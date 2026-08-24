import asyncio
import socket
import ipaddress
import logging
import tempfile
import os
import httpx
import cv2
import numpy as np
from io import BytesIO
from PIL import Image
from urllib.parse import urlparse
from config import settings

logger = logging.getLogger("uvicorn.error")

def calculate_blur_score(image: np.ndarray) -> float:
    """
    Calculates the variance of the Laplacian to determine the blurriness of an image.
    Lower score means more blurry.
    """
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    score = cv2.Laplacian(gray, cv2.CV_64F).var()
    return float(score)
def is_safe_url(url: str) -> bool:
    """
    SSRF validation logic: Parse hostname from URL and resolve to IP.
    Reject if the IP is private, loopback, or link-local.
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            logger.warning(f"SSRF Check: Rejected URL {url} due to unsupported scheme: {parsed.scheme}")
            return False
        
        hostname = parsed.hostname
        if not hostname:
            logger.warning(f"SSRF Check: Rejected URL {url} due to missing hostname")
            return False
            
        # Resolve hostname to IP addresses
        ip_strs = socket.getaddrinfo(hostname, None)
        for _, _, _, _, sockaddr in ip_strs:
            ip_str = sockaddr[0]
            ip = ipaddress.ip_address(ip_str)
            if ip.is_private or ip.is_loopback or ip.is_link_local:
                logger.warning(f"SSRF Check: Rejected URL {url} as it resolves to a private/local IP: {ip_str}")
                return False
        return True
    except Exception as e:
        logger.error(f"SSRF Check: Exception during validation of URL {url}: {e}")
        return False

async def download_image_async(url: str) -> np.ndarray:
    """
    Asynchronously download an image with SSRF protection and a hard limit on download size.
    """
    if settings.PREVENT_SSRF and not is_safe_url(url):
        raise ValueError("Security Violation: Target URL is not allowed.")
        
    limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
    async with httpx.AsyncClient(limits=limits, timeout=settings.DOWNLOAD_TIMEOUT) as client:
        async with client.stream("GET", url) as response:
            response.raise_for_status()
            
            # 1. Size Validation via headers
            content_length = response.headers.get("Content-Length")
            if content_length and int(content_length) > settings.MAX_IMAGE_SIZE_BYTES:
                raise ValueError(f"Content-Length {content_length} exceeds maximum limit of {settings.MAX_IMAGE_SIZE_BYTES} bytes.")
                
            # 2. Size Validation during chunk download
            bytes_buffer = BytesIO()
            total_bytes = 0
            async for chunk in response.aiter_bytes(chunk_size=16384):
                bytes_buffer.write(chunk)
                total_bytes += len(chunk)
                if total_bytes > settings.MAX_IMAGE_SIZE_BYTES:
                    raise ValueError(f"Downloaded content exceeds maximum limit of {settings.MAX_IMAGE_SIZE_BYTES} bytes.")
            
            bytes_buffer.seek(0)
            image = Image.open(bytes_buffer).convert("RGB")
            logger.info("Image downloaded")
            return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

async def download_video_frames_async(url: str, frames_per_second: int = 1) -> list[np.ndarray]:
    """
    Asynchronously stream and write a video to disk, then extract frames
    with downsampling to avoid excessive memory usage.
    """
    if settings.PREVENT_SSRF and not is_safe_url(url):
        raise ValueError("Security Violation: Target URL is not allowed.")
        
    temp_file_path = None
    try:
        limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
        async with httpx.AsyncClient(limits=limits, timeout=settings.DOWNLOAD_TIMEOUT) as client:
            async with client.stream("GET", url) as response:
                response.raise_for_status()
                
                content_length = response.headers.get("Content-Length")
                if content_length and int(content_length) > settings.MAX_VIDEO_SIZE_BYTES:
                    raise ValueError(f"Video Content-Length {content_length} exceeds maximum limit of {settings.MAX_VIDEO_SIZE_BYTES} bytes.")
                    
                # Write to disk temporarily
                fd, temp_file_path = tempfile.mkstemp(suffix=".mp4")
                total_bytes = 0
                with os.fdopen(fd, "wb") as f:
                    async for chunk in response.aiter_bytes(chunk_size=65536):
                        f.write(chunk)
                        total_bytes += len(chunk)
                        if total_bytes > settings.MAX_VIDEO_SIZE_BYTES:
                            raise ValueError(f"Downloaded video exceeds maximum limit of {settings.MAX_VIDEO_SIZE_BYTES} bytes.")
                            
        # Extract frames in an executor thread to avoid blocking the main event loop
        frames = await asyncio.to_thread(_extract_video_frames, temp_file_path, frames_per_second)
        return frames
        
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as e:
                logger.error(f"Error removing temp video file {temp_file_path}: {e}")

def _extract_video_frames(file_path: str, frames_per_second: int) -> list[np.ndarray]:
    frames = []
    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        raise Exception(f"Unable to open video file {file_path}")
        
    try:
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0:
            fps = 30.0
            
        frame_interval = int(fps / frames_per_second)
        if frame_interval < 1:
            frame_interval = 1
            
        count = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            if count % frame_interval == 0:
                if len(frames) >= settings.MAX_VIDEO_FRAMES:
                    logger.warning(f"Video extraction capped at maximum frame limit of {settings.MAX_VIDEO_FRAMES}.")
                    break
                    
                frames.append(frame)
                
            count += 1
    finally:
        cap.release()
        
    return frames
