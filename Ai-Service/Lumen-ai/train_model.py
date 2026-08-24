import os
import shutil
import logging
import torch
from ultralytics import YOLO
from utils import logger, BASE_DIR, TARGET_DATASET_DIR, YOLO_MODEL_DST, ensure_base_model, get_next_run_version

def run_yolo_training() -> str:
    """
    Train YOLO11 Nano model on the generated Garbage_Dataset.
    Saves outputs to runs/detect/garbage_v1 (or increments if already exists).
    """
    logger.info("Initializing YOLO11 Nano training...")
    
    # Ensure models/yolo11n.pt exists
    ensure_base_model()
    
    if not os.path.exists(YOLO_MODEL_DST):
        logger.error(f"YOLO11 Nano base weights missing at {YOLO_MODEL_DST}")
        raise FileNotFoundError(f"Missing base weights: {YOLO_MODEL_DST}")
        
    model = YOLO(YOLO_MODEL_DST)
    
    # Resolve run directory version (e.g. garbage_v1, garbage_v2)
    runs_detect_dir = os.path.join(BASE_DIR, "Lumen-ai", "runs", "detect")
    next_run_name = get_next_run_version(runs_detect_dir, "garbage_v")
    logger.info(f"Target run name: {next_run_name}")
    
    data_yaml_path = os.path.join(TARGET_DATASET_DIR, "data.yaml")
    
    # Resolve device param
    if torch.cuda.is_available():
        device_param = '0'
        logger.info("CUDA GPU is available. Training on GPU (device='0').")
    else:
        device_param = 'cpu'
        logger.info("CUDA GPU is not available. Falling back to CPU training.")
        
    # Resolve workers based on OS (Windows must use 0 to prevent multiprocessing crashes)
    import sys
    if sys.platform == "win32":
        workers_param = 0
        logger.info("Windows detected: DataLoader workers set to 0 to prevent multiprocessing crashes.")
    else:
        workers_param = 8
        logger.info("Non-Windows OS: DataLoader workers set to 8.")
        
    # Attempt training with robust fallbacks
    success = False
    run_dir = os.path.join(runs_detect_dir, next_run_name)
    
    # Try 1: GPU batch=4
    try:
        logger.info(f"Attempting GPU training (device={device_param}) with batch=4...")
        results = model.train(
            data=data_yaml_path.replace('\\', '/'),
            epochs=35,
            imgsz=640,
            batch=4,
            device=device_param,
            cache=True,
            workers=workers_param,
            patience=20,
            project=os.path.join(BASE_DIR, "Lumen-ai", "runs", "detect").replace('\\', '/'),
            name=next_run_name,
            exist_ok=False
        )
        success = True
    except Exception as e:
        logger.warning(f"GPU training with batch=4 failed: {e}. Attempting GPU with batch=2...")
        try:
            results = model.train(
                data=data_yaml_path.replace('\\', '/'),
                epochs=35,
                imgsz=640,
                batch=2,
                device=device_param,
                cache=True,
                workers=workers_param,
                patience=20,
                project=os.path.join(BASE_DIR, "Lumen-ai", "runs", "detect").replace('\\', '/'),
                name=next_run_name,
                exist_ok=False
            )
            success = True
        except Exception as e2:
            logger.warning(f"GPU training with batch=2 failed: {e2}. Falling back to CPU training with batch=4...")
            try:
                results = model.train(
                    data=data_yaml_path.replace('\\', '/'),
                    epochs=35,
                    imgsz=640,
                    batch=4,
                    device='cpu',
                    cache=True,
                    workers=workers_param,
                    patience=20,
                    project=os.path.join(BASE_DIR, "Lumen-ai", "runs", "detect").replace('\\', '/'),
                    name=next_run_name,
                    exist_ok=False
                )
                success = True
            except Exception as e3:
                logger.warning(f"CPU training with batch=4 failed: {e3}. Trying CPU with batch=2...")
                try:
                    results = model.train(
                        data=data_yaml_path.replace('\\', '/'),
                        epochs=35,
                        imgsz=640,
                        batch=2,
                        device='cpu',
                        cache=True,
                        workers=workers_param,
                        patience=20,
                        project=os.path.join(BASE_DIR, "Lumen-ai", "runs", "detect").replace('\\', '/'),
                        name=next_run_name,
                        exist_ok=False
                    )
                    success = True
                except Exception as e4:
                    logger.error(f"CPU fallback training with batch=2 failed: {e4}")
                    raise e4

    if not success:
        raise RuntimeError("Model training failed on all attempts.")
        
    logger.info(f"Training completed. Results saved in: {run_dir}")
    return run_dir

def verify_training_outputs(run_dir: str) -> tuple[bool, list[str]]:
    """
    Verify that expected output files exist in the run directory.
    Checks: best.pt, last.pt, results.csv, confusion_matrix.png.
    """
    logger.info(f"Verifying training output files in {run_dir}...")
    errors = []
    
    expected_files = {
        "weights/best.pt": "weights/best.pt",
        "weights/last.pt": "weights/last.pt",
        "results.csv": "results.csv",
        "confusion_matrix.png": "confusion_matrix.png",
        "BoxF1_curve.png": "BoxF1_curve.png",
        "BoxP_curve.png": "BoxP_curve.png",
        "BoxPR_curve.png": "BoxPR_curve.png"
    }
    
    for user_name, yolo_name in expected_files.items():
        path = os.path.join(run_dir, yolo_name)
        if os.path.exists(path):
            logger.info(f"Verified output file: {user_name} exists.")
            # If named differently by YOLO, create a symlink or copy to match the user's naming
            if user_name != yolo_name:
                dst_path = os.path.join(run_dir, user_name)
                try:
                    if not os.path.exists(dst_path):
                        shutil.copy2(path, dst_path)
                        logger.info(f"Copied {yolo_name} to match user requested name: {user_name}")
                except Exception as e:
                    logger.warning(f"Could not copy {yolo_name} to {user_name}: {e}")
        else:
            # Let's check BoxF1_curve.png in parent if it's there
            errors.append(f"Expected file missing: {user_name} (Checked path: {path})")
            
    is_valid = len(errors) == 0
    return is_valid, errors
