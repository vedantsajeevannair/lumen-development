from PIL import Image
import numpy as np
import sys
from ultralytics import YOLO

model = YOLO('models/best.pt')

# Load image
img_path = sys.argv[1]
try:
    pil_img = Image.open(img_path).convert('RGB')
    img = np.array(pil_img)
except Exception as e:
    print(f"Failed to load image at {img_path}: {e}")
    sys.exit(1)

# Run inference
results_list = list(model.predict(source=img, conf=0.1))
result = results_list[0]

print(f"Detected {len(result.boxes)} boxes")
for box in result.boxes:
    print(f"Class: {model.names[int(box.cls[0])]}, Conf: {float(box.conf[0])}")
