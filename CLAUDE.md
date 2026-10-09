# Project: personal site + tools platform

## Working style

- Before starting any non-trivial task, ask me clarifying questions about the
  idea and design instead of assuming. Propose a plan and wait for approval.
- Do not commit after changes.
- Keep changes scoped to one task. Summarize what changed and why at the end.
- Keep the documentation current: after every change, check what it affects and
  update it in the same change. That means this file, README.md, deploy/README.md,
  deploy/storage.md, deploy/mail.md, apps/web/.env.example, and the information pages (legal, FAQ,
  accessibility, security, colophon, about), which state facts about the code. A
  change to a legal page's substance also gets an entry in its `changes`.

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
  at /tools/<name>/. Tools: apps/notes, apps/convert, apps/inspect (File info),
  apps/qr, apps/color.
- apps/<game-name> (@trilleo/game-<name>): each game in its own source-only
  package, like tools (`.` the React app, `./meta` its `GameMeta`), mounted at
  /games/<name>/. First game: apps/skygrid.
- packages/tool-kit (@trilleo/tool-kit): what tools share: `ToolMeta`, storage
  (this browser, or the account via the data API), the `useToolItems` hook, and
  file helpers (src/files.ts: `detectFileType` from the first bytes,
  `formatBytes`, `downloadBlob`).
- packages/ui (@trilleo/ui): shared React components and the Tailwind v4
  theme (`theme.css`, CSS `@theme` tokens). Source-only, no build step. Tool
  building blocks: `ToolSection` (a section with its label in the left column),
  `FileDrop`, `Choice` (radio row), `Field` (label + hint as description),
  `CopyButton`, `fieldClasses`.
- packages/db (@trilleo/db): Drizzle schema, migrations, and client. Source-only.
- packages/storage (@trilleo/storage): file storage. `.` the shared rules (names,
  types, limits, the moderation state machine, API shapes), `./server` the drivers
  (OBS, local), `./client` `uploadFile()`, `./react` `<FileUpload>`. Source-only.
- packages/mail (@trilleo/mail): email. `.` the shared rules (addresses, kinds of
  message, notification topics) and the HTML/text template (`renderEmail`), `./server`
  the drivers (SMTP via Nodemailer, capture), `./testing` a recording driver.
  Source-only.
- packages/mc-files (@trilleo/mc-files): reading Minecraft files in the browser: NBT
  (Java and Bedrock), version ranges/pack formats/data versions, and `readHints`
  (what a mod, plugin, pack, world or schematic says about itself); builds' blocks
  (`readVoxels`), the compact preview format, block colours/shapes and the mesher
  for the 3D view. `./testing` writes NBT for tests. Source-only.
- Blog content: Markdown posts in Postgres, written in the admin editor (/admin/posts).
- Workspace packages use the `@trilleo/*` scope.

## Decisions

- Hosting: single VPS with Docker; Caddy for TLS and routing; Postgres on the box
  (Phase 5). The VPS is Huawei Cloud in mainland China (x86_64, Ubuntu 24.04);
  the domain is ICP-filed. Cloudflare proxies it with an Origin certificate
  ("Full (strict)"). Canonical URL: https://www.trilleo.net (apex redirects).
- English only. React for islands and tools.
- Accounts (comments, per-user tool data, admin): an account is its email address,
  signed in with a one-time code (no passwords); GitHub is a linked alternative.
  Google was left out: its OAuth endpoints are blocked from the mainland server.
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
- Inner pages start with a breadcrumb (components/Breadcrumb.astro, `(02) Tools / Notes`):
  ancestors are links, the current page is plain text with aria-current.
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
  gives buttons a sliding fill (`hover: "plain"`: a plain colour change, used on the
  sign-in pages).
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
  (add, then remove in a later release), because rollbacks don't undo them. A new
  NOT NULL column on existing rows: add it nullable, backfill, then SET NOT NULL in
  the same hand-edited migration, and keep the previous release's inserts working
  (0016_accounts-by-email does both).
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

- Hand-written in apps/web/src/lib/auth/. An account is its email address
  (users.email, always proved); `users.username` is the site's own handle (URLs,
  @mentions). Other ways in are rows in user_identities (provider + the provider's
  permanent ID; only GitHub so far), so renaming yourself on GitHub changes nothing.
  Every way of signing in ends in `startSession` (sign-in.ts). Sessions live in
  Postgres as the SHA-256 of the cookie's token; 30 days, extended when used in
  the last 15. Cookie `__Host-trilleo_session` over HTTPS, `trilleo_session` on
  plain-HTTP dev/e2e.
