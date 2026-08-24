import logging
import time
from typing import List
from fastapi import APIRouter, File, UploadFile, HTTPException, status
from pydantic import BaseModel, Field

from inference.road_damage_detector import rdd_detector, RoadDamageModelNotFoundError

logger = logging.getLogger("routes.road_damage")

router = APIRouter()

class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float

class RDDItem(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    bbox: BoundingBox

class RDDResponse(BaseModel):
    success: bool
    model: str
    model_version: str
    inference_time_ms: float
    detections: List[RDDItem]

class RDDHealthResponse(BaseModel):
    loaded: bool
    model: str
    device: str
    classes: int
    class_names: List[str]

@router.post("/road-damage", response_model=RDDResponse)
async def detect_road_damage(image: UploadFile = File(...)):
    start_time = time.time()
    try:
        if image.filename is None:
            raise HTTPException(status_code=400, detail="Missing filename")
        file_bytes = await image.read()
        detections_raw = rdd_detector.predict_bytes(file_bytes, image.filename)
        
        detections = []
        for d in detections_raw:
            detections.append(RDDItem(
                class_id=d["class_id"],
                class_name=d["class_name"],
                confidence=d["confidence"],
                bbox=BoundingBox(**d["bbox"])
            ))
            
        inference_time_ms = round((time.time() - start_time) * 1000, 2)
        
        info = rdd_detector.get_model_info()
        
        return RDDResponse(
            success=True,
            model=info.get("model", "rdd2022"),
            model_version="1.0.0",
            inference_time_ms=inference_time_ms,
            detections=detections
        )
        
    except RoadDamageModelNotFoundError as e:
        logger.error(f"RDD model not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except ValueError as e:
        logger.warning(f"Invalid image request: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"RDD inference failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal prediction error"
        )

@router.get("/health/model", response_model=RDDHealthResponse)
def get_model_health():
    info = rdd_detector.get_model_info()
    return RDDHealthResponse(
        loaded=info["loaded"],
        model=info["model"],
        device=info["device"],
        classes=info["classes"],
        class_names=info["class_names"]
    )
