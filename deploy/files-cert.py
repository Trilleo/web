"""Installs a TLS certificate on the OBS bucket's custom domain (files.trilleo.net).

Run by .github/workflows/files-cert.yml after certbot has issued a fresh Let's Encrypt
certificate. OBS serves the custom domain itself (no Cloudflare in front), so it needs
a publicly trusted certificate, and Let's Encrypt's last 90 days: the workflow renews
it every month.

    python deploy/files-cert.py <fullchain.pem> <private-key.pem>

Environment: OBS_BUCKET, OBS_REGION, FILES_DOMAIN, and the access keys of an IAM user
allowed only obs:bucket:PutBucketCustomDomainConfiguration (OBS_CERT_ACCESS_KEY_ID,
OBS_CERT_SECRET_ACCESS_KEY). See deploy/storage.md.

Huawei's API reference says line breaks in the PEM text should be sent as "\\n", which
could mean either form; the script tries real line breaks, then escaped ones, and only
succeeds once the domain is actually serving the new certificate.
"""

import os
import socket
import ssl
import sys
import time
from datetime import datetime, timezone

from obs import ObsClient


def leaf_der(chain_pem: str) -> bytes:
    """The DER bytes of the first (leaf) certificate in a PEM chain."""
    end = "-----END CERTIFICATE-----"
    first = chain_pem[: chain_pem.index(end) + len(end)]
    return ssl.PEM_cert_to_DER_cert(first)


def served_der(domain: str) -> bytes | None:
    """The certificate the domain serves right now, without verifying it."""
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    try:
        with socket.create_connection((domain, 443), timeout=10) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as tls:
                return tls.getpeercert(binary_form=True)
    except OSError as error:
        print(f"  (couldn't connect yet: {error})")
        return None


def wait_for(domain: str, expected: bytes, seconds: int) -> bool:
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if served_der(domain) == expected:
            return True
        time.sleep(15)
    return False


def main() -> int:
    chain_path, key_path = sys.argv[1], sys.argv[2]
    bucket = os.environ["OBS_BUCKET"]
    region = os.environ["OBS_REGION"]
    domain = os.environ["FILES_DOMAIN"]
    with open(chain_path, encoding="ascii") as file:
        chain = file.read().strip()
    with open(key_path, encoding="ascii") as file:
        key = file.read().strip()
    expected = leaf_der(chain)

    if served_der(domain) == expected:
        print(f"{domain} already serves this certificate.")
        return 0

    client = ObsClient(
        access_key_id=os.environ["OBS_CERT_ACCESS_KEY_ID"],
        secret_access_key=os.environ["OBS_CERT_SECRET_ACCESS_KEY"],
        server=f"https://obs.{region}.myhuaweicloud.com",
    )
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
    attempts = [("real line breaks", lambda text: text), ("escaped line breaks", lambda text: text.replace("\n", "\\n"))]
    try:
        for label, encode in attempts:
            print(f"Uploading the certificate ({label})…")
            response = client.setBucketCustomDomain(
                bucket,
                domain,
                certificateInfo={
                    "name": f"files-{stamp}",
                    "certificate": encode(chain),
                    "privateKey": encode(key),
                },
            )
            if response.status >= 300:
                print(f"  OBS refused it: {response.status} {response.errorCode} {response.errorMessage}")
                continue
            print("  Accepted. Waiting for the domain to serve it…")
            if wait_for(domain, expected, 180):
                print(f"{domain} now serves the new certificate.")
                return 0
            print("  The domain still serves the old certificate.")
    finally:
        client.close()
    print("::error::The new certificate isn't being served. See deploy/storage.md (Troubleshooting).")
    return 1


if __name__ == "__main__":
    sys.exit(main())
