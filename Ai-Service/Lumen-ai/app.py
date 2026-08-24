import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routes.detection import router as detection_router
from routes.predict import router as predict_router
from routes.road_damage import router as road_damage_router
from routes.fastapi_integration import router as fastapi_integration_router
from config import settings
from services.yolo_service import yolo_service
from inference.road_damage_detector import rdd_detector, RoadDamageModelNotFoundError

# Setup centralized application logging format and level
logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("app")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create necessary directories
    settings.UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
    settings.PREDICTION_FOLDER.mkdir(parents=True, exist_ok=True)
    settings.LOG_DIR.mkdir(parents=True, exist_ok=True)
    
    # Load YOLO model
    logger.info("Initializing YOLO inference service...")
    try:
        yolo_service.load_model()
    except Exception as e:
        logger.critical(f"Failed to start server due to main model loading error: {e}")
        raise e
        
    logger.info("Initializing RDD inference service...")
    try:
        rdd_detector.load_model()
    except RoadDamageModelNotFoundError as e:
        logger.warning(f"RDD model not yet trained. Endpoint will be unavailable: {e}")
    except Exception as e:
        logger.error(f"Unexpected error loading RDD model: {e}")
        
    yield
    
    logger.info("Shutting down YOLO inference service...")

app = FastAPI(
    title="LUMEN Smart City CV Service",
    description=(
        "Production-grade FastAPI computer vision service for the LUMEN Smart City platform. "
        "Exposes real-time detection APIs to identify potholes, garbage, leaks, and infrastructure issues."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure Cross-Origin Resource Sharing (CORS) middleware
# Essential for allowing frontend dashboards and backend aggregators to make client requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In enterprise deployments, lock down to specific domains/origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(detection_router, tags=["Civic Issue Detection"])
app.include_router(predict_router, tags=["YOLO Inference Service"])
app.include_router(road_damage_router, prefix="/api/v1/detection", tags=["Road Damage Detection"])
app.include_router(fastapi_integration_router, tags=["NestJS Integration"])

@app.get("/", tags=["General"])
def read_root():
    """Service landing entrypoint supplying documentation routes."""
    return {
        "name": "LUMEN Civic Infrastructure CV Platform",
        "description": "API service for YOLO11 based civic problem detection",
        "documentation": "/docs",
        "health": "/health",
        "status": "online"
    }

if __name__ == "__main__":
    logger.info(f"Starting FastAPI CV platform on {settings.HOST}:{settings.PORT}")
    uvicorn.run(
        "app:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False  # Disabled in production for thread performance and stability
    )
