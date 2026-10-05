# File storage (Huawei OBS)

The site keeps uploaded files in the OBS bucket **trilleo-web-storage** (region
**cn-southwest-2**, CN Southwest-Guiyang1). Postgres records what each file is (the
`files` table); the bucket only holds the bytes.

- **Uploads** go from the browser **straight to OBS**, in parts, through short-lived
  signed URLs the app hands out. The bytes never pass through the server or
  Cloudflare. That's why the bucket needs a CORS rule.
- **Downloads** of published files come from **https://files.trilleo.net**, the bucket's
  own custom domain. It's set to **DNS only** in Cloudflare, so visitors in China reach
  OBS directly. OBS serves the HTTPS certificate itself: a Let's Encrypt certificate
  that a GitHub workflow renews every month (`.github/workflows/files-cert.yml`).
- The bucket stays **private**. Publishing a file gives that one object a public-read
  ACL; taking it down makes it private again.
- Files that aren't public (waiting for review, private) download through
  `https://www.trilleo.net/d/<id>`, which redirects their owner or the admin to a
  5-minute signed link.

Code: `packages/storage` (drivers, rules, uploader) and `apps/web/src/lib/storage`
(database, API, processing). Without the settings below the site still runs, and
/admin/files says storage isn't set up.

## One-time setup

Do these in order. Steps 1–4 are in the Huawei Cloud console, 5 in Cloudflare, 6–8 on
GitHub and the server.

### 1. Bucket settings (OBS console → Buckets → trilleo-web-storage)

1. **Overview → Basic Information**: check that the bucket ACL / bucket policy is
   **Private**, and leave **Versioning** off (the site never overwrites a file; deleted
   files are kept for a while by the site itself).
2. **Permissions → CORS Rules → Create**, then **OK**:

   | Field             | Value                     |
   | ----------------- | ------------------------- |
   | Allowed Origin    | `https://www.trilleo.net` |
   | Allowed Method    | `PUT`, `GET`, `HEAD`      |
   | Allowed Header    | `*`                       |
   | Exposed Header    | `ETag`                    |
   | Cache Duration(s) | `3600`                    |

   To try OBS from `pnpm dev` later, add a second rule with origin
   `http://localhost:4321`.

3. **Data Management → Lifecycle Rules → Create**: name `abort-unfinished-uploads`,
   status **Enable**, prefix `f/`. Leave current-version and historical-version
   expiration **off** and set only **Fragments** (incomplete multipart uploads) to expire
   after **1** day. Without this rule, an upload someone abandons would leave its parts
   in the bucket (and on the bill).

### 2. An IAM user for the app

The app gets keys that can only touch objects in this bucket.

1. **IAM console → Permissions → Policies/Roles → Create Custom Policy**:
   - Name `trilleo-storage-app`, policy view **JSON**, scope **Global services**:

   ```json
   {
     "Version": "1.1",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "obs:object:PutObject",
           "obs:object:GetObject",
           "obs:object:DeleteObject",
           "obs:object:PutObjectAcl",
           "obs:object:AbortMultipartUpload",
           "obs:object:ListMultipartUploadParts"
         ],
         "Resource": ["OBS:*:*:object:trilleo-web-storage/*"]
       }
     ]
   }
   ```

2. **IAM → Users → Create User**: name `trilleo-storage`, access type **Programmatic
   access** only (no console login), credential type **Access key**. On the permissions
   page, attach **trilleo-storage-app** only. Finish and **download the access key**
   (`credentials.csv`: Access Key Id and Secret Access Key). It's shown only once.

### 3. An IAM user for the certificate workflow

A second, separate user that can only change the bucket's custom-domain settings
(the monthly workflow uses it to install certificates).

1. Custom policy `trilleo-files-cert`, JSON, **Global services**:

   ```json
   {
     "Version": "1.1",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "obs:bucket:PutBucketCustomDomainConfiguration",
           "obs:bucket:GetBucketCustomDomainConfiguration"
         ],
         "Resource": ["OBS:*:*:bucket:trilleo-web-storage"]
       }
     ]
   }
   ```

2. User `trilleo-files-cert`, programmatic access only, policy **trilleo-files-cert**
   only. Download its access key.

### 4. Bind the custom domain (OBS console)

