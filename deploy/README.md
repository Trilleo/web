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

**c. Create the deploy user and the app directory:**

```bash
useradd --create-home --shell /bin/bash deploy
usermod -aG docker deploy
install -d -m 755 -o deploy -g deploy /srv/trilleo
install -d -m 700 -o root -g root /srv/trilleo/certs
echo "swr.$REGION.myhuaweicloud.com/$ORG/web" > /srv/trilleo/image-repo
chown deploy:deploy /srv/trilleo/image-repo
id deploy && cat /srv/trilleo/image-repo
```

`id deploy` should list the `docker` group.

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

**e. Install the deploy script.** From your PC, in this repo (PowerShell):

```powershell
scp deploy/server/trilleo-deploy root@<SERVER_IP>:/usr/local/bin/trilleo-deploy
```

Then on the server:

```bash
sed -i 's/\r$//' /usr/local/bin/trilleo-deploy   # in case Windows added CRLF line endings
chown root:root /usr/local/bin/trilleo-deploy
chmod 755 /usr/local/bin/trilleo-deploy
sudo -u deploy trilleo-deploy; echo "exit code: $?"
```

The last line should print the usage message and `exit code: 64` (it refuses to run
without a commit hash), which shows it's installed and runnable by `deploy`.

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
Before the `DEPLOY_KNOWN_HOSTS` line, check that the fingerprint `ssh-keyscan` prints
matches the server's (`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` on the server):

```powershell
gh variable set SWR_REGISTRY --body "swr.<REGION>.myhuaweicloud.com"
gh variable set SWR_ORG --body "<ORG>"
gh secret set SWR_USERNAME --body "<REGION>@<PUSH_AK>"
gh secret set SWR_PASSWORD                     # paste the push user's long-term password
gh secret set DEPLOY_HOST --body "<SERVER_IP>"
Get-Content $env:USERPROFILE\trilleo-keys\trilleo-deploy -Raw | gh secret set DEPLOY_SSH_KEY
ssh-keyscan -t ed25519 <SERVER_IP> | Tee-Object -Variable hostKey | ssh-keygen -lf -
$hostKey | gh secret set DEPLOY_KNOWN_HOSTS
gh variable list; gh secret list
```

The last line should list 2 variables and 5 secrets (values are never shown). Then
delete `$env:USERPROFILE\trilleo-keys` from your PC: GitHub has the key, and if it's
ever needed again, make a new one and update the server's `authorized_keys`.

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

| Symptom                                        | Likely cause                                                                                                                                                                                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare **521** (web server is down)        | Container not running (`docker compose ps`), or the security group blocks Cloudflare on 443.                                                                                                                                             |
| Cloudflare **522** (timed out)                 | Security group or provider firewall drops Cloudflare; check the 443 rules and the ICP filing status.                                                                                                                                     |
| Cloudflare **525/526** (SSL handshake/invalid) | SSL mode isn't Full (strict), or `origin.pem`/`origin.key` don't match or aren't the Origin certificate.                                                                                                                                 |
| Cloudflare **520** or empty reply              | Caddy dropped the connection: Cloudflare's ranges changed; see "Cloudflare IP ranges changed" above.                                                                                                                                     |
| Deploy fails at "Log in to Huawei SWR"         | `SWR_USERNAME` must be `<REGION>@<AK>`; the password is the long-term hex string; check org permissions.                                                                                                                                 |
| Deploy fails at "Deploy on the server"         | `DEPLOY_HOST`/`DEPLOY_KNOWN_HOSTS` wrong, key not in `authorized_keys`, or the server's pull login expired.                                                                                                                              |
| `Permission denied (publickey)` for root       | Key login wasn't set up before §4g. Log in via Huawei console → ECS → Remote Login → **VNC**, move `/etc/ssh/sshd_config.d/10-trilleo.conf` away, `systemctl reload ssh`, redo §4a until `key login works`, then restore the file (§4g). |
| Deploy fails at "Check the live site"          | The site is up but not the new version: check `trilleo-deploy` output in the job log and `docker compose ps`.                                                                                                                            |
