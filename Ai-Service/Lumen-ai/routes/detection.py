import logging
from typing import List, Dict, Any
from fastapi import APIRouter, File, UploadFile, HTTPException, status
from pydantic import BaseModel, Field
import yaml
from pathlib import Path

from config import settings
from services.detector import ModelNotFoundError
from services.predictor import PredictorService

logger = logging.getLogger("routes.detection")

router = APIRouter()
predictor_service = PredictorService()

# Pydantic schemas for API Response validation and Swagger documentation
class DetectionItem(BaseModel):
    category: str = Field(..., description="Detected civic issue class name")
    confidence: float = Field(..., description="Prediction confidence score (0.0 to 1.0)")
    bbox: List[float] = Field(..., description="Bounding box coordinates [xmin, ymin, xmax, ymax]")

class DetectionResponse(BaseModel):
    success: bool = Field(..., description="Whether the prediction ran successfully")
    filename: str = Field(..., description="Name of the evaluated image file")
    detections: List[DetectionItem] = Field(..., description="List of detected civic problems")

class ClassListResponse(BaseModel):
    classes: List[str] = Field(..., description="List of categories recognized by the platform")

class ModelInfoResponse(BaseModel):
    model_path: str = Field(..., description="Configured file path to model weights")
    device: str = Field(..., description="Active compute device (e.g. cuda, cpu)")
    confidence_threshold: float = Field(..., description="Minimum detection confidence threshold")
    image_size: int = Field(..., description="Input image size width/height")
    batch_size: int = Field(..., description="Training batch size")
    epochs: int = Field(..., description="Training epochs configuration")
    is_loaded: bool = Field(..., description="Whether the custom weights are loaded in memory")

class HealthResponse(BaseModel):
    status: str = Field(..., description="Service health state")
    model_loaded: bool = Field(..., description="Whether the model weights are loaded")
    device: str = Field(..., description="Active compute device")

@router.post(
    "/detect", 
    response_model=DetectionResponse, 
    status_code=status.HTTP_200_OK,
    summary="Detect civic infrastructure issues",
    description="Accepts an image upload, runs YOLO11 inference, and returns identified objects with scores and coordinates."
)
async def detect_issue(file: UploadFile = File(..., description="Image to analyze (JPEG, PNG, WEBP)")):
    try:
        # Read uploaded image bytes
        file_bytes = await file.read()
        
        # Execute predictions
        detections = predictor_service.predict_image_bytes(file_bytes, file.filename)
        
        # Map raw predictions to validated schemas
        items = [
            DetectionItem(
                category=det["category"],
                confidence=det["confidence"],
                bbox=det["bbox"]
            )
            for det in detections
        ]
        
        return DetectionResponse(
            success=True,
            filename=file.filename,
            detections=items
        )

    except ModelNotFoundError as e:
        logger.error(f"Prediction failed because model is missing: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model weights file best.pt is not loaded. Please run training to generate weights: {str(e)}"
        )
    except ValueError as e:
        logger.warning(f"Bad request received: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected prediction failure: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )

@router.get(
    "/health", 
    response_model=HealthResponse,
    summary="Perform a service health check"
)
def health_check() -> HealthResponse:
    detector = predictor_service.detector
    return HealthResponse(
        status="healthy",
        model_loaded=detector.is_loaded(),
        device=settings.get_device()
    )

@router.get(
    "/classes", 
    response_model=ClassListResponse,
    summary="Get list of supported classes"
)
def get_classes() -> ClassListResponse:
    detector = predictor_service.detector
    try:
        # Try fetching classes directly from the loaded model
        names_dict = detector.get_class_names()
        classes = list(names_dict.values())
    except ModelNotFoundError:
        # Fallback: Read classes from dataset/data.yaml if the model has not been trained yet
        logger.warning("Model weights missing. Reading classes from dataset/data.yaml configuration.")
        yaml_path = Path(settings.DATASET_YAML_PATH)
        if yaml_path.exists():
            try:
                with open(yaml_path, "r") as f:
                    data = yaml.safe_load(f)
                    names_dict = data.get("names", {})
                    classes = list(names_dict.values())
            except Exception as e:
                logger.error(f"Failed to read dataset/data.yaml: {e}")
                classes = ["pothole", "garbage", "water_leak", "broken_streetlight", "drainage_issue", "fallen_tree"]
        else:
            classes = ["pothole", "garbage", "water_leak", "broken_streetlight", "drainage_issue", "fallen_tree"]
            
    return ClassListResponse(classes=classes)

@router.get(
    "/model-info", 
    response_model=ModelInfoResponse,
    summary="Get configuration and loaded model state"
)
def get_model_info() -> ModelInfoResponse:
    detector = predictor_service.detector
    return ModelInfoResponse(
        model_path=str(settings.MODEL_PATH),
        device=settings.get_device(),
        confidence_threshold=settings.CONFIDENCE_THRESHOLD,
        image_size=settings.IMAGE_SIZE,
        batch_size=settings.BATCH_SIZE,
        epochs=settings.EPOCHS,
        is_loaded=detector.is_loaded()
    )
