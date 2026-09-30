# Deploying www.trilleo.net

```
push to main ─▶ CI passes ─▶ Deploy workflow
                              ├─ build images ─▶ Huawei SWR  …/web:<commit>  (Caddy + static site)
                              │                              …/app:<commit>  (Astro server, Node)
                              ├─ (in parallel) copy the Postgres image from Docker Hub ─▶ SWR,
                              │     only if SWR doesn't have compose.yaml's tag yet
                              ├─ ssh deploy@server <commit>   (key can only run trilleo-deploy)
                              │     └─ server pulls from SWR, restarts, waits until healthy
                              └─ checks https://www.trilleo.net/version.txt == <commit>

visitor ─HTTPS─▶ Cloudflare ─HTTPS (Origin cert, "Full (strict)")─▶ web (Caddy :443)
                                            static files ◀─┘   └─▶ everything else: app :4321 ─▶ db (Postgres)
```

- The server only answers Cloudflare's IP ranges (`cloudflare-ips.txt`); `trilleo.net`
  redirects to `www.trilleo.net`.
- Caddy serves any file that exists and forwards other requests to the app, so prerendered
  pages (/about, /tools, assets) keep working even if the app is down; the home page and
  posts render on the app. Only Caddy's ports are published.
- The app applies database migrations when it starts; Docker's health check waits for it.
- The web image carries `compose.yaml`, so server config ships with each release.
- Files here: `Caddyfile`, `compose.yaml`, `start-caddy.sh` (image entrypoint),
  `server/trilleo-deploy` and `server/trilleo-backup` (+ `.cron`) (run on the server),
  `smoke-test.sh` and `check-cloudflare-ips.sh` (run by CI).

Placeholders below: `<SERVER_IP>`, `<REGION>` (your Huawei region, e.g. `cn-east-3`),
`<ORG>` (your SWR organization name, e.g. `trilleo`).

## One-time setup

### 1. Cloudflare (dashboard → trilleo.net)

1. **DNS → Records:** `A  @  <SERVER_IP>` and `A  www  <SERVER_IP>` (or `CNAME www
trilleo.net`), both **Proxied** (orange cloud).
2. **SSL/TLS → Overview:** encryption mode **Full (strict)**.
3. **SSL/TLS → Origin Server → Create Certificate:** key type RSA (2048), hostnames
   `trilleo.net` and `*.trilleo.net`, validity 15 years. Keep the page open: you'll paste
   the **Origin Certificate** and the **Private Key** (shown only once) in step 4.
4. **SSL/TLS → Edge Certificates:** turn on **Always Use HTTPS**; set **Minimum TLS
   Version** to 1.2.

### 2. Huawei Cloud SWR (same region as the server)

Chinese console labels in brackets. `<REGION>` is the server's region ID (IAM → My
Credentials 我的凭证 → project list, e.g. 华东-上海一 = `cn-east-3`); the registry is
`swr.<REGION>.myhuaweicloud.com`.

1. **SWR (容器镜像服务) → Organizations (组织管理) → Create Organization (创建组织):**
   `<ORG>`. Names are unique per region across all Huawei users; if `trilleo` is taken,
   pick another (e.g. `trilleo-web`) and use it everywhere as `<ORG>`.
2. **IAM (统一身份认证) → Users (用户) → Create User (创建用户)**, twice:
   `github-swr-push` (GitHub pushes images) and `server-swr-pull` (the server pulls).
   Access type **Programmatic access (编程访问)** only, credential **Access key (访问密钥)**;
   no user group (they get no account-wide permissions). Download each user's
   `credentials.csv` at the end; it's shown only once. (Missed it? User details →
   Security Settings (安全设置) → Create Access Key.)
3. **SWR → Organizations → `<ORG>` → Users tab (用户) → Grant Permission (添加授权):**
   `github-swr-push` → **Edit (编辑)** (push + pull); `server-swr-pull` → **Read (读取)**
   (pull only).
