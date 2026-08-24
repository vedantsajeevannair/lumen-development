# ==============================================================================
# LUMEN AI inference service (FastAPI + YOLO)
#
# CPU image. For GPU nodes, swap the torch index below for a CUDA build and base
# the image on nvidia/cuda instead.
# ==============================================================================
FROM python:3.11-slim AS base

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# opencv-python-headless is built without GUI support, so the GL/X11 packages the
# previous image installed (libgl1-mesa-glx, libsm6, libxext6, libxrender-dev)
# are not needed — dropping them trims the image. libgl1-mesa-glx is still a
# transitional package on bookworm, but it is gone in trixie, so this also
# avoids a break when the base image moves on.
# tini forwards SIGTERM so uvicorn can drain.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libglib2.0-0 \
      tini \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install the CPU-only torch build first. Plain `pip install torch` pulls the
# CUDA wheels (several GB of nvidia libraries) which are dead weight on CPU
# nodes and blow up image pull time.
RUN pip install --no-cache-dir \
      --index-url https://download.pytorch.org/whl/cpu \
      torch torchvision \
 && pip install --no-cache-dir -r requirements.txt

COPY . .

# Weights are fetched at startup from MODEL_S3_URI (see model_source.py), so the
# image stays small and a retrained model does not need a rebuild. Create the
# directory up front and make it writable by the runtime user.
RUN mkdir -p /app/models && useradd --create-home --uid 1000 lumen \
 && chown -R lumen:lumen /app
USER lumen

EXPOSE 8000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
