# Project: personal site + tools platform

## Working style

- Before starting any non-trivial task, ask me clarifying questions about the
  idea and design instead of assuming. Propose a plan and wait for approval.
- Do not commit after changes.
- Keep changes scoped to one task. Summarize what changed and why at the end.

## Architecture

- pnpm workspaces monorepo, Turborepo for task running.
- apps/web: Astro (TypeScript strict), static by default, server-rendered
  routes only where needed (`export const prerender = false`, run by
  @astrojs/node). Tailwind for styling. Builds to dist/client (static files) and
  dist/server (a self-contained Node server: the build bundles every dependency
  except PGlite, because the app image has no node_modules).
  `pnpm --filter @trilleo/web run check:server` runs the build outside the repo to
  prove it (CI does too); run it after adding server-side dependencies.
- apps/<tool-name>: each standalone tool/app in its own package.
- packages/ui (@trilleo/ui): shared React components and the Tailwind v4
  theme (`theme.css`, CSS `@theme` tokens). Source-only, no build step.
- packages/db (@trilleo/db): Drizzle schema, migrations, and client. Source-only.
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
  apps/web/dist-e2e and serves it on port 4329 with an in-memory database.
- Vite wraps every `import()` in bundled Astro scripts with a preload helper that
  breaks when Astro inlines the script; load runtime-only modules (like Pagefind)
  from an `is:inline` script instead.

## Database

- Schema: packages/db/src/schema.ts. After changing it, run
  `pnpm --filter @trilleo/db db:generate` and commit the migration; CI fails if
  they don't match. Migrations must stay compatible with the previous release
  (add, then remove in a later release), because rollbacks don't undo them.
- Server code gets the database from `getDb()` (apps/web/src/lib/db.ts), which
  connects and applies pending migrations on first use; the health route
  (/api/health) triggers that when the container starts.
- DATABASE_URL: a Postgres URL in production (password via PGPASSWORD),
  `memory://` in e2e; unset in `pnpm dev`, which uses PGlite in
  apps/web/.data/pglite (delete it to reset). Tests use in-memory PGlite. A
  built server also needs MIGRATIONS_DIR.
- PGlite stays out of the server bundle (vite.ssr.external) and is only a dev
  dependency of apps/web; production never imports it.
- Use the query builder in app code: raw `db.execute()` results differ by driver.

## Auth

- GitHub OAuth, hand-written in apps/web/src/lib/auth/: /auth/github → GitHub
  (state + PKCE, no scopes) → /auth/github/callback → a session. Sessions live in
  Postgres as the SHA-256 of the cookie's token; 30 days, extended when used in
  the last 15. Cookie `__Host-trilleo_session` over HTTPS, `trilleo_session` on
  plain-HTTP dev/e2e. GitHub's access token is used once and never stored.
- Anyone with a GitHub account can sign in (to comment); blocked accounts can't,
  and their sessions stop working. ADMIN_GITHUB_IDS only decides who can use
  /admin. After sign-in, visitors land on `next` (default /account).
- src/middleware.ts sets `Astro.locals.user` / `session` on server-rendered
  requests. Guarded pages start with
  `const user = requireUser(Astro); if (user instanceof Response) return user;`
  (or `requireAdmin`) and send `Cache-Control: private, no-store`. Anything that
  changes state is a POST form (Astro's origin check blocks cross-site posts),
  never a GET.
- astro.config's `security.allowedDomains` must list every host the server is
  reached as; otherwise Astro sees `localhost`, and redirect URIs, cookies and the
  origin check all break (the smoke test checks this behind Caddy).
- Settings: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, ADMIN_GITHUB_IDS. Production:
  /srv/trilleo/app.env. Dev: apps/web/.env (from .env.example, loaded in
  astro.config), with a separate localhost OAuth App. E2E signs in against
  e2e/fake-github.ts.
- New private pages: add their prefix to PRIVATE_PATHS (src/lib/site.ts) to keep
  them out of robots.txt and the sitemap.

## Comments

- Post pages stay pre-built; their comments are a server island
  (src/components/comments/CommentSection.astro, `server:defer`), fetched per
  visit and never cached, since they depend on who's signed in.
- Rules live in src/lib/comments/store.ts: people see published comments plus
  their own pending ones; one level of replies (a reply to a reply joins the
  thread); a newcomer's comments wait until the admin approves one, which sets
  users.trusted_at; LIMITS caps bursts, daily totals and pending comments (the
  admin is exempt); deleting a comment that has replies leaves a placeholder;
  blocking hides everything the person wrote and ends their sessions.
- Formatting (src/lib/comments/render.ts) is markdown-it's "zero" preset with a
  fixed list of rules, HTML off, and only http(s) or site-relative links (rel
  nofollow ugc). Changing what's enabled means updating its XSS tests too.
- All actions are plain POST forms that work without JavaScript: /comments (a
  refused comment gets a page that keeps the text), /comments/delete,
  /admin/moderate, /account/delete. Only published posts take comments.
- E2E tests share one database, run in parallel and may be retried: commenters
  are fresh accounts (`freshLogin()` in e2e/support.ts) with unique comment text,
  and no test may sign the shared admin out everywhere.

## Deploy

- Runbook: deploy/README.md. Push to main → CI → Deploy workflow builds two
  images from the Dockerfile (`web`: Caddy + static files; `app`: the Astro
  server), copies the Postgres image to Huawei SWR, pushes everything there, and
  SSHes to the server as `deploy`, whose key can only run
  /usr/local/bin/trilleo-deploy.
- The server is in mainland China: it can't rely on ghcr.io or Docker Hub. Images
  come from SWR (built outside China by GitHub Actions); Docker comes from
  Huawei's mirror. Don't add runtime pulls from blocked registries.
- Uploads from GitHub to SWR are slow (~70 KB/s), so base images are pinned by
  digest in the Dockerfile (Dependabot bumps them monthly) and Postgres by exact
  tag in compose.yaml; the Deploy workflow copies Postgres only when SWR lacks
  that tag. A new base image means one 10–30 minute deploy. Keep images small.
- deploy/Caddyfile accepts only Cloudflare's ranges (deploy/cloudflare-ips.txt;
  CI checks it against Cloudflare's live list). It serves files that exist and
  proxies everything else to the app, so new server routes need no Caddy change;
  /api/health stays internal. CSP is report-only for now.
- Server config (deploy/compose.yaml) ships inside the web image; changing it only
  needs a deploy. deploy/server/* changes (trilleo-deploy, trilleo-backup) need a
  manual reinstall. Server-only secrets live in /srv/trilleo/*.env, never in git
  or GitHub.
- CI's "Docker image" job builds both images and runs deploy/smoke-test.sh, which
  starts the whole stack like the server does (including a backup). Docker isn't
  installed on the dev machine, so the images are verified in CI.

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
