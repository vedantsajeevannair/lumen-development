import cv2
import numpy as np
from PIL import Image
import io
import os
from typing import Tuple, List, Dict, Any, Union
import logging

logger = logging.getLogger("image_utils")

def validate_image_metadata(
    file_bytes: bytes, 
    filename: str, 
    max_size_mb: int, 
    allowed_mime_types: List[str], 
    allowed_extensions: List[str]
) -> Tuple[bool, str]:
    """
    Validates basic image metadata such as size, extension, and signature headers.
    
    Args:
        file_bytes: The raw bytes of the file.
        filename: Name of the uploaded file.
        max_size_mb: The maximum allowed size in Megabytes.
        allowed_mime_types: Allowed MIME type strings.
        allowed_extensions: Allowed file extension suffix strings.
        
    Returns:
        A tuple of (is_valid: bool, error_message: str).
    """
    # 1. Check file size
    file_size_mb = len(file_bytes) / (1024 * 1024)
    if file_size_mb > max_size_mb:
        return False, f"File size exceeds the maximum limit of {max_size_mb}MB (Current size: {file_size_mb:.2f}MB)"

    # 2. Check file extension
    _, ext = os.path.splitext(filename.lower())
    if ext not in allowed_extensions:
        return False, f"File extension '{ext}' is not allowed. Supported formats: {', '.join(allowed_extensions)}"

    # 3. Check Image Validity by attempting a lazy header check using Pillow
    try:
        img = Image.open(io.BytesIO(file_bytes))
        img.verify()  # Verifies the file contents (doesn't load full pixel data)
        
        # Check if the format is what we expect
        img_format = img.format.lower() if img.format else ""
        mapped_mime = f"image/{img_format}"
        if img_format == "jpeg":
            mapped_mime = "image/jpeg"
            
        if mapped_mime not in allowed_mime_types:
            return False, f"MIME type '{mapped_mime}' is not supported. Allowed: {', '.join(allowed_mime_types)}"
            
    except Exception as e:
        logger.warning(f"Image verification failed: {e}")
        return False, "The file could not be parsed as a valid image. It might be corrupted."

    return True, ""

def load_image_from_bytes(file_bytes: bytes) -> np.ndarray:
    """
    Decodes raw image bytes into an OpenCV BGR numpy array.
    
    Args:
        file_bytes: Raw bytes of the image file.
        
    Returns:
        A numpy array containing the image in BGR representation.
        
    Raises:
        ValueError: If the image cannot be decoded.
    """
    np_arr = np.frombuffer(file_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Failed to decode image. File might be corrupted or in an invalid format.")
    return image

def resize_image_simple(image: np.ndarray, max_dim: int = 640) -> np.ndarray:
    """
    Resizes an image maintaining aspect ratio so its largest dimension is `max_dim`.
    If the image is already smaller than `max_dim` in both dimensions, returns it unchanged.
    
    Args:
        image: Original OpenCV image array (H, W, C).
        max_dim: The target maximum dimension limit.
        
    Returns:
        Resized OpenCV image.
    """
    h, w = image.shape[:2]
    if max(h, w) <= max_dim:
        return image
        
    scale = max_dim / max(h, w)
    new_w = int(w * scale)
    new_h = int(h * scale)
    return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)

def draw_bounding_boxes(image: np.ndarray, detections: List[Dict[str, Any]]) -> np.ndarray:
    """
    Draws high-contrast bounding boxes, category labels, and confidence scores
    on a copy of the input image.
    
    Args:
        image: Original image array (BGR).
        detections: List of detection dictionaries, each containing:
            {
                "category": str,
                "confidence": float,
                "bbox": [x1, y1, x2, y2]
            }
            
    Returns:
        A copy of the image with annotations drawn on it.
    """
    annotated = image.copy()
    
    # Palette mapping for standard classes to make visualization clean
    colors = [
        (0, 0, 255),      # Red (pothole)
        (0, 165, 255),    # Orange (garbage)
        (255, 0, 0),      # Blue (water_leak)
        (0, 255, 255),    # Yellow (broken_streetlight)
        (255, 0, 255),    # Magenta (drainage_issue)
        (0, 255, 0),      # Green (fallen_tree)
    ]
    
    class_colors = {}
    
    for det in detections:
        category = det.get("category", "unknown")
        confidence = det.get("confidence", 0.0)
        bbox = det.get("bbox", [])
        
        if len(bbox) != 4:
            continue
            
        x1, y1, x2, y2 = map(int, bbox)
        
        # Dynamically assign a color from our palette
        if category not in class_colors:
            class_colors[category] = colors[len(class_colors) % len(colors)]
        color = class_colors[category]
        
        # 1. Draw bounding box rectangle
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
        
        # 2. Build text label string
        label = f"{category} {confidence:.2f}"
        (label_width, label_height), baseline = cv2.getTextSize(
            label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1
        )
        
        # Position the label box (default above the bbox, fallback inside if too close to top)
        label_y = max(y1, label_height + 5)
        
        # Draw background filled box for text readability
        cv2.rectangle(
            annotated, 
            (x1, label_y - label_height - 5), 
            (x1 + label_width, label_y + baseline - 5), 
            color, 
            cv2.FILLED
        )
        
        # Draw label text
        cv2.putText(
            annotated, 
            label, 
            (x1, label_y - 5), 
            cv2.FONT_HERSHEY_SIMPLEX, 
            0.5, 
            (255, 255, 255), 
            1, 
            cv2.LINE_AA
        )
        
    return annotated

def encode_image_to_bytes(image: np.ndarray, ext: str = ".jpg") -> bytes:
    """
    Encodes an OpenCV BGR image array into bytes of the specified format.
    
    Args:
        image: The image array.
        ext: File format extension, e.g., ".jpg", ".png".
        
    Returns:
        Bytes of the encoded image.
    """
    success, encoded = cv2.imencode(ext, image)
    if not success:
        raise ValueError("Failed to encode image to bytes.")
    return encoded.tobytes()
