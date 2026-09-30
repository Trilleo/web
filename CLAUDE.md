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
- apps/<tool-name> (@trilleo/tool-<name>): each tool in its own source-only
  package, exporting its details (`./meta`) and a React app that apps/web mounts
  at /tools/<name>/. First tool: apps/notes.
- apps/<game-name> (@trilleo/game-<name>): each game in its own source-only
  package, like tools (`.` the React app, `./meta` its `GameMeta`), mounted at
  /games/<name>/. First game: apps/skygrid.
- packages/tool-kit (@trilleo/tool-kit): what tools share: `ToolMeta`, storage
  (this browser, or the account via the data API), and the `useToolItems` hook.
- packages/ui (@trilleo/ui): shared React components and the Tailwind v4
  theme (`theme.css`, CSS `@theme` tokens). Source-only, no build step.
- packages/db (@trilleo/db): Drizzle schema, migrations, and client. Source-only.
- Blog content: Markdown posts in Postgres, written in the admin editor (/admin/posts).
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
- Design: "Swiss grid" direction (Schibsted Grotesk + Geist Mono, orange accent),
  with Source Serif 4 for reading text.
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
- Small labels ("(01)", "About", post meta, contents) hang in a left column:
  2 of 8 columns on iPad, 2 of 12 on desktop, so content starts at column 3.
  Right-hand asides take columns 10–12 on desktop; post text is columns 3–9.
