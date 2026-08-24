from ultralytics import YOLO
import requests
from PIL import Image
from io import BytesIO

url = "https://lumen-smartcity-storage.s3.ap-south-1.amazonaws.com/complaints/images/2026/08/18/5febbbc8-55f2-4ecf-9402-b6ac45f4c3ba.jpeg"
response = requests.get(url)
img = Image.open(BytesIO(response.content)).convert("RGB")

model = YOLO("models/best.pt")
results = model.predict(source=img, conf=0.1)

res = results[0]  # type: ignore
print("Number of boxes:", len(res.boxes))  # type: ignore
if len(res.boxes) > 0:  # type: ignore
    for box in res.boxes:  # type: ignore
        print(f"Conf: {box.conf[0].item():.4f}, Class: {model.names[int(box.cls[0].item())]}")
else:
    print("NO BOXES DETECTED!")
