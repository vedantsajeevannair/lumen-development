import os
import shutil
import logging
from pathlib import Path

# Paths
BASE_DIR = r"d:\Ai-Service"
AI_DATASET_DIR = os.path.join(BASE_DIR, "Ai-Dataset")
SOURCE_DATASET_DIR = os.path.join(AI_DATASET_DIR, "trashdata_Set", "Trash Dataset_fin.v1i.yolov11")
TARGET_DATASET_DIR = os.path.join(BASE_DIR, "Garbage_Dataset")
MODELS_DIR = os.path.join(BASE_DIR, "Lumen-ai", "models")
YOLO_MODEL_SRC = os.path.join(BASE_DIR, "Lumen-ai", "yolo11n.pt")
YOLO_MODEL_DST = os.path.join(MODELS_DIR, "yolo11n.pt")

def setup_logger():
    """Configure logging for the pipeline."""
    logger = logging.getLogger("garbage_pipeline")
    logger.setLevel(logging.INFO)
    
    # Avoid duplicate handlers if already configured
    if not logger.handlers:
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        
        # File handler
        fh = logging.FileHandler("garbage_pipeline.log", mode='w')
        fh.setFormatter(formatter)
        logger.addHandler(fh)
        
        # Console handler
        ch = logging.StreamHandler()
        ch.setFormatter(formatter)
        logger.addHandler(ch)
        
    return logger

logger = setup_logger()

def is_garbage_class(class_name: str) -> bool:
    """
    Determine if a class represents municipal garbage or waste.
    """
    name_lower = class_name.lower().strip()
    
    # Explicit unrelated categories (municipal infrastructure, humans, animals, vehicles)
    unrelated_keywords = [
        'person', 'human', 'bus', 'bicycle', 'car', 'truck', 'motorbike', 
        'motorcycle', 'dog', 'cat', 'chair', 'table', 'building', 'tree', 
        'traffic light', 'road sign'
    ]
    for kw in unrelated_keywords:
        if kw in name_lower:
            return False
            
    # Garbage/waste categories
    garbage_keywords = [
        'glass', 'metal', 'can', 'plastic', 'bottle', 'paper', 'bag', 
        'food', 'cardboard', 'wrapper', 'cup', 'trash', 'garbage', 'waste'
    ]
    for kw in garbage_keywords:
        if kw in name_lower:
            return True
            
    return False

def get_next_run_version(runs_dir: str, base_name: str = "garbage_v") -> str:
    """Dynamically find the next run folder name (e.g. garbage_v1, garbage_v2)."""
    idx = 1
    while True:
        run_name = f"{base_name}{idx}"
        target_path = os.path.join(runs_dir, run_name)
        if not os.path.exists(target_path):
            return run_name
        idx += 1

def ensure_base_model():
    """Copy base model weights to models/ folder if not present."""
    os.makedirs(MODELS_DIR, exist_ok=True)
    if os.path.exists(YOLO_MODEL_SRC) and not os.path.exists(YOLO_MODEL_DST):
        logger.info(f"Copying YOLO11 model weights to {YOLO_MODEL_DST}...")
        shutil.copy2(YOLO_MODEL_SRC, YOLO_MODEL_DST)
