#!/usr/bin/env bash
# Nightly backup of the LUMEN stack, off the box.
#
# Installed at /opt/lumen/backup.sh and run by the lumen-backup systemd timer.
# Reads BACKUP_PAR_URL from /opt/lumen/.env.
#
# Off the box is the whole point. Consolidating onto one instance traded
# managed-service backups for a single point of failure: everything — database,
# photographs, the containers themselves — sits on one 50 GB boot volume. A
# backup written beside it protects against a bad migration and nothing else.
# These go to OCI Object Storage, which is a different service with its own
# free allowance and survives the instance being destroyed.
#
# The upload URL is a pre-authenticated request scoped to AnyObjectWrite: it can
# create objects in the backup bucket and cannot read, list or delete them. If
# this box is compromised the attacker cannot use it to read old backups or to
# wipe them before encrypting the live data.
set -euo pipefail

cd /opt/lumen

STAMP="$(date -u +%Y-%m-%dT%H%M%SZ)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

log() { printf '[backup] %s\n' "$*"; }

DB_USER=$(grep '^DB_USER=' .env | cut -d= -f2)
DB_NAME=$(grep '^DB_NAME=' .env | cut -d= -f2)
BUCKET=$(grep '^STORAGE_BUCKET_NAME=' .env | cut -d= -f2)
MINIO_USER=$(grep '^MINIO_ROOT_USER=' .env | cut -d= -f2)
MINIO_PASS=$(grep '^MINIO_ROOT_PASSWORD=' .env | cut -d= -f2)
PAR_URL=$(grep '^BACKUP_PAR_URL=' .env | cut -d= -f2-)

if [[ -z "${PAR_URL}" ]]; then
  echo "[backup] BACKUP_PAR_URL is not set in .env — refusing to run" >&2
  exit 1
fi

# --- database ---------------------------------------------------------------
# Custom format (-Fc): compressed, and pg_restore can filter it by table
# rather than forcing an all-or-nothing replay of a plain SQL file.
log "dumping ${DB_NAME}"
docker exec "lumen-postgres-1" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc \
  > "${WORK}/db.dump"
log "  $(du -h "${WORK}/db.dump" | cut -f1)"

# --- photographs ------------------------------------------------------------
# The database rows are useless without the images they point at, so the two
# are backed up together and stamped with the same timestamp — restoring a
# database from one night and photographs from another would leave complaints
# referencing objects that do not exist.
log "mirroring ${BUCKET}"
docker exec lumen-minio-1 mc alias set bk http://localhost:9000 \
  "$MINIO_USER" "$MINIO_PASS" >/dev/null
docker exec lumen-minio-1 rm -rf /tmp/bk
docker exec lumen-minio-1 mc mirror --quiet "bk/${BUCKET}" /tmp/bk >/dev/null
docker cp "lumen-minio-1:/tmp/bk" "${WORK}/files" >/dev/null
docker exec lumen-minio-1 rm -rf /tmp/bk
tar -czf "${WORK}/files.tar.gz" -C "${WORK}" files
log "  $(du -h "${WORK}/files.tar.gz" | cut -f1)"

# --- upload -----------------------------------------------------------------
# A PAR URL is a prefix; the object name is whatever path follows it. Dated
# names mean a corrupted or half-written backup never overwrites a good one.
upload() {
  local file="$1" name="$2"
  log "uploading ${name}"
  curl -fsS --max-time 600 -X PUT --upload-file "$file" "${PAR_URL}${name}" >/dev/null
}

upload "${WORK}/db.dump"       "${STAMP}/db.dump"
upload "${WORK}/files.tar.gz"  "${STAMP}/files.tar.gz"

# A manifest makes a restore self-describing — which dump pairs with which
# archive, and what the stack looked like when they were taken.
cat > "${WORK}/manifest.txt" <<EOF
taken:      ${STAMP}
database:   ${DB_NAME} (pg_dump -Fc)
bucket:     ${BUCKET}
db bytes:   $(stat -c %s "${WORK}/db.dump")
files bytes:$(stat -c %s "${WORK}/files.tar.gz")
images:     $(find "${WORK}/files" -type f | wc -l)
EOF
upload "${WORK}/manifest.txt" "${STAMP}/manifest.txt"

log "done — ${STAMP}"
