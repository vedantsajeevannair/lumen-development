import logging
from typing import List, Dict, Any, Union
from pathlib import Path
from utils.image_utils import (
    validate_image_metadata,
    load_image_from_bytes,
    resize_image_simple
)
from services.detector import DetectorService
from config import settings

logger = logging.getLogger("predictor")

class PredictorService:
    """
    Coordinates end-to-end inference workflows including image input validation,
    loading, resizing, detection, and prediction formatting.
    """
    def __init__(self) -> None:
        self.detector = DetectorService()

    def predict_image_bytes(self, file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
        """
        Validates, decodes, and runs prediction on uploaded image bytes.
        
        Args:
            file_bytes: Raw bytes of the image file.
            filename: Original name of the uploaded file.
            
        Returns:
            A list of formatted detections:
            [
                {
                    "category": str,
                    "confidence": float,
                    "bbox": [x1, y1, x2, y2]
                }
            ]
            
        Raises:
            ValueError: If the file is invalid, corrupted, or violates size/format constraints.
        """
        # Validate image file metadata and structure
        is_valid, err_msg = validate_image_metadata(
            file_bytes=file_bytes,
            filename=filename,
            max_size_mb=settings.MAX_IMAGE_SIZE_MB,
            allowed_mime_types=settings.ALLOWED_MIME_TYPES,
            allowed_extensions=settings.ALLOWED_EXTENSIONS
        )
        if not is_valid:
            logger.error(f"Image validation failed for {filename}: {err_msg}")
            raise ValueError(err_msg)

        # Decode raw bytes into OpenCV BGR numpy array
        image = load_image_from_bytes(file_bytes)
        
        # Pre-resize large images to prevent excessive memory usage.
        # YOLO scales internally, but limiting source resolution speeds up preprocess.
        image_resized = resize_image_simple(image, max_dim=settings.IMAGE_SIZE * 2)

        # Run inference
        detections = self.detector.detect(image_resized)
        return detections

    def predict_image_path(self, file_path: Union[str, Path]) -> List[Dict[str, Any]]:
        """
        Reads an image from a local file path, validates it, and runs prediction.
        
        Args:
            file_path: Path to the image file.
            
        Returns:
            A list of detections.
            
        Raises:
            FileNotFoundError: If the file is not found.
            ValueError: If validation fails.
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Image not found at path: {path}")
            
        with open(path, "rb") as f:
            file_bytes = f.read()
            
        return self.predict_image_bytes(file_bytes, path.name)

    def predict_batch_paths(self, file_paths: List[Union[str, Path]]) -> Dict[str, Any]:
        """
        Runs batch predictions over a list of local file paths.
        
        Args:
            file_paths: List of file paths to process.
            
        Returns:
            A dictionary mapping image paths to their prediction details:
            {
                "image_path": {
                    "status": "success" | "failed",
                    "detections": [...] or "error": str
                }
            }
        """
        results = {}
        for path_str in file_paths:
            path = Path(path_str)
            try:
                detections = self.predict_image_path(path)
                results[str(path)] = {
                    "status": "success",
                    "detections": detections
                }
            except Exception as e:
                logger.error(f"Failed to process batch image '{path}': {e}")
                results[str(path)] = {
                    "status": "failed",
                    "error": str(e)
                }
        return results