- Email sign-in (email-sign-in.ts): /sign-in (POST: the address) → a code (purpose
  "sign-in", SIGN_IN_LIMITS: 10 minutes, per-address and per-IP limits, the IP only
  as an in-memory hash) → /sign-in/code → a session; for an address without an
  account, a sign-up ticket (an email_codes row, purpose "sign-up", holding the
  ticket's hash) → /sign-up (username + terms) → the account. The address and ticket
  ride in the `trilleo_sign_in` cookie; the pages look the same whether or not an
  address has an account. Needs mail to be available (mailSetup); GitHub doesn't.
  These pages are one centred box (components/account/AuthCard.astro), not the
  usual display title and grid.
- GitHub (sign-in.ts `completeSignIn`): /auth/github → GitHub (state + PKCE, scope
  `user:email` for the verified primary address) → /auth/github/callback. A linked
  identity signs in; an unknown one makes an account with GitHub's verified address,
  but if an account already has that address it's refused ("email-taken"): an
  address alone never links accounts. Linking from /account/security/ is a POST to
  /auth/github (`linkUserId` in the state cookie). GitHub's token is used once.
- Usernames (usernames.ts): `a-z0-9` and single hyphens, 3–30, a reserved list;
  changed on /account/profile/ every USERNAME_COOLDOWN_DAYS. The old one goes to
  username_history: it redirects (`movedUsername`, 301 from /people/, creator and
  island pages, not for private or blocked accounts) and nobody else can take it for
  USERNAME_HOLD_DAYS. Look accounts up with
  `eq(users.username, normalizeUsername(x))`.
- Accounts from before email sign-in (migration 0016 turned their GitHub accounts
  into identities and their logins into usernames) have no address. At their next
  GitHub sign-in they take GitHub's verified address if it's free
  (`adoptVerifiedEmail`; /account/security/?done=adopted says so); otherwise
  src/lib/auth/setup.ts sends every server-rendered GET to
  /account/email/?setup=1&next= until they add one. /admin shows how many are left
  (migration.ts). `users.github_login` (a copy of the username) and the
  `users_fill_username` trigger exist only for the previous release: drop both in a
  later one. `users.github_id` mirrors the GitHub identity for ADMIN_GITHUB_IDS.
- Anyone can make an account (to comment); blocked accounts can't sign in, and
  their sessions stop working. /admin is for accounts whose address is in
  ADMIN_EMAILS or whose linked GitHub ID is in ADMIN_GITHUB_IDS (`isAdmin`). After
  sign-in, visitors land on `next` (default /account). An address can be changed
  (a code to the new one) but not removed, and an identity can't be unlinked from
  an account without an address.
- src/middleware.ts sets `Astro.locals.user` / `session` on server-rendered
  requests. Guarded pages start with
  `const user = requireUser(Astro); if (user instanceof Response) return user;`
  (or `requireAdmin`) and send `Cache-Control: private, no-store`. Anything that
  changes state is a POST form (the same-origin check blocks cross-site posts),
  never a GET. That check is Astro's, done in src/middleware.ts
  (src/lib/origin-check.ts, `checkOrigin: false` in astro.config) so that one-click
  unsubscribes (/mail/unsubscribe/) can get through; keep CROSS_SITE_POST_PATHS short.
- astro.config's `security.allowedDomains` must list every host the server is
  reached as; otherwise Astro sees `localhost`, and redirect URIs, cookies and the
  origin check all break (the smoke test checks this behind Caddy).
- Settings: ADMIN_EMAILS, ADMIN_GITHUB_IDS, and (optional) GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET. Production: /srv/trilleo/app.env. Dev: apps/web/.env (from
  .env.example, loaded in astro.config), with a separate localhost OAuth App; the dev
  server prints captured mail's subjects, so email codes work with no setup. E2E
  signs in against e2e/fake-github.ts, which gives every login a verified address
  (`githubEmail`) except "legacy-" ones (accounts from before email sign-in). Email
  sign-ins in e2e share 127.0.0.1's per-IP limit: keep them few (e2e/sign-in.spec.ts).
- New private pages: add their prefix to PRIVATE_PATHS (src/lib/site.ts) to keep
  them out of robots.txt and the sitemap.
- The header's account slot (components/account/HeaderAccount.astro) is a server
  island, so pre-built pages show who's signed in too: "Sign in" (back to this
  page), or a menu (profile, account, security, Admin for the admin, sign out). Its
  Escape/click-away behaviour lives in SiteHeader's script (islands bring none).
