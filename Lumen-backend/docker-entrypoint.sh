#!/bin/sh
set -e

# Migrations are NOT run on every boot by default. With more than one replica
# each would race to apply the same migration, and Prisma's advisory lock turns
# that into a rollout-blocking stall. Run them once per release instead:
#
#   Kubernetes : the Job in deploy/k8s/migrate-job.yaml (or an initContainer)
#   EC2/compose: docker compose run --rm api npm run migrate:deploy
#
# For a single-instance box where that ceremony is not worth it, set
# RUN_MIGRATIONS_ON_START=true.
if [ "${RUN_MIGRATIONS_ON_START}" = "true" ]; then
  echo "[entrypoint] RUN_MIGRATIONS_ON_START=true — applying migrations"
  npx prisma migrate deploy
fi

exec "$@"
