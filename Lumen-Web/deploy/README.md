# Deploying the web app (S3 + CloudFront)

```bash
VITE_API_BASE_URL=https://api.lumen.example.gov \
S3_BUCKET=lumen-web \
CLOUDFRONT_DISTRIBUTION_ID=E123456 \
  ./deploy/deploy-s3.sh
```

## Two things that will bite you

**SPA routing.** The app uses client-side routes (`/app/dashboard`,
`/auth/login`). S3 has no such objects, so a refresh or a shared deep link
returns 403/404. In the CloudFront distribution add a **custom error response**:

| HTTP error code | Response page path | HTTP response code |
|---|---|---|
| 403 | `/index.html` | 200 |
| 404 | `/index.html` | 200 |

Use an Origin Access Control with a private bucket — with a public S3 *website*
endpoint you lose HTTPS to the origin.

**CORS.** The bundle calls the backend on a different origin, so the backend's
`FRONTEND_URL` must contain this site's origin (e.g.
`https://lumen.example.gov`) or the browser blocks every request before it
reaches the ALB. Include the CloudFront domain too if you use it directly.

## The API URL is baked in at build time

Vite inlines `VITE_API_BASE_URL` into the bundle — it is not read at runtime.
Changing the backend URL means rebuilding and re-uploading, not editing config.
That is also why `index.html` is uploaded with `no-cache`: a cached shell would
keep pointing at the old bundle.
