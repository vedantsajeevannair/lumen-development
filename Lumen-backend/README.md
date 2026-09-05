# LUMEN Backend

The shared API behind LUMEN — the same service powers both the operator web app
([`../Lumen-Web`](../Lumen-Web)) and the mobile app ([`../Lumen-app`](../Lumen-app)).
It owns the database, authentication, dispatch and audit trail, and orchestrates
the computer-vision service for damage detection.

```
Lumen-Web (React SPA)  ─┐
                        ├─→  Lumen-backend  ─→  FastAPI CV service (server/ai/python)
Lumen-app (mobile)     ─┘      NestJS + Prisma        YOLO / OpenCV
                                    │
                          PostgreSQL + Redis
```

**Stack** — NestJS 11 · Prisma 6 · PostgreSQL (PostGIS) · Redis (BullMQ queues + cache)
· Socket.IO · JWT (access + refresh) · AWS S3 · Swagger.

## Quick start

```bash
npm install
cp .env.example .env      # then fill in the secrets
npx prisma migrate deploy  # creates the schema from prisma/migrations
npm run start:dev          # http://localhost:3000
```

Interactive API docs are served at **http://localhost:3000/api/docs**.

### With Docker

Brings up Postgres, Redis, the FastAPI CV service and the API together:

```bash
docker compose up --build
```

## Scripts

| Script | Does |
|---|---|
| `npm run start:dev` | Watch-mode dev server on :3000 |
| `npm run build` | `prisma generate` + `nest build` → `dist/` |
| `npm run start:prod` | Run the built server (`node dist/main`) |
| `npm run migrate:deploy` | Apply pending migrations (run once per release) |
| `npm run start:ai` | Run the FastAPI CV service directly |
| `npm run lint` | ESLint + Prettier, with `--fix` |
| `npm run test` / `test:e2e` / `test:cov` | Jest unit / e2e / coverage |

## Route layout

The API serves two consumers, so prefixes are split by audience:

| Prefix | Audience | Source |
|---|---|---|
| `/api/*` | Operator web app | `server/web-integration/` |
| `/api/v1/*` | Mobile app and admin | `server/{admin,citizen,department,dispatch,payments,ai-triage,health}/` |
| `/auth`, `/complaints`, `/users`, `/ai`, `/maps`, `/analytics`, `/audit`, `/timeline`, `/gamification`, `/storage` | Shared | respective modules |

`server/web-integration/` exists specifically to give the web dashboard a
purpose-shaped surface over the same data the mobile routes use — keep new
web-only endpoints there rather than widening the shared routes.

## Deploying (AWS)

The image is built from [`Dockerfile`](Dockerfile) and runs as the unprivileged
`node` user under `tini`, which forwards `SIGTERM` so the app can drain — Nest
calls `enableShutdownHooks()` and disconnects Prisma before exiting.

Manifests live in [`deploy/`](deploy):

| Path | For |
|---|---|
| `deploy/k8s/` | EKS — Deployment, Service + ALB Ingress, ConfigMap, IRSA ServiceAccount, migration Job |
| `deploy/k8s/ai-service.yaml` | EKS — the FastAPI + YOLO service, ClusterIP only |
| `deploy/ec2/` | EC2 — `docker-compose.prod.yml` against RDS + ElastiCache |

### The AI service

`server/ai/python` is the FastAPI + YOLO inference service. It is reached only by
this backend, over the cluster network, and is **not** exposed through the ALB.

Your trained weights are not baked into the image — `best.pt` is gitignored and
large. Upload it to S3 and set `MODEL_S3_URI`:

```
MODEL_S3_URI=s3://lumen-smartcity-storage/models/best.pt
MODEL_PATH=/app/models/best.pt
```

The service downloads it on startup via the pod's IAM role (no static keys) and
caches it in an `emptyDir`. Rolling the Deployment picks up a retrained model
without rebuilding the image.

On a platform with no role to assume (Render, Railway, Fly — see
[`../DEPLOYMENT.md`](../DEPLOYMENT.md)), set `MODEL_URL` to an `https://` copy of
the weights instead — a GitHub release asset, a Hugging Face file or a presigned
S3 link. `MODEL_S3_URI` takes precedence when both are set.