4. **Long-term login for each user:** SWR → **Generate Login Command (登录指令) → Standard
   (通用型登录指令) → Long-Term (长期有效登录指令) → Import Access Keys (导入访问密钥)** →
   that user's `credentials.csv` → **Generate (生成指令)**. The result is
   `docker login -u <REGION>@<AK> -p <SECRET> swr.<REGION>.myhuaweicloud.com`: the value
   after `-u` is the username, after `-p` the password. Don't use _Enhanced_ commands
   (they expire in 24 hours). If there's no Long-Term tab, compute the password with
   `openssl` instead (doesn't echo the SK or save it to history):

   ```bash
   read -r -p 'AK: ' AK; read -r -s -p 'SK: ' SK; echo
   printf '%s' "$AK" | openssl dgst -binary -sha256 -hmac "$SK" | od -An -vtx1 | tr -d ' \n'; echo
   unset SK
   ```

5. Delete both `credentials.csv` files once you have the passwords. A password stays valid
   until its access key is disabled or deleted in IAM, which is also how to revoke it.

### 3. Huawei Cloud security group (the server's)

Inbound rules:

- TCP **443** and **80** from **each IPv4 range** in `cloudflare-ips.txt` (and nothing
  else for these ports).
- TCP **22** from anywhere (GitHub Actions connects from changing addresses; SSH is
  key-only after step 4).

Remove any other rule that opens 80/443 to `0.0.0.0/0`.

### 4. The server (SSH in as root)

**a. Make sure you can log in as root with a key** before step g turns passwords off.
From your PC (PowerShell). Skip `ssh-keygen` if `~\.ssh\id_ed25519.pub` already exists:

```powershell
ssh-keygen -t ed25519                   # press Enter for the default path; a passphrase is recommended
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@<SERVER_IP> "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys"
ssh -o PasswordAuthentication=no root@<SERVER_IP> "echo key login works"
```

The last command must print `key login works` without asking for a password.

Then SSH in as root for the rest of this section, and set your values once (they're
used by the commands below; set them again if you reconnect):

```bash
REGION=cn-east-3    # your region ID from §2
ORG=trilleo         # your SWR organization from §2
```

**b. Install Docker** (from Huawei's mirror of Docker's official repository):

```bash
apt-get update && apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://mirrors.huaweicloud.com/docker-ce/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://mirrors.huaweicloud.com/docker-ce/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update && apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl is-active docker && docker version && docker compose version
```

**c. Create the deploy user, the app directory, and the database password:**

```bash
useradd --create-home --shell /bin/bash deploy
usermod -aG docker deploy
install -d -m 755 -o deploy -g deploy /srv/trilleo
install -d -m 700 -o root -g root /srv/trilleo/certs
echo "swr.$REGION.myhuaweicloud.com/$ORG" > /srv/trilleo/registry
chown deploy:deploy /srv/trilleo/registry
( umask 077; pw="$(openssl rand -hex 32)"; printf 'POSTGRES_PASSWORD=%s\nPGPASSWORD=%s\n' "$pw" "$pw" > /srv/trilleo/db.env )
chown root:deploy /srv/trilleo/db.env && chmod 640 /srv/trilleo/db.env
id deploy && cat /srv/trilleo/registry && ls -l /srv/trilleo/db.env
```

`id deploy` should list the `docker` group, and `db.env` should be `-rw-r-----  root deploy`.
The password is random and never needs typing: Postgres reads `POSTGRES_PASSWORD` the first
time it starts, and the app uses `PGPASSWORD`. Changing it later means changing it inside
Postgres too, so leave it alone.

**d. Install the Origin certificate** from §1 step 3. Paste each into nano, then save with
Ctrl+O, Enter, and exit with Ctrl+X:

```bash
nano /srv/trilleo/certs/origin.pem    # the Origin Certificate (-----BEGIN CERTIFICATE-----…)
nano /srv/trilleo/certs/origin.key    # the Private Key (-----BEGIN PRIVATE KEY-----…)
chown root:root /srv/trilleo/certs/*
chmod 644 /srv/trilleo/certs/origin.pem
chmod 600 /srv/trilleo/certs/origin.key
```

Check it before going on. The names must include `trilleo.net` and `*.trilleo.net`, and
the last two lines must be identical (the key belongs to the certificate):

```bash
openssl x509 -in /srv/trilleo/certs/origin.pem -noout -issuer -enddate -ext subjectAltName
openssl x509 -in /srv/trilleo/certs/origin.pem -noout -pubkey | sha256sum
openssl pkey -in /srv/trilleo/certs/origin.key -pubout | sha256sum
```

**e. Install the deploy and backup scripts.** From your PC, in this repo (PowerShell):

```powershell
scp deploy/server/trilleo-deploy deploy/server/trilleo-backup deploy/server/trilleo-backup.cron root@<SERVER_IP>:/tmp/
```

Then on the server:

```bash
cd /tmp && sed -i 's/\r$//' trilleo-deploy trilleo-backup trilleo-backup.cron   # in case Windows added CRLF
install -o root -g root -m 755 trilleo-deploy trilleo-backup /usr/local/bin/
install -o root -g root -m 644 trilleo-backup.cron /etc/cron.d/trilleo-backup
rm trilleo-deploy trilleo-backup trilleo-backup.cron
sudo -u deploy trilleo-deploy; echo "exit code: $?"
```

The last line should print the usage message and `exit code: 64` (it refuses to run
without a commit hash), which shows it's installed and runnable by `deploy`. The backup
runs nightly at 03:30 (server time) once the first deploy has started the database.

**f. Log the deploy user in to SWR** with the **pull** user from §2. It's stored in
`/home/deploy/.docker/config.json`; Docker's warning that it's unencrypted is expected:

```bash
read -r -p 'Pull user AK: ' PULL_AK
sudo -u deploy -H docker login "swr.$REGION.myhuaweicloud.com" -u "$REGION@$PULL_AK"
# paste the pull user's long-term password at the prompt → "Login Succeeded"
```

**g. SSH: keys only.** Only after step a printed `key login works`. Keep this root session
open until the check below passes, so a mistake can't lock you out:

```bash
cat > /etc/ssh/sshd_config.d/10-trilleo.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
sshd -t && systemctl reload ssh
sshd -T | grep -E '^(passwordauthentication|kbdinteractiveauthentication|permitrootlogin) '
```

It should show `no`, `no`, and `without-password` (sshd's name for `prohibit-password`).
The file is named `10-…` because sshd uses the first value it finds, so it wins over the
`50-cloud-init.conf` many cloud images ship with `PasswordAuthentication yes`. Then, from
a **new** PowerShell window, confirm you can still get in: `ssh root@<SERVER_IP>`.

### 5. The deploy key

A separate key just for GitHub Actions, with **no passphrase** (CI can't type one). On
your PC (PowerShell), in a folder outside the repo:

```powershell
mkdir $env:USERPROFILE\trilleo-keys; cd $env:USERPROFILE\trilleo-keys
ssh-keygen -t ed25519 -f trilleo-deploy -C github-actions-deploy   # press Enter twice: empty passphrase
scp .\trilleo-deploy.pub root@<SERVER_IP>:/tmp/trilleo-deploy.pub
```

On the server, lock that key to the deploy script:

```bash
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
printf 'command="/usr/local/bin/trilleo-deploy",restrict %s\n' "$(tr -d '\r' < /tmp/trilleo-deploy.pub)" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
rm /tmp/trilleo-deploy.pub
cat /home/deploy/.ssh/authorized_keys
```

It should be one line starting `command="/usr/local/bin/trilleo-deploy",restrict ssh-ed25519`.
Test from your PC that the key works but can do nothing except deploy:

```powershell
ssh -i .\trilleo-deploy -o IdentitiesOnly=yes deploy@<SERVER_IP> whoami
```

It should print the `usage: trilleo-deploy …` message rather than `deploy`: whatever
command is sent, the server runs only `trilleo-deploy` (and refuses anything that isn't
a commit hash).

### 6. GitHub settings

From this repo on your PC (PowerShell, with `gh` logged in; check with `gh auth status`).
Don't pipe values into `gh secret set` (`… | gh secret set`): Windows PowerShell adds a
byte-order mark and CRLF line endings, which break the SSH key. The key goes in through
`cmd`'s `<` instead, which passes the file unchanged.

The server's host key comes from your own `known_hosts` (the entry you verified in §4a),
not `ssh-keyscan`: Windows' built-in `ssh-keyscan` can't negotiate with Ubuntu 24.04's
SSH server and prints nothing. The `ssh-keygen -lf -` line must print the server's ED25519
fingerprint (`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` on the server):

```powershell
gh variable set SWR_REGISTRY --body "swr.<REGION>.myhuaweicloud.com"
gh variable set SWR_ORG --body "<ORG>"
gh secret set SWR_USERNAME --body "<REGION>@<PUSH_AK>"
gh secret set SWR_PASSWORD                     # paste the push user's long-term password
gh secret set DEPLOY_HOST --body "<SERVER_IP>"
cmd /c "gh secret set DEPLOY_SSH_KEY < %USERPROFILE%\trilleo-keys\trilleo-deploy"
$hostKey = @(ssh-keygen -F <SERVER_IP> | Where-Object { $_ -match ' ssh-ed25519 ' })
$hostKey | ssh-keygen -lf -
if ($hostKey.Count -eq 1) { gh secret set DEPLOY_KNOWN_HOSTS --body $hostKey[0] } else { "Expected 1 ED25519 line, got $($hostKey.Count)" }
gh variable list; gh secret list
```

The last line should list 2 variables and 5 secrets (values are never shown). Then
delete `$env:USERPROFILE\trilleo-keys` from your PC: GitHub has the key, and if it's
ever needed again, make a new one and update the server's `authorized_keys`.

### 7. GitHub sign-in

Sign-in uses a GitHub **OAuth App** (not a GitHub App). Each OAuth App allows one
callback URL, so production and local development get one each.

1. <https://github.com/settings/applications/new> (Settings → Developer settings → OAuth
   Apps → New OAuth App):
   - Application name `trilleo.net`, homepage `https://www.trilleo.net`
   - Authorization callback URL `https://www.trilleo.net/auth/github/callback`
   - Leave **Enable Device Flow** off. **Register application**, then **Generate a new
     client secret** and keep the page open (the secret is shown once).
2. Your numeric GitHub user ID (usernames can change; IDs can't). From your PC:
   `gh api user --jq .id`
3. On the server, as root. The prompts keep the secret out of shell history; paste it,
   nothing echoes:

   ```bash
   cd /srv/trilleo
   read -r -p 'Client ID: ' id; read -r -s -p 'Client secret: ' secret; echo; read -r -p 'Admin GitHub user ID(s), comma-separated: ' admins
   ( umask 077; printf 'GITHUB_CLIENT_ID=%s\nGITHUB_CLIENT_SECRET=%s\nADMIN_GITHUB_IDS=%s\n' "$id" "$secret" "$admins" > app.env ); unset secret
   chown root:deploy app.env && chmod 640 app.env && ls -l app.env && grep -c . app.env
   ```

   It should list `-rw-r----- root deploy` and count 3 lines. These accounts can use
   /admin; anyone with a GitHub account can sign in to comment.

4. For `pnpm dev`, optionally: a second OAuth App named `trilleo.net (local)`, homepage
   `http://localhost:4321`, callback `http://localhost:4321/auth/github/callback`; copy
   `apps/web/.env.example` to `apps/web/.env` and fill it in.

### 8. First deploy

Push to `main`, or run **Actions → Deploy → Run workflow**. Watch it at
<https://github.com/Trilleo/web/actions>, then open <https://www.trilleo.net> and sign in
at <https://www.trilleo.net/admin>.

### 9. Search engines (optional, any time after the first deploy)

Search consoles show what Google and Bing have indexed, which searches find the site,
and any problems they hit. Each asks you to prove you own the site. A **Domain**
property verified by a DNS TXT record (Google), or Bing's import from Google Search
Console, needs nothing here: skip steps 1–4 for that console and keep the TXT record.
Otherwise use the HTML tag, which the home page adds from `app.env`.

1. **Google:** <https://search.google.com/search-console> → **Add property** → **URL
   prefix** `https://www.trilleo.net/` → **HTML tag**. Copy only the `content="…"` value.
2. **Bing:** <https://www.bing.com/webmasters> → add `https://www.trilleo.net/` →
   **HTML Meta Tag** (the `msvalidate.01` one). Copy only its `content` value. (Bing can
   also import the site from Google Search Console, with no tag.)
3. Add the values to `/srv/trilleo/app.env` and recreate the app:

   ```bash
   cd /srv/trilleo
   printf 'GOOGLE_SITE_VERIFICATION=%s\nBING_SITE_VERIFICATION=%s\n' '<google value>' '<bing value>' >> app.env
   docker compose up -d --force-recreate app
   curl -s https://www.trilleo.net/ | grep -E 'google-site-verification|msvalidate'
   ```

4. Press **Verify** in each console. Keep the values in `app.env` afterwards: both
   engines re-check from time to time.
5. In each console, submit both sitemaps: `https://www.trilleo.net/sitemap-index.xml`
   (pages built with the site) and `https://www.trilleo.net/sitemap-posts.xml` (posts
   and tags, from the database).

6. **IndexNow** (Bing, Yandex and others hear about new and changed posts within
   minutes; Google doesn't take part). Make a key, add it to `app.env`, recreate the
   app, and check that the key file answers:

   ```bash
   cd /srv/trilleo
   key=$(openssl rand -hex 16)
   printf 'INDEXNOW_KEY=%s\n' "$key" >> app.env
   docker compose up -d --force-recreate app
   curl -s "https://www.trilleo.net/$key.txt"   # prints the key
   ```

   /admin's SEO section then says IndexNow is on. Posts are announced when you save
   them, and scheduled ones within ~10 minutes of going live. The key isn't secret (it's
   served publicly) but keep it stable: changing it just means a new key file.

Link previews (Open Graph images, drawn by the app at `/og/…`) need no setup. Check
one by pasting a post's URL into a chat app, or at <https://www.opengraph.xyz>.

## Day to day

- **Deploy:** push to `main`. CI runs, then Deploy. Nothing else to do.
- **Redeploy the current main:** Actions → Deploy → Run workflow.
- **What's live:** `cat /srv/trilleo/current`, or <https://www.trilleo.net/version.txt>.
- **Roll back** (as root; the last 5 releases are kept on the server, older ones are pulled
  again from SWR):

  ```bash
  docker image ls "$(cat /srv/trilleo/registry)/web"   # available commits
  sudo -u deploy trilleo-deploy <older-commit-sha>
  ```

  Rolling back doesn't undo database migrations; they're written to stay compatible with
  the previous release (see `packages/db/src/schema.ts`).

- **Moderate comments:** <https://www.trilleo.net/admin>. A newcomer's comments wait in
  **Review** until you approve one (after that theirs appear at once). You can hide,
  delete, or block from there; blocking hides all of that person's comments and signs
  them out. There are no notifications, so check it now and then.
- **Change who is admin, or the OAuth secret:** edit `/srv/trilleo/app.env`, then
  `cd /srv/trilleo && docker compose up -d --force-recreate app` (a plain restart keeps
  the old values). Someone removed from the list keeps their account but loses /admin.
- **Logs / status:** `cd /srv/trilleo && docker compose ps` and
  `docker compose logs -f app` (or `web`, `db`).
- **Database shell:** `cd /srv/trilleo && docker compose exec db psql -U trilleo`.
- **Backups:** nightly at 03:30 into `/srv/trilleo/backups` (14 days kept; log in
  `/var/log/trilleo-backup.log`). Back up now with `trilleo-backup`. Copy one to your PC
  (PowerShell): `scp root@<SERVER_IP>:/srv/trilleo/backups/<file>.dump .`
- **Restore a backup** (replaces the current data; the app is stopped meanwhile):

  ```bash
  cd /srv/trilleo
  docker compose stop app
  docker compose exec -T db pg_restore -U trilleo -d trilleo --clean --if-exists --single-transaction < backups/<file>.dump
  docker compose start app
  ```

- **Cloudflare IP ranges changed** (CI's "Cloudflare IP list is current" step fails):
  update `cloudflare-ips.txt` and the security group rules, then deploy.
- **Slow deploys after a base image changes:** uploads from GitHub to SWR run at about
  70 KB/s. A normal release uploads a few MB (a minute or two), but a new base image
  (Node, Caddy, or Postgres) is tens of MB, 10–30 minutes, once. That's why they're pinned:
  Dependabot proposes Dockerfile updates monthly; Postgres is updated by changing its tag
  in `compose.yaml` (minor versions within 18 need nothing else).
- **Enforce the Content-Security-Policy:** after browsing the live site with DevTools
  open shows no CSP reports, rename `Content-Security-Policy-Report-Only` to
  `Content-Security-Policy` in `Caddyfile`.
- **Origin certificate** is valid for 15 years; to replace it, redo steps 1.3 and 4d, then
  `sudo -u deploy docker compose restart` in `/srv/trilleo`.

## Troubleshooting

| Symptom                                                        | Likely cause                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare **521** (web server is down)                        | Container not running (`docker compose ps`), or the security group blocks Cloudflare on 443.                                                                                                                                                                                                                                      |
| Cloudflare **522** (timed out)                                 | Security group or provider firewall drops Cloudflare; check the 443 rules and the ICP filing status.                                                                                                                                                                                                                              |
| Cloudflare **525/526** (SSL handshake/invalid)                 | SSL mode isn't Full (strict), or `origin.pem`/`origin.key` don't match or aren't the Origin certificate.                                                                                                                                                                                                                          |
| Cloudflare **520** or empty reply                              | Caddy dropped the connection: Cloudflare's ranges changed; see "Cloudflare IP ranges changed" above.                                                                                                                                                                                                                              |
| Deploy fails at "Log in to Huawei SWR"                         | `SWR_USERNAME` must be `<REGION>@<AK>`; the password is the long-term hex string; check org permissions.                                                                                                                                                                                                                          |
| Deploy fails at "Deploy on the server"                         | `Host key verification failed`: `DEPLOY_KNOWN_HOSTS` is wrong; redo its §6 lines. `Load key … invalid format` or `Permission denied (publickey)`: `DEPLOY_SSH_KEY` isn't the exact key file (set it with §6's `cmd /c` line) or the key isn't in `authorized_keys`. A `docker pull` error: the server's pull login expired (§4f). |
| `Permission denied (publickey)` for root                       | Key login wasn't set up before §4g. Log in via Huawei console → ECS → Remote Login → **VNC**, move `/etc/ssh/sshd_config.d/10-trilleo.conf` away, `systemctl reload ssh`, redo §4a until `key login works`, then restore the file (§4g).                                                                                          |
| Deploy fails at "Check the live site"                          | The site is up but not the new version: check `trilleo-deploy` output in the job log and `docker compose ps`.                                                                                                                                                                                                                     |
| Deploy log: `env file … db.env not found`                      | §4c's `db.env` is missing.                                                                                                                                                                                                                                                                                                        |
| Deploy log: `env file … app.env not found`                     | §7's `app.env` is missing.                                                                                                                                                                                                                                                                                                        |
| `/sign-in` says sign-in isn't set up                           | `app.env` lacks a value, or the app hasn't been recreated since it changed (see "Change who is admin").                                                                                                                                                                                                                           |
| GitHub: "redirect_uri is not associated with this application" | The OAuth App's callback URL isn't exactly `https://www.trilleo.net/auth/github/callback`.                                                                                                                                                                                                                                        |
| Sign-in ends at "That GitHub account can't sign in here"       | The account is blocked: unblock it under **Blocked accounts** on `/admin`.                                                                                                                                                                                                                                                        |
| `/admin` says "Only the site owner can see this page"          | Your ID isn't in `ADMIN_GITHUB_IDS` (`gh api user --jq .id`), or the app wasn't recreated after changing it.                                                                                                                                                                                                                      |
| Deploy log: a container is `unhealthy`                         | The job log shows `docker compose ps` and the app's last log lines. Usually the app can't reach or migrate the database: `docker compose logs db app`. The static site keeps running meanwhile.                                                                                                                                   |
| Cloudflare **502** on some pages only                          | Static pages work but the app is down or restarting: `docker compose ps`, `docker compose logs app`.                                                                                                                                                                                                                              |
