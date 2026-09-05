# LUMEN

AI-assisted civic infrastructure platform. A citizen photographs road damage; a
YOLO model detects and classifies it, the platform scores severity, dispatches
the right engineer, and verifies the repair from an after-photo before closure.

## The four components

| Component | What it is | Where it runs on AWS |
|---|---|---|
| [`Lumen-app`](Lumen-app) | Expo / React Native mobile app | Phones — built with EAS, not hosted |
| [`Lumen-Web`](Lumen-Web) | Vite + React operator console | S3 + CloudFront (static) |
| [`Lumen-backend`](Lumen-backend) | NestJS + Prisma REST API | EKS behind an ALB |
| [`Ai-Service`](Ai-Service) / `Lumen-backend/server/ai/python` | FastAPI + YOLO inference | EKS, cluster-internal only |

```
   phone (Lumen-app) ─┐
                      ├─HTTPS─→ ALB ─→ EKS: lumen-backend ──→ RDS (Postgres)
 browser (Lumen-Web) ─┘                        │                ElastiCache (Redis)
   S3 + CloudFront                             │                S3 (media)
                                               └─cluster-internal─→ lumen-ai
                                                                    (FastAPI + YOLO)
```

Both clients speak the same REST API. Only the backend talks to the AI service,
and only over the cluster network — the AI service is never exposed through the
ALB.

## Deployment guides

Two targets, pick one:

**Managed platforms** — [`DEPLOYMENT.md`](DEPLOYMENT.md). Render + Neon + Vercel,
no AWS account, free except the AI service. Driven by [`render.yaml`](render.yaml)
and [`Lumen-Web/vercel.json`](Lumen-Web/vercel.json).

**AWS**, as diagrammed above:

- **Backend + AI service** — [`Lumen-backend/README.md`](Lumen-backend/README.md#deploying-aws),
  manifests in [`Lumen-backend/deploy/`](Lumen-backend/deploy)
- **Web** — [`Lumen-Web/deploy/README.md`](Lumen-Web/deploy/README.md)
- **Mobile** — standard EAS build; point `EXPO_PUBLIC_API_URL` at the ALB domain

## Things that trip up a first deploy

**Client URLs are compile-time, not runtime.** `VITE_API_BASE_URL` and
`EXPO_PUBLIC_API_URL` are inlined by the bundlers. Moving the API means
rebuilding both clients, not restarting them.

**CORS gates the browser, not the app.** The backend's `FRONTEND_URL` is a
comma-separated allow-list and must contain the web app's origin. Native mobile
builds send no `Origin` header and are unaffected.

**The YOLO weights are not in the image.** `best.pt` is gitignored and too large
to bake in. Upload it to S3 and point `MODEL_S3_URI` at it; the AI service
downloads it at startup using its IAM role. Rolling the Deployment picks up a
retrained model with no rebuild. Off AWS, where there is no role to assume, set
`MODEL_URL` to any HTTPS copy of the weights instead.

**Migrations are a release step.** Run the migration Job once per release before
rolling the backend Deployment — several replicas racing the same migration
contend on Prisma's advisory lock.

## Local development

Each project's README covers running it locally. The short version:

```bash
cd Lumen-backend && docker compose up -d   # Postgres, Redis, FastAPI, API
cd Lumen-Web     && npm run dev            # http://localhost:5173
cd Lumen-app     && npm start              # Expo
```
