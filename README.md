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
apps/web        Astro site (static by default), Tailwind v4, React islands
packages/ui     @trilleo/ui: shared React components + Tailwind theme (theme.css)
```

Lint, format, and TypeScript base configs live at the repo root (`eslint.config.js`,
`.prettierrc.json`, `tsconfig.base.json`).
