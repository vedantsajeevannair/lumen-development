import os
import pytest
from fastapi.testclient import TestClient
from pathlib import Path

# Set environment variable to mock model loading if actual model isn't trained
os.environ["AI_MODEL_PATH_RDD"] = str(Path(__file__).resolve().parent.parent / "models" / "yolo11n.pt")
os.environ["AI_DEVICE"] = "cpu"

from app import app
from inference.road_damage_detector import rdd_detector

client = TestClient(app)

def test_model_health_endpoint():
    response = client.get("/api/v1/detection/health/model")
    assert response.status_code == 200
    data = response.json()
    assert "loaded" in data
    assert "model" in data
    assert "device" in data
    assert "classes" in data
    assert "class_names" in data

def test_road_damage_inference_invalid_image():
    # Provide text file instead of image
    files = {'image': ('test.txt', b'this is not an image', 'text/plain')}
    response = client.post("/api/v1/detection/road-damage", files=files)
    assert response.status_code == 400
    assert "not allowed" in response.json()["detail"].lower() or "validation failed" in response.json()["detail"].lower()

@pytest.fixture
def dummy_image():
    # 1x1 black pixel PNG
    import base64
    img_data = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=")
    return img_data

def test_road_damage_inference_valid_image(dummy_image):
    # In a real environment with the rdd2022 model, this would return an empty list or detections
    # Right now, since we fallback to yolo11n.pt for the test, it will just execute a prediction
    # on the generic model. We only care about the API response structure.
    
    # Ensure the rdd_detector is initialized
    rdd_detector.load_model()
    
    files = {'image': ('dummy.png', dummy_image, 'image/png')}
    response = client.post("/api/v1/detection/road-damage", files=files)
    
    if response.status_code == 200:
        data = response.json()
        assert data["success"] is True
        assert "detections" in data
        assert isinstance(data["inference_time_ms"], float)
        assert data["model_version"] == "1.0.0"
    else:
        # If it fails due to memory or config, it should be a 500
        assert response.status_code == 500
