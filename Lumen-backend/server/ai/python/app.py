import asyncio
import logging
import secrets
import json
import time
import sys
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager

from config import settings
from detector import detector

# Configure structured JSON logging for production log management
class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S") + f".{int(record.msecs):03d}Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage()
        }
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_record)

# Override default logging handlers with the structured JSON formatter
log_handler = logging.StreamHandler(sys.stdout)
log_handler.setFormatter(JSONFormatter())
logging.basicConfig(level=logging.INFO, handlers=[log_handler], force=True)

logger = logging.getLogger("uvicorn.error")
logger.handlers = [log_handler]
logger.propagate = False

class DetectRequest(BaseModel):
    url: str
    description: str = ""

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load model on startup - fail fast and crash the server if loading fails
    try:
        detector.load_model()
    except Exception as e:
        logger.critical(f"Lifespan initialization failed: Model could not be loaded: {e}", exc_info=True)
        # Re-raising crashes the Uvicorn worker process immediately
        raise e
        
    # Start the dynamic batcher queue worker
    await detector.start_worker()
    yield
    # Cleanup on shutdown to release background threads and GPU memory
    await detector.stop_worker()
    detector.unload_model()

app = FastAPI(
    title="LUMEN AI Inference Service",
    description="Production-grade FastAPI service for YOLO11 damage detection with dynamic batching and SSRF security controls.",
    version="1.0.0",
    lifespan=lifespan
)

# This service is called server-to-server by the LUMEN backend, not by browsers,
# so CORS defaults to closed. Set CORS_ORIGINS only if something in a browser
# genuinely needs direct access.
_cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
if _cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def require_api_key(request: Request) -> None:
    """Reject calls that do not carry the shared secret.

    The backend already sends `Authorization: Bearer $FASTAPI_API_KEY`; this
    makes the service actually check it. No key configured means no check, which
    is only safe when the service is unreachable from outside the cluster/VPC.
    """
    if not settings.API_KEY:
        return
    header = request.headers.get("authorization", "")
    token = header[7:].strip() if header.lower().startswith("bearer ") else ""
    if not secrets.compare_digest(token, settings.API_KEY):
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")

@app.get("/health")
def health_check():
    model_loaded = detector.model is not None
    queue_size = detector.queue.qsize() if detector.queue else 0
    return {
        "status": "healthy" if model_loaded else "degraded",
        "device": detector.device,
        "model_loaded": model_loaded,
        "queue_depth": queue_size,
        "max_queue_size": settings.MAX_QUEUE_SIZE,
        "max_batch_size": settings.MAX_BATCH_SIZE
    }

@app.post("/detect/image", dependencies=[Depends(require_api_key)])
async def detect_image(req: DetectRequest):
    if not req.url:
        raise HTTPException(status_code=400, detail="Invalid request: 'url' parameter is required.")
        
    try:
        start_time = time.time()
        # Non-blocking prediction using the dynamic batching queue
        result = await detector.predict_image(req.url)
        elapsed = time.time() - start_time
        
        result["metadata"] = {
            "processingTimeMs": int(elapsed * 1000),
            "device": detector.device,
            "type": "image",
            "width": result.pop("width", 0),
            "height": result.pop("height", 0)
        }
        logger.info(f"Image inference completed in {int(elapsed * 1000)}ms.")
        logger.info("Prediction returned")
        return result
    except ValueError as e:
        # Security violation (e.g., SSRF) or image download/validation error
        logger.error(f"Image preprocessing or validation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except asyncio.QueueFull as e:
        # Queue limit reached under high load
        logger.warning(f"Request dropped due to queue congestion: {e}")
        raise HTTPException(status_code=503, detail="Server busy: inference queue is full. Please try again later.")
    except Exception as e:
        logger.critical(f"Unexpected error during image inference: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference engine failure: {str(e)}")

@app.post("/detect/video", dependencies=[Depends(require_api_key)])
async def detect_video(req: DetectRequest):
    if not req.url:
        raise HTTPException(status_code=400, detail="Invalid request: 'url' parameter is required.")
        
    try:
        start_time = time.time()
        # Non-blocking prediction using the dynamic batching queue for multiple frames
        result = await detector.predict_video(req.url)
        elapsed = time.time() - start_time
        
        result["metadata"] = {
            "processingTimeMs": int(elapsed * 1000),
            "device": detector.device,
            "type": "video",
            "sampleRateFps": settings.VIDEO_SAMPLE_RATE,
            "width": result.pop("width", 0),
            "height": result.pop("height", 0)
        }
        logger.info(f"Video inference completed in {int(elapsed * 1000)}ms.")
        return result
    except ValueError as e:
        # Security violation (e.g., SSRF) or video download/validation error
        logger.error(f"Video preprocessing or validation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except asyncio.QueueFull as e:
        # Queue limit reached under high load
        logger.warning(f"Request dropped due to queue congestion: {e}")
        raise HTTPException(status_code=503, detail="Server busy: inference queue is full. Please try again later.")
    except Exception as e:
        logger.critical(f"Unexpected error during video inference: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference engine failure: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    
    logger.info("Starting LUMEN AI Inference Service...")
    try:
        uvicorn.run("app:app", host=settings.HOST, port=settings.PORT, reload=False)
    except (KeyboardInterrupt, asyncio.CancelledError):
        logger.info("AI Server stopped gracefully.")
        sys.exit(0)
    except Exception as e:
        logger.critical(f"Server crashed during startup or run: {e}", exc_info=True)
        sys.exit(1)
