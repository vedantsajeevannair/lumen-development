"""Resolve the YOLO weights before the detector loads them.

The trained .pt is deliberately not baked into the image: it is large, it is
gitignored, and retraining should not require rebuilding the service. When
MODEL_S3_URI is set and the local file is missing, fetch it once at startup.

Credentials come from the AWS default provider chain, so an EC2 instance
profile, ECS task role or EKS IRSA role works with no static keys.
"""

import logging
import os
from urllib.parse import urlparse

logger = logging.getLogger("uvicorn.error")


def ensure_model_available(local_path: str, s3_uri: str = "") -> str:
    """Return a path to the weights, downloading from S3 if needed."""
    if os.path.exists(local_path):
        size_mb = os.path.getsize(local_path) / (1024 * 1024)
        logger.info(f"Using model already present at {local_path} ({size_mb:.1f} MB)")
        return local_path

    if not s3_uri:
        raise FileNotFoundError(
            f"No model at '{local_path}' and MODEL_S3_URI is not set. "
            "Either bake the weights into the image or point MODEL_S3_URI at "
            "an s3:// object holding your trained best.pt."
        )

    parsed = urlparse(s3_uri)
    if parsed.scheme != "s3" or not parsed.netloc:
        raise ValueError(f"MODEL_S3_URI must look like s3://bucket/key, got '{s3_uri}'")

    bucket, key = parsed.netloc, parsed.path.lstrip("/")
    if not key:
        raise ValueError(f"MODEL_S3_URI is missing an object key: '{s3_uri}'")

    try:
        import boto3
    except ImportError as e:
        raise RuntimeError("boto3 is required to download the model from S3") from e

    os.makedirs(os.path.dirname(local_path) or ".", exist_ok=True)
    logger.info(f"Downloading model from {s3_uri} -> {local_path}")

    tmp_path = f"{local_path}.partial"
    boto3.client("s3").download_file(bucket, key, tmp_path)
    # Atomic move so a crashed download never leaves a truncated .pt behind
    # that would then be treated as a valid cached model on the next boot.
    os.replace(tmp_path, local_path)

    size_mb = os.path.getsize(local_path) / (1024 * 1024)
    logger.info(f"Model downloaded ({size_mb:.1f} MB)")
    return local_path
