#!/usr/bin/env bash
# Build and deploy the FastAPI + YOLO inference service to Cloud Run.
#
#   PROJECT_ID=my-gcp-project \
#   FASTAPI_API_KEY=$(openssl rand -hex 32) \
#     ./deploy/cloudrun/deploy-ai.sh
#
# Builds with Cloud Build, so a local Docker daemon is not required.
#
# Why Cloud Run for this service: inference is idle almost all the time and
# bursts when a citizen submits a photo. Scale-to-zero means an idle service
# costs nothing, and 2 GB of memory is available — the 512 MB free tiers on
# other platforms OOM-kill this container during startup, because importing
# torch alone costs ~300 MB before an image is decoded.
set -euo pipefail

: "${PROJECT_ID:?set PROJECT_ID — your GCP project}"

REGION="${REGION:-asia-south1}"
SERVICE="${SERVICE:-lumen-ai}"
# The AI service lives under the backend; that directory is the build context.
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../server/ai/python" && pwd)"

# ------------------------------------------------------------------------------
# The API key is not optional here.
#
# On EKS this service is a ClusterIP with no route in from outside, so running
# without a key is defensible. A Cloud Run service is on the public internet:
# the backend cannot present a Google-signed ID token (it sends
# `Authorization: Bearer $FASTAPI_API_KEY`), so the service must be deployed
# --allow-unauthenticated and the shared secret is the only thing standing
# between your GPU-less CPU budget and the open web.
# ------------------------------------------------------------------------------
: "${FASTAPI_API_KEY:?set FASTAPI_API_KEY — this service is internet-facing on Cloud Run, so the shared secret is mandatory. Generate one with: openssl rand -hex 32}"

# ------------------------------------------------------------------------------
# Weights are baked into the image rather than downloaded at startup.
#
# The S3/MODEL_URL path exists so a retrained model can roll out without a
# rebuild, which is the right trade on long-lived pods. Cloud Run scales to
# zero, so every cold start would re-download the file and pay that latency on
# a user-facing request. Baking it in trades rebuild-on-retrain for a fast,
# dependency-free cold start.
# ------------------------------------------------------------------------------
WEIGHTS="${SRC_DIR}/models/best.pt"
if [[ ! -f "${WEIGHTS}" ]]; then
  cat >&2 <<EOF
✗ No weights at ${WEIGHTS}

  The service fails fast at startup without them rather than serving a
  model-less container, so deploying now would just produce a crash loop.

  Put your trained best.pt there and re-run. It is gitignored, so it will not
  be committed — but there is no .dockerignore, so the Docker build context
  picks it up and bakes it into the image.

  To download from a URL at runtime instead (slower cold starts), remove this
  check and set MODEL_URL on the service.
EOF
  exit 1
fi
echo "→ weights: $(du -h "${WEIGHTS}" | cut -f1)"

echo "→ enabling APIs (no-op if already enabled)"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com --project "${PROJECT_ID}" --quiet

echo "→ building and deploying ${SERVICE} to ${REGION}"

# Note the single --set-env-vars below. The flag replaces the whole environment
# rather than merging into it, and gcloud keeps only the last occurrence when it
# is repeated — so splitting these across two flags silently drops every variable
# but the ones in the final flag. The ^;^ prefix switches the delimiter from a
# comma to a semicolon, so a value that happens to contain a comma cannot split
# itself into bogus extra variables.
gcloud run deploy "${SERVICE}" \
  --source "${SRC_DIR}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 0 \
  --max-instances 3 \
  --concurrency 4 \
  --timeout 120s \
  --cpu-boost \
  --set-env-vars "^;^MODEL_PATH=/app/models/best.pt;TORCH_NUM_THREADS=2;PREVENT_SSRF=True;CONFIDENCE_THRESHOLD=${CONFIDENCE_THRESHOLD:-0.60};FASTAPI_API_KEY=${FASTAPI_API_KEY}"

URL="$(gcloud run services describe "${SERVICE}" \
  --project "${PROJECT_ID}" --region "${REGION}" --format 'value(status.url)')"

echo
echo "✓ deployed: ${URL}"
echo
echo "  Verify:  curl ${URL}/health"
echo "  Expect:  {\"status\":\"healthy\",\"model_loaded\":true,...}"
echo
echo "  Then set these on the backend (Render → Environment):"
echo "    FASTAPI_INFERENCE_URL=${URL}"
echo "    FASTAPI_API_KEY=<the same key you passed here>"
