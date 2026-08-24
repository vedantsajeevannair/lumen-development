import os
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "max_split_size_mb:128"

import logging
import shutil
import sys
import gc
from pathlib import Path
from datetime import datetime
import torch
import yaml
from ultralytics import YOLO
from config import settings

logger = logging.getLogger("trainer")

# Monkey-patch torch.save to be atomic to protect checkpoints from corruption
_orig_torch_save = torch.save

def _atomic_torch_save(obj, f, *args, **kwargs) -> None:
    if isinstance(f, (str, Path)):
        dest_path = Path(f)
        # Create temp file in the same directory
        temp_file = dest_path.parent / f"{dest_path.name}.tmp"
        try:
            _orig_torch_save(obj, temp_file, *args, **kwargs)
            os.replace(temp_file, dest_path)
        finally:
            if temp_file.exists():
                try:
                    temp_file.unlink()
                except Exception:
                    pass
    else:
        _orig_torch_save(obj, f, *args, **kwargs)

torch.save = _atomic_torch_save

def _safe_copy(src: Path, dst: Path) -> None:
    """Copies a file atomically by writing to a temporary file first."""
    if not src.exists():
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    temp_dst = dst.parent / f"{dst.name}.tmp"
    shutil.copy(src, temp_dst)
    os.replace(temp_dst, dst)

