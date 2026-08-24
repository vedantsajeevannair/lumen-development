import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Union
from ultralytics import YOLO
import numpy as np

from config import settings
from utils.image_utils import validate_image_metadata, load_image_from_bytes, resize_image_simple

logger = logging.getLogger("road_damage_detector")

class RoadDamageModelNotFoundError(Exception):
    pass

class RoadDamageDetector:
    """
    Dedicated inference service for Road Damage Detection (RDD2022).
    Keeps model instance isolated from the main DetectorService.
    """
    _instance = None
    _model = None
    
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(RoadDamageDetector, cls).__new__(cls, *args, **kwargs)
        return cls._instance
        
    def __init__(self):
        if hasattr(self, "_initialized") and self._initialized:
            return
        self._initialized = True
        
        # Resolve config
        self.base_dir = Path(__file__).resolve().parent.parent
        model_env = os.getenv("AI_MODEL_PATH_RDD", str(self.base_dir / "models" / "rdd2022_best.pt"))
        self.model_path = Path(model_env)
        self.device = os.getenv("AI_DEVICE", settings.get_device())
        
        # We set strict thresholds for RDD
        self.conf_threshold = float(os.getenv("AI_CONFIDENCE_THRESHOLD_RDD", "0.60"))
        self.iou_threshold = float(os.getenv("AI_IOU_THRESHOLD_RDD", "0.45"))
        self.img_size = int(os.getenv("AI_IMAGE_SIZE_RDD", "640"))
        self.max_size_mb = int(os.getenv("AI_MAX_IMAGE_SIZE_MB", "10"))
        
    def load_model(self) -> YOLO:
        if self._model is not None:
            return self._model
            
        logger.info(f"Attempting to load RDD2022 YOLO model from: {self.model_path}")
        
        if not self.model_path.exists():
            msg = f"Model weights not found at {self.model_path}. Please train the model first."
            logger.error(msg)
            raise RoadDamageModelNotFoundError(msg)
            
        try:
            model = YOLO(str(self.model_path))
            model.to(self.device)
            
            # Warm up
            dummy_img = np.zeros((self.img_size, self.img_size, 3), dtype=np.uint8)
            model(dummy_img, imgsz=self.img_size, verbose=False)
            
            self._model = model
            logger.info(f"RDD2022 model loaded successfully on {self.device}")
            return self._model
        except Exception as e:
            logger.error(f"Failed to load RDD2022 model: {e}", exc_info=True)
            raise RuntimeError(f"Model load failure: {e}")
            
    def is_loaded(self) -> bool:
        return self._model is not None

    def get_model_info(self) -> Dict[str, Any]:
        info = {
            "loaded": self.is_loaded(),
            "model": self.model_path.name,
            "device": self.device,
            "classes": 0,
            "class_names": []
        }
        if self._model is not None:
            info["classes"] = len(self._model.names)
            info["class_names"] = list(self._model.names.values())
        return info

    def predict(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Runs inference on OpenCV image array.
        """
        model = self.load_model()
        results_list = list(model.predict(
            source=image,
            imgsz=self.img_size,
            conf=self.conf_threshold,
            iou=self.iou_threshold,
            device=self.device,
            verbose=False
        ))
        
        detections = []
        if not results_list:
            return detections
            
        result = results_list[0]
        if not hasattr(result, 'boxes') or result.boxes is None: # type: ignore
            return detections
            
        img_h, img_w = image.shape[:2]
        img_area = img_h * img_w
        
        for box in result.boxes: # type: ignore
            xyxy = box.xyxy[0].cpu().numpy().tolist()
            conf = float(box.conf[0].cpu().item())
            cls_id = int(box.cls[0].cpu().item())
            c_name = model.names.get(cls_id, f"class_{cls_id}")
            
            # Severity Calculation: Bounding Box Area Percentage
            w = xyxy[2] - xyxy[0]
            h = xyxy[3] - xyxy[1]
            bbox_area = w * h
            area_percentage = bbox_area / img_area
            # Scale severity: if a pothole takes 10% of the image, it's very severe.
            severity = min(100.0, area_percentage * 500.0) 
            
            detections.append({
                "class_id": cls_id,
                "class_name": c_name,
                "confidence": round(conf, 4),
                "severity": round(severity, 2),
                "bbox": {
                    "x1": round(xyxy[0], 2),
                    "y1": round(xyxy[1], 2),
                    "x2": round(xyxy[2], 2),
                    "y2": round(xyxy[3], 2)
                }
            })
            
        return detections

    def predict_bytes(self, file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
        is_valid, err_msg = validate_image_metadata(
            file_bytes=file_bytes,
            filename=filename,
            max_size_mb=self.max_size_mb,
            allowed_mime_types=settings.ALLOWED_MIME_TYPES,
            allowed_extensions=settings.ALLOWED_EXTENSIONS
        )
        
        if not is_valid:
            raise ValueError(err_msg)
            
        image = load_image_from_bytes(file_bytes)
        
        h, w = image.shape[:2]
        max_dim = self.img_size * 2
        scale = 1.0
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            
        image_resized = resize_image_simple(image, max_dim=max_dim)
        
        detections = self.predict(image_resized)
        
        if scale != 1.0:
            for det in detections:
                det["bbox"]["x1"] = round(det["bbox"]["x1"] / scale, 2)
                det["bbox"]["y1"] = round(det["bbox"]["y1"] / scale, 2)
                det["bbox"]["x2"] = round(det["bbox"]["x2"] / scale, 2)
                det["bbox"]["y2"] = round(det["bbox"]["y2"] / scale, 2)
                
        return detections
        
    def predict_file(self, file_path: Union[str, Path]) -> List[Dict[str, Any]]:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        with open(path, "rb") as f:
            return self.predict_bytes(f.read(), path.name)

# Singleton export
rdd_detector = RoadDamageDetector()
