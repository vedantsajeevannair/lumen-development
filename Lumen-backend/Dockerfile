# ==============================================================================
# LUMEN Backend — production image
# Multi-stage: the build stage keeps toolchains and devDependencies out of the
# shipped image.
# ==============================================================================

FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# openssl is required by Prisma's query engine; python3/make/g++ build native deps.
RUN apk add --no-cache openssl python3 make g++

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# Drop devDependencies but keep the generated Prisma client, so the runtime stage
# gets a production-only node_modules without a second network install.
RUN npm prune --omit=dev


# ------------------------------------------------------------------------------
FROM node:22-alpine AS production

WORKDIR /usr/src/app

ENV NODE_ENV=production

# tini reaps zombies and — critically — forwards SIGTERM to node. Without an init
# (or with npm as PID 1) the signal is swallowed and the orchestrator SIGKILLs the
# container after its grace period instead of letting it drain.
RUN apk add --no-cache openssl tini

COPY --from=builder --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=node:node /usr/src/app/dist ./dist
COPY --from=builder --chown=node:node /usr/src/app/package*.json ./
COPY --from=builder --chown=node:node /usr/src/app/prisma ./prisma
COPY --chown=node:node docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

# The base image ships an unprivileged `node` user; running as root is flagged by
# every AWS security baseline and is unnecessary here.
USER node

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--", "./docker-entrypoint.sh"]
CMD ["node", "dist/main"]
