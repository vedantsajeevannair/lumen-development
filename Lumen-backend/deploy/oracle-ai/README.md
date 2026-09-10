# AI inference service on Oracle Cloud (Always Free)

Runs the FastAPI + ONNX YOLO service on an Oracle `VM.Standard.A1.Flex` ARM
instance, behind Caddy for automatic HTTPS. Free indefinitely, not a monthly
quota.

## Why this rather than Cloud Run

Cloud Run's free tier is 180k vCPU-seconds a month; exceed it and the service
bills. Oracle's A1 allowance (4 OCPU / 24 GB across the tenancy) has no monthly
meter, so an always-on box costs nothing regardless of traffic.

The trade is that the box is always on. That removes scale-to-zero — and with it
the cold start. The model stays resident, so the first request of the day is as
fast as the hundredth. On 2 ARM cores inference measures 370–950 ms per image,
in the same range as Cloud Run's burst CPU.

## Live deployment

| | |
|---|---|
| Instance | `lumen-ai`, 2 OCPU / 12 GB / 50 GB boot, `ap-mumbai-1` AD-1 |
| Network | `lumen-ai-vcn` (10.1.0.0/16), its own VCN |
| Endpoint | `https://140.238.250.246.sslip.io` |
| App root | `/opt/lumen-ai` on the instance |

`lumen-ai` sits in a **separate VCN** from the pre-existing `lumen` instance on
purpose. The ingress rules this service needs would otherwise have to go on a
shared security list, changing what that other box is exposed to.

Free-tier headroom after this deployment: 4/4 A1 OCPUs, 24/24 GB RAM, 150/200 GB
block storage.

## Operating it

```bash
ssh -i ~/.ssh/lumen_oracle ubuntu@140.238.250.246
cd /opt/lumen-ai

sudo docker compose ps            # status
sudo docker compose logs -f ai    # inference logs
sudo docker compose restart ai    # restart after an .env change
```

Containers are `restart: unless-stopped` and Docker is enabled at boot, so the
service returns on its own after a reboot.

## Deploying a change

From `Lumen-backend/` on a workstation with the SSH key:

```bash
rsync -az --delete --exclude '.venv/' --exclude '__pycache__/' --exclude '.DS_Store' \
  -e "ssh -i ~/.ssh/lumen_oracle" \
  server/ai/python/ ubuntu@140.238.250.246:/opt/lumen-ai/app/
ssh -i ~/.ssh/lumen_oracle ubuntu@140.238.250.246 \
  'cd /opt/lumen-ai && sudo -E docker compose up -d --build'
```

Retraining the model is the same flow — drop the new `best.onnx` into
`server/ai/python/models/` first. Export it with the NMS threshold low enough
that `CONFIDENCE_THRESHOLD` is what filters detections:

```bash
python -c "from ultralytics import YOLO; \
  YOLO('models/best.pt').export(format='onnx', nms=True, imgsz=640, \
  opset=12, simplify=True, conf=0.001, iou=0.7)"
```

## Certificates

Caddy holds a Let's Encrypt certificate for `140.238.250.246.sslip.io` and
renews it automatically. sslip.io answers any A query with the IP embedded in
the hostname, which is what makes a certificate possible without owning a
domain — Let's Encrypt will not issue for a bare IP.

The certificate and ACME account key live in the `caddy_data` named volume.
**Do not `docker compose down -v`**: destroying that volume forces a re-issue
and repeated re-issues hit Let's Encrypt's duplicate-certificate rate limit.

Renewal needs port 80 reachable for the HTTP-01 challenge. It is open in both
the VCN security list and the instance's own iptables rules.

## Rebuilding from scratch

`../../..` has no Terraform for this; the instance was provisioned with the OCI
CLI. To recreate it, the steps are: VCN with an internet gateway and a default
route to it, a security list allowing 22/80/443 inbound, a public subnet, then
`oci compute instance launch` with the ARM shape and Ubuntu 22.04 aarch64 image.
Then install `docker.io` and `docker-compose-v2`, open 80/443 in iptables and
`netfilter-persistent save` (the Ubuntu image ships a default-deny INPUT chain
that blocks everything but SSH), copy this directory and `server/ai/python` to
`/opt/lumen-ai`, and `docker compose up -d --build`.
