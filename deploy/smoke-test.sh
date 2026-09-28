#!/usr/bin/env bash
# Starts a built image with a throwaway certificate and checks the Caddy setup:
# redirects, headers, caching, the 404 page, health, and that non-Cloudflare
# connections are refused. Needs docker, openssl, and curl (CI runs it).
#
#   bash deploy/smoke-test.sh <image> <expected version.txt contents>
set -euo pipefail

image="$1"
expected_version="$2"
work="$(mktemp -d)"
open_name="trilleo-smoke-open"
strict_name="trilleo-smoke-strict"

cleanup() {
	docker rm -f "$open_name" "$strict_name" >/dev/null 2>&1 || true
	rm -rf "$work"
}
trap cleanup EXIT

fail() {
	echo "FAIL: $*" >&2
	docker logs "$open_name" 2>&1 | tail -n 30 >&2 || true
	exit 1
}

# Self-signed stand-in for the Cloudflare Origin certificate.
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj "/CN=trilleo.net" \
	-addext "subjectAltName=DNS:trilleo.net,DNS:www.trilleo.net" \
	-keyout "$work/origin.key" -out "$work/origin.pem" 2>/dev/null
chmod 644 "$work/origin.key" "$work/origin.pem"

echo "==> caddy validate"
docker run --rm -v "$work:/certs:ro" "$image" start-caddy validate >/dev/null

# "Open" container: every address counts as Cloudflare, so curl can reach it.
docker run -d --name "$open_name" -p 127.0.0.1:443:443 -p 127.0.0.1:80:80 \
	-v "$work:/certs:ro" -e TRUSTED_PROXIES="0.0.0.0/0 ::/0" "$image" >/dev/null

site() {
	curl --silent --show-error --insecure --max-time 10 \
		--resolve www.trilleo.net:443:127.0.0.1 --resolve trilleo.net:443:127.0.0.1 "$@"
}

echo "==> waiting for Caddy"
for _ in $(seq 1 30); do
	site --output /dev/null "https://www.trilleo.net/" && break
	sleep 1
done

echo "==> home page: 200, security headers, revalidating cache"
headers="$(site --dump-header - --output "$work/home.html" "https://www.trilleo.net/")"
grep -qi '^HTTP/[0-9.]* 200' <<<"$headers" || fail "home page status: $headers"
for header in \
	'strict-transport-security: max-age=31536000' \
	'x-content-type-options: nosniff' \
	'referrer-policy: strict-origin-when-cross-origin' \
	'x-frame-options: DENY' \
	'content-security-policy-report-only:' \
	'cache-control: public, max-age=0, must-revalidate'; do
	grep -qi "^$header" <<<"$headers" || fail "missing header '$header'"
done
if grep -qi '^server:' <<<"$headers"; then fail "Server header should be removed"; fi
grep -q '<title>Trilleo</title>' "$work/home.html" || fail "home page content"

echo "==> compression"
site --output /dev/null --dump-header - -H 'Accept-Encoding: gzip' "https://www.trilleo.net/" |
	grep -qi '^content-encoding: gzip' || fail "gzip not applied"

echo "==> bare domain redirects to www, keeping the path"
headers="$(site --dump-header - --output /dev/null "https://trilleo.net/writing/?q=1")"
grep -qi '^HTTP/[0-9.]* 301' <<<"$headers" || fail "apex redirect status: $headers"
grep -qi '^location: https://www.trilleo.net/writing/?q=1' <<<"$headers" || fail "apex redirect target: $headers"

echo "==> fingerprinted assets are immutable"
asset="$(grep -o '/_astro/[^"'"'"' )]*' "$work/home.html" | head -n 1)"
[[ -n "$asset" ]] || fail "no /_astro/ asset referenced from the home page"
site --dump-header - --output /dev/null "https://www.trilleo.net$asset" |
	grep -qi '^cache-control: public, max-age=31536000, immutable' || fail "asset cache headers ($asset)"

echo "==> version.txt"
headers="$(site --dump-header - --output "$work/version.txt" "https://www.trilleo.net/version.txt")"
grep -qi '^cache-control: no-store' <<<"$headers" || fail "version.txt should not be cached"
[[ "$(cat "$work/version.txt")" == "$expected_version" ]] || fail "version.txt is '$(cat "$work/version.txt")'"

echo "==> unknown pages get the styled 404"
status="$(site --output "$work/404.html" --write-out '%{http_code}' "https://www.trilleo.net/does-not-exist")"
[[ "$status" == "404" ]] || fail "404 status was $status"
grep -q '404' "$work/404.html" || fail "404 page content"

echo "==> health check"
for _ in $(seq 1 30); do
	state="$(docker inspect --format '{{.State.Health.Status}}' "$open_name" 2>/dev/null || echo none)"
	[[ "$state" == "healthy" ]] && break
	sleep 2
done
[[ "$state" == "healthy" ]] || fail "container health is '$state'"

# "Strict" container: the real Cloudflare list, so a local connection must be dropped.
echo "==> non-Cloudflare connections are refused"
docker run -d --name "$strict_name" -p 127.0.0.1:8443:443 -v "$work:/certs:ro" "$image" >/dev/null
sleep 3
if curl --silent --insecure --max-time 5 --resolve www.trilleo.net:8443:127.0.0.1 \
	--output /dev/null "https://www.trilleo.net:8443/"; then
	fail "a direct (non-Cloudflare) request was served"
fi

echo "All smoke tests passed."