- Fonts are self-hosted from npm (@fontsource-variable/*); no third-party requests.
- Typefaces by role: the grotesk (`font-sans`) for headings, UI and quotes; the
  serif (`font-serif`, Source Serif 4 with optical sizes) for reading text: .prose
  (posts, rendered notes), .comment-body, and `type-dek`; mono for labels and code.
- Astro scoped styles don't reach child components: wrap a child in an element
  you own if the parent's CSS must place it.

## Motion

- Crisp, not bouncy: 150/260/450ms (`--tr-dur-fast|base|slow`), `ease-swiss`
  (plus `-out` for entrances, `-in` for exits); things slide along the grid.
  Tokens, keyframes and utilities live in theme.css; packages/ui/src/motion.ts
  (`MOTION`) mirrors them for JS.
- Utilities: `link-wipe` (underline drawn from the left; put it on the text span,
  it reacts to the enclosing link/button/`group`), `press` (click press-in; owns
  the element's transitions), `animate-rise|fade|mask-up|pop|draw` (entrances,
  `backwards` fill so hover transforms still work afterwards). `buttonClasses`
  gives buttons a sliding fill.
- Scroll reveals: add `data-reveal` (or `="rule"` / `="fade"`); reveal.ts staggers
  whatever arrives together. Content is only hidden while `<html data-motion>`
  is set (JS on, motion allowed), with a CSS failsafe. Don't nest reveals or put
  them inside server islands (they load after the observer starts).
- Page transitions are native cross-document View Transitions (no client
  router). The header holds still. Only a tool's name morphs into its page title
  (post titles deliberately don't: too busy for the style); morphing elements share
  `view-transition-name: transitionName(prefix, id)` (src/lib/site.ts) plus
  `view-transition-class: tr-morph` and `data-morph` (`data-morph="from"` on list
  items: morphs only go list → page, and never to an off-screen element; see
  packages/ui/src/page-transition.ts). Names must be unique on a page and sit on a
  box that doesn't wrap across lines (a fragmented inline box aborts the
  transition). The theme toggle sweeps the new theme in behind a diagonal
  edge, top right to bottom left, and is labelled with the mode it switches to
  ("Dark mode" / "Light mode", driven by CSS from <html data-theme>).
- Everything respects prefers-reduced-motion; never run an infinite animation
  outside `@media (prefers-reduced-motion: no-preference)`. E2E runs with reduced
  motion by default; e2e/motion.spec.ts covers the motion itself.
- React tools animate with Motion (`motion/react`) inside
  `<MotionConfig reducedMotion="user">`, timed with `MOTION`; their Vitest setup
  sets `MotionGlobalConfig.skipAnimations`. Plain pages ship no animation library.

## Blog

- Posts live in the `posts` table and are written in the admin editor:
  /admin/posts (list), /admin/posts/new/ and /admin/posts/<id>/ (one page,
  src/pages/admin/posts/[id].astro; logic in src/lib/blog/editor.ts). The editor
  (src/components/admin/PostEditor.tsx) is a real POST form plus a live preview,
  autosave for drafts, a local backup for unsaved edits to live posts, and image
  uploads. There are no Markdown files or content collections any more.
- A post is public when `status = published` and `publishedAt` has passed, checked on
  every read (src/lib/blog/store.ts), so scheduling needs no job. Drafts are only
  seen by the admin, or through a share link (/writing/preview/<token>/, noindex,
  revocable). Changing a public post's slug keeps the old one as a 301
  (post_slugs) and moves its comments.
- Post pages, /writing, tags, the home page, RSS and /sitemap-posts.xml render on
  the server from the database. The 404 page is server-rendered too, so pages can
  `Astro.rewrite("/404")`.
- Markdown is rendered by markdown-it + Shiki (src/lib/blog/render.ts) when a post
  is saved, not by Astro's Sätteri: it's a native binary the server bundle can't
  carry. The renderer writes GFM-style footnotes and slugged heading ids, which the
  side notes (src/lib/post-html.ts) and .prose depend on. Bump RENDER_VERSION when
  its output changes; stale posts re-render when next read.
- Images: /admin/media/ stores uploads in the `media` table (raster formats only,
  sniffed from the bytes, 5 MB); /media/<sha256>.<ext> serves them immutably. They
  live in Postgres so the nightly pg_dump covers them.
- Search is Postgres full-text search (English): /api/search for the search box,
  /writing/?q= without JavaScript.
- SITE_URL (src/lib/site.ts) is https://www.trilleo.net; RSS, sitemaps, canonical
  URLs, and robots.txt all derive from it.
- The database starts with the old file posts as drafts (migration
  0004_import-posts). `pnpm test:e2e` builds to apps/web/dist-e2e, serves it on port
  4329 with an in-memory database, and e2e/posts.setup.ts publishes those drafts
  through the editor before the specs run.
- Vite wraps every `import()` in bundled Astro scripts with a preload helper that
  breaks when Astro inlines the script; load runtime-only modules from an
  `is:inline` script instead.

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
- The header's account slot (components/account/HeaderAccount.astro) is a server
  island, so pre-built pages show who's signed in too: "Sign in" (back to this
  page), or a menu (profile, account, sessions, Admin for the admin, sign out). Its
  Escape/click-away behaviour lives in SiteHeader's script (islands bring none).
- Profiles (src/lib/profile/): the username is GitHub's login, re-synced at sign-in;
  people choose a display name (falls back to GitHub's name, then the login),
  pronouns, location, a "currently" line, a bio (comment Markdown) and up to 5 links,
  whether the profile is public, and whether comments show their name or just
  @login. Pages: /account/profile/ (edit), /people/<login>/ (public, noindex; 404
  when private or blocked, except to its owner), /account/sessions/ (sign other
  browsers out; sessions keep last_used_at, written at most every 5 minutes, and
  the User-Agent), /account/export.json (everything we keep, as JSON).

## Comments

- Post pages render on the server, but their comments are still a server island
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
- The admin can pin one published top-level comment per post
  (posts.pinned_comment_id): it shows first, marked "Pinned"; pinning another
  replaces it, and hiding or deleting it unpins it. Each post also has a comment
  mode: open, closed (shown, no new ones; /comments refuses with 403) or off (no
  section).
- All actions are plain POST forms that work without JavaScript: /comments (a
  refused comment gets a page that keeps the text), /comments/delete,
  /comments/pin, /admin/moderate, /account/delete. Only public posts with open
  comments take new ones.
- E2E tests share one database, run in parallel and may be retried: commenters
  are fresh accounts (`freshLogin()` in e2e/support.ts) with unique comment text,
  and no test may sign the shared admin out everywhere.

## SEO

- src/lib/seo.ts holds the pure parts: descriptions (`describe` falls back to the
  post's text), share cards (`OgCard`, `ogImagePath`), and JSON-LD builders
  (`serializeJsonLd` escapes `<` so titles can't close the script). BaseLayout turns its
  props (`image`, `article`, `jsonLd`, `noindex`) into Open Graph, X card, canonical
  and verification tags; `noindex` pages get no canonical.
- Share images: /og/site.png, /og/posts/<slug>.png, /og/tools/<slug>.png, 1200×630,
  drawn per request by satori + resvg-wasm (src/lib/og/) and kept in memory. Pages
  link them with `?v=<hash of the card>`, cached immutably; bump OG_CARD_VERSION
  when the card's design changes. Fonts and resvg's WebAssembly are inlined with
  `?inline` (astro.config's `assetsInclude`), so the bundle carries them. satori is
  pinned to 0.32: newer versions load harfbuzzjs, which the bundle can't carry.
- Structured data: WebSite + Person (the author, "Trilleo") on the home page,
  BlogPosting on posts, WebApplication on tools, BreadcrumbList on inner pages.
- Kept out of the index (noindex): private pages, search results (`?q=`), tag pages
  with fewer than TAG_INDEX_MIN_POSTS posts (also left out of sitemap-posts.xml), and
  the 404 page.
- GOOGLE_SITE_VERIFICATION / BING_SITE_VERIFICATION (optional, app.env) are read per
  request, so only server-rendered pages (the home page) carry them. Consoles verified
  by DNS don't need them.
- Posts have optional `seoTitle` / `seoDescription` (the editor's "Search & sharing"
  section, with a search-result and share-card preview and length meters). They
  replace the title and description in `<title>`, og:title and the meta description
  only; the page, its card and its JSON-LD headline keep the real title. Length rules
  (`titleVerdict`, `descriptionVerdict`) live in seo.ts, shared with the checklist.
- IndexNow (src/lib/indexnow.ts): with INDEXNOW_KEY set, /<key>.txt serves the key
  and saving a post announces it (plus an old address after a slug change, unpublish
  or delete) in the background. `posts.index_now_at` records the last announcement;
  public posts saved or gone live since are announced on the next chance, and any
  server request checks at most every 10 minutes (the middleware), which catches
  scheduled posts. Failures are only logged and retried later; unset key: no pings.
- /admin has an SEO checklist (src/lib/seo-audit.ts): long or missing search titles
  and descriptions, duplicate titles, untagged posts, and internal links to pages
  that don't exist. /llms.txt (src/lib/llms.ts) lists public posts and tools for AI
  assistants.

## Tools

- apps/web/src/lib/tools/registry.ts lists every tool; /tools, the home page's
  Tools section and the data API all read it. Planned tools can be listed with
  details only (no package needed).
- Each tool has a page, src/pages/tools/<name>.astro: `ToolLayout` plus the app
  with `client:load` (Astro can only hydrate components it sees imported, so
  there's no shared dynamic route). Pages render on the server, so the app gets
  the signed-in state and, for signed-in people, their data up front.
- Tools work signed out, keeping data in this browser; signed in, it goes to the
  account. Notes offers to move browser data into a newly signed-in account.
- Account data: the tool_data table (user, tool, key → JSON value) behind
  /api/tools/<tool>/data[/<key>] (src/lib/tools/api.ts): sign-in and same-origin
  checks, at most 500 keys and 200 KB per value, and the tool's own
  `isValidValue` from its meta. Deleting an account deletes its tool data.

## Games

- apps/web/src/lib/games/registry.ts lists every game (`GAMES`); /games, the
  home page's Games section (03), llms.txt and /og/games/<slug>.png read it. Game
  cards reuse ToolList (`code="G"`, `morph="game"`); pages use `GameLayout`
  (VideoGame JSON-LD). Adding a game follows the tool recipe (package, registry,
  workspace dependency, Dockerfile, `@source`, page, a11y), minus the data API.
- Skygrid (apps/skygrid): a Skyblock-style MMO-lite drawn in text. `./core` is the
  engine: pure and deterministic (time passed in, seeded RNG in the state), so the
  server can later replay a player's actions to check them. Content (items, nodes,
  recipes, island maps) lives in src/core/content/; src/ui/ is the browser side
  (GameSession, Controller, WorldView). Pacing guard rails: src/core/balance.test.ts.
- Skygrid combat (src/core/content/combat.ts): stats come from skills, gear and full
  armor sets (`playerStats`); mobs are letters on the map (z, s, B). Fights are
  exchanges: each swing that doesn't kill is answered, so the engine stays
  event-based and replayable. Wounded mobs and your health live in the save;
  health regenerates in `advance`. Saves from before a field existed are filled in
  by `parseSave` (keep doing that rather than bumping `v`).
- Skygrid saves: signed out, in localStorage (`trilleo:game:skygrid`); signed in,
  in `skygrid_saves` (one row per account, deleted with it, in the export). The
  browser sends its actions in batches (src/ui/sync.ts) to
  /api/games/skygrid/sync, which replays them on the saved state under a row lock
  and a version check (src/lib/games/skygrid/): the server never stores a state
  the client sent. On a broken rule it keeps the valid prefix and the client takes
  the server's state. /api/games/skygrid/import gives an account its first island,
  new or moved from the browser (`prepareImport` caps it: nobody checked it).
  Actions are stamped with server time (the page passes `serverTime`).
- The grid is set in Geist Mono, which (self-hosted) has ASCII and almost no
  symbols: maps and overlays use only `MONO_GLYPHS` (tested), since fallback
  glyphs are wider and not code-like. Signs are `[TEXT]`: the rules see them as
  scenery (`Island.tiles`), whatever letters they hold. Each cell is 1ch wide.
- The accent is only a background in the grid (dark text on orange): orange text
  on the light paper is too faint.
- Server-rendered game content must be visible without JavaScript: don't start it
  at opacity 0 for an entrance animation (axe also flags it mid-fade).

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

Copy apps/notes as the template, then:

1. Package: apps/<name>, named `@trilleo/tool-<name>`, with exports `.` (the React
   app) and `./meta` (its `ToolMeta`: slug, name, description, status, shape).
   Keep meta free of React imports: the server reads it.
2. Saving data? Use `useToolStorage` + `useToolItems` from @trilleo/tool-kit, and
   give the meta an `isValidValue` (the server's only check on what's saved).
   Without one, the data API refuses the tool.
3. Register it: add the meta to `TOOLS` in apps/web/src/lib/tools/registry.ts;
   add the package to apps/web's dependencies as `workspace:*`; and copy its
   package.json in the Dockerfile's build stage, next to the others (otherwise
   the image build can't install it).
4. Page: apps/web/src/pages/tools/<name>.astro, as notes.astro does
   (`prerender = false`, no-store, `ToolLayout`, the app with `client:load`).
5. Styles: add `@source "../../../<name>/src";` to apps/web/src/styles/global.css
   so Tailwind sees the tool's classes. Use the design system's classes, and
   animate with Motion + `MOTION` (see Motion above).
6. Tests: Vitest in the package (logic, and components with Testing Library);
   a Playwright spec in apps/web/e2e/ (fresh accounts via `freshLogin()`); add its
   page to e2e/a11y.spec.ts.
7. Before pushing: typecheck, lint, test, test:e2e, then `pnpm build` and
   `pnpm --filter @trilleo/web run check:server` (the server must still run
   without node_modules). No server changes are needed to deploy.
8. A tool that needs its own server gets a subdomain instead; that recipe isn't
   written yet.