If the file is absent and neither variable is set, the service fails fast with an
explanatory error rather than serving a model-less container.

`FASTAPI_API_KEY` must match on both sides: the backend sends it as
`Authorization: Bearer <key>` and the AI service verifies it. Leave it unset only
while the service is unreachable from outside the cluster.

### Credentials: use IAM roles, not keys

`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` are optional and should be **unset**
in AWS. The S3 client only passes static credentials when both are present;
otherwise it falls through to the SDK's default provider chain and picks up the
EC2 instance profile, ECS task role or EKS IRSA role. It logs which mode it chose
at startup.

### Migrations are a release step, not a boot step

The entrypoint does **not** migrate by default. With more than one replica every
pod would race on the same migration and contend on Prisma's advisory lock.

```bash
# EKS — run once, before rolling the Deployment
kubectl apply -f deploy/k8s/migrate-job.yaml
kubectl wait --for=condition=complete job/lumen-migrate --timeout=300s

# EC2 / compose
docker compose -f deploy/ec2/docker-compose.prod.yml run --rm api npm run migrate:deploy
```

On a single-instance box, `RUN_MIGRATIONS_ON_START=true` makes the entrypoint
apply them at boot instead.

### Health checks

`GET /api/v1/health` is unauthenticated and returns **503 when Postgres is
unreachable**, 200 otherwise — so it works directly as a readiness probe or ALB
target-group check. Redis being down reports `status: "degraded"` with a 200,
because the cache falls back to memory and queues run offline by design; a pod is
not taken out of service for it. Liveness should hit `/` instead, so a database
blip does not restart healthy pods.

### Managed service notes

- **RDS** requires TLS — keep `?sslmode=require` on `DATABASE_URL`.
- **ElastiCache** with encryption in transit issues `rediss://`; the queue
  connection detects the scheme and enables TLS.
- **CORS** — `FRONTEND_URL` is a comma-separated allow-list and must contain the
  deployed web app's origin, or the browser blocks every request before it
  reaches the ALB. Native mobile builds send no `Origin` and are unaffected.
- The clients bake their backend URL in at build time (`VITE_API_BASE_URL`,
  `EXPO_PUBLIC_API_URL`), so moving the API means rebuilding them.

## Database

The schema lives in [`prisma/schema.prisma`](prisma/schema.prisma) and the SQL to
build it is in `prisma/migrations/`. Apply it with:

```bash
npx prisma migrate deploy
```

RDS requires TLS; append `?sslmode=require` to `DATABASE_URL` if your connection
string does not already include it.

## Layout

```
server/
├── main.ts               bootstrap: helmet, CORS, validation, Swagger
├── app.module.ts         module registry
├── authentication/       JWT login, refresh, logout
├── complaints/           complaint lifecycle, the core domain
├── ai/                   CV orchestration + BullMQ queue (python/ = FastAPI service)
├── ai-triage/            automated triage rules
├── dispatch/             engineer assignment and routing
├── web-integration/      the /api/* surface consumed by Lumen-Web
├── notifications/        Socket.IO gateway + push
├── audit/                immutable audit log
├── common/               guards, decorators, filters, storage
└── …                     admin, analytics, citizen, department, gamification,
                          health, mail, maps, otp, payments, timeline, users
prisma/schema.prisma      User, Complaint, AiPrediction, ComplaintTimeline,
                          DispatchRecord, AuditLog, Badge, PaymentTransaction, …
```

## Configuration

Every variable is documented in [`.env.example`](.env.example). The ones you
cannot run without:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST` / `REDIS_PORT` | Redis, for queues and cache |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Token signing — generate real secrets |
| `FASTAPI_INFERENCE_URL` | Where the CV service listens |
| `AWS_*` | S3 bucket for complaint media |
| `SMTP_*` | OTP and notification email |

`FRONTEND_URL` overrides the CORS allow-list; it defaults to the local web and
Expo dev origins (see `server/main.ts`).
