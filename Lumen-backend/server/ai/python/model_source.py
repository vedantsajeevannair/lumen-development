"""Resolve the YOLO weights before the detector loads them.

The trained .pt is deliberately not baked into the image: it is large, it is
gitignored, and retraining should not require rebuilding the service. When the
local file is missing, fetch it once at startup from whichever source is set:

  MODEL_S3_URI  s3://bucket/key — credentials come from the AWS default provider
                chain, so an EC2 instance profile, ECS task role or EKS IRSA role
                works with no static keys.
  MODEL_URL     any https:// URL — a GitHub release asset, a Hugging Face file, a
                presigned S3 link. Needs no AWS credentials at all, which is what
                platforms without instance roles (Render, Railway, Fly) require.

MODEL_S3_URI wins when both are set, since it is the credentialed path and the
one the AWS deployment uses.
"""

import logging
import os
from typing import Callable
from urllib.parse import urlparse

logger = logging.getLogger("uvicorn.error")

# The weights are hundreds of MB; stream them rather than buffering the whole
# response in memory on a container sized for inference and nothing more.
_CHUNK_BYTES = 1024 * 1024


def ensure_model_available(local_path: str, s3_uri: str = "", url: str = "") -> str:
    """Return a path to the weights, downloading them if they are not on disk."""
    if os.path.exists(local_path):
        size_mb = os.path.getsize(local_path) / (1024 * 1024)
        logger.info(f"Using model already present at {local_path} ({size_mb:.1f} MB)")
        return local_path

    if not s3_uri and not url:
        raise FileNotFoundError(
            f"No model at '{local_path}' and neither MODEL_S3_URI nor MODEL_URL "
            "is set. Either bake the weights into the image, point MODEL_S3_URI "
            "at an s3:// object, or point MODEL_URL at an https:// copy of your "
            "trained best.pt."
        )

    # Validate the source before touching the filesystem, so a malformed URI is
    # reported as such instead of as a confusing mkdir failure.
    download = _resolve_s3(s3_uri) if s3_uri else _resolve_https(url)

    os.makedirs(os.path.dirname(local_path) or ".", exist_ok=True)
    # Download to a sidecar path and rename only on success. A crashed or
    # truncated download must never leave a partial .pt behind that the next
    # boot would then treat as a valid cached model.
    tmp_path = f"{local_path}.partial"
    download(tmp_path)

    os.replace(tmp_path, local_path)

    size_mb = os.path.getsize(local_path) / (1024 * 1024)
    logger.info(f"Model downloaded ({size_mb:.1f} MB)")
    return local_path


def _resolve_s3(s3_uri: str) -> Callable[[str], None]:
    """Validate an s3:// URI, returning a callable that fetches it to `dest`."""
    parsed = urlparse(s3_uri)
    if parsed.scheme != "s3" or not parsed.netloc:
        raise ValueError(f"MODEL_S3_URI must look like s3://bucket/key, got '{s3_uri}'")

    bucket, key = parsed.netloc, parsed.path.lstrip("/")
    if not key:
        raise ValueError(f"MODEL_S3_URI is missing an object key: '{s3_uri}'")

    def fetch(dest: str) -> None:
        try:
            import boto3
        except ImportError as e:
            raise RuntimeError("boto3 is required to download the model from S3") from e

        logger.info(f"Downloading model from {s3_uri} -> {dest}")
        boto3.client("s3").download_file(bucket, key, dest)

    return fetch


def _resolve_https(url: str) -> Callable[[str], None]:
    """Validate an https:// URL, returning a callable that fetches it to `dest`."""
    parsed = urlparse(url)
    # Plain http:// would ship the weights — and any credentials embedded in a
    # presigned URL — in the clear, so require TLS.
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError(f"MODEL_URL must be an https:// URL, got '{url}'")

    def fetch(dest: str) -> None:
        import requests

        # Log the URL without its query string: a presigned link carries its
        # credentials there, and logs are not the place for them.
        logger.info(f"Downloading model from {parsed.scheme}://{parsed.netloc}{parsed.path} -> {dest}")

        # No overall deadline: a multi-hundred-MB pull over a slow link is
        # normal. The tuple's second element caps the gap *between* chunks,
        # which is what actually separates a stalled transfer from a slow one.
        with requests.get(url, stream=True, timeout=(10, 60)) as resp:
            resp.raise_for_status()
            with open(dest, "wb") as f:
                for chunk in resp.iter_content(chunk_size=_CHUNK_BYTES):
                    f.write(chunk)

    return fetch
