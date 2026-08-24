import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app import app
from routes.detection import predictor_service
from services.detector import ModelNotFoundError
from tests.test_services import create_dummy_image_bytes

client = TestClient(app)

def test_read_root() -> None:
    """Verifies that the root URL returns API info."""
    response = client.get("/")
    assert response.status_code == 200
    json_data = response.json()
    assert "status" in json_data
    assert json_data["status"] == "online"
    assert "documentation" in json_data

def test_health_check_unloaded() -> None:
    """Verifies service health behavior when model weights are not loaded."""
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    # By default, since best.pt is missing, model_loaded should be false
    assert json_data["model_loaded"] is False

def test_classes_fallback() -> None:
    """Verifies the classes endpoint works even when model weights are missing by falling back."""
    response = client.get("/classes")
    assert response.status_code == 200
    json_data = response.json()
    assert "classes" in json_data
    # Must list all 6 core issues
    assert len(json_data["classes"]) == 6
    assert "pothole" in json_data["classes"]
    assert "garbage" in json_data["classes"]

def test_model_info() -> None:
    """Verifies configurations and status fields are returned correctly."""
    response = client.get("/model-info")
    assert response.status_code == 200
    json_data = response.json()
    assert "model_path" in json_data
    assert json_data["is_loaded"] is False

def test_detect_missing_model() -> None:
    """Verifies that image upload returns 503 Service Unavailable if best.pt is not trained/present."""
    img_bytes = create_dummy_image_bytes()
    files = {"file": ("test.jpg", img_bytes, "image/jpeg")}
    response = client.post("/detect", files=files)
    assert response.status_code == 503
    assert "best.pt" in response.json()["detail"]

def test_detect_corrupt_image() -> None:
    """Verifies that sending a corrupted file returns a clean 400 Bad Request."""
    files = {"file": ("corrupt.jpg", b"corrupted_binary_data_here", "image/jpeg")}
    response = client.post("/detect", files=files)
    assert response.status_code == 400
    assert "could not be parsed" in response.json()["detail"]

@patch("services.detector.DetectorService.detect")
@patch("services.detector.DetectorService.load_model")
@patch("services.detector.DetectorService.is_loaded")
def test_detect_success_mock(
    mock_is_loaded: MagicMock, 
    mock_load_model: MagicMock, 
    mock_detect: MagicMock
) -> None:
    """Verifies the success path of POST /detect using mock detection data."""
    # Configure mock returns
    mock_is_loaded.return_value = True
    mock_load_model.return_value = MagicMock()
    mock_detect.return_value = [
        {
            "category": "pothole", 
            "confidence": 0.9824, 
            "bbox": [120.4, 150.2, 420.1, 500.5]
        }
    ]
    
    img_bytes = create_dummy_image_bytes()
    files = {"file": ("pothole_input.jpg", img_bytes, "image/jpeg")}
    
    response = client.post("/detect", files=files)
    assert response.status_code == 200
    
    json_data = response.json()
    assert json_data["success"] is True
    assert json_data["filename"] == "pothole_input.jpg"
    assert len(json_data["detections"]) == 1
    
    detection = json_data["detections"][0]
    assert detection["category"] == "pothole"
    assert detection["confidence"] == 0.9824
    assert detection["bbox"] == [120.4, 150.2, 420.1, 500.5]
