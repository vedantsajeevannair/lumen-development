# LUMEN on one Oracle box

Everything runs on a single Always Free ARM instance: Postgres, Redis, MinIO,
the API, the CV service, the web console, and a TLS-terminating reverse proxy.
No managed services, no monthly quota, ₹0 indefinitely.

## Live

| | |
|---|---|
| URL | https://140.238.250.246.sslip.io |
| Instance | `lumen-ai`, `VM.Standard.A1.Flex`, 2 OCPU / 12 GB / 50 GB, `ap-mumbai-1` |
| Path | `/opt/lumen` on the instance |

The whole stack idles around **520 MB** of the 12 GB and 7.6 GB of the 50 GB
disk, so there is room for the database and photo bucket to grow considerably.

## What replaced what

| Was | Now |
|---|---|
| Vercel (console) | Caddy serving the built SPA from `./web` |
| Render (API) | `api` container |
| Supabase (Postgres) | `postgres` container |
| Upstash (Redis) | `redis` container |
| Supabase Storage (photos) | `minio` container |
| Cloud Run → Oracle (CV) | `fastapi` container, no longer public |

Two things improved beyond the bill. The API no longer sleeps — Render's free
tier suspended it after 15 minutes idle, so the first request of the day took
30–50 seconds. And inference dropped from ~850 ms to ~240 ms, because the API
now reaches the CV service over the compose network instead of the public
internet.

## Layout

Only Caddy is published. Everything else talks over the compose network and has
no route in from outside — including the CV service, which was internet-facing
when it ran on Cloud Run and no longer is.

```
                    :443
                      │
                   [ caddy ]
        ┌─────────────┼───────────────┬──────────────┐
        │             │               │              │
   /api /auth …   /files/*         everything     (SPA files
   [ api ]        [ minio ]         else → SPA      on disk)
    │  │  │
    │  │  └── [ fastapi ]  ← internal only
    │  └───── [ redis ]
    └──────── [ postgres ]
```

### The one routing subtlety

`/auth/*` is claimed by both sides — the console has page routes at
`/auth/login`, `/auth/register`, `/auth/verify` and `/auth/forgot-password`, and
the API has endpoints at those same paths. Split across two hosts this never
came up; on one origin it does.

The Caddyfile splits them by method, which is exact rather than lucky: every
endpoint on `authentication.controller.ts` is a `POST` except `GET /auth/me`.
**Adding a GET endpoint under `/auth` means adding it to the Caddyfile too**, or
it will silently return `index.html` with a 200 instead of JSON.

## Operating it

```bash
ssh -i ~/.ssh/lumen_oracle ubuntu@140.238.250.246
cd /opt/lumen

sudo docker compose -f docker-compose.prod.yml ps
sudo docker compose -f docker-compose.prod.yml logs -f api
sudo docker compose -f docker-compose.prod.yml restart api
```

Containers are `restart: always` and Docker starts at boot, so the stack returns
on its own after a reboot.

## Deploying a change

From `Lumen-backend/` and `Lumen-Web/` on a workstation with the SSH key:

```bash
# API or CV service
rsync -az --delete --exclude node_modules/ --exclude .venv/ --exclude __pycache__/ \
  --exclude dist/ --exclude .git/ -e "ssh -i ~/.ssh/lumen_oracle" \
  ./ ubuntu@140.238.250.246:/opt/lumen/src/
ssh -i ~/.ssh/lumen_oracle ubuntu@140.238.250.246 \
  'cd /opt/lumen && sudo -E docker compose -f docker-compose.prod.yml up -d --build api'

# Web console — build with an EMPTY API base so it calls its own origin
cd ../Lumen-Web && VITE_API_BASE_URL="" VITE_WS_URL="" npm run build
rsync -az --delete -e "ssh -i ~/.ssh/lumen_oracle" \
  dist/ ubuntu@140.238.250.246:/opt/lumen/web/
```

