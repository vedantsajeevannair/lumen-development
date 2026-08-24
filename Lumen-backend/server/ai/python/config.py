import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    MODEL_PATH: str = os.getenv("MODEL_PATH", "models/best.pt")
    # Optional S3 location of the trained weights, e.g.
    #   s3://lumen-smartcity-storage/models/best.pt
    # When set and MODEL_PATH is absent on disk, the weights are downloaded to
    # MODEL_PATH at startup. This keeps multi-hundred-MB .pt files out of the
    # container image and lets a retrained model roll out without a rebuild.
    MODEL_S3_URI: str = os.getenv("MODEL_S3_URI", "")
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
    # Shared secret the backend sends as `Authorization: Bearer <key>`. When set,
    # unauthenticated requests to the detect endpoints are rejected. Leave empty
    # only when the service is unreachable from outside the VPC/cluster.
    API_KEY: str = os.getenv("FASTAPI_API_KEY", "")
    # Comma-separated CORS origins. Default is none: only the backend calls this
    # service, and it is server-to-server, so no browser origin is needed.
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "")
    PREVENT_SSRF: bool = os.getenv("PREVENT_SSRF", "True").lower() in ("true", "1", "yes")

    # Image Quality
    BLUR_THRESHOLD: float = float(os.getenv("BLUR_THRESHOLD", "100.0"))

settings = Settings()

