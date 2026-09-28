#!/bin/sh
# Runs Caddy with {$TRUSTED_PROXIES} set to Cloudflare's IP ranges from
# cloudflare-ips.txt, unless it's already set (the CI smoke test widens it so it can
# connect locally). Usage: start-caddy run | start-caddy validate
set -eu

if [ -z "${TRUSTED_PROXIES:-}" ]; then
	TRUSTED_PROXIES="$(grep -v -e '^#' -e '^$' /etc/caddy/cloudflare-ips.txt | tr '\n' ' ')"
fi
export TRUSTED_PROXIES

exec caddy "${1:-run}" --config /etc/caddy/Caddyfile --adapter caddyfile