Do step 5.1 (the DNS record) first, then: **Buckets → trilleo-web-storage → Domain
Name Mgmt → Configure User Domain Name** → `files.trilleo.net` → **OK**. Skip the
certificate here; the workflow adds it in step 7. OBS checks the ICP filing at this
point. If it refuses the domain, the error says why (usually the filing isn't linked to
this Huawei account yet).

### 5. Cloudflare (dashboard → trilleo.net)

1. **DNS → Records → Add record**:
   - Type `CNAME`, name `files`, target
     `trilleo-web-storage.obs.cn-southwest-2.myhuaweicloud.com`
   - **Proxy status: DNS only** (grey cloud). This matters: proxied, visitors in China
     would go through Cloudflare's overseas network, and OBS's certificate check would
     fail.
   - TTL Auto. **Save**.
2. **DNS → Records**: if the zone has **CAA** records, add one allowing Let's Encrypt:
   type `CAA`, name `files` (or `@`), tag **Only allow specific hostnames**, CA domain
   `letsencrypt.org`. With no CAA records at all, nothing is needed.
3. An API token for the certificate workflow: **My Profile → API Tokens → Create
   Token → Edit zone DNS (Use template)**. Under **Zone Resources** choose **Include →
   Specific zone → trilleo.net**. **Continue to summary → Create Token**, and copy the
   token (shown once).

### 6. GitHub secrets (from your PC, in the repo folder)

Each command prompts for the value (paste it; nothing is echoed or saved in history):

```bash
gh secret set CLOUDFLARE_DNS_API_TOKEN
```

```bash
gh secret set OBS_CERT_ACCESS_KEY_ID
```

```bash
gh secret set OBS_CERT_SECRET_ACCESS_KEY
```

The last two are the **trilleo-files-cert** user's keys (step 3), not the app's.

### 7. The first certificate

**GitHub → Actions → Files certificate → Run workflow**. It takes 2–5 minutes. It
issues a certificate for `files.trilleo.net`, installs it on the bucket, and waits
until the domain actually serves it. Then, from your PC:

```bash
curl -sI https://files.trilleo.net/
```

A `404` or `403` from OBS with no TLS error means it works (there's nothing at `/`).
From now on the workflow renews the certificate on the 1st of every month. GitHub
emails you if a run fails.

### 8. The app's settings (on the server, as root)

Add the **trilleo-storage** user's keys (step 2) to `app.env`. The prompts keep the
secret out of shell history:

```bash
cd /srv/trilleo
read -r -p 'Access Key Id: ' ak; read -r -s -p 'Secret Access Key: ' sk; echo
( umask 077; printf 'OBS_BUCKET=trilleo-web-storage\nOBS_REGION=cn-southwest-2\nOBS_ACCESS_KEY_ID=%s\nOBS_SECRET_ACCESS_KEY=%s\nFILES_URL=https://files.trilleo.net\n' "$ak" "$sk" >> app.env ); unset sk
docker compose up -d --force-recreate app
grep -c '^OBS_' app.env
```

It should count 4 lines. The server reaches the bucket over Huawei's internal network
(same region), so its own reads cost no traffic.

### 9. Check it end to end

After the next deploy (or now, if the release with storage is already live):

1. <https://www.trilleo.net/admin/files/> no longer says storage isn't set up.
2. Upload a small image. It should end up **Published**.
3. Open it (the name links to its page): the preview loads from `files.trilleo.net`,
   and **Download** works.
4. Take it down with a reason: its `files.trilleo.net` address now answers 403 (your
   own browser may still show it from cache for up to a day). **Restore** brings it
   back.

## How it behaves

- **Limits** (packages/storage/src/limits.ts): 1 GiB per file. Signed-in users get
  2 GiB in total and 200 MiB per file; trusted uploaders 10 GiB and 1 GiB; the admin has
  no total limit. For now only the admin can upload (the `site` purpose). People's
  uploads use the `shared` purpose, which stays off until a feature (the creator
  platform) turns it on in `apps/web/src/lib/storage/purposes.ts`. To switch it on
  early without a code change, add `STORAGE_ENABLE_PURPOSES=shared` to `app.env`.
- **Types**: almost anything. Images, audio, video and PDF open in the browser; every
  other type downloads. HTML, SVG and scripts are stored as plain bytes and always
  download, so nothing on `files.trilleo.net` can run as a web page. Programs (`.exe`,
  `.apk`, …) are admin-only. A file whose bytes don't match its name (a ".png" that's
  really HTML) is refused.
