# web

Personal site, blog, tools, games and file storage behind <https://www.trilleo.net>. A
pnpm + Turborepo monorepo with an Astro site and shared React UI.

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
deploy/             Caddy config, server compose file, deploy and backup scripts, runbooks
Dockerfile          Production images: `web` (Caddy + static site) and `app` (Node server)
```

The database needs no setup for development: `pnpm dev` uses PGlite (Postgres compiled
to WebAssembly) in `apps/web/.data/`, and tests use an in-memory one. After changing
`packages/db/src/schema.ts`, run `pnpm --filter @trilleo/db db:generate` and commit the
new migration.

File storage needs no setup either: `pnpm dev` keeps uploads in `apps/web/.data/storage`
(production uses a Huawei OBS bucket). Malware scanning is off in development; the e2e
tests run a fake ClamAV. Uploading happens at `/admin/files` (admin) and, for features
that let people upload, through `@trilleo/storage`'s `uploadFile()` or `<FileUpload>`.

Sign-in (`/admin`) works in development once `apps/web/.env` has a localhost GitHub OAuth
App's credentials: copy `apps/web/.env.example` and see
[deploy/README.md §7](deploy/README.md#7-github-sign-in). The e2e tests use a fake GitHub
and need nothing.

Lint, format, and TypeScript base configs live at the repo root (`eslint.config.js`,
`.prettierrc.json`, `tsconfig.base.json`).

## Deploying

Pushing to `main` deploys to <https://www.trilleo.net> once CI passes. Setup, rollback,
and troubleshooting: [deploy/README.md](deploy/README.md). File storage (the OBS bucket,
`files.trilleo.net`, its certificate, ClamAV and moderation):
[deploy/storage.md](deploy/storage.md).

Conventions and architecture notes for contributors (and AI assistants) are in
[CLAUDE.md](CLAUDE.md).
