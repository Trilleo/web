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
FROM node:24.22.2-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS build
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
COPY apps/chunithm/package.json apps/chunithm/
COPY apps/color/package.json apps/color/
COPY apps/convert/package.json apps/convert/
COPY apps/inspect/package.json apps/inspect/
COPY apps/notes/package.json apps/notes/
COPY apps/preview/package.json apps/preview/
COPY apps/qr/package.json apps/qr/
COPY apps/hotfix/package.json apps/hotfix/
COPY apps/skygrid/package.json apps/skygrid/
COPY packages/captcha/package.json packages/captcha/
COPY packages/chunithm/package.json packages/chunithm/
COPY packages/cryptic/package.json packages/cryptic/
COPY packages/db/package.json packages/db/
COPY packages/forum/package.json packages/forum/
COPY packages/mail/package.json packages/mail/
COPY packages/mc-files/package.json packages/mc-files/
COPY packages/storage/package.json packages/storage/
COPY packages/study/package.json packages/study/
COPY packages/tool-kit/package.json packages/tool-kit/
COPY packages/ui/package.json packages/ui/
COPY packages/wiki/package.json packages/wiki/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @trilleo/web build

# Lets the deploy workflow confirm which commit is live.
ARG GIT_SHA=unknown
RUN printf '%s\n' "$GIT_SHA" > apps/web/dist/client/version.txt

# 2. The Astro server. Its build bundles its dependencies, so there's no node_modules.
FROM node:24.22.2-alpine3.24@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85 AS app
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
FROM caddy:2.11.6-alpine@sha256:d44355d3c2149dc580ce2cac735955d1c08d3d00882c30489c241aa51a5c10d9 AS web
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY deploy/cloudflare-ips.txt /etc/caddy/cloudflare-ips.txt
COPY --chmod=755 deploy/start-caddy.sh /usr/local/bin/start-caddy
COPY deploy/compose.yaml /deploy/compose.yaml
COPY --from=build /repo/apps/web/dist/client /srv/site
LABEL org.opencontainers.image.source="https://github.com/Trilleo/web"
EXPOSE 80 443
CMD ["start-caddy", "run"]