- **Life of a file**: uploading → processing (size check, type check, SHA-256) →
  published, or waiting for review for uploads that need it. The admin can approve,
  refuse, take down (with a reason the uploader sees), restore and delete. Every
  change is logged in `storage_events`, shown as the file's history on its page.
- **Moderation** (packages/storage/src/policy.ts):
  - A newcomer's public uploads wait in the review queue (/admin/files/review). After
    3 approved uploads with no strikes they publish straight away; you can also trust
    someone by hand (**Approve & trust**, or the Trust switch), or never.
  - Refusing or taking down a file gives the uploader a **strike** (90 days) and blocks
    those exact bytes from being uploaded again. Tick **No strike** for honest
    mistakes. **3 active strikes ban uploading**; you can also ban by hand, and lift a
    ban (optionally clearing the strikes).
  - Anyone signed in can **report** a public file from its page. Reports land in the
    queue's Reports tab; 3 reports from accounts at least a week old hide the file
    until you decide (the site owner's own files are never hidden this way).
  - Uploaders see reasons, strikes and bans on /account/files and can **appeal** each
    refused or taken-down file once. Accepting restores the file, clears its strike
    (lifting a strike ban) and unblocks its bytes. Files with an open appeal aren't
    purged.
  - **Spot checks**: trusted uploaders' files that nobody has looked at yet.
- **Clean-up** (every ~10 minutes, in the background): uploads unfinished after a day
  are cancelled; bytes of deleted and refused files are purged after 7 days, taken-down
  files after 30. The row stays as a record.
- **Caching**: public files are cached by browsers for a day, so a takedown reaches
  everyone within a day.

## Malware scanning (ClamAV)

The `clamav` service in compose.yaml scans every upload. Nothing to set up: the
Deploy workflow copies its image to SWR (once, slowly), and on first start it
downloads its virus signatures (a few hundred MB) into the `clamav-db` volume,
which takes several minutes. Until then, and whenever clamd is down, new uploads
from other people wait for review marked **Not scanned**, and are scanned again
every half hour or so: clean ones held only for the scan publish by themselves.
It needs about 1.5 GB of RAM (the server has 4 GB).

- Malware in someone's upload: refused automatically, a strike, and the bytes are
  blocked. In your own uploads it's only shown (file page, /admin/files).
- Check it's running: `docker compose logs --tail 30 clamav` should end with clamd
  listening, and `docker compose exec clamav clamdcheck.sh` prints "Clamd is up".
- If signature downloads fail from China (freshclam errors in those logs), the
  fallback is a GitHub Action that mirrors the signatures into the bucket and a
  `FRESHCLAM_CONF_PrivateMirror` setting pointing at it; ask for it then.

## Backups

The nightly `pg_dump` covers the `files` table (what exists), not the bytes in OBS.
OBS stores objects redundantly within the region. If you want a second copy, turn on
**Cross-Region Replication** to a bucket in another region (it costs storage there).

## Troubleshooting

- **Uploads fail at once, with a CORS error in the browser console**: the bucket's CORS
  rule (step 1.2) is missing or has a different origin.
- **Uploads fail with "File storage isn't answering"**: the app's logs
  (`docker compose logs app | grep -i storage`) show OBS's error. `SignatureDoesNotMatch`
  or `InvalidAccessKeyId`: check the keys in `app.env`. `AccessDenied`: the IAM policy
  (step 2) isn't attached, or names another bucket.
- **/admin/files says storage isn't set up**: `app.env` lacks `OBS_BUCKET`, or the app
  wasn't recreated after editing it. If `OBS_BUCKET` is set but a key is missing, the
  app logs which one.
- **The certificate workflow fails**:
  - at "Issue a certificate": the Cloudflare token can't edit the zone's DNS, or a CAA
    record doesn't allow Let's Encrypt (step 5).
  - at "Install it on the bucket" with an OBS error: check the `OBS_CERT_*` secrets, and
    that the domain is bound (step 4).
  - "The new certificate isn't being served": OBS accepted the upload in both formats
    the script tries, but the domain still shows the old certificate. Keep the run's
    log: `deploy/files-cert.py` needs adjusting to what OBS expects. Until then, the
    old certificate keeps working until it expires (up to 90 days after it was issued).
