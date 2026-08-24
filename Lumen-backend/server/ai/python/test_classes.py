from ultralytics import YOLO

model = YOLO("models/best.pt")
print("Model classes:", model.names)
