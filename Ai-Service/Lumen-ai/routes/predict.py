import logging
import uuid
import time
import json
from pathlib import Path
from typing import List, Any
from fastapi import APIRouter, File, UploadFile, HTTPException, status
from pydantic import BaseModel, Field

from config import settings
from services.yolo_service import yolo_service

# Setup dedicated logger for predictions
predict_logger = logging.getLogger("prediction_log")
predict_logger.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(message)s')
# Ensure log directory exists
settings.LOG_DIR.mkdir(parents=True, exist_ok=True)
file_handler = logging.FileHandler(settings.LOG_DIR / "prediction.log")
file_handler.setFormatter(formatter)
if not predict_logger.handlers:
    predict_logger.addHandler(file_handler)

router = APIRouter()

@router.post(
    "/predict",
    status_code=status.HTTP_200_OK,
    summary="Run YOLO11 Inference on Image",
    description="Accepts an image upload and returns structured JSON with bounding boxes."
)
async def predict_image(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing file")

    if file.filename is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing filename")

    # Validate extensions
    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        predict_logger.error(f"Filename: {file.filename} - Error: Unsupported file type")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Unsupported file format. Allowed: {settings.ALLOWED_EXTENSIONS}"
        )

    # Validate image size by reading content (up to 10MB)
    file_bytes = await file.read()
    if len(file_bytes) > settings.MAX_IMAGE_SIZE_MB * 1024 * 1024:
        predict_logger.error(f"Filename: {file.filename} - Error: File too large")
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image size exceeds {settings.MAX_IMAGE_SIZE_MB}MB limit."
        )

    # Save temporary file with UUID
    temp_filename = f"{uuid.uuid4()}{ext}"
    temp_path = settings.UPLOAD_FOLDER / temp_filename
    
    try:
        with open(temp_path, "wb") as f:
            f.write(file_bytes)
    except Exception as e:
        predict_logger.error(f"Filename: {file.filename} - Error: Failed to save temporary image ({e})")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save image.")

    try:
        # Run prediction
        output_filename = f"annotated_{temp_filename}"
        result = yolo_service.predict(image_path=temp_path, output_filename=output_filename)
        
        # Check if nothing detected
        if result["total_objects"] == 0:
            predict_logger.info(
                f"Filename: {file.filename} - Processing time: {result['processing_time_ms']}ms "
                f"- Detected classes: [] - Confidences: []"
            )
            return {
                "success": True,
                "detections": [],
                "message": "No known infrastructure issue detected."
            }

        # Log details
        detected_classes = [det["class_name"] for det in result["detections"]]
        confidences = [det["confidence"] for det in result["detections"]]
        predict_logger.info(
            f"Filename: {file.filename} - Processing time: {result['processing_time_ms']}ms "
            f"- Detected classes: {json.dumps(detected_classes)} - Confidences: {json.dumps(confidences)}"
        )
        
        return result

    except FileNotFoundError as e:
        predict_logger.error(f"Filename: {file.filename} - Error: YOLO model missing ({e})")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Model missing.")
    except Exception as e:
        predict_logger.error(f"Filename: {file.filename} - Error: Unexpected exception ({e})")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        # Clean up temporary file
        yolo_service.cleanup(temp_path)
