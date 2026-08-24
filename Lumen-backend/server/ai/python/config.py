import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    MODEL_PATH: str = os.getenv("MODEL_PATH", "models/best.pt")
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.60"))
    DEVICE: str = os.getenv("DEVICE", "")  # leave empty for auto-detect (cuda if available, else cpu)
    VIDEO_SAMPLE_RATE: int = int(os.getenv("VIDEO_SAMPLE_RATE", "1"))  # Extract 1 frame per second
    
    # Redesign parameters
    MAX_BATCH_SIZE: int = int(os.getenv("MAX_BATCH_SIZE", "16"))
    BATCH_TIMEOUT_MS: int = int(os.getenv("BATCH_TIMEOUT_MS", "10"))
    MAX_QUEUE_SIZE: int = int(os.getenv("MAX_QUEUE_SIZE", "500"))
    TORCH_NUM_THREADS: int = int(os.getenv("TORCH_NUM_THREADS", "4"))
    
    # Download limits
    MAX_IMAGE_SIZE_BYTES: int = int(os.getenv("MAX_IMAGE_SIZE_BYTES", "10485760"))  # Default 10MB
    MAX_VIDEO_SIZE_BYTES: int = int(os.getenv("MAX_VIDEO_SIZE_BYTES", "52428800"))  # Default 50MB
    MAX_VIDEO_FRAMES: int = int(os.getenv("MAX_VIDEO_FRAMES", "100"))  # Cap at 100 frames
    DOWNLOAD_TIMEOUT: int = int(os.getenv("DOWNLOAD_TIMEOUT", "15"))  # Timeout in seconds
    
    # Security
    PREVENT_SSRF: bool = os.getenv("PREVENT_SSRF", "True").lower() in ("true", "1", "yes")

    # Image Quality
    BLUR_THRESHOLD: float = float(os.getenv("BLUR_THRESHOLD", "100.0"))

settings = Settings()

