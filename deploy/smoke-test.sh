#!/usr/bin/env bash
# Starts the production stack (web + app + db) from built images, laid out like the
# server's /srv/trilleo but with a throwaway certificate, and checks it: redirects,
# headers, caching, the 404 page, routing to the app, the database, backups, and that
# non-Cloudflare connections are refused. Needs docker with compose, openssl, and curl
# (CI runs it).
#
#   bash deploy/smoke-test.sh <web image> <app image> <expected version.txt contents>
set -euo pipefail

web_image="$1"
app_image="$2"
expected_version="$3"
deploy_dir="$(cd "$(dirname "$0")" && pwd)"
stack="$(mktemp -d)"
strict_name="trilleo-smoke-strict"
# Stands in for the SWR registry; the Postgres image is tagged under it locally.
registry="smoke.local/trilleo"

# The production compose file, plus an override that lets curl in (see "open" below).
export COMPOSE_FILE="$stack/compose.yaml:$stack/compose.smoke.yaml"

cleanup() {
	docker compose down --volumes --remove-orphans >/dev/null 2>&1 || true
	docker rm -f "$strict_name" >/dev/null 2>&1 || true
	rm -rf "$stack"
}
trap cleanup EXIT

fail() {
	echo "FAIL: $*" >&2
	docker compose ps --all >&2 || true
	docker compose logs --tail 30 >&2 || true
	exit 1
}

echo "==> setting up a stack directory like /srv/trilleo"
mkdir "$stack/certs"
# Self-signed stand-in for the Cloudflare Origin certificate.
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj "/CN=trilleo.net" \
	-addext "subjectAltName=DNS:trilleo.net,DNS:www.trilleo.net" \
	-keyout "$stack/certs/origin.key" -out "$stack/certs/origin.pem" 2>/dev/null
chmod 644 "$stack/certs/origin.key" "$stack/certs/origin.pem"
# Like trilleo-deploy: compose.yaml comes out of the web image.
docker run --rm --entrypoint cat "$web_image" /deploy/compose.yaml >"$stack/compose.yaml"
printf 'REGISTRY=%s\nWEB_IMAGE=%s\nAPP_IMAGE=%s\n' "$registry" "$web_image" "$app_image" >"$stack/.env"
password="$(openssl rand -hex 16)"
printf 'POSTGRES_PASSWORD=%s\nPGPASSWORD=%s\n' "$password" "$password" >"$stack/db.env"
# Placeholder OAuth App: enough to start a sign-in, which never reaches GitHub here.
printf 'GITHUB_CLIENT_ID=smoke-client\nGITHUB_CLIENT_SECRET=smoke-secret\nADMIN_GITHUB_IDS=1\n' >"$stack/app.env"
# "Open": every address counts as Cloudflare, so curl can reach it.
cat >"$stack/compose.smoke.yaml" <<'YAML'
services:
  web:
    environment:
      TRUSTED_PROXIES: "0.0.0.0/0 ::/0"
YAML

postgres_tag="$(sed -n 's|.*/postgres:\([^[:space:]"]*\).*|\1|p' "$stack/compose.yaml")"
[[ -n "$postgres_tag" ]] || fail "no Postgres image in compose.yaml"
docker pull --quiet "postgres:$postgres_tag" >/dev/null
docker tag "postgres:$postgres_tag" "$registry/postgres:$postgres_tag"

echo "==> caddy validate"
docker run --rm -v "$stack/certs:/certs:ro" "$web_image" start-caddy validate >/dev/null

echo "==> starting web, app and db"
# Not clamav: it downloads virus signatures for minutes on first start. The app treats
# a missing scanner as "couldn't scan", as production does while clamd is down.
docker compose up --detach --wait --wait-timeout 180 web app db || fail "the stack didn't become healthy"

site() {
	curl --silent --show-error --insecure --max-time 10 \
		--resolve www.trilleo.net:443:127.0.0.1 --resolve trilleo.net:443:127.0.0.1 "$@"
}

echo "==> home page: 200, security headers, revalidating cache"
headers="$(site --dump-header - --output "$stack/home.html" "https://www.trilleo.net/")"
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
grep -q '<title>Trilleo Network</title>' "$stack/home.html" || fail "home page content"

