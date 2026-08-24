import os
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "max_split_size_mb:128"
import logging
from pathlib import Path
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
import torch

# Configure basic logging for settings loading
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("config")

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables and an optional .env file.
    Follows 12-factor app design patterns and structures settings with Pydantic.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    # Base Directory
    BASE_DIR: Path = Path(__file__).resolve().parent

    # Configuration paths
    MODEL_PATH: Path = Field(default_factory=lambda: Path(__file__).resolve().parent / "runs" / "train_run" / "weights" / "best.pt")
    DATASET_YAML_PATH: Path = Field(default_factory=lambda: Path(__file__).resolve().parent / "dataset" / "data.yaml")
    RUNS_DIR: Path = Field(default_factory=lambda: Path(__file__).resolve().parent / "runs")
    UPLOAD_FOLDER: Path = Field(default_factory=lambda: Path(__file__).resolve().parent / "uploads")
    PREDICTION_FOLDER: Path = Field(default_factory=lambda: Path(__file__).resolve().parent / "predictions")
    LOG_DIR: Path = Field(default_factory=lambda: Path(__file__).resolve().parent / "logs")

    # Hyperparameters & Inference Config
    CONFIDENCE_THRESHOLD: float = Field(
        default=0.25, 
        description="Confidence threshold for YOLO predictions (0.0 to 1.0)"
    )
    IMAGE_SIZE: int = Field(
        default=640, 
        description="Standard image resolution for YOLO training and inference"
    )
    BATCH_SIZE: int = Field(
        default=4, 
        description="Training batch size"
    )
    EPOCHS: int = Field(
        default=50, 
        description="Number of training epochs"
    )
    WORKERS: int = Field(
        default=0 if os.name == 'nt' else 8,
        description="Number of workers for DataLoader"
    )
    
    # Device configuration
    DEVICE: str = Field(
        default="auto", 
        description="Compute device: 'cpu', 'cuda', 'mps' or 'auto'"
    )

    # FastAPI parameters
    HOST: str = Field(default="0.0.0.0", description="IP address to bind the API server")
    PORT: int = Field(default=8000, description="Port to bind the API server")
    LOG_LEVEL: str = Field(default="INFO", description="Logging level (DEBUG, INFO, WARNING, ERROR)")

    # Image upload constraints
    MAX_IMAGE_SIZE_MB: int = Field(
        default=10, 
        description="Maximum allowed uploaded image size in megabytes"
    )
    ALLOWED_EXTENSIONS: List[str] = Field(
        default=[".jpg", ".jpeg", ".png", ".webp"],
        description="Allowed file extensions for image upload"
    )
    ALLOWED_MIME_TYPES: List[str] = Field(
        default=["image/jpeg", "image/png", "image/webp"],
        description="Allowed MIME types for image upload"
    )

    def get_device(self) -> str:
        """
        Resolves the compute device, mapping 'auto' to the best available GPU, 
        otherwise defaulting to 'cpu'.
        """
        device = self.DEVICE.lower()
        if device == "auto":
            if torch.cuda.is_available():
                resolved = "cuda"
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                resolved = "mps"
            else:
                resolved = "cpu"
            logger.info(f"Auto-detected compute device: {resolved}")
            return resolved
        return device

# Instantiate settings singleton
settings = Settings()
