import argparse
import sys
import logging
import torch
from services.trainer import TrainerService
from config import settings

# Configure console logger for training feedback
logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("train_cli")

def main() -> None:
    """CLI entry point for running custom YOLO11 model training with resume capabilities."""
    parser = argparse.ArgumentParser(
        description="LUMEN Smart City CV Platform - Model Training CLI Utility",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    parser.add_argument(
        "--epochs", 
        type=int, 
        default=settings.EPOCHS, 
        help="Number of epochs to train the custom YOLO11 model"
    )
    parser.add_argument(
        "--batch", 
        type=int, 
        default=settings.BATCH_SIZE, 
        help="Batch size for gradient descent steps"
    )
    parser.add_argument(
        "--imgsz", 
        type=int, 
        default=settings.IMAGE_SIZE, 
        help="Input resolution size (square dimension)"
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume training from the last checkpoint (runs/train_run/weights/last.pt)"
    )
    parser.add_argument(
        "--auto-resume",
        action="store_true",
        help="Automatically resume training if a previous checkpoint exists, otherwise start fresh"
    )
    
    args = parser.parse_args()
    
    logger.info("Booting up LUMEN custom trainer pipeline...")
    
    # Check GPU availability if device is configured for GPU
    configured_device = settings.DEVICE.lower()
    if configured_device == "cuda" or (configured_device == "auto" and "cuda" in settings.get_device()):
        if not torch.cuda.is_available():
            logger.warning("===================================================")
            logger.warning("WARNING: CUDA GPU requested or expected but unavailable!")
            logger.warning("Falling back to CPU execution. Training will be extremely slow.")
            logger.warning("===================================================")
            
    trainer = TrainerService()
    
    try:
        # Run training loop using configured overrides and resume flags
        run_artifacts_dir = trainer.train_model(
            epochs=args.epochs,
            batch_size=args.batch,
            imgsz=args.imgsz,
            resume=args.resume,
            auto_resume=args.auto_resume
        )
        logger.info(f"Training session artifacts are stored under: {run_artifacts_dir}")
        
    except FileNotFoundError as e:
        error_msg = str(e)
        if "Resume requested but no checkpoint found" in error_msg:
            logger.error("===================================================")
            logger.error("CRITICAL ERROR: CHECKPOINT MISSING")
            logger.error(error_msg)
            logger.error("Please run without --resume to start a fresh training.")
            logger.error("===================================================")
        elif "Dataset configuration file not found" in error_msg:
            logger.error("===================================================")
            logger.error("CRITICAL ERROR: DATASET CONFIGURATION MISSING")
            logger.error(error_msg)
            logger.error("Please run dataset_tools/prepare_dataset.py before training.")
            logger.error("===================================================")
        else:
            logger.error(f"File not found during training setup: {error_msg}")
        sys.exit(1)
        
    except RuntimeError as e:
        error_msg = str(e)
        if "Checkpoint corrupted" in error_msg:
            logger.error("===================================================")
            logger.error("CRITICAL ERROR: CORRUPTED CHECKPOINT")
            logger.error(error_msg)
            logger.error("The checkpoint file is damaged or incomplete. Please delete runs/train_run and start a fresh session.")
            logger.error("===================================================")
        elif "CUDA out of memory" in error_msg:
            logger.error("===================================================")
            logger.error("CRITICAL ERROR: CUDA OUT OF MEMORY (OOM)")
            logger.error(error_msg)
            logger.error("Your GPU has run out of VRAM. Try reducing your batch size using --batch (e.g., --batch 8 or --batch 4).")
            logger.error("===================================================")
        else:
            logger.error("===================================================")
            logger.error(f"CRITICAL RUNTIME ERROR: {error_msg}")
            logger.error("===================================================")
        sys.exit(1)
        
    except KeyboardInterrupt:
        logger.warning("\n===================================================")
        logger.warning("TRAINING INTERRUPTED BY USER (Ctrl+C)")
        logger.warning("Your training progress up to the last completed epoch has been saved.")
        logger.warning("You can resume training later using: python train.py --resume")
        logger.warning("===================================================")
        sys.exit(130)
        
    except Exception as e:
        logger.error("===================================================")
        logger.error(f"UNEXPECTED EXCEPTION DURING TRAINING: {e}", exc_info=True)
        logger.error("===================================================")
        sys.exit(1)

if __name__ == "__main__":
    main()
