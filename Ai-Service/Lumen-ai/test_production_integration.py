import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add current directory to path so we can import app
sys.path.append(str(Path(__file__).resolve().parent))

from app import app
import json

client = TestClient(app)

def test_integration():
    print("Running production integration test on rdd2022_best.pt...")
    
    # We will use the test image we copied locally
    test_image_path = str(Path(__file__).resolve().parent / "test_image.jpg")
    
    # Payload matching NestJS ai.service.ts
    payload = {
        "url": test_image_path
    }
    
    response = client.post("/detect/image", json=payload)
    
    print(f"Status Code: {response.status_code}")
    if response.status_code != 200:
        print("Response:", response.text)
        return
        
    data = response.json()
    print("Response JSON:")
    print(json.dumps(data, indent=2))
    
    assert data["damageClass"] in ["D40", "UNKNOWN"], "Expected damageClass to be recognized"
    
    print("\n✅ End-to-End FastAPI integration test passed!")

if __name__ == "__main__":
    test_integration()
