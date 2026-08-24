import logging
import os
from pathlib import Path
from typing import Dict, Any
import numpy as np
import cv2
from ultralytics import YOLO

from config import settings

logger = logging.getLogger("yolo_service")

class YoloService:
    """
    Dedicated service for managing the YOLO11 model, executing inference,
    and processing results into structured JSON and annotated images.
    Designed to be used as a dependency-injected singleton.
    """
    def __init__(self) -> None:
        self.model_path = Path(settings.MODEL_PATH)
        self.device = settings.get_device()
        self.conf_threshold = settings.CONFIDENCE_THRESHOLD
        self._model = None

    def load_model(self) -> None:
        """
        Loads the YOLO11 model into memory.
        This should be called exactly once during FastAPI startup.
        
        Raises:
            FileNotFoundError: If the weights file is missing.
            RuntimeError: If the model cannot be loaded.
        """
        if self._model is not None:
            return

        logger.info(f"Loading YOLO11 model from: {self.model_path}")
        
        if not self.model_path.exists():
            error_msg = f"YOLO model weights missing at {self.model_path}. Server cannot start."
            logger.critical(error_msg)
            raise FileNotFoundError(error_msg)

        try:
            # Initialize model
            self._model = YOLO(str(self.model_path))
            
            # Move to target device
            self._model.to(self.device)
            
            # Warm up the model to prevent slow first-inference
            logger.info("Performing model warmup...")
            dummy_img = np.zeros((settings.IMAGE_SIZE, settings.IMAGE_SIZE, 3), dtype=np.uint8)
            self._model(dummy_img, imgsz=settings.IMAGE_SIZE, verbose=False)
            
            logger.info(f"YOLO11 model successfully loaded on {self.device}")
            
        except Exception as e:
            logger.critical(f"Failed to load YOLO model: {e}", exc_info=True)
            raise RuntimeError(f"YOLO model initialization failed: {e}")

    def get_model(self) -> YOLO:
        """Returns the loaded model, raising an error if it's not loaded."""
        if self._model is None:
            raise RuntimeError("Model is not loaded. Call load_model() first.")
        return self._model

    def predict(self, image_path: Path, output_filename: str) -> Dict[str, Any]:
        """
        Runs inference on the provided image, formats the output into structured JSON,
        and saves an annotated version of the image.
        
        Args:
            image_path: Path to the temporary uploaded image.
            output_filename: Name to use for the annotated output image.
            
        Returns:
            Dict containing success, image dimensions, detections, total_objects,
            processing_time, and annotated_image_path.
        """
        model = self.get_model()
        
        try:
            # Run inference
            # Ultralytics calculates processing time inside the results object (speed dictionary)
            results_list = list(model.predict(
                source=str(image_path),
                conf=self.conf_threshold,
                device=self.device,
                verbose=False
            ))
            
            if not results_list:
                raise ValueError("Prediction returned no results.")
                
            result = results_list[0]
            
            # Extract image dimensions
            orig_shape = result.orig_shape  # type: ignore
            image_height, image_width = orig_shape
            
            # Extract inference speed
            speed_ms = sum(v for v in result.speed.values() if v is not None) if hasattr(result, 'speed') else 0.0 # type: ignore
            
            # Process bounding boxes
            boxes = result.boxes # type: ignore
            detections = []
            
            if boxes is not None and len(boxes) > 0:
                for box in boxes:
                    xyxy = box.xyxy[0].cpu().numpy().tolist()
                    conf = float(box.conf[0].cpu().item())
                    cls_id = int(box.cls[0].cpu().item())
                    category = model.names.get(cls_id, f"class_{cls_id}")
                    
                    detections.append({
                        "class_id": cls_id,
                        "class_name": category,
                        "confidence": round(conf, 2),
                        "bounding_box": {
                            "x1": round(xyxy[0], 2),
                            "y1": round(xyxy[1], 2),
                            "x2": round(xyxy[2], 2),
                            "y2": round(xyxy[3], 2)
                        }
                    })
            
            # Save annotated image
            annotated_img = result.plot() # type: ignore
            output_path = settings.PREDICTION_FOLDER / output_filename
            cv2.imwrite(str(output_path), annotated_img)
            
            return {
                "success": True,
                "image_width": int(image_width),
                "image_height": int(image_height),
                "detections": detections,
                "total_objects": len(detections),
                "processing_time_ms": round(speed_ms, 2),
                "annotated_image_path": str(output_path)
            }
            
        except Exception as e:
            logger.error(f"Error during YOLO prediction: {e}", exc_info=True)
            raise

    def cleanup(self, file_path: Path) -> None:
        """Safely removes a temporary file."""
        try:
            if file_path.exists():
                os.remove(file_path)
                logger.debug(f"Cleaned up temporary file: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to clean up temporary file {file_path}: {e}")

# Global instance for dependency injection
yolo_service = YoloService()
