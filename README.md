# web

Personal site, blog, and tools platform. A pnpm + Turborepo monorepo with an Astro site and
shared React UI.

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
apps/web        Astro site (static by default, a Node server for dynamic routes), Tailwind v4
apps/notes      @trilleo/tool-notes: the Notes tool (/tools/notes/)
packages/ui     @trilleo/ui: shared React components + Tailwind theme (theme.css)
packages/db     @trilleo/db: Drizzle schema, migrations, and database client
packages/tool-kit  @trilleo/tool-kit: what tools share (storage, data hook, types)
deploy/         Caddy config, server compose file, deploy and backup scripts, runbook
Dockerfile      Production images: `web` (Caddy + static site) and `app` (Node server)
```

The database needs no setup for development: `pnpm dev` uses PGlite (Postgres compiled
to WebAssembly) in `apps/web/.data/`, and tests use an in-memory one. After changing
`packages/db/src/schema.ts`, run `pnpm --filter @trilleo/db db:generate` and commit the
new migration.

Sign-in (`/admin`) works in development once `apps/web/.env` has a localhost GitHub OAuth
App's credentials: copy `apps/web/.env.example` and see
[deploy/README.md §7](deploy/README.md#7-github-sign-in). The e2e tests use a fake GitHub
and need nothing.

Lint, format, and TypeScript base configs live at the repo root (`eslint.config.js`,
`.prettierrc.json`, `tsconfig.base.json`).

## Deploying

Pushing to `main` deploys to <https://www.trilleo.net> once CI passes. Setup, rollback,
and troubleshooting: [deploy/README.md](deploy/README.md).
