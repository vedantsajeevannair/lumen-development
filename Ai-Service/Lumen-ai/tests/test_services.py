import pytest
import io
import numpy as np
from PIL import Image
from utils.image_utils import (
    validate_image_metadata,
    load_image_from_bytes,
    resize_image_simple,
    draw_bounding_boxes
)

def create_dummy_image_bytes(format_name: str = "JPEG", size: tuple = (100, 100), color: tuple = (255, 0, 0)) -> bytes:
    """Helper function to create valid image bytes in memory for tests."""
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    img.save(buf, format=format_name)
    return buf.getvalue()

def test_validate_image_metadata_valid() -> None:
    """Tests image validation on a valid JPEG image."""
    file_bytes = create_dummy_image_bytes(format_name="JPEG")
    is_valid, msg = validate_image_metadata(
        file_bytes=file_bytes,
        filename="pothole_test.jpg",
        max_size_mb=2,
        allowed_mime_types=["image/jpeg", "image/png"],
        allowed_extensions=[".jpg", ".jpeg", ".png"]
    )
    assert is_valid is True
    assert msg == ""

def test_validate_image_metadata_too_large() -> None:
    """Tests file size constraint validation."""
    file_bytes = create_dummy_image_bytes()
    # Setting max_size_mb to 0.0 forces the size validation to fail
    is_valid, msg = validate_image_metadata(
        file_bytes=file_bytes,
        filename="pothole_test.jpg",
        max_size_mb=0,  # 0MB threshold
        allowed_mime_types=["image/jpeg"],
        allowed_extensions=[".jpg"]
    )
    assert is_valid is False
    assert "exceeds" in msg

def test_validate_image_metadata_invalid_extension() -> None:
    """Tests extension checking logic."""
    file_bytes = create_dummy_image_bytes()
    is_valid, msg = validate_image_metadata(
        file_bytes=file_bytes,
        filename="pothole_test.pdf",  # PDF extension not supported
        max_size_mb=5,
        allowed_mime_types=["image/jpeg"],
        allowed_extensions=[".jpg"]
    )
    assert is_valid is False
    assert "extension" in msg

def test_validate_image_metadata_corrupt() -> None:
    """Tests detection of corrupt/garbage files."""
    corrupt_bytes = b"not_an_image_file_data_stream_garbage"
    is_valid, msg = validate_image_metadata(
        file_bytes=corrupt_bytes,
        filename="corrupt_pothole.jpg",
        max_size_mb=5,
        allowed_mime_types=["image/jpeg"],
        allowed_extensions=[".jpg"]
    )
    assert is_valid is False
    assert "could not be parsed" in msg

def test_load_image_from_bytes() -> None:
    """Verifies that bytes decode successfully to OpenCV-compatible numpy arrays."""
    file_bytes = create_dummy_image_bytes()
    image = load_image_from_bytes(file_bytes)
    assert isinstance(image, np.ndarray)
    assert image.shape == (100, 100, 3)

def test_resize_image_simple() -> None:
    """Verifies scale-down resizing and aspect ratio preservation."""
    # 1. Large image scaling down
    large_img = np.zeros((1200, 800, 3), dtype=np.uint8)
    resized_large = resize_image_simple(large_img, max_dim=600)
    assert max(resized_large.shape[:2]) == 600
    assert resized_large.shape[0] == 600
    assert resized_large.shape[1] == 400  # preserves aspect ratio

    # 2. Small image (must not scale up)
    small_img = np.zeros((300, 200, 3), dtype=np.uint8)
    resized_small = resize_image_simple(small_img, max_dim=600)
    assert resized_small.shape == (300, 200, 3)

def test_draw_bounding_boxes() -> None:
    """Verifies bounding box draw functions do not crash and modify image pixels."""
    base_img = np.zeros((400, 400, 3), dtype=np.uint8)
    detections = [
        {
            "category": "pothole",
            "confidence": 0.967,
            "bbox": [50.0, 50.0, 250.0, 250.0]
        }
    ]
    annotated = draw_bounding_boxes(base_img, detections)
    assert annotated.shape == base_img.shape
    # Make sure we wrote something onto the BGR black image
    assert not np.array_equal(base_img, annotated)
