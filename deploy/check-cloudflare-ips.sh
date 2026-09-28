#!/usr/bin/env bash
# Fails if Cloudflare's published IP ranges differ from deploy/cloudflare-ips.txt, so a
# change on Cloudflare's side can't silently lock visitors out. Run by CI.
set -euo pipefail
cd "$(dirname "$0")"

fetch() {
	curl --silent --show-error --fail --retry 3 --max-time 20 "$1"
}

live="$({
	fetch https://www.cloudflare.com/ips-v4
	echo
	fetch https://www.cloudflare.com/ips-v6
	echo
} | grep -v '^$' | sort)"
ours="$(grep -v -e '^#' -e '^$' cloudflare-ips.txt | sort)"

if [[ "$live" != "$ours" ]]; then
	echo "Cloudflare's IP ranges changed. Update deploy/cloudflare-ips.txt and the" >&2
	echo "Huawei Cloud security group (see deploy/README.md). Differences (< ours, > live):" >&2
	diff <(echo "$ours") <(echo "$live") >&2 || true
	exit 1
fi
echo "Cloudflare IP ranges match deploy/cloudflare-ips.txt."
