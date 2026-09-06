#!/usr/bin/env bash
# Run the CV service on this machine and expose it to the deployed backend.
#
#   ./deploy/local-ai/start.sh
#
# The AI service does not fit any free tier — PyTorch needs ~2 GB and the free
# instances are 512 MB — so it runs here and reaches the internet through a
# cloudflared quick tunnel.
#
# The tunnel hostname is random and changes on every start, which is the part
# that makes doing this by hand miserable: the deployed backend keeps calling
# yesterday's URL and every detection fails. This script updates Render's
# FASTAPI_INFERENCE_URL for you when it has an API key to do it with.
#
# Put a Render API key in ~/.lumen-deploy/render to enable that. Without one the
# script still runs everything and prints the URL for you to paste in yourself.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AI_DIR="$(cd "${HERE}/../../server/ai/python" && pwd)"
VENV="${AI_DIR}/.venv"
RENDER_SERVICE="${RENDER_SERVICE:-srv-dabhmt5cqm1c73dlctpg}"
KEY_FILE="${KEY_FILE:-$HOME/.lumen-deploy/render}"
LOG_DIR="${TMPDIR:-/tmp}/lumen-ai"
mkdir -p "$LOG_DIR"

log()  { printf '\n\033[1m→ %s\033[0m\n' "$*"; }
warn() { printf '\033[33m! %s\033[0m\n' "$*" >&2; }

cleanup() {
  log "shutting down"
  [[ -n "${TUNNEL_PID:-}" ]] && kill "$TUNNEL_PID" 2>/dev/null || true
  [[ -n "${UVICORN_PID:-}" ]] && kill "$UVICORN_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# ------------------------------------------------------------------------------
# Preconditions. Each of these fails loudly here rather than as a confusing
# error three steps later.
# ------------------------------------------------------------------------------
[[ -d "$VENV" ]] || {
  warn "no virtualenv at $VENV — create it once with:"
  warn "  cd $AI_DIR && python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt"
  exit 1
}
[[ -f "${AI_DIR}/models/best.pt" ]] || {
  warn "no weights at ${AI_DIR}/models/best.pt — the service exits at startup without them."
  warn "Drop your trained best.pt there. For a placeholder that only detects COCO classes:"
  warn "  curl -fsSL -o ${AI_DIR}/models/best.pt \\"
  warn "    https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n.pt"
  exit 1
}
command -v cloudflared >/dev/null || { warn "cloudflared not installed: brew install cloudflared"; exit 1; }

# The shared secret must match what the backend sends. Reuse the stored one so
# restarting does not silently start rejecting the backend's requests with 401.
KEYSTORE="$HOME/.lumen-deploy/fastapi-key"
if [[ -f "$KEYSTORE" ]]; then
  FASTAPI_API_KEY="$(cat "$KEYSTORE")"
else
  FASTAPI_API_KEY="$(openssl rand -hex 32)"
  mkdir -p "$(dirname "$KEYSTORE")" && chmod 700 "$(dirname "$KEYSTORE")"
  printf '%s' "$FASTAPI_API_KEY" > "$KEYSTORE" && chmod 600 "$KEYSTORE"
  warn "generated a new API key — set FASTAPI_API_KEY on Render to match, or detection returns 401"
fi
export FASTAPI_API_KEY

# ------------------------------------------------------------------------------
# CV service
# ------------------------------------------------------------------------------
log "starting the CV service on 127.0.0.1:8000"
cd "$AI_DIR"
MODEL_PATH=models/best.pt TORCH_NUM_THREADS=4 PREVENT_SSRF=True \
  "$VENV/bin/uvicorn" app:app --host 127.0.0.1 --port 8000 > "$LOG_DIR/service.log" 2>&1 &
UVICORN_PID=$!

# Loading torch and the model takes a while; wait for readiness rather than
# guessing with a sleep. Bail out if the process dies instead of hanging.
for _ in $(seq 1 60); do
  curl -fsS --max-time 2 http://127.0.0.1:8000/health >/dev/null 2>&1 && break
  kill -0 "$UVICORN_PID" 2>/dev/null || { warn "service exited during startup:"; tail -20 "$LOG_DIR/service.log" >&2; exit 1; }
  sleep 2
done
curl -fsS --max-time 2 http://127.0.0.1:8000/health >/dev/null 2>&1 || {
  warn "service did not become healthy in 120s:"; tail -20 "$LOG_DIR/service.log" >&2; exit 1
}
echo "  model loaded"

# ------------------------------------------------------------------------------
# Tunnel
# ------------------------------------------------------------------------------
log "opening the tunnel"
cloudflared tunnel --url http://localhost:8000 > "$LOG_DIR/tunnel.log" 2>&1 &
TUNNEL_PID=$!

URL=""
for _ in $(seq 1 45); do
  # `|| true` is load-bearing: under `set -e` with pipefail, grep exiting 1
  # because the URL has not been printed yet would kill the script on the very
  # first pass, before cloudflared has had a chance to write anything.
  URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_DIR/tunnel.log" 2>/dev/null | head -1 || true)"
  [[ -n "$URL" ]] && break
  kill -0 "$TUNNEL_PID" 2>/dev/null || { warn "cloudflared exited:"; tail -20 "$LOG_DIR/tunnel.log" >&2; exit 1; }
  sleep 2
done
[[ -n "$URL" ]] || { warn "no tunnel URL after 90s:"; tail -20 "$LOG_DIR/tunnel.log" >&2; exit 1; }
echo "  $URL"

# ------------------------------------------------------------------------------
# Point the deployed backend at this tunnel
# ------------------------------------------------------------------------------
if [[ -f "$KEY_FILE" ]]; then
  log "updating FASTAPI_INFERENCE_URL on Render"
  code=$(curl -s -o /dev/null -w '%{http_code}' -X PUT \
    -H "Authorization: Bearer $(cat "$KEY_FILE")" -H 'Content-Type: application/json' \
    "https://api.render.com/v1/services/${RENDER_SERVICE}/env-vars/FASTAPI_INFERENCE_URL" \
    -d "{\"value\":\"${URL}\"}")
  if [[ "$code" == "200" || "$code" == "201" ]]; then
    echo "  updated — Render restarts the service automatically, give it a minute"
  else
    warn "Render returned HTTP $code — set FASTAPI_INFERENCE_URL to ${URL} by hand"
  fi
else
  warn "no Render API key at $KEY_FILE"
  warn "set FASTAPI_INFERENCE_URL=${URL} on the backend by hand, or detection keeps"
  warn "calling the previous tunnel and failing."
fi

cat <<EOF

  Local  : http://127.0.0.1:8000/health
  Public : ${URL}/health
  Logs   : ${LOG_DIR}/service.log, ${LOG_DIR}/tunnel.log

  Leave this terminal open. Ctrl-C stops both, and closing the lid ends the
  tunnel — the hostname is different next time, which is why this script
  re-points the backend on every start.
EOF

wait
