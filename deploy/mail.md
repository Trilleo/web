# Email (Tencent Cloud SES)

The site sends email through **Tencent Cloud SES** (邮件推送) in the **Hong Kong**
region, over SMTP: `smtp.qcloudmail.com`, port **465** (TLS from the first byte). The
sender domain is **automail.trilleo.net**; messages come from
`"Trilleo Network" <no-reply@automail.trilleo.net>`.

What it sends:

- **Codes**: to sign in (/sign-in; an account is its email address) and to confirm a
  new address (/account/email/). Always sent.
- **Address changed**: to the old address after a change, with a link that undoes it.
  Always sent; its body is cleared once sent, like codes.
- **New sign-in** alerts (a browser the account hasn't used lately), which people can
  switch off ("Sign-in alerts").
- **Notifications** people can switch off: replies to their comments, their comments'
  review, decisions on their uploads and Minecraft projects. Each has a one-click
  unsubscribe link (`List-Unsubscribe` + `List-Unsubscribe-Post`).
- **Your replies** to contact messages (/admin/messages/ → "Reply by email").
- **Admin alerts**: new contact messages, files waiting for review, reports, appeals,
  comments waiting. Bundled: at most one email every 10 minutes.

How it works: every message is written to the `mail_messages` table (the outbox) first,
then sent in the background. A failed send is retried after 1, 5, 30, 120 and 360
minutes, then marked **failed**; a permanent refusal (an address that doesn't exist)
fails at once. Code emails have their bodies cleared as soon as they're sent; other
bodies after 30 days; the rows after 180 days. Everything is on
<https://www.trilleo.net/admin/mail/>.

Code: `packages/mail` (template, drivers) and `apps/web/src/lib/mail` (outbox,
addresses, notifications, alerts). Without the settings below the site still runs, but
nobody can sign in by email (only with GitHub): /sign-in and /account/email/ say email
isn't set up, and /admin/mail/ says why.

## One-time setup

Steps 1–3 are in the Tencent Cloud console (<https://console.cloud.tencent.com/ses>,
region **Hong Kong** at the top), 4 in Cloudflare, 5–8 on the server and the site.

### 1. Check the sender domain (邮件推送 → 发信域名 / Sender Domains)

`automail.trilleo.net` should show **verified** (已验证) for every record. If one isn't,
press **Verify** (验证) and fix it in Cloudflare (step 4). The records Tencent asks for
are, roughly:

| Type | Name (in the `trilleo.net` zone) | What it does                                      |
| ---- | -------------------------------- | ------------------------------------------------- |
| MX   | `automail`                       | Proves the domain is yours (and catches bounces). |
| TXT  | `automail`                       | SPF: lets Tencent's servers send for the domain.  |
| TXT  | `qcloud._domainkey.automail`     | DKIM: Tencent signs each message with this key.   |
| TXT  | `_dmarc.automail`                | DMARC: tells inboxes to check SPF and DKIM.       |

Copy the values from the console exactly; don't type them.

### 2. Create the sender address (发信地址 / Sender Address → 新建 / Create)

1. **Sender domain** `automail.trilleo.net`, **address prefix** `no-reply`, **sender
   name** `Trilleo Network`.
2. On its row, **Set SMTP password** (设置SMTP密码). Use a long random one, e.g. from
   a password manager, letters and digits only (no quotes, `$` or spaces: it goes
   into `app.env` as is). Keep it for step 5; Tencent won't show it again.

The SMTP **username** is the full address: `no-reply@automail.trilleo.net`.

### 3. Sending limits (optional but worth a look)

**Overview / 概览** shows the free monthly quota and the daily sending limit (new
accounts start low and grow with good sending). The site sends a handful a day, but a
burst of codes during an attack could hit it: the site limits codes to 10 per account
and 5 per address a day.

You don't need email templates (模板): SMTP sends the site's own content.

### 4. Cloudflare DNS (only if step 1 showed a record missing)

**trilleo.net → DNS → Records → Add record** for each record from step 1, with the
**proxy off** (grey cloud: MX and TXT can't be proxied anyway). Then press **Verify**
in the Tencent console again; DNS takes a few minutes.

If `_dmarc.automail` doesn't exist yet, a safe start is:

```
v=DMARC1; p=none; rua=mailto:<your address>
```

After a few weeks of reports showing everything passes, change `p=none` to
`p=quarantine`.

### 5. Check the server can reach Tencent

Huawei Cloud blocks outgoing port 25, but 465 is open unless the security group's
**outbound** rules were narrowed (the default allows all outbound traffic). On the
server:

```bash
timeout 10 openssl s_client -connect smtp.qcloudmail.com:465 -quiet </dev/null 2>/dev/null | head -1
```

It should print a line starting with `220`. Nothing after 10 seconds: allow outbound
TCP 465 in the server's security group (**Outbound Rules → Add Rule**: TCP 465,
destination `0.0.0.0/0`).

### 6. Settings in `app.env`

On the server (the password is read without echoing it):

```bash
cd /srv/trilleo
read -rsp 'SMTP password: ' pw; echo
( umask 077; printf 'SMTP_HOST=smtp.qcloudmail.com\nSMTP_PORT=465\nSMTP_USER=no-reply@automail.trilleo.net\nSMTP_PASSWORD=%s\n' "$pw" >> app.env ); unset pw
grep -c '^SMTP_' app.env   # 4
docker compose up -d --force-recreate app
```

Optional settings (same file, then recreate the app again):

| Setting         | Default                                             | What for                                                                                                             |
| --------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `MAIL_FROM`     | `"Trilleo Network" <no-reply@automail.trilleo.net>` | Another sender. Must be a sender address created in step 2.                                                          |
| `MAIL_REPLY_TO` | none                                                | Your own address: people's answers to your contact replies go there. Without it, the email says replies aren't read. |
| `MAIL_ADMIN_TO` | your verified address (step 8)                      | Comma-separated addresses for admin alerts, instead of the admins' own.                                              |

```bash
printf 'MAIL_REPLY_TO=%s\n' 'you@example.com' >> app.env
docker compose up -d --force-recreate app
```

### 7. Test it

1. Open <https://www.trilleo.net/admin/mail/>. **Setup → Sending** should say
   `SMTP: no-reply@automail.trilleo.net at smtp.qcloudmail.com:465`, with no warning
   under it.
2. Press **Check connection**: "The SMTP server accepted the connection and the login."
3. **Send a test** to a Gmail or Outlook address and to a QQ / 163 address. The row
   should turn **Sent** within a few seconds, and the email arrive in the inbox (not
   spam).
4. In Gmail, open the test → **⋮ → Show original**: SPF, DKIM and DMARC should all say
   **PASS**. If DKIM fails, the DKIM record from step 1 is wrong or missing.
5. In the same original, check that the links still point at `www.trilleo.net` and
   that there's no extra `<img>` near the end. The privacy policy promises no open or
   click tracking: if Tencent rewrote the links or added a pixel, switch off open/click
   tracking (打开/点击追踪) for the sender in the SES console, and send another test.

### 8. Your own address

Sign in (if your account is from before email sign-in, it takes GitHub's verified
address or asks for one). To use another address, open
<https://www.trilleo.net/account/email/>, enter it and type the code. Then add
`ADMIN_EMAILS=<that address>` to app.env ([README.md §7](README.md#7-github-sign-in)). Keep **Admin alerts** ticked: that's where alerts go (unless `MAIL_ADMIN_TO` is
set). /admin's **Mail** section shows where alerts go.

## Day to day

- **Failed messages** show in red on /admin/mail/ (and as a count on /admin). Open one
  to see Tencent's answer; **Send again** once the cause is fixed. Code emails can't be
  sent again (their body is gone): the person asks for a new code.
- **Change the SMTP password:** set a new one in the console (step 2), replace the
  `SMTP_PASSWORD=` line in `/srv/trilleo/app.env`, then
  `docker compose up -d --force-recreate app`.
- **Bounces and complaints** are listed in the Tencent console (**统计 / Statistics**,
  **退信 / Bounces**). The site marks a message failed when Tencent refuses it at once,
  but it doesn't read later bounces; if an address keeps bouncing, its owner can fix it
  on their account page (or you can tell them).
- **Someone says a code never arrived:** find it on /admin/mail/ (filter **To**). Sent:
  it's in their spam folder or held by their provider. Queued with an error: see the
  error. Not there: they mistyped the address.
- **Turn email off:** remove the `SMTP_*` lines from `app.env` and recreate the app.
  Messages are then kept in the outbox, not sent.

## Troubleshooting

| Symptom                                                   | Cause / fix                                                                                                          |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| /admin/mail/ says "SMTP_HOST is set, but … is missing"    | A line is missing from `app.env`, or it has a typo. Check `grep '^SMTP_' app.env`.                                   |
| Check connection: `Invalid login: 535 …` (EAUTH)          | Wrong `SMTP_USER` (it must be the full sender address) or password. Set a new password (step 2) and update the file. |
| Check connection: `Connection timeout` (ETIMEDOUT)        | Port 465 is blocked going out: step 5. Port 25 never works from Huawei Cloud.                                        |
| Messages fail with `550 … sender not verified` or similar | `MAIL_FROM` isn't a sender address from step 2, or the domain isn't verified (step 1).                               |
| Messages fail with a daily limit / quota error            | Tencent's sending limit (step 3). They're retried for about 9 hours, then failed: **Send again** later.              |
| Emails land in spam                                       | Check SPF/DKIM/DMARC in "Show original" (step 7). A new domain also needs a little time to build a reputation.       |
| The app was changed but nothing is different              | `app.env` changes need `docker compose up -d --force-recreate app`; a plain restart keeps the old values.            |
