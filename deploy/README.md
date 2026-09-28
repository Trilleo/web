# Deploying www.trilleo.net

```
push to main ─▶ CI passes ─▶ Deploy workflow
                              ├─ build image (site + Caddy) ─▶ Huawei SWR  …/web:<commit>
                              ├─ ssh deploy@server <commit>   (key can only run trilleo-deploy)
                              │     └─ server pulls from SWR, restarts, waits until healthy
                              └─ checks https://www.trilleo.net/version.txt == <commit>

visitor ─HTTPS─▶ Cloudflare ─HTTPS (Origin cert, "Full (strict)")─▶ Caddy :443 on the server
```

- The server only answers Cloudflare's IP ranges (`cloudflare-ips.txt`); `trilleo.net`
  redirects to `www.trilleo.net`.
- The image carries its own `compose.yaml`, so server config ships with each release.
- Files here: `Caddyfile`, `compose.yaml`, `start-caddy.sh` (image entrypoint),
  `server/trilleo-deploy` (runs on the server), `smoke-test.sh` and
  `check-cloudflare-ips.sh` (run by CI).

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

1. **SWR → Organizations → Create:** `<ORG>`.
2. **IAM → Users → Create** two users with _programmatic access_ only, and save each one's
   access key (AK/SK):
   - `github-swr-push`: GitHub Actions pushes images with it.
   - `server-swr-pull`: the server pulls images with it.
3. **SWR → Organizations → `<ORG>` → Users/Permissions:** give `github-swr-push` **Edit**
   (push) and `server-swr-pull` **Read** (pull). (Console labels may differ slightly; if a
   login is refused later, check these permissions first.)
4. For **each** user, turn its AK/SK into a long-term registry password. Run this in any
   shell with `openssl` (the server, WSL, or Git Bash). It doesn't echo the SK or save it
   to history:

   ```bash
   read -r -p 'AK: ' AK; read -r -s -p 'SK: ' SK; echo
   printf '%s' "$AK" | openssl dgst -binary -sha256 -hmac "$SK" | od -An -vtx1 | tr -d ' \n'; echo
   unset SK
   ```

   The registry username is `<REGION>@<AK>`; the printed hex string is the password.

### 3. Huawei Cloud security group (the server's)

Inbound rules:

- TCP **443** and **80** from **each IPv4 range** in `cloudflare-ips.txt` (and nothing
  else for these ports).
- TCP **22** from anywhere (GitHub Actions connects from changing addresses; SSH is
  key-only after step 4).

Remove any other rule that opens 80/443 to `0.0.0.0/0`.

### 4. The server (SSH in as root)

**a. Make sure you can log in as root with a key** before step g turns passwords off.
From your PC, if you don't have a key on the server yet (PowerShell):

