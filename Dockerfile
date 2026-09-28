# syntax=docker/dockerfile:1

# The production image: the static site (plus search index) served by Caddy.
# Built by .github/workflows/deploy.yml; see deploy/README.md.

# 1. Build the site with the workspace's pinned pnpm.
FROM node:24-slim AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    SKIP_INSTALL_SIMPLE_GIT_HOOKS=1 \
    ASTRO_TELEMETRY_DISABLED=1 \
    TURBO_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

# Manifests first, so dependency installs stay cached until they change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @trilleo/web build

# Lets the deploy workflow confirm which commit is live.
ARG GIT_SHA=unknown
RUN printf '%s\n' "$GIT_SHA" > apps/web/dist/version.txt

# 2. Serve it.
FROM caddy:2.11-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY deploy/cloudflare-ips.txt /etc/caddy/cloudflare-ips.txt
COPY --chmod=755 deploy/start-caddy.sh /usr/local/bin/start-caddy
COPY deploy/compose.yaml /deploy/compose.yaml
COPY --from=build /repo/apps/web/dist /srv/site
LABEL org.opencontainers.image.source="https://github.com/Trilleo/web"
EXPOSE 80 443
CMD ["start-caddy", "run"]
