import asyncio
import logging
import json
import time
import sys
from fastapi import FastAPI, HTTPException
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

# Enable CORS for external access from frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.post("/detect/image")
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

@app.post("/detect/video")
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