- Profiles (src/lib/profile/): people choose a username, a display name (falls back
  to a linked account's name, then the username), pronouns, location, a "currently"
  line, a bio (comment Markdown) and up to 5 links, whether the profile is public, and
  whether comments show their name or just @username. Pages: /account/profile/
  (edit, username included), /people/<username>/ (public, noindex; 404 when private
  or blocked, except to its owner), /account/security/ (address, linked accounts,
  link to sessions), /account/sessions/ (sign other browsers out; sessions keep
  last_used_at, written at most every 5 minutes, and the User-Agent),
  /account/export.json (everything we keep, as JSON).

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
- Share images: /og/site.png, /og/posts/<slug>.png, /og/tools/<slug>.png,
  /og/games/<slug>.png, /og/minecraft.png and /og/minecraft/<slug>.png, 1200×630,
  drawn per request by satori + resvg-wasm (src/lib/og/) and kept in memory. Pages
  link them with `?v=<hash of the card>`, cached immutably; bump OG_CARD_VERSION
  when the card's design changes. Fonts and resvg's WebAssembly are inlined with
  `?inline` (astro.config's `assetsInclude`), so the bundle carries them. satori is
  pinned to 0.32: newer versions load harfbuzzjs, which the bundle can't carry.
- Structured data: WebSite + Person (the author, "Trilleo") on the home page,
  BlogPosting on posts, WebApplication on tools, VideoGame on games,
  SoftwareApplication (mods, plugins) or CreativeWork (worlds, builds, packs) on
  Minecraft projects, BreadcrumbList on inner pages.
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
  that don't exist. /llms.txt (src/lib/llms.ts) lists public posts, tools, games
  and listed Minecraft projects for AI assistants. Sitemaps: sitemap-index.xml (built
  pages), /sitemap-posts.xml and /sitemap-minecraft.xml (from the database).

## Information pages

- apps/web/src/lib/info-pages.ts lists them (`INFO_PAGES`: path, title, label,
  description, group legal|help|site, `changes` newest first); the footer, /legal/,
  /sitemap/, llms.txt and the SEO checklist read it. Legal pages live under /legal/
  (terms, privacy, cookies, guidelines, copyright); help pages are /contact/, /faq/,
  /accessibility/, /security/; site pages /colophon/, /sitemap/ (server-rendered: it
  lists posts). Plus /.well-known/security.txt (Expires a year after each build) and
  /humans.txt.
- Pages use `InfoLayout` (title, description and "Updated" from the registry; `sections`
  feed the contents; `history` appends "Changes to this page"). When a legal page
  changes in substance, add an entry to its `changes`.
- The text states facts about the code: import numbers (retention, limits, session
  length, cookie keys) rather than copying them, and update the text when behaviour
  changes. Operator: Trilleo, an individual in mainland China (PRC law, PIPL, GDPR
  rights offered to all); accounts are 14+.
- Mainland filing numbers (`ICP_FILING`, `PSB_FILING` in src/lib/site.ts) show in the
  footer, set in `font-cjk` (Latin in the grotesk, Han characters in the system's
  Chinese sans; no CJK webfont).
- Contact form (src/lib/contact/store.ts): /contact/ (prerendered) posts to
  /contact/send, which works without JS and re-shows the form with errors. Anyone can
  write; a signed-in sender's account is linked (export, deleted with the account).
  Limits: per account from the database; per signed-out visitor by an in-memory hash
  of the IP, plus a daily cap on all signed-out messages; a honeypot field (`website`)
  is accepted and dropped. Messages are purged after CONTACT_RETENTION_DAYS. The
  admin's inbox is /admin/messages/ (new / read / archived, delete). E2E: only one
  test may send a signed-out message (they share 127.0.0.1's limit).

## Tools

- apps/web/src/lib/tools/registry.ts lists every tool; /tools, the home page's
  Tools section and the data API all read it. Planned tools can be listed with
  details only (no package needed).
- Each tool has a page, src/pages/tools/<name>.astro: `ToolLayout` plus the app
  with `client:load` (Astro can only hydrate components it sees imported, so
  there's no shared dynamic route). Pages render on the server, so the app gets
  the signed-in state and, for signed-in people, their data up front. Tools that
  keep no account data (convert, inspect, qr, color) are prerendered.
- Cards (components/ToolList.astro, shared with games) show the meta's `icon`, a
  flat pictogram from components/ToolIcon.astro (120×120 grid, ink plus one
  accent part, even-odd holes; keep them simple and on-grid). Icons rest in ink;
  hovering or focusing a live card fills the accent part in (a `fill` transition,
  `.icon-accent`). A live card is one
  link: the title's `<a>` stretches over it (`::after`), so tests click the card
  itself, not text inside it. On desktop the icon has a fixed band, so every
  title starts at the same height.
- File tools work entirely in the browser: nothing is uploaded. Heavy codecs load
  with `import()` only when a file needs them: Mediabunny (+ its MP3/FLAC encoder
  add-ons) for audio and media details, @jsquash/avif's single-threaded encoder
  (the threaded one needs cross-origin isolation), libheif-js for HEIC, gifenc,
  utif2, hash-wasm, exifr, fflate. AAC and Opus use the browser's own WebCodecs
  encoders, so formats a browser can't write are shown disabled.
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
- Skygrid's Bazaar (src/lib/games/skygrid/bazaar.ts): trades involve other players,
  so they run on the server, not in the replayed engine. One request = one
  transaction: lock the player's save (version check, at the ¤ stall), lock and
  fill the other side's orders best price first, record trades, save. Orders hold
  what they cost (coins or items) out of the save; makers collect fills later
  (claim), so no request writes another player's save. The client pauses input and
  flushes its sync first (`Syncer.exclusive`), then adopts the returned island.
- Skygrid's daily tasks (src/core/content/daily.ts) are part of the engine: three
  per UTC day, picked when `advance` crosses into a new day from what the island
  has unlocked, with their own generator (seeded by day and island) so drops stay
  the same; finishing all three and claiming builds a streak. Leaderboards
  (/games/skygrid/leaderboard/, `?board=`) and island pages
  (/games/skygrid/visit/<login>/, noindex) follow the profile rules: private
  profiles show no name and have no island page, blocked accounts don't appear
  (src/lib/games/skygrid/leaderboard.ts). Islands are drawn on the server with the
  game's own `drawWorld` (`@trilleo/game-skygrid/draw`) in IslandPicture.astro.
- The grid is set in Geist Mono, which (self-hosted) has ASCII and almost no
  symbols: maps and overlays use only `MONO_GLYPHS` (tested), since fallback
  glyphs are wider and not code-like. Signs are `[TEXT]`: the rules see them as
  scenery (`Island.tiles`), whatever letters they hold. Each cell is 1ch wide.
- The accent is only a background in the grid (dark text on orange): orange text
  on the light paper is too faint.
- Server-rendered game content must be visible without JavaScript: don't start it
  at opacity 0 for an entrance animation (axe also flags it mid-fade).

## Minecraft platform

- People share Minecraft creations at /minecraft/<type>/<slug>/ (types: mods, plugins,
  worlds, builds, resource-packs, data-packs; src/lib/minecraft/catalog.ts). A project
  (mc_projects) has a gallery (mc_gallery) and releases (mc_releases: version, channel,
  game versions, loaders, dependencies), whose files are `files` rows in storage:
  purposes `minecraft` (release files; `alwaysReview: ["jar"]`, so mods and plugins
  always wait for the admin) and `minecraft-media` (gallery images).
- Others see a project when it isn't a draft or hidden, its owner isn't blocked, and a
  release's main file is published (`lastReleasedAt`). Storage's `changeStatus` calls
  src/lib/minecraft/sync.ts for Minecraft files, which keeps those dates; nothing polls.
- Creator pages: /account/minecraft/ (dashboard), …/<id>/ (details; `new` makes one),
  …/<id>/gallery/, …/<id>/releases/[<release>|new]/, buttons POST to …/<id>/action.
  Uploads attach to their release or gallery as they start (`uploadFile`'s
  `onStarted` → /api/minecraft/attach), so no upload is left belonging to nothing.
- Public pages: /minecraft/ (front page), /minecraft/browse/ and /minecraft/<type>/
  (listings: GET filters, noindex when filtered), /minecraft/<type>/<slug>/ (project),
  …/releases/[<version>/], …/download/ (newest stable file that fits ?version=,
  ?loader=, ?channel= → /d/<id>), /minecraft/creators/<login>/ (noindex), /minecraft/
  report (POST). `lookupProject` (src/lib/minecraft/page.ts) handles visibility and
  redirects (old slug or wrong type → 301). The section is "(05) Minecraft" (04 is
  About): a home page section and a footer link, not in the header. Also in
  /sitemap-minecraft.xml, /sitemap/, llms.txt and /og/minecraft[/<slug>].png.
- Admin: /admin/minecraft/ (?tab=projects|reports): feature, hide (with a reason the
  creator sees; settles open reports), show again, dismiss reports. Files are still
  reviewed in /admin/files/review, whose cards say which project, release and role a
  file has (`fileUses`). Project reports: `reportProject` (src/lib/minecraft/service.ts),
  PROJECT_REPORTS_TO_HIDE from established accounts hide a project until reviewed.
- Long display titles use DisplayTitle's `fit` (the word's measured width in em,
  plus room): type-display-fit shrinks it to fit between the gutters.
- ReleaseEditor reads a dropped main file with @trilleo/mc-files to fill in the form;
  everything it finds is a suggestion the creator checks.
- Descriptions and changelogs: src/lib/minecraft/render.ts (comment Markdown plus
  headings, lists, tables; images only from the project's own published gallery).
  Bump MC_RENDER_VERSION when its output changes.
- Game versions: Mojang's version manifest (server-side, cached 6 hours), with
  FALLBACK_JAVA_VERSIONS in game-versions.ts when it can't be read; add new releases
  there now and then. MINECRAFT_VERSION_MANIFEST=off (e2e) never fetches.
- Builds' 3D view: after a .litematic/.schem/.nbt/.mcstructure uploads, the
  creator's browser reads its blocks, sends a compact preview (POST
  /api/minecraft/preview, ≤ MAX_PREVIEW_BYTES) that the server decodes before keeping
  it in mc_previews (with the materials it counted), and, for a project without
  pictures, adds an isometric cover to the gallery (components/minecraft/
  build-preview.ts). /minecraft/preview/<file>.bin serves it while its file is public.
  BuildViewer loads the decoder and voxel-renderer.ts (hand-written WebGL2, no
  three.js) only on "View in 3D"; BuildMaterials is the server-rendered text version.
  Colours are our own (blocks.ts), never Mojang's textures.
- Public JSON API: /api/minecraft/v1/projects[/<slug>[/latest]] (src/lib/minecraft/
  api.ts), read-only, CORS *. Embeds: …/<slug>/embed/ sends `frame-ancestors *`,
  which browsers obey over Caddy's X-Frame-Options. Creators see 30-day download
  charts on their dashboard and each project's releases page.
- Mojang's usage guidelines: pages about the platform carry MOJANG_NOTICE ("Not an
  official Minecraft product…"); never use Mojang's textures or logo.

## Mail

- Runbook: deploy/mail.md. Production sends through Tencent Cloud SES (Hong Kong) over
  SMTP (smtp.qcloudmail.com:465), from no-reply@automail.trilleo.net. Settings:
  SMTP_HOST/PORT/USER/PASSWORD, MAIL_FROM, MAIL_REPLY_TO, MAIL_ADMIN_TO
  (apps/web/src/lib/mail/config.ts). Without SMTP, `pnpm dev` and e2e
  (MAIL_CAPTURE=1) capture: messages are kept, not sent, and read at /admin/mail/;
  production without SMTP is "off" (kept, and /account/email/ says it isn't set up).
- Everything goes through the outbox (mail_messages, src/lib/mail/outbox.ts):
  `queueMail` writes the row, delivery sends in the background (src/lib/mail/
  delivery.ts: started when something is queued, plus a middleware tick at most every
  minute), retries with RETRY_DELAYS_MS, and fails at once on a permanent (5xx)
  refusal. Secret kinds (codes) have their bodies cleared once sent; bodies go after
  MAIL_RETENTION_DAYS, rows after MAIL_LOG_DAYS. Never send mail any other way.
- Addresses (src/lib/mail/addresses.ts): users.email is only ever an address proved
  with a 6-digit code (email_codes keeps its SHA-256; 15 minutes, 5 guesses, newest code
  only, per-account and per-address limits; purged after CODE_RETENTION_DAYS), or one
  GitHub verified. It's what people sign in with (see Auth), so it can be changed but
  not removed. Its purpose is "verify-email"; signing in uses "sign-in" and "sign-up".
  Changing the address replaces users.email_token, the secret in unsubscribe links.
- Notifications (src/lib/mail/notify.ts) respect the topic switches
  (users.email_notifications, NOTIFICATION_TOPICS in @trilleo/mail), skip blocked
  accounts, people's own actions and the admin's own content, and carry
  List-Unsubscribe + List-Unsubscribe-Post. They're called through `safely()` where
  things happen: comments (createComment, moderateComment), storage's changeStatus
  (file decisions; `notify: false` when the caller sends its own, like appeals),
  decideAppeal, and Minecraft's setHidden. notify.ts reads tables directly, so those
  services can import it without cycles.
- Admin alerts (src/lib/mail/alerts.ts): `alertAdmin` adds an admin_alerts row
  (contact messages, files waiting, file and project reports, appeals, comments
  waiting); delivery bundles them into one email per ADMIN_ALERT_GAP_MS, to
  MAIL_ADMIN_TO or the admins' own verified addresses with "Admin alerts" on.
- Pages: /account/email/ (address, code, switches; one page, POST with `intent`),
  /mail/unsubscribe/<token>/ (GET asks, POST does it; no sign-in), /admin/mail/ (setup,
  outbox with filters, test send, connection check, recent alerts) and
  /admin/mail/<id>/ (the HTML in a sandboxed iframe), and replies to contact messages
  from /admin/messages/ (src/lib/contact/reply.ts, ref "contact:<id>").
- Templates are written in code with `composeNotification` / `composeDirect`
  (src/lib/mail/compose.ts) on top of `renderEmail`: blocks, no images or tracking,
  hex colours from the light theme (email clients can't use CSS variables).
- E2E reads codes and messages from /admin/mail/ as the admin (`openMail`,
  `codeSentTo` in e2e/support.ts); the shared admin never
  changes their address. axe can't run inside the sandboxed preview frame: exclude it.

## Storage

- Files live in Huawei OBS (bucket trilleo-web-storage, cn-southwest-2); Postgres
  (`files`, `storage_events`) is the truth about them. Runbook: deploy/storage.md.
- The bucket is private. The browser uploads straight to it: the app hands out signed
  part URLs (every upload is multipart, one part when small) and never sees the
  bytes. Published files get a public-read ACL and are served from
  https://files.trilleo.net (the bucket's custom domain, DNS only in Cloudflare; a
  Let's Encrypt certificate installed by .github/workflows/files-cert.yml monthly).
  Others go through /d/<id>, a redirect to a 5-minute signed link for the owner/admin.
- Drivers (packages/storage): `ObsDriver` (S3 API via aws4fetch) when OBS_BUCKET is
  set; otherwise `LocalDriver`: `STORAGE_URL=memory://` (e2e, tests) or a folder
  (`pnpm dev`: apps/web/.data/storage), served by /api/storage/local/. Neither in
  production: storage is off and the site still runs (apps/web/src/lib/storage/config.ts).
- Features declare a purpose in apps/web/src/lib/storage/purposes.ts (who uploads,
  types, size, visibilities, review, `alwaysReview` extensions); uploads name one.
  `site` is the admin's; `minecraft` and `minecraft-media` are anyone's (the
  Minecraft platform). `shared` (general uploads, review until trusted) is defined
  but `enabled: false`; STORAGE_ENABLE_PURPOSES=shared switches it on (e2e).
- Every status change goes through `transition` (packages/storage/src/moderation.ts)
  and `changeStatus` (guarded by the expected status, logged in storage_events); the
  object's ACL follows `isServedPublicly(status, visibility)`. Operations live in
  apps/web/src/lib/storage/service.ts and return `Result`s; routes are thin.
- Safety on the files domain: only raster images, audio, video and PDF are inline;
  HTML/SVG/XML/JS are stored as application/octet-stream and download; a file whose
  first bytes contradict an inline name is refused; programs are admin-only.
  Objects cache for a day (`PUBLIC_CACHE`) so takedowns reach browsers.
- Background maintenance (middleware, every 10 minutes): abandon day-old uploads,
  reprocess stuck files, purge bytes after RETENTION_DAYS (rows stay).
- Moderation policy (numbers and decisions) is packages/storage/src/policy.ts;
  apps/web/src/lib/storage/ keeps the facts: standing.ts (trust: auto after 3
  approvals with no strikes, or the admin's "always"/"never"; strikes for 90 days, 3
  ban uploading; manual bans), reports.ts (signed-in reports; 3 from accounts ≥7 days
  old hide a non-admin file via the `flag` transition), appeals.ts (one per refused or
  removed file; an open appeal stops the purge; accepting restores, clears the strike
  and unblocks the hash). Rejecting or removing strikes and blocks the SHA-256
  (blocked_hashes) unless "no strike"; approving dismisses reports and may grant trust.
  User-level actions are logged in storage_events with `subjectId`.
- Processing lists archives' contents (packages/storage/src/zip.ts, two ranged reads)
  into `files.details` for reviewers; the review queue previews non-public files
  through signed URLs on the bucket's own domain (in the CSP's img-src/media-src).
- Malware scanning (ClamAV, the `clamav` service in compose.yaml, `_base` image +
  freshclam into a volume; CLAMAV_ADDRESS): processing reads each object once for
  both the SHA-256 and clamd's INSTREAM (packages/storage/src/clamd.ts, no dependency).
  Malware from non-admins is refused (system `fail`, strike, hash blocked); the
  admin's files only show it. A file that couldn't be scanned (clamd down, over its
  limits, or OBS without ClamAV configured) waits for review; `heldForScan` marks
  files held only for that, and maintenance rescans a few per run, publishing clean
  ones (system `clear`). Local storage without CLAMAV_ADDRESS doesn't scan. E2E runs
  e2e/fake-clamd.ts, which "finds" a marker string (never write the real EICAR string
  into the repo: antivirus quarantines the file).
- Thumbnails: the browser makes a ≤480px WebP after an upload
  (packages/storage/src/thumbnail.ts) and posts it to /api/storage/uploads/<id>/thumbnail
  (≤200 KB, sniffed, once, within an hour); stored at t/<id>.webp with the file's ACL
  (`setAccess`) and purged with it (`removeObjects`). Lists show them (Thumb.astro).
- Download stats: /d/<id> also counts into file_downloads (per file per UTC day);
  downloads-stats.ts feeds the file page's chart (DownloadChart.astro, owner/admin),
  30-day counts in lists, and the admin's site-wide chart and top files.
- Pages: /admin/files (all files, ?owner=<login> shows the uploader panel),
  /admin/files/review (?tab=waiting|reports|appeals|spot), /files/<id>/ (with the
  report form), /account/files (usage, strikes, appeals). The account export lists
  files, reports, appeals and strikes; deleting an account deletes its files' bytes
  and rows first.

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
  /api/health stays internal. CSP is report-only for now; it allows
  'wasm-unsafe-eval' and blob: (images, media, workers) for the file tools. Its
  `frame-ancestors 'none'` and X-Frame-Options DENY don't stop Minecraft embeds,
  which send their own enforced `frame-ancestors *`; when the CSP is enforced, leave
  the embed paths out of it (deploy/README.md says how).
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
   app) and `./meta` (its `ToolMeta`: slug, name, description, status, icon).
   A new kind of tool needs a pictogram: add it to `ToolIcon` (tool-kit) and
   components/ToolIcon.astro.
   Keep meta free of React imports: the server reads it.
2. Saving data? Use `useToolStorage` + `useToolItems` from @trilleo/tool-kit, and
   give the meta an `isValidValue` (the server's only check on what's saved).
   Without one, the data API refuses the tool.
3. Register it: add the meta to `TOOLS` in apps/web/src/lib/tools/registry.ts;
   add the package to apps/web's dependencies as `workspace:*`; and copy its
   package.json in the Dockerfile's build stage, next to the others (otherwise
   the image build can't install it).
4. Page: apps/web/src/pages/tools/<name>.astro, as notes.astro does
   (`prerender = false`, no-store, `ToolLayout`, the app with `client:load`); a
   tool without account data can stay prerendered (see inspect.astro).
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