class TrainerService:
    """
    Manages the custom training pipeline using Ultralytics YOLO11.
    Supports checkpoint saving, automatic resuming, dynamic logging, and statistics mapping.
    """
    def __init__(self) -> None:
        self.data_yaml = Path(settings.DATASET_YAML_PATH)
        self.models_dir = Path(settings.BASE_DIR) / "models"
        self.runs_dir = Path(settings.RUNS_DIR)
        self.checkpoint_path = self.runs_dir / "train_run" / "weights" / "last.pt"
        self.log_file_path = self.runs_dir / "train_run" / "train.log"

    def _get_class_mapping_from_yaml(self) -> dict[str, int]:
        """Dynamically extract class mapping from data.yaml to avoid hardcoding."""
        try:
            with open(self.data_yaml, 'r') as f:
                data = yaml.safe_load(f)
            names = data.get('names', {})
            return {v: k for k, v in names.items()}
        except Exception:
            # Fallback to default RDD2022 mapping if file is unreadable
            return {'D40': 0, 'D00': 1, 'D10': 2, 'D20': 3}

    def _get_epochs_remaining(self, checkpoint_path: Path, target_epochs: int) -> int:
        """Parse the PyTorch checkpoint to calculate the remaining epochs."""
        try:
            ckpt = torch.load(checkpoint_path, map_location='cpu')
            epochs_done = ckpt.get('epoch', -1) + 1  # 0-indexed
            epochs_remaining = max(0, target_epochs - epochs_done)
            return epochs_remaining
        except Exception:
            return target_epochs

    def _validate_checkpoint(self, checkpoint_path: Path) -> bool:
        """
        Strictly verifies that a checkpoint contains everything needed to resume training.
        Requires: 'epoch', 'optimizer', and 'train_args'.
        """
        try:
            ckpt = torch.load(checkpoint_path, map_location='cpu')
            # Check for essential resume keys
            if 'epoch' not in ckpt or 'optimizer' not in ckpt or 'train_args' not in ckpt:
                return False
            return True
        except Exception:
            return False

    def _validate_dataset(self) -> None:
        """Verifies the dataset config and referenced train/val directories exist."""
        logger.info(f"Dataset path: {self.data_yaml.resolve()}")
        
        if not self.data_yaml.exists():
            raise FileNotFoundError(
                f"Dataset configuration file not found at: {self.data_yaml}. "
                f"Please run prepare_dataset.py first."
            )
            
        try:
            with open(self.data_yaml, 'r') as f:
                data = yaml.safe_load(f)
                
            dataset_dir = self.data_yaml.parent
            train_path = data.get('train', '')
            val_path = data.get('val', '')
            
            # Ultralytics resolves relative paths to the yaml file location
            train_dir = (dataset_dir / train_path).resolve()
            val_dir = (dataset_dir / val_path).resolve()
            
            if not train_dir.exists():
                raise FileNotFoundError(f"Train directory specified in data.yaml does not exist: {train_dir}")
            if not val_dir.exists():
                raise FileNotFoundError(f"Validation directory specified in data.yaml does not exist: {val_dir}")
                
        except yaml.YAMLError as e:
            raise RuntimeError(f"Failed to parse {self.data_yaml}: {e}")

    def _count_dataset_images(self) -> tuple[int, int]:
        """Count training and validation images dynamically from YAML config."""
        train_count = 0
        val_count = 0
        try:
            if self.data_yaml.exists():
                with open(self.data_yaml, 'r') as f:
                    data = yaml.safe_load(f)
                dataset_dir = self.data_yaml.parent
                train_path = dataset_dir / data.get('train', 'images/train')
                val_path = dataset_dir / data.get('val', 'images/val')
                
                extensions = {'.jpg', '.jpeg', '.png', '.webp'}
                if train_path.exists():
                    train_count = sum(1 for p in train_path.iterdir() if p.suffix.lower() in extensions)
                if val_path.exists():
                    val_count = sum(1 for p in val_path.iterdir() if p.suffix.lower() in extensions)
        except Exception as e:
            logger.warning(f"Failed to count dataset images: {e}")
        return train_count, val_count

    def _sync_to_google_drive(self) -> None:
        """Helper to sync training weights, logs, and plots to Google Drive in real-time."""
        drive_checkpoints_dir = Path("/content/drive/MyDrive/LUMEN/checkpoints")
        if not drive_checkpoints_dir.exists():
            try:
                drive_checkpoints_dir.mkdir(parents=True, exist_ok=True)
            except Exception:
                return  # Not running in Colab or Drive not mounted
                
        run_dir = self.runs_dir / "train_run"
        weights_dir = run_dir / "weights"
        
        files_to_sync = {
            weights_dir / "last.pt": drive_checkpoints_dir / "last.pt",
            weights_dir / "best.pt": drive_checkpoints_dir / "best.pt",
            run_dir / "train.log": drive_checkpoints_dir / "train.log",
            run_dir / "results.png": drive_checkpoints_dir / "results.png",
            run_dir / "confusion_matrix.png": drive_checkpoints_dir / "confusion_matrix.png",
            run_dir / "results.csv": drive_checkpoints_dir / "metrics.csv",
        }
        
        for local_file, drive_file in files_to_sync.items():
            if local_file.exists():
                try:
                    temp_drive_file = drive_file.parent / f"{drive_file.name}.tmp"
                    shutil.copy(local_file, temp_drive_file)
                    os.replace(temp_drive_file, drive_file)
                except Exception as e:
                    logger.warning(f"Failed to sync {local_file.name} to Google Drive: {e}")

    def _setup_custom_callbacks(self, model: YOLO) -> None:
        """Setup callbacks to log training progress to train.log on every epoch."""
        def on_train_epoch_end(trainer) -> None:
            try:
                epoch = trainer.epoch + 1
                loss_dict = trainer.loss_items
                loss_str = " ".join([f"{k}: {v:.4f}" for k, v in zip(trainer.loss_names, loss_dict)])
                
                metrics_str = ""
                if hasattr(trainer, 'validator') and hasattr(trainer.validator, 'metrics'):
                    val_metrics = trainer.validator.metrics
                    mAP50 = val_metrics.get('metrics/mAP50(B)', 0.0) if hasattr(val_metrics, 'get') else getattr(val_metrics, 'map50', 0.0)
                    mAP95 = val_metrics.get('metrics/mAP50-95(B)', 0.0) if hasattr(val_metrics, 'get') else getattr(val_metrics, 'map95', 0.0)
                    metrics_str = f" | Validation - mAP50: {mAP50:.4f}, mAP50-95: {mAP95:.4f}"
                    
                log_msg = f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Epoch {epoch}/{trainer.epochs} - {loss_str}{metrics_str}\n"
                
                if torch.cuda.is_available():
                    reserved = torch.cuda.memory_reserved(0)
                    allocated = torch.cuda.memory_allocated(0)
                    free, total = torch.cuda.mem_get_info(0)
                    mem_msg = f"GPU Reserved: {reserved / (1024**2):.2f} MB | GPU Allocated: {allocated / (1024**2):.2f} MB | GPU Free: {free / (1024**2):.2f} MB"
                    logger.info(f"GPU Reserved: {reserved / (1024**2):.2f} MB")
                    logger.info(f"GPU Allocated: {allocated / (1024**2):.2f} MB")
                    logger.info(f"GPU Free: {free / (1024**2):.2f} MB")
                    log_msg += f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {mem_msg}\n"
                
                with open(self.log_file_path, 'a') as f:
                    f.write(log_msg)
                # Sync updated metrics/checkpoints to Google Drive in real-time
                self._sync_to_google_drive()
            except Exception as e:
                try:
                    with open(self.log_file_path, 'a') as f:
                        f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Error writing epoch metrics: {e}\n")
                except Exception:
                    pass
        model.add_callback('on_train_epoch_end', on_train_epoch_end)

    def train_model(
        self, 
        epochs: int | None = None, 
        batch_size: int | None = None, 
        imgsz: int | None = None,
        resume: bool = False,
        auto_resume: bool = False
    ) -> Path:
        """
        Runs YOLO11 model training on the custom dataset with support for resuming.
        """
        epochs = epochs or settings.EPOCHS
        batch_size = batch_size or settings.BATCH_SIZE
        imgsz = imgsz or settings.IMAGE_SIZE
        device = settings.get_device()

        # 1. Validate dataset strictly
        self._validate_dataset()

        # 2. Determine Resume Status & Validate Checkpoint
        checkpoint_exists = self.checkpoint_path.exists()
        is_resume = False

        if resume:
            if not checkpoint_exists:
                raise FileNotFoundError(
                    f"Resume requested but no checkpoint found at: {self.checkpoint_path}"
                )
            is_resume = True
        elif auto_resume:
            is_resume = checkpoint_exists

        if is_resume:
            if not self._validate_checkpoint(self.checkpoint_path):
                logger.warning(f"Checkpoint at {self.checkpoint_path} is invalid/corrupted. Starting fresh automatically.")
                is_resume = False

        # 3. Determine Workers (Always use 0 on Windows, 2-4 on Colab/Linux)
        if sys.platform == "win32":
            workers = 0
            logger.info("Windows detected: DataLoader workers forced to 0 to prevent multiprocessing crashes.")
        else:
            import os
            num_cpus = os.cpu_count() or 2
            workers = min(settings.WORKERS, max(2, num_cpus))
            workers = min(4, workers)  # Cap workers at 4 for Colab training stability
            logger.info(f"DataLoader workers set to {workers} (CPUs: {num_cpus}).")

        # Create log folder before starting
        self.log_file_path.parent.mkdir(parents=True, exist_ok=True)

        # Get GPU configuration stats
        gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "None (CPU)"
        cuda_status = "Available" if torch.cuda.is_available() else "Unavailable"
        if torch.cuda.is_available():
            vram_total = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
            vram_str = f"{round(vram_total)} GB"
        else:
            vram_str = "N/A"

        train_count, val_count = self._count_dataset_images()

        current_batch_size = batch_size
        attempt_resume = is_resume

        while current_batch_size >= 1:
            checkpoint_exists = self.checkpoint_path.exists()
            actual_resume = False
            if attempt_resume or checkpoint_exists:
                if self._validate_checkpoint(self.checkpoint_path):
                    actual_resume = True
                else:
                    logger.warning(f"Checkpoint at {self.checkpoint_path} is invalid/corrupted. Restarting fresh.")
                    actual_resume = False

            if actual_resume:
                try:
                    logger.info(f"Loading checkpoint for resume: {self.checkpoint_path}")
                    model = YOLO(str(self.checkpoint_path))
                except Exception as e:
                    logger.error(f"Failed to load checkpoint {self.checkpoint_path}: {e}. Starting fresh.")
                    model = YOLO("yolo11n.pt")
                    actual_resume = False
            else:
                try:
                    logger.info("Loading base model: yolo11n.pt")
                    model = YOLO("yolo11n.pt")
                except Exception as e:
                    raise RuntimeError(f"Base model loading failed: {e}")

            # Setup custom callback logging
            self._setup_custom_callbacks(model)

            # Register extra cache callbacks
            def on_train_epoch_start(trainer) -> None:
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()

            def on_val_end(validator) -> None:
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                self._sync_to_google_drive()

            def on_train_end(trainer) -> None:
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                self._sync_to_google_drive()

            model.add_callback('on_train_epoch_start', on_train_epoch_start)
            model.add_callback('on_val_end', on_val_end)
            model.add_callback('on_train_end', on_train_end)

            epochs_remaining = epochs
            if actual_resume:
                epochs_remaining = self._get_epochs_remaining(self.checkpoint_path, epochs)

            # Print Startup Summary
            startup_summary = f"""
======================================
LUMEN AI TRAINING
======================================
GPU: {gpu_name}
CUDA: {cuda_status}
VRAM: {vram_str}

Dataset:
{train_count} train
{val_count} val

Batch:
{current_batch_size}

Workers:
{workers}

Cache:
Disabled

AMP:
Enabled

Resume:
{actual_resume}

======================================
"""
            logger.info(startup_summary.strip())

            # Write training start information to train.log
            start_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            try:
                from dataset_tools.statistics import get_stats_summary
                stats_str = get_stats_summary(self.data_yaml.parent, self._get_class_mapping_from_yaml())
            except Exception as e:
                stats_str = f"Failed to gather dataset statistics: {e}"

            with open(self.log_file_path, 'a') as f:
                f.write("=" * 51 + "\n")
                f.write("             LUMEN AI - TRAINING LOG\n")
                f.write("=" * 51 + "\n")
                f.write(f"Training Start/Restart Time: {start_time}\n")
                f.write(f"Resume Status:               {'Resumed' if actual_resume else 'Fresh Training'}\n")
                f.write(f"GPU:                         {gpu_name}\n")
                f.write(f"Device Config:               {device}\n")
                f.write(f"Target Epochs:               {epochs}\n")
                f.write(f"Epochs Remaining:            {epochs_remaining}\n")
                f.write(f"Batch Size:                  {current_batch_size}\n")
                f.write(f"Image Size:                  {imgsz}\n")
                f.write("-" * 51 + "\n")
                f.write("DATASET STATISTICS\n")
                f.write(stats_str)
                f.write("-" * 51 + "\n")
                f.write("TRAINING PROGRESS\n")

            # Try training up to two times for the current batch size
            successful = False
            err_msg = ""
            for attempt in range(2):
                try:
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                        torch.cuda.reset_peak_memory_stats()

                    results = model.train(
                        data=str(self.data_yaml.resolve()),
                        epochs=epochs,
                        batch=current_batch_size,
                        imgsz=imgsz,
                        device=device,
                        project=str(self.runs_dir.resolve()),
                        name="train_run",
                        exist_ok=True,
                        resume=actual_resume,
                        workers=workers,
                        amp=True,
                        cache=False,
                        deterministic=True,
                    )
                    successful = True
                    break  # Success! Break the attempt loop.
                except RuntimeError as e:
                    err_msg = str(e)
                    if "CUDA out of memory" in err_msg:
                        logger.warning(
                            f"CUDA out of memory on attempt {attempt + 1}/2 with batch size {current_batch_size}."
                        )
                        if torch.cuda.is_available():
                            torch.cuda.empty_cache()
                        gc.collect()

                        if attempt == 0:
                            logger.info("Retrying ONE time with cleared cache and garbage collection...")
                            continue
                        else:
                            logger.error("Retry also failed with CUDA out of memory.")
                            break
                    else:
                        raise e
                finally:
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()

            if successful:
                break  # Break out of the batch size reduction loop

            # If we are here, both attempts failed. Reduce batch size.
            if current_batch_size > 1:
                next_batch_size = current_batch_size // 2
                if next_batch_size < 1:
                    next_batch_size = 1
                logger.info(f"Reducing batch size from {current_batch_size} to {next_batch_size} and restarting training.")
                current_batch_size = next_batch_size
                attempt_resume = True  # Try resuming from the last valid checkpoint on restart
            else:
                raise RuntimeError(
                    f"CUDA out of memory during training even with batch size 1: {err_msg}"
                )

        # 8. Post-training directory validation
        if (self.runs_dir.parent / "detect").exists() or (Path("runs/detect").exists()):
            logger.critical("Ultralytics attempted to fallback and created a 'detect' directory. Training configuration failed.")
            raise RuntimeError("CRITICAL: Training incorrectly fell back to default behavior. Check dataset paths.")

        # 9. Training Completion Logs
        end_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        run_weights_dir = self.runs_dir / "train_run" / "weights"
        best_run_weights = run_weights_dir / "best.pt"
        last_run_weights = run_weights_dir / "last.pt"

        # Verify training exported model weights
        if not best_run_weights.exists():
            raise FileNotFoundError(
                f"Training finished but could not locate model weights at: {best_run_weights}"
            )

        # Copy models to core weights folder
        self.models_dir.mkdir(parents=True, exist_ok=True)
        _safe_copy(best_run_weights, self.models_dir / "best.pt")
        if last_run_weights.exists():
            _safe_copy(last_run_weights, self.models_dir / "last.pt")
        
        # Perform a final sync to Google Drive
        self._sync_to_google_drive()

        # Write training completion metadata to train.log
        with open(self.log_file_path, 'a') as f:
            f.write("-" * 51 + "\n")
            f.write("TRAINING COMPLETED\n")
            f.write(f"Training Completion Time: {end_time}\n")
            f.write(f"Best Model Weight:        {best_run_weights}\n")
            f.write(f"Last Checkpoint Weight:   {last_run_weights}\n")
            f.write("=" * 51 + "\n")

        # 10. Print Completion Header using standard logger.info
        logger.info("\n" + "=" * 51)
        logger.info("Training completed successfully.")
        logger.info(f"Best model:\nruns/train_run/weights/best.pt\n")
        logger.info(f"Last Checkpoint:\nruns/train_run/weights/last.pt\n")
        logger.info(f"Results:\nruns/train_run/results.png\n")
        logger.info(f"Confusion Matrix:\nruns/train_run/confusion_matrix.png")
        logger.info("=" * 51)

        return self.runs_dir / "train_run"
