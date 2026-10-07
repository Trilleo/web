# syntax=docker/dockerfile:1

# The production images, from one build (see deploy/README.md):
#   --target app  the Astro server (Node) for server-rendered routes
#   --target web  Caddy: serves the static site and passes everything else to `app`
# Built by .github/workflows/deploy.yml.
#
# Base images are pinned (tag + digest): every new base layer has to be uploaded to
# Huawei SWR in mainland China, which is slow (~70 KB/s from GitHub), so they change
# only on purpose. Dependabot proposes updates monthly; keep the Node versions in step.

# 1. Build the site with the workspace's pinned pnpm.
FROM node:24.21.0-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    SKIP_INSTALL_SIMPLE_GIT_HOOKS=1 \
    ASTRO_TELEMETRY_DISABLED=1 \
    TURBO_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

# Manifests first, so dependency installs stay cached until they change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Every workspace package's manifest (a new tool or game package needs a line here too).
COPY apps/web/package.json apps/web/
COPY apps/color/package.json apps/color/
COPY apps/convert/package.json apps/convert/
COPY apps/inspect/package.json apps/inspect/
COPY apps/notes/package.json apps/notes/
COPY apps/qr/package.json apps/qr/
COPY apps/skygrid/package.json apps/skygrid/
COPY packages/db/package.json packages/db/
COPY packages/mc-files/package.json packages/mc-files/
COPY packages/storage/package.json packages/storage/
COPY packages/tool-kit/package.json packages/tool-kit/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @trilleo/web build

# Lets the deploy workflow confirm which commit is live.
ARG GIT_SHA=unknown
RUN printf '%s\n' "$GIT_SHA" > apps/web/dist/client/version.txt

# 2. The Astro server. Its build bundles its dependencies, so there's no node_modules.
FROM node:24.21.0-alpine3.24@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321 \
    MIGRATIONS_DIR=/app/migrations
WORKDIR /app
COPY --from=build /repo/apps/web/dist ./dist
COPY --from=build /repo/packages/db/migrations ./migrations
LABEL org.opencontainers.image.source="https://github.com/Trilleo/web"
USER node
EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]

# 3. Caddy with the static files (last, so it's also the default target).
FROM caddy:2.11.4-alpine@sha256:6aeddd44c3078b0f9a35206472a11420648a79c184603ef95957d0a20044cb2b AS web
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY deploy/cloudflare-ips.txt /etc/caddy/cloudflare-ips.txt
COPY --chmod=755 deploy/start-caddy.sh /usr/local/bin/start-caddy
COPY deploy/compose.yaml /deploy/compose.yaml
COPY --from=build /repo/apps/web/dist/client /srv/site
LABEL org.opencontainers.image.source="https://github.com/Trilleo/web"
EXPOSE 80 443
CMD ["start-caddy", "run"]
