#!/usr/bin/env bash
# Provision the Always-Free ARM instance the AI service runs on.
#
#   COMPARTMENT_ID=ocid1.tenancy.oc1..xxx ./provision.sh
#
# Idempotent it is not — run it once. Re-running creates a second VCN and a
# second instance, which will exceed the free A1 allowance and start billing.
#
# This creates a *new* VCN rather than reusing an existing one. The ingress
# rules this service needs would otherwise land on a shared security list and
# change what every other instance in that VCN is exposed to.
set -euo pipefail

: "${COMPARTMENT_ID:?set COMPARTMENT_ID — usually the tenancy OCID}"
AD="${AD:-$(oci iam availability-domain list --compartment-id "$COMPARTMENT_ID" \
  | python3 -c 'import json,sys;print(json.load(sys.stdin)["data"][0]["name"])')}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/lumen_oracle.pub}"
NAME="${NAME:-lumen-ai}"
CIDR="${CIDR:-10.1.0.0/16}"

# Ubuntu 22.04 for aarch64. Resolved rather than pinned so a stale image OCID
# does not fail the run months later.
IMAGE=$(oci compute image list --compartment-id "$COMPARTMENT_ID" \
  --operating-system "Canonical Ubuntu" --operating-system-version "22.04" \
  --shape "VM.Standard.A1.Flex" --sort-by TIMECREATED --limit 1 \
  | python3 -c 'import json,sys;print(json.load(sys.stdin)["data"][0]["id"])')

q() { python3 -c 'import json,sys;print(json.load(sys.stdin)["data"]["id"])'; }
g() { python3 -c "import json,sys;print(json.load(sys.stdin)['data']['$1'])"; }

echo "→ VCN"
VCN=$(oci network vcn create --compartment-id "$COMPARTMENT_ID" --cidr-blocks "[\"$CIDR\"]" \
  --display-name "$NAME-vcn" --dns-label "${NAME//-/}" --wait-for-state AVAILABLE | q)

echo "→ internet gateway"
IGW=$(oci network internet-gateway create --compartment-id "$COMPARTMENT_ID" --vcn-id "$VCN" \
  --is-enabled true --display-name "$NAME-igw" --wait-for-state AVAILABLE | q)

RT=$(oci network vcn get --vcn-id "$VCN" | g default-route-table-id)
SL=$(oci network vcn get --vcn-id "$VCN" | g default-security-list-id)

echo "→ default route → internet"
oci network route-table update --rt-id "$RT" --force --route-rules \
  "[{\"destination\":\"0.0.0.0/0\",\"destinationType\":\"CIDR_BLOCK\",\"networkEntityId\":\"$IGW\"}]" >/dev/null

# 22 to provision, 80 for the ACME HTTP-01 challenge and its renewals, 443 for
# the service. Port 8000 stays shut — the container is only reachable via Caddy.
# The ICMP rule is type 3 code 4, without which path-MTU discovery blackholes.
echo "→ ingress 22/80/443"
oci network security-list update --security-list-id "$SL" --force \
  --egress-security-rules '[{"destination":"0.0.0.0/0","protocol":"all","isStateless":false}]' \
  --ingress-security-rules '[
    {"source":"0.0.0.0/0","protocol":"6","isStateless":false,"tcpOptions":{"destinationPortRange":{"min":22,"max":22}}},
    {"source":"0.0.0.0/0","protocol":"6","isStateless":false,"tcpOptions":{"destinationPortRange":{"min":80,"max":80}}},
    {"source":"0.0.0.0/0","protocol":"6","isStateless":false,"tcpOptions":{"destinationPortRange":{"min":443,"max":443}}},
    {"source":"0.0.0.0/0","protocol":"1","isStateless":false,"icmpOptions":{"type":3,"code":4}}
  ]' >/dev/null

echo "→ public subnet"
SUB=$(oci network subnet create --compartment-id "$COMPARTMENT_ID" --vcn-id "$VCN" \
  --cidr-block "${CIDR%.*.*}.0.0/24" --display-name "$NAME-subnet" --dns-label aisub \
  --route-table-id "$RT" --security-list-ids "[\"$SL\"]" \
  --prohibit-public-ip-on-vnic false --wait-for-state AVAILABLE | q)

# 2 OCPU / 12 GB is half the tenancy-wide Always Free A1 allowance, and 50 GB
# boot keeps block storage well under the 200 GB that tier covers. Raising
# either past what is left of the allowance starts billing silently.
echo "→ instance"
INST=$(oci compute instance launch --compartment-id "$COMPARTMENT_ID" --availability-domain "$AD" \
  --shape VM.Standard.A1.Flex --shape-config '{"ocpus":2,"memoryInGBs":12}' \
  --display-name "$NAME" --image-id "$IMAGE" --subnet-id "$SUB" \
  --assign-public-ip true --boot-volume-size-in-gbs 50 \
  --ssh-authorized-keys-file "$SSH_KEY" --wait-for-state RUNNING | q)

IP=$(oci compute instance list-vnics --instance-id "$INST" \
  | python3 -c 'import json,sys;print(json.load(sys.stdin)["data"][0]["public-ip"])')

cat <<EOF

✓ $NAME running at $IP

  Next, on the instance — the Ubuntu image ships a default-deny INPUT chain that
  drops 80/443 no matter what the security list says, so open it there too:

    ssh -i ${SSH_KEY%.pub} ubuntu@$IP
    sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT
    sudo iptables -I INPUT 7 -p tcp --dport 443 -j ACCEPT
    sudo netfilter-persistent save
    sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2

  Then from Lumen-backend/ on your workstation:

    ssh -i ${SSH_KEY%.pub} ubuntu@$IP 'sudo mkdir -p /opt/lumen-ai/app && sudo chown -R ubuntu:ubuntu /opt/lumen-ai'
    rsync -az --delete --exclude '.venv/' --exclude '__pycache__/' --exclude '.DS_Store' \\
      -e "ssh -i ${SSH_KEY%.pub}" server/ai/python/ ubuntu@$IP:/opt/lumen-ai/app/
    rsync -az -e "ssh -i ${SSH_KEY%.pub}" deploy/oracle-ai/docker-compose.yml \\
      deploy/oracle-ai/Caddyfile ubuntu@$IP:/opt/lumen-ai/

  Copy .env.example to /opt/lumen-ai/.env, set AI_HOSTNAME=$IP.sslip.io and
  FASTAPI_API_KEY to match the backend, then:

    ssh -i ${SSH_KEY%.pub} ubuntu@$IP 'cd /opt/lumen-ai && sudo -E docker compose up -d --build'

  Finally point the backend at it:  FASTAPI_INFERENCE_URL=https://$IP.sslip.io
EOF