```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@<SERVER_IP> "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

**b. Install Docker** (from Huawei's mirror of Docker's official repository):

```bash
apt-get update && apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://mirrors.huaweicloud.com/docker-ce/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://mirrors.huaweicloud.com/docker-ce/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update && apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
docker version && docker compose version
```

**c. Create the deploy user and the app directory:**

```bash
useradd --create-home --shell /bin/bash deploy
usermod -aG docker deploy
install -d -m 755 -o deploy -g deploy /srv/trilleo
install -d -m 700 -o root -g root /srv/trilleo/certs
echo "swr.<REGION>.myhuaweicloud.com/<ORG>/web" > /srv/trilleo/image-repo
chown deploy:deploy /srv/trilleo/image-repo
```

**d. Install the Origin certificate** from step 1.3 (paste each, then Ctrl+O, Enter, Ctrl+X):

```bash
nano /srv/trilleo/certs/origin.pem    # the Origin Certificate
nano /srv/trilleo/certs/origin.key    # the Private Key
chown root:root /srv/trilleo/certs/*
chmod 644 /srv/trilleo/certs/origin.pem
chmod 600 /srv/trilleo/certs/origin.key
```

**e. Install the deploy script.** From your PC, in this repo:

```powershell
scp deploy/server/trilleo-deploy root@<SERVER_IP>:/usr/local/bin/trilleo-deploy
```

Then on the server:

```bash
sed -i 's/\r$//' /usr/local/bin/trilleo-deploy   # in case Windows added CRLF line endings
chown root:root /usr/local/bin/trilleo-deploy
chmod 755 /usr/local/bin/trilleo-deploy
```

**f. Log the deploy user in to SWR** with the **pull** user from step 2 (it's stored in
`/home/deploy/.docker/config.json`):

```bash
sudo -u deploy docker login swr.<REGION>.myhuaweicloud.com -u '<REGION>@<PULL_AK>'
# paste the pull user's long-term password at the prompt
```

**g. SSH: keys only.** (Only after step a works!)

```bash
cat > /etc/ssh/sshd_config.d/10-trilleo.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
sshd -t && systemctl reload ssh
```

### 5. The deploy key

On your PC (PowerShell, in a folder outside the repo):

```powershell
ssh-keygen -t ed25519 -f trilleo-deploy -C github-actions-deploy -N '""'
Get-Content trilleo-deploy.pub
```

On the server, lock that key to the deploy script (paste the `.pub` line in place of
`ssh-ed25519 AAAA…`):

```bash
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
echo 'command="/usr/local/bin/trilleo-deploy",restrict ssh-ed25519 AAAA… github-actions-deploy' > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub   # note this fingerprint for step 6
```

### 6. GitHub settings

From this repo on your PC (PowerShell, `gh` logged in). Check that the fingerprint
`ssh-keyscan` prints matches the one from step 5 before trusting it:

```powershell
gh variable set SWR_REGISTRY --body "swr.<REGION>.myhuaweicloud.com"
gh variable set SWR_ORG --body "<ORG>"
gh secret set SWR_USERNAME --body "<REGION>@<PUSH_AK>"
gh secret set SWR_PASSWORD                     # paste the push user's long-term password
gh secret set DEPLOY_HOST --body "<SERVER_IP>"
Get-Content path\to\trilleo-deploy -Raw | gh secret set DEPLOY_SSH_KEY
ssh-keyscan -t ed25519 <SERVER_IP> | Tee-Object -Variable hostKey | ssh-keygen -lf -
$hostKey | gh secret set DEPLOY_KNOWN_HOSTS
```

Then delete the private key file `trilleo-deploy` from your PC (GitHub has it; if it's
ever needed again, make a new one).

### 7. First deploy

Push to `main`, or run **Actions → Deploy → Run workflow**. Watch it at
<https://github.com/Trilleo/web/actions>, then open <https://www.trilleo.net>.

## Day to day

- **Deploy:** push to `main`. CI runs, then Deploy. Nothing else to do.
- **Redeploy the current main:** Actions → Deploy → Run workflow.
- **What's live:** `cat /srv/trilleo/current`, or <https://www.trilleo.net/version.txt>.
- **Roll back** (as root; the last 5 releases are kept on the server, older ones are pulled
  again from SWR):

  ```bash
  docker image ls "$(cat /srv/trilleo/image-repo)"   # available commits
  sudo -u deploy trilleo-deploy <older-commit-sha>
  ```

- **Logs / status:** `cd /srv/trilleo && sudo -u deploy docker compose ps` and
  `sudo -u deploy docker compose logs -f`.
- **Cloudflare IP ranges changed** (CI's "Cloudflare IP list is current" step fails):
  update `cloudflare-ips.txt` and the security group rules, then deploy.
- **Enforce the Content-Security-Policy:** after browsing the live site with DevTools
  open shows no CSP reports, rename `Content-Security-Policy-Report-Only` to
  `Content-Security-Policy` in `Caddyfile`.
- **Origin certificate** is valid for 15 years; to replace it, redo steps 1.3 and 4d, then
  `sudo -u deploy docker compose restart` in `/srv/trilleo`.

## Troubleshooting

| Symptom                                        | Likely cause                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Cloudflare **521** (web server is down)        | Container not running (`docker compose ps`), or the security group blocks Cloudflare on 443.                  |
| Cloudflare **522** (timed out)                 | Security group or provider firewall drops Cloudflare; check the 443 rules and the ICP filing status.          |
| Cloudflare **525/526** (SSL handshake/invalid) | SSL mode isn't Full (strict), or `origin.pem`/`origin.key` don't match or aren't the Origin certificate.      |
| Cloudflare **520** or empty reply              | Caddy dropped the connection: Cloudflare's ranges changed; see "Cloudflare IP ranges changed" above.          |
| Deploy fails at "Log in to Huawei SWR"         | `SWR_USERNAME` must be `<REGION>@<AK>`; the password is the long-term hex string; check org permissions.      |
| Deploy fails at "Deploy on the server"         | `DEPLOY_HOST`/`DEPLOY_KNOWN_HOSTS` wrong, key not in `authorized_keys`, or the server's pull login expired.   |
| Deploy fails at "Check the live site"          | The site is up but not the new version: check `trilleo-deploy` output in the job log and `docker compose ps`. |