echo "==> compression"
headers="$(site --output /dev/null --dump-header - -H 'Accept-Encoding: gzip' "https://www.trilleo.net/")"
grep -qi '^content-encoding: gzip' <<<"$headers" || fail "gzip not applied"

echo "==> bare domain redirects to www, keeping the path"
headers="$(site --dump-header - --output /dev/null "https://trilleo.net/writing/?q=1")"
grep -qi '^HTTP/[0-9.]* 301' <<<"$headers" || fail "apex redirect status: $headers"
grep -qi '^location: https://www.trilleo.net/writing/?q=1' <<<"$headers" || fail "apex redirect target: $headers"

echo "==> fingerprinted assets are immutable"
asset="$(grep -o '/_astro/[^"'"'"' )]*' "$stack/home.html" | head -n 1)"
[[ -n "$asset" ]] || fail "no /_astro/ asset referenced from the home page"
headers="$(site --dump-header - --output /dev/null "https://www.trilleo.net$asset")"
grep -qi '^cache-control: public, max-age=31536000, immutable' <<<"$headers" || fail "asset cache headers ($asset)"

echo "==> version.txt"
headers="$(site --dump-header - --output "$stack/version.txt" "https://www.trilleo.net/version.txt")"
grep -qi '^cache-control: no-store' <<<"$headers" || fail "version.txt should not be cached"
[[ "$(cat "$stack/version.txt")" == "$expected_version" ]] || fail "version.txt is '$(cat "$stack/version.txt")'"

echo "==> unknown pages get the styled 404 (rendered by the app)"
status="$(site --output "$stack/404.html" --write-out '%{http_code}' "https://www.trilleo.net/does-not-exist")"
[[ "$status" == "404" ]] || fail "404 status was $status"
grep -q '404' "$stack/404.html" || fail "404 page content"

echo "==> the app's health check isn't public"
status="$(site --output /dev/null --write-out '%{http_code}' "https://www.trilleo.net/api/health")"
[[ "$status" == "404" ]] || fail "/api/health answered $status from outside"

# These need Caddy's forwarded headers to reach Astro intact (security.allowedDomains):
# otherwise the app thinks it's http://localhost and all of them go wrong.
echo "==> sign-in: admin pages redirect, and sign-in starts at GitHub with the right URLs"
headers="$(site --dump-header - --output /dev/null "https://www.trilleo.net/admin")"
grep -qi '^HTTP/[0-9.]* 302' <<<"$headers" || fail "/admin status: $headers"
grep -qi '^location: /sign-in?next=%2Fadmin' <<<"$headers" || fail "/admin redirect: $headers"
headers="$(site --dump-header - --output /dev/null "https://www.trilleo.net/sign-in")"
grep -qi '^HTTP/[0-9.]* 200' <<<"$headers" || fail "/sign-in status: $headers"
grep -qi '^cache-control: private, no-store' <<<"$headers" || fail "/sign-in should not be cached"
headers="$(site --dump-header - --output /dev/null "https://www.trilleo.net/auth/github")"
grep -qi '^location: https://github.com/login/oauth/authorize?client_id=smoke-client&redirect_uri=https%3A%2F%2Fwww.trilleo.net%2Fauth%2Fgithub%2Fcallback&' <<<"$headers" ||
	fail "sign-in redirect: $headers"
cookie="$(grep -i '^set-cookie: __Host-trilleo_oauth=' <<<"$headers")" ||
	fail "no __Host-trilleo_oauth cookie: $headers"
for attribute in 'Path=/' 'HttpOnly' 'Secure' 'SameSite=Lax'; do
	grep -qi "; $attribute" <<<"$cookie" || fail "sign-in cookie lacks $attribute: $cookie"
done

echo "==> sign-out accepts this site's forms and refuses other sites'"
logout() {
	site --output /dev/null --write-out '%{http_code}' --request POST \
		--header "Origin: $1" --data 'everywhere=0' "https://www.trilleo.net/auth/logout"
}
status="$(logout https://www.trilleo.net)"
[[ "$status" == "303" ]] || fail "same-site sign-out answered $status"
status="$(logout https://evil.example)"
[[ "$status" == "403" ]] || fail "cross-site sign-out answered $status"

