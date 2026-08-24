import sys
from ultralytics import YOLO
import numpy as np
from PIL import Image

sys.path.append('.')
from postprocess import format_single_prediction

model = YOLO('models/best.pt')

try:
    pil_img = Image.open('test_latest.jpg').convert('RGB')
    img = np.array(pil_img)
except Exception as e:
    print(f"Failed to load image: {e}")
    sys.exit(1)

# Run inference with conf=0.60 as configured in config.py
results = model.predict(source=img, conf=0.60)

output = format_single_prediction(results[0], model.names)

import json
print(json.dumps(output, indent=2))