The console needs no restart — Caddy serves the files off disk.

## Backups

Consolidating traded managed-service backups for a single point of failure:
database, photographs and containers all sit on one 50 GB boot volume. A backup
written beside them would protect against a bad migration and nothing else, so
these go **off the box** — to OCI Object Storage, a different service with its
own free allowance that survives the instance being destroyed.

`backup.sh` runs nightly at 19:30 UTC (01:00 IST) under the `lumen-backup`
systemd timer. Each run uploads a timestamped set:

```
<UTC timestamp>/db.dump        pg_dump -Fc of lumen_db
<UTC timestamp>/files.tar.gz   every object in the photo bucket
<UTC timestamp>/manifest.txt   sizes and image count, so a restore is self-describing
```

Database and photographs are captured under one timestamp deliberately.
Restoring a database from one night against photographs from another leaves
complaints pointing at objects that do not exist.

```bash
systemctl list-timers lumen-backup          # when it next runs
systemctl status lumen-backup.service       # how the last run went
sudo systemctl start lumen-backup.service   # run one now
```

### The upload credential

The box holds a pre-authenticated request URL scoped to `AnyObjectWrite`, in
`BACKUP_PAR_URL`. It can create objects in the bucket and **cannot read, list or
delete them**. If this instance is ever compromised, that URL cannot be used to
read old backups or to wipe them before encrypting the live data.

It expires **2028-01-01**. Backups fail loudly after that; reissue with:

```bash
oci os preauth-request create --namespace <ns> --bucket-name lumen-backups \
  --name lumen-box-backup-writer --access-type AnyObjectWrite \
  --time-expires <date>
```

The returned `access-uri` is a *path*, not a URL — prefix it with
`https://objectstorage.<region>.oraclecloud.com` before putting it in `.env`.

A bucket lifecycle rule deletes objects after 90 days. At roughly 1 MB a night
that is about 90 MB against a 20 GB allowance, so the rule is hygiene rather
than necessity.

### Restoring

```bash
oci os object get --namespace <ns> --bucket-name lumen-backups \
  --name '<timestamp>/db.dump' --file db.dump
scp -i ~/.ssh/lumen_oracle db.dump ubuntu@140.238.250.246:/tmp/
ssh -i ~/.ssh/lumen_oracle ubuntu@140.238.250.246 \
  'sudo docker cp /tmp/db.dump lumen-postgres-1:/tmp/db.dump && \
   sudo docker exec lumen-postgres-1 pg_restore -U lumen -d lumen_db \
     --clean --if-exists --no-owner --no-privileges /tmp/db.dump'
```

Photographs restore by extracting `files.tar.gz` and `mc mirror`-ing it back
into the bucket.

**Test the restore into a scratch database, not the live one** — `CREATE
DATABASE restore_test`, restore there, check the row counts, drop it. A backup
nobody has restored is a hypothesis. This one has been verified end to end:
downloaded from Object Storage, restored into a scratch database, row counts
matched, scratch dropped.

## Certificates

Caddy holds a Let's Encrypt certificate for the sslip.io name and renews it
automatically. sslip.io answers any A query with the IP embedded in the
hostname, which is what makes a certificate possible without owning a domain —
Let's Encrypt will not issue for a bare IP.

The certificate and ACME account key live in the `caddy_data` volume. **Do not
`docker compose down -v`** — destroying it forces a re-issue, and repeated
re-issues hit the duplicate-certificate rate limit.

## Rebuilding from scratch

`provision.sh` in this directory creates the instance and network. After that:
install `docker.io` and `docker-compose-v2`, open 80/443 in iptables and
`netfilter-persistent save` (the Ubuntu image ships a default-deny INPUT chain),
copy this directory plus the backend source to `/opt/lumen`, fill in `.env` from
`.env.example`, drop `best.onnx` into `./models/`, build the console into
`./web/`, then `docker compose -f docker-compose.prod.yml up -d`.
