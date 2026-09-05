#!/usr/bin/env bash
# One-time preparation of a fresh Oracle Cloud Always Free ARM instance.
#
#   scp -r deploy/oracle ubuntu@<public-ip>:~/lumen
#   ssh ubuntu@<public-ip> 'cd lumen && ./setup.sh'
#
# Installs Docker, opens the two ports Caddy needs, and creates the directories
# the compose file mounts. Safe to re-run.
set -euo pipefail

log() { printf '\n\033[1m→ %s\033[0m\n' "$*"; }
warn() { printf '\033[33m! %s\033[0m\n' "$*" >&2; }

[[ $EUID -eq 0 ]] && { warn "run as the default user (ubuntu/opc), not root — it uses sudo where needed"; exit 1; }

# ------------------------------------------------------------------------------
# Docker
# ------------------------------------------------------------------------------
if command -v docker >/dev/null 2>&1; then
  log "Docker already installed ($(docker --version))"
else
  log "installing Docker"
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  warn "you were added to the 'docker' group — log out and back in before running compose"
fi

sudo systemctl enable --now docker

# ------------------------------------------------------------------------------
# The firewall that actually blocks you
#
# Oracle filters traffic in TWO independent places, and both must allow a port:
#
#   1. The VCN security list / network security group, in the web console.
#      THIS SCRIPT CANNOT CHANGE IT — do it by hand:
#        Networking → Virtual Cloud Networks → your VCN → Subnet → Security List
#        → Add Ingress Rules: source 0.0.0.0/0, TCP, destination ports 80 and 443
#
#   2. The instance's own iptables, below. Oracle's Ubuntu images ship a REJECT
#      rule at the end of the INPUT chain, so an ACCEPT appended after it never
#      matches. The rules must be INSERTED above it, which is what -I does.
#
# Skipping either one produces the same symptom: the port looks open, curl hangs,
# and Let's Encrypt fails its challenge with no useful error.
# ------------------------------------------------------------------------------
log "opening ports 80 and 443 on the instance firewall"

if command -v firewall-cmd >/dev/null 2>&1; then
  # Oracle Linux
  sudo firewall-cmd --permanent --add-port=80/tcp
  sudo firewall-cmd --permanent --add-port=443/tcp
  sudo firewall-cmd --reload
  log "firewalld updated"
else
  # Ubuntu images: insert above the trailing REJECT, then persist.
  for port in 80 443; do
    if sudo iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null; then
      echo "  port $port already allowed"
    else
      sudo iptables -I INPUT 1 -p tcp --dport "$port" -j ACCEPT
      echo "  port $port allowed"
    fi
  done
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent >/dev/null 2>&1 || true
  sudo netfilter-persistent save >/dev/null 2>&1 || warn "could not persist iptables — rules will be lost on reboot"
fi

# ------------------------------------------------------------------------------
# Directories the compose file mounts
# ------------------------------------------------------------------------------
log "creating mount points"
mkdir -p models web
echo "  ./models  ← put your trained best.pt here"
echo "  ./web     ← upload the contents of Lumen-Web/dist here"

# ------------------------------------------------------------------------------
# Checks worth doing before the first deploy rather than after
# ------------------------------------------------------------------------------
log "preflight"

arch="$(uname -m)"
echo "  architecture   : ${arch}"
[[ "$arch" == "aarch64" ]] || warn "expected aarch64 on an Ampere A1 instance"

mem_gb=$(awk '/MemTotal/ {printf "%.1f", $2/1048576}' /proc/meminfo)
echo "  memory         : ${mem_gb} GB"
awk -v m="$mem_gb" 'BEGIN { if (m+0 < 5.5) exit 1 }' || \
  warn "under ~6 GB — this is probably an AMD micro instance, not the ARM one. The CV service needs ~1.5 GB on its own."

echo "  public IP      : $(curl -fsS --max-time 5 https://checkip.amazonaws.com 2>/dev/null || echo '(could not determine)')"

if [[ -f models/best.pt ]]; then
  echo "  weights        : $(du -h models/best.pt | cut -f1)"
else
  warn "no models/best.pt — the CV service exits at startup without it. The rest of the stack runs fine; bring it up without the fastapi service until you have weights."
fi

if [[ -f web/index.html ]]; then
  echo "  web bundle     : present"
else
  warn "no web/index.html — build it locally and upload:"
  warn "    (in Lumen-Web) VITE_API_BASE_URL= npm run build"
  warn "    scp -r dist/* <user>@<ip>:~/lumen/web/"
  warn "  Note the EMPTY VITE_API_BASE_URL: same-origin deployment, so no CORS."
fi

cat <<'EOF'

Next:
  1. Add the ingress rules in the OCI console (ports 80, 443) — see the comment
     in this script. The instance firewall alone is not enough.
  2. Point your domain's A record at the public IP above.
  3. cp .env.example .env && $EDITOR .env
  4. docker compose -f docker-compose.prod.yml up -d --build
  5. docker compose -f docker-compose.prod.yml logs -f caddy   # watch cert issuance

The first build compiles nothing from source — every dependency has an ARM64
wheel — but it still takes 10-20 minutes on two cores. Expect that once.
EOF