echo "==> comments: /account needs sign-in, and posting goes through the app"
headers="$(site --dump-header - --output /dev/null "https://www.trilleo.net/account")"
grep -qi '^location: /sign-in?next=%2Faccount' <<<"$headers" || fail "/account redirect: $headers"
# The production build has no published posts yet, so any post is "not found" here;
# what matters is reaching the handler (not Caddy's or the origin check's answer).
status="$(site --output /dev/null --write-out '%{http_code}' --request POST \
	--header 'Origin: https://www.trilleo.net' --data 'post=no-such-post&body=hi' \
	"https://www.trilleo.net/comments")"
[[ "$status" == "404" ]] || fail "posting a comment answered $status"

echo "==> tools: pages render, and the data API wants a signed-in user"
status="$(site --output "$stack/notes.html" --write-out '%{http_code}' "https://www.trilleo.net/tools/notes/")"
[[ "$status" == "200" ]] || fail "/tools/notes/ answered $status"
grep -q 'astro-island' "$stack/notes.html" || fail "/tools/notes/ has no app to hydrate"
status="$(site --output /dev/null --write-out '%{http_code}' "https://www.trilleo.net/tools/")"
[[ "$status" == "200" ]] || fail "/tools/ answered $status"
headers="$(site --dump-header - --output /dev/null "https://www.trilleo.net/api/tools/notes/data")"
grep -qi '^HTTP/[0-9.]* 401' <<<"$headers" || fail "tool data API without sign-in: $headers"
grep -qi '^cache-control: no-store' <<<"$headers" || fail "tool data API should not be cached"

echo "==> the database was migrated"
migrations="$(docker compose exec -T db psql --username=trilleo --dbname=trilleo --tuples-only --no-align \
	--command='select count(*) from drizzle.__drizzle_migrations')" || fail "couldn't read the migrations table"
[[ "$migrations" -ge 1 ]] || fail "no migrations applied ($migrations)"

echo "==> the database uses Postgres's built-in locale"
provider="$(docker compose exec -T db psql --username=trilleo --dbname=trilleo --tuples-only --no-align \
	--command="select datlocprovider from pg_database where datname = 'trilleo'")" || fail "couldn't read the locale provider"
[[ "$provider" == "b" ]] || fail "locale provider is '$provider', expected 'b' (builtin)"

echo "==> backup script produces a restorable dump"
TRILLEO_DIR="$stack" bash "$deploy_dir/server/trilleo-backup"
dump="$(find "$stack/backups" -name 'trilleo-*.dump' | head -n 1)"
[[ -n "$dump" ]] || fail "no backup file written"
# Captured first: under pipefail, `… | grep -q` fails when grep exits before the writer is done.
contents="$(docker compose exec -T db pg_restore --list <"$dump")" || fail "pg_restore couldn't read the backup"
grep -q 'TABLE public users' <<<"$contents" || fail "backup doesn't contain the users table"

echo "==> with the app stopped, static pages still work and the rest fails fast"
docker compose stop app >/dev/null
# The home page and posts render on the app now; /about/ is still a prerendered file.
status="$(site --output /dev/null --write-out '%{http_code}' "https://www.trilleo.net/about/")"
[[ "$status" == "200" ]] || fail "about page was $status while the app was down"
status="$(site --output /dev/null --write-out '%{http_code}' "https://www.trilleo.net/does-not-exist")"
[[ "$status" == "502" ]] || fail "non-file request was $status while the app was down (expected 502 from the proxy)"
docker compose start app >/dev/null
# Named services, as at the start: a bare `up` would also start (and pull) clamav.
docker compose up --detach --wait --wait-timeout 60 web app db || fail "the app didn't recover"

# "Strict": the real Cloudflare list, so a local connection must be dropped.
echo "==> non-Cloudflare connections are refused"
docker run -d --name "$strict_name" -p 127.0.0.1:8443:443 -v "$stack/certs:/certs:ro" "$web_image" >/dev/null
sleep 3
if curl --silent --insecure --max-time 5 --resolve www.trilleo.net:8443:127.0.0.1 \
	--output /dev/null "https://www.trilleo.net:8443/"; then
	fail "a direct (non-Cloudflare) request was served"
fi

echo "All smoke tests passed."
