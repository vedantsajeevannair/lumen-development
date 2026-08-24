import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Union
from ultralytics import YOLO
import numpy as np
from config import settings

logger = logging.getLogger("detector")

class ModelNotFoundError(Exception):
    """Exception raised when the requested custom YOLO model weights file is missing."""
    pass

class DetectorService:
    """
    Manages the lifecycle and execution of the YOLO11 model.
    Implements a lazy-loaded thread-safe singleton pattern.
    """
    _instance = None
    _model = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(DetectorService, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self) -> None:
        # Prevent re-initialization if already initialized
        if hasattr(self, "_initialized") and self._initialized:
            return
        self._initialized = True
        self.model_path = Path(settings.MODEL_PATH)
        self.device = settings.get_device()
        self.conf_threshold = settings.CONFIDENCE_THRESHOLD
        self.img_size = settings.IMAGE_SIZE

    def load_model(self, force_reload: bool = False) -> YOLO:
        """
        Loads the YOLO model into memory.
        
        Raises:
            ModelNotFoundError: If the weights file is missing.
            Exception: If model loading fails due to file corruption or parsing issues.
        """
        if self._model is not None and not force_reload:
            return self._model

        logger.info(f"Attempting to load YOLO model from: {self.model_path}")
        
        if not self.model_path.exists():
            msg = f"Model weights file not found at: {self.model_path}. Please run train.py first to generate the weights."
            logger.error(msg)
            raise ModelNotFoundError(msg)

        try:
            # Load custom YOLO11 model weights
            model = YOLO(str(self.model_path))
            
            # Bind the model to the config-specified hardware accelerator (CPU, CUDA, MPS)
            model.to(self.device)
            
            # Perform a quick model warm-up to prepare the backend and cache layers
            logger.info("Performing model warmup...")
            dummy_img = np.zeros((settings.IMAGE_SIZE, settings.IMAGE_SIZE, 3), dtype=np.uint8)
            model(dummy_img, imgsz=self.img_size, verbose=False)
            
            self._model = model
            logger.info(f"YOLO model successfully loaded on device: {self.device}")
            return self._model
            
        except Exception as e:
            msg = f"Failed to load or compile YOLO model weights: {str(e)}"
            logger.error(msg, exc_info=True)
            raise Exception(msg)

    def is_loaded(self) -> bool:
        """Checks if the model is currently loaded in memory."""
        return self._model is not None

    def get_class_names(self) -> Dict[int, str]:
        """
        Returns the mapping of ID -> name recognized by the loaded model.
        If the model is not loaded, it attempts to load it first.
        """
        model = self.load_model()
        return model.names

    def detect(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Runs YOLO11 inference on a single preprocessed OpenCV image array.
        
        Args:
            image: OpenCV BGR image array (H, W, C).
            
        Returns:
            A list of detections where each detection contains:
            {
                "category": str,
                "confidence": float,
                "bbox": [x1, y1, x2, y2]
            }
        """
        model = self.load_model()
        
        try:
            # Execute model predictions using Ultralytics predict API
            results = model.predict(
                source=image,
                imgsz=self.img_size,
                conf=self.conf_threshold,
                device=self.device,
                verbose=False
            )
            
            detections = []
            if not results:
                return detections
                
            result = results[0]
            boxes = result.boxes
            
            for box in boxes:
                # Coordinate formats: xyxy (xmin, ymin, xmax, ymax) in floats
                xyxy = box.xyxy[0].cpu().numpy().tolist()
                conf = float(box.conf[0].cpu().item())
                cls_id = int(box.cls[0].cpu().item())
                
                # Fetch class name dynamically from model names dictionary
                category = model.names.get(cls_id, f"class_{cls_id}")
                
                detections.append({
                    "category": category,
                    "confidence": round(conf, 4),
                    "bbox": [round(coord, 2) for coord in xyxy]
                })
                
            return detections
            
        except Exception as e:
            logger.error(f"Inference execution failed: {e}", exc_info=True)
            raise RuntimeError(f"Prediction execution failure: {str(e)}")
