# Project: personal site + tools platform

## Working style

- Before starting any non-trivial task, ask me clarifying questions about the
  idea and design instead of assuming. Propose a plan and wait for approval.
- Do not commit after changes.
- Keep changes scoped to one task. Summarize what changed and why at the end.

## Architecture

- pnpm workspaces monorepo, Turborepo for task running.
- apps/web: Astro (TypeScript strict), static by default, server-rendered
  routes only where needed. Tailwind for styling.
- apps/<tool-name>: each standalone tool/app in its own package.
- packages/ui (@trilleo/ui): shared React components and the Tailwind v4
  theme (`theme.css`, CSS `@theme` tokens). Source-only, no build step.
- packages/db: Drizzle schema + client (Postgres).
- Blog content: Markdown/MDX in Astro content collections.
- Workspace packages use the `@trilleo/*` scope.

## Decisions

- Hosting: single VPS with Docker; Caddy for TLS and routing; Postgres on the box
  (Phase 5). The VPS is Huawei Cloud in mainland China (x86_64, Ubuntu 24.04);
  the domain is ICP-filed. Cloudflare proxies it with an Origin certificate
  ("Full (strict)"). Canonical URL: https://www.trilleo.net (apex redirects).
- English only. React for islands and tools.
- Accounts (comments, per-user tool data, admin): GitHub OAuth only.
- Tools are served at /tools/<name> by default; a subdomain only when a tool
  needs its own server.
- New domain, fresh start: no WordPress content or URLs carried over.
- Node 24 LTS, pnpm (version pinned in package.json#packageManager).
  TypeScript stays on 6.x until typescript-eslint and @astrojs/check support 7.
- Design: "Swiss grid" direction (Schibsted Grotesk + Geist Mono, orange accent).
  Light/dark follows the system; the header toggle overrides it, and flipping
  back to the system's choice clears the override.

## Design system

- Tokens and utilities live in packages/ui/src/styles/theme.css; theme logic
  (no-flash init script, toggle) in packages/ui/src/theme.ts.
- Use the semantic color classes (bg-paper, text-ink, text-muted, border-ink,
  bg-accent, text-on-accent, …), never raw hex; the default Tailwind palette is
  disabled. In plain CSS/SVG use the --tr-* variables. No `dark:` variants: the
  tokens switch themselves.
- Breakpoints: phone < 768px (4 columns), md ≥ 768px (8), xl ≥ 1280px (12). Lay
  pages out with `grid-swiss` + `px-page`, and type with the `type-*` roles.
- Fonts are self-hosted from npm (@fontsource-variable/*); no third-party requests.
- Astro scoped styles don't reach child components: wrap a child in an element
  you own if the parent's CSS must place it.

## Blog

- Posts: apps/web/src/content/writing/<slug>.md(x) → /writing/<slug>/. Schema in
  src/content.config.ts; published posts need `pubDate`. `draft: true` posts show
  in `pnpm dev` and the e2e build only, never in production, RSS, or the sitemap.
- Markdown is rendered by Sätteri (Astro 7's default), not remark/rehype: unified
  plugins don't apply. Side notes are a build-time transform of the rendered HTML
  (src/lib/post-html.ts), so they work for .md posts; .mdx posts keep plain
  footnotes and get description-only RSS items.
- SITE_URL (src/lib/site.ts) is https://www.trilleo.net; RSS, sitemap, canonical
  URLs, and robots.txt all derive from it.
- `pnpm build` also builds the Pagefind search index (skipped while there are no
  published posts). `pnpm test:e2e` makes its own drafts-included build in
  apps/web/dist-e2e and serves it on port 4329.
- Vite wraps every `import()` in bundled Astro scripts with a preload helper that
  breaks when Astro inlines the script; load runtime-only modules (like Pagefind)
  from an `is:inline` script instead.

## Deploy

- Runbook: deploy/README.md. Push to main → CI → Deploy workflow builds the
  Dockerfile image (static site + Caddy), pushes it to Huawei SWR, and SSHes to
  the server as `deploy`, whose key can only run /usr/local/bin/trilleo-deploy.
- The server is in mainland China: it can't rely on ghcr.io or Docker Hub. Images
  come from SWR (built outside China by GitHub Actions); Docker comes from
  Huawei's mirror. Don't add runtime pulls from blocked registries.
- deploy/Caddyfile accepts only Cloudflare's ranges (deploy/cloudflare-ips.txt;
  CI checks it against Cloudflare's live list). CSP is report-only for now.
- Server config (deploy/compose.yaml) ships inside the image; changing it only
  needs a deploy. deploy/server/trilleo-deploy changes need a manual reinstall.
- CI's "Docker image" job builds the image and runs deploy/smoke-test.sh.
  Docker isn't installed on the dev machine, so the image is verified in CI.

## Commands

- pnpm install / pnpm dev / pnpm build
- pnpm typecheck / pnpm lint / pnpm test / pnpm test:e2e
- pnpm format / pnpm format:check (Prettier)
- Always run typecheck, lint, and tests before declaring a task done.

## Rules

- TypeScript strict everywhere; no `any` without a comment explaining why.
- Every API route and server page that touches user data must check auth.
- Secrets live only in .env files (gitignored); read them at runtime via
  process.env, never import.meta.env, so they aren't inlined into builds.
- New features need tests: Vitest for logic, Playwright for user flows.

## Adding a new tool

(Fill in once the first tool is added; this becomes the checklist.)
