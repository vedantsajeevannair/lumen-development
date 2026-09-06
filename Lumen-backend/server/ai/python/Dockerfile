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

# OpenCV 5's "headless" wheel is not actually headless: it links libxcb.so.1 and
# libGL.so.1, where 4.x needed neither and this image accordingly installed only
# libglib2.0-0. requirements.txt has no upper bound on opencv-python-headless, so
# any fresh build now resolves to 5.x and the container dies at `import cv2` —
# visible only as "failed to start and listen on the port".
#
# Installing the libraries rather than pinning opencv back to 4.x, so the image
# builds whichever version resolves. libgl1 is the runtime GL loader (not the
# transitional libgl1-mesa-glx, which is gone in trixie).
# tini forwards SIGTERM so uvicorn can drain.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libglib2.0-0 \
      libgl1 \
      libxcb1 \
      libsm6 \
      libxext6 \
      libxrender1 \
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

# Bind $PORT when the platform injects one (Cloud Run, Render and most PaaS
# assign it and will not route to a container listening anywhere else), falling
# back to 8000 so the compose file and the k8s manifests keep working unchanged.
# This is the shell form on purpose — the exec form cannot expand a variable.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
