#!/usr/bin/env bash
# Build the SPA and publish it to S3 + CloudFront.
#
#   VITE_API_BASE_URL=https://api.lumen.example.gov \
#   S3_BUCKET=lumen-web \
#   CLOUDFRONT_DISTRIBUTION_ID=E123456 \
#     ./deploy/deploy-s3.sh
set -euo pipefail

: "${S3_BUCKET:?set S3_BUCKET}"
: "${VITE_API_BASE_URL:?set VITE_API_BASE_URL — it is baked into the bundle at build time}"

echo "→ building against ${VITE_API_BASE_URL}"
VITE_API_BASE_URL="${VITE_API_BASE_URL}" npm run build

# Hashed assets are immutable and can be cached hard. index.html must NOT be,
# or browsers keep loading an old bundle that points at a stale API URL.
echo "→ syncing hashed assets"
aws s3 sync dist/ "s3://${S3_BUCKET}/" \
  --delete \
  --exclude "index.html" \
  --cache-control "public,max-age=31536000,immutable"

echo "→ uploading index.html (no-cache)"
aws s3 cp dist/index.html "s3://${S3_BUCKET}/index.html" \
  --cache-control "no-cache,no-store,must-revalidate"

if [[ -n "${CLOUDFRONT_DISTRIBUTION_ID:-}" ]]; then
  echo "→ invalidating CloudFront"
  aws cloudfront create-invalidation \
    --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
    --paths "/index.html" "/" >/dev/null
fi

echo "✓ deployed"
