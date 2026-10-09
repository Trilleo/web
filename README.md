# web

Personal site, blog, tools, games, a Minecraft creator platform and file storage behind
<https://www.trilleo.net>. A pnpm + Turborepo monorepo with an Astro site and shared
React UI.

## Prerequisites

- Node.js 24 LTS (see `.nvmrc`)
- pnpm, at the version pinned in `package.json#packageManager`

If `registry.npmjs.org` is unreachable from your network, point npm/pnpm at a mirror in your
**user-level** config. Don't commit it to the repo; CI uses the default registry.

```bash
npm config set registry https://registry.npmmirror.com
```

## Commands

| Command             | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `pnpm install`      | Install dependencies and set up the pre-commit hook   |
| `pnpm dev`          | Start all dev servers (site at http://localhost:4321) |
| `pnpm build`        | Build every package                                   |
| `pnpm typecheck`    | `astro check` / `tsc --noEmit`                        |
| `pnpm lint`         | ESLint                                                |
| `pnpm test`         | Vitest unit tests                                     |
| `pnpm test:e2e`     | Build, then run Playwright against `astro preview`    |
| `pnpm format`       | Format everything with Prettier                       |
| `pnpm format:check` | Check formatting (used in CI)                         |

First-time Playwright setup: `pnpm --filter @trilleo/web exec playwright install chromium`.

## Layout

```
apps/web            Astro site (static by default, a Node server for dynamic routes), Tailwind v4
apps/notes          @trilleo/tool-notes: Notes (/tools/notes/)
apps/convert        @trilleo/tool-convert: file converter (/tools/convert/)
apps/inspect        @trilleo/tool-inspect: File info (/tools/inspect/)
apps/qr             @trilleo/tool-qr: QR codes (/tools/qr/)
apps/color          @trilleo/tool-color: colors (/tools/color/)
apps/skygrid        @trilleo/game-skygrid: Skygrid, a text-drawn Skyblock-style game (/games/skygrid/)
packages/ui         @trilleo/ui: shared React components + Tailwind theme (theme.css)
packages/db         @trilleo/db: Drizzle schema, migrations, and database client
packages/tool-kit   @trilleo/tool-kit: what tools share (storage, data hook, file helpers)
packages/storage    @trilleo/storage: file storage (OBS and local drivers, upload client,
                    moderation rules, ClamAV client)
packages/mail       @trilleo/mail: email (template, address rules, SMTP and capture drivers)
packages/mc-files   @trilleo/mc-files: reads Minecraft files in the browser (NBT, mod and
                    pack metadata, builds' blocks, 3D preview format and mesher)
deploy/             Caddy config, server compose file, deploy and backup scripts, runbooks
Dockerfile          Production images: `web` (Caddy + static site) and `app` (Node server)
```

The database needs no setup for development: `pnpm dev` uses PGlite (Postgres compiled
to WebAssembly) in `apps/web/.data/`, and tests use an in-memory one. After changing
`packages/db/src/schema.ts`, run `pnpm --filter @trilleo/db db:generate` and commit the
new migration.

File storage needs no setup either: `pnpm dev` keeps uploads in `apps/web/.data/storage`
(production uses a Huawei OBS bucket). Malware scanning is off in development; the e2e
tests run a fake ClamAV. Uploading happens at `/admin/files` (admin), on the Minecraft
creator pages (`/account/minecraft/`, anyone signed in), and for other features through
`@trilleo/storage`'s `uploadFile()` or `<FileUpload>`.

Email needs no setup for development either: `pnpm dev` keeps every message in the
outbox instead of sending it, and the admin reads them at `/admin/mail/` (the e2e tests
read codes there too). People add an address at `/account/email/` to get notifications;
production sends through Tencent Cloud SES over SMTP.

The Minecraft platform lives under `/minecraft/` (public pages, a read-only JSON API at
`/api/minecraft/v1/`) and `/account/minecraft/` (creators); the admin moderates it at
`/admin/minecraft/` and `/admin/files/review`. Its list of Minecraft versions comes
from Mojang's version manifest; set `MINECRAFT_VERSION_MANIFEST=off` in
`apps/web/.env` to work offline with the list kept in the code.

Accounts are their email address: `/sign-in` sends a code (in development it lands in
the outbox, and the dev server prints its subject, which holds the code) and a new
address makes an account (`/sign-up`). To use `/admin` in
development, put your account's address in `ADMIN_EMAILS` in `apps/web/.env` (copy
`apps/web/.env.example`). "Sign in with GitHub" also works once `.env` has a localhost
GitHub OAuth App's credentials: see
[deploy/README.md §7](deploy/README.md#7-github-sign-in). The e2e tests use a fake GitHub
and need nothing. Without an OAuth App, the `web-fake-signin` and `fake-github` entries
in `.claude/launch.json` run a dev server (port 4331, in-memory database) that signs in
against the e2e fake GitHub.

Lint, format, and TypeScript base configs live at the repo root (`eslint.config.js`,
`.prettierrc.json`, `tsconfig.base.json`).

## Deploying

Pushing to `main` deploys to <https://www.trilleo.net> once CI passes. Setup, rollback,
and troubleshooting: [deploy/README.md](deploy/README.md). File storage (the OBS bucket,
`files.trilleo.net`, its certificate, ClamAV and moderation):
[deploy/storage.md](deploy/storage.md). Email (Tencent Cloud SES, the sender domain,
SMTP settings): [deploy/mail.md](deploy/mail.md).

Conventions and architecture notes for contributors (and AI assistants) are in
[CLAUDE.md](CLAUDE.md). Keep these documents current: update them in the same change as
the code they describe.
