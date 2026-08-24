import logging
import httpx
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from inference.road_damage_detector import rdd_detector, RoadDamageModelNotFoundError

logger = logging.getLogger("routes.fastapi_integration")

router = APIRouter()

class DetectImageRequest(BaseModel):
    url: str

class BoundingBox(BaseModel):
    xMin: float
    yMin: float
    xMax: float
    yMax: float
    confidence: float
    label: str

class PredictionMetadata(BaseModel):
    processingTimeMs: float
    device: str
    type: str
    model: str

class FastApiPredictionResponse(BaseModel):
    damageClass: str
    confidenceScore: float
    severity: Optional[float] = 0.0
    blur_score: Optional[float] = 0.0
    is_blurry: Optional[bool] = False
    boundingBoxes: List[BoundingBox]
    metadata: PredictionMetadata

@router.post("/detect/image", response_model=FastApiPredictionResponse)
async def detect_image_from_url(request: DetectImageRequest):
    """
    Endpoint matching the NestJS backend interface for AI processing.
    Expects a URL instead of a file upload, downloads the image, and 
    runs road damage inference on it.
    """
    import time
    start_time = time.time()
    
    # 1. Download image
    try:
        if request.url.startswith("http"):
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(request.url)
                response.raise_for_status()
                file_bytes = response.content
        else:
            # Maybe it's a local file path (for testing)
            with open(request.url, "rb") as f:
                file_bytes = f.read()
    except Exception as e:
        logger.error(f"Failed to download image from URL {request.url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch image: {e}"
        )
        
    # 2. Run inference
    try:
        # Default filename for validation logs
        filename = request.url.split("/")[-1] if "/" in request.url else "downloaded_image.jpg"
        
        detections_raw = rdd_detector.predict_bytes(file_bytes, filename)
        
        # 3. Map to FastApiPredictionResponse expected by NestJS
        # We will pick the highest severity/confidence detection to define the main class,
        # or combine them if multiple exist.
        
        main_class = "UNKNOWN"
        max_conf = 0.0
        max_severity = 0.0
        
        bounding_boxes = []
        for d in detections_raw:
            conf = d["confidence"]
            sev = d.get("severity", 0.0)
            c_name = d["class_name"]
            
            if conf > max_conf:
                max_conf = conf
                main_class = c_name
                max_severity = sev
                
            bounding_boxes.append(BoundingBox(
                xMin=d["bbox"]["x1"],
                yMin=d["bbox"]["y1"],
                xMax=d["bbox"]["x2"],
                yMax=d["bbox"]["y2"],
                confidence=conf,
                label=c_name
            ))
            
        processing_time_ms = round((time.time() - start_time) * 1000, 2)
        
        info = rdd_detector.get_model_info()
        
        return FastApiPredictionResponse(
            damageClass=main_class,
            confidenceScore=max_conf,
            severity=max_severity,
            is_blurry=False,
            blur_score=0.0,
            boundingBoxes=bounding_boxes,
            metadata=PredictionMetadata(
                processingTimeMs=processing_time_ms,
                device=info["device"],
                type="image",
                model=info["model"]
            )
        )
        
    except RoadDamageModelNotFoundError as e:
        logger.error(f"RDD model not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except ValueError as e:
        logger.warning(f"Invalid image content: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Prediction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal prediction error"
        )
