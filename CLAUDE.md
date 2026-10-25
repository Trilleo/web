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
  change to a legal page's substance also gets an entry in its `changes`. A change to
  the API gets an entry in its changelog (apps/web/src/lib/api/docs/changelog.ts).

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
  apps/preview, apps/qr, apps/color, apps/chunithm (CHUNITHM charts).
- apps/<game-name> (@trilleo/game-<name>): each game in its own source-only
  package, like tools (`.` the React app, `./meta` its `GameMeta`), mounted at
  /games/<name>/. Games: apps/skygrid, apps/hotfix.
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
- packages/forum (@trilleo/forum): the forum's pure rules: addresses (slugs, topic
  segments, reserved forum slugs), layouts (`FORUM_LAYOUTS`), permissions
  (`FORUM_PERMISSIONS`, `can`), limits and the post renderer. Source-only.
- packages/wiki (@trilleo/wiki): wiki components. `.` the registry (`COMPONENTS`,
  `COMPONENT_SETS`), the markdown-it plugin that renders them, and syntax helpers;
  `./client` the browser part (`enhanceTabs`). Source-only.
- packages/study (@trilleo/study): the study section's engine. `.` content (loads and
  checks study/), the lesson renderer (markdown-it + KaTeX + the study components, on
  @trilleo/wiki's component plugin), quizzes, expressions, units, circuits; `./react`
  the widgets (Quiz, Plot, Explore, CircuitLab); `./dates` exam countdowns (browser);
  `./katex.css`. Source-only.
- packages/cryptic (@trilleo/cryptic): the daily cryptic's pure rules: enumerations
  (`parseEnumeration`, `enumerationOf`, `answerFits`), checking guesses by their
  letters (`checkGuess`), UTC days, streaks. Source-only.
- packages/chunithm (@trilleo/chunithm): the CHUNITHM catalog's pure rules:
  difficulties and constants (tenths), versions (`versionSlug` for every source's
  names), readers for SEGA's song list, otoge-db and sdvx.in (scripts read as text,
  never run), `buildCatalog`, which merges them by SEGA's IDs, and charts.ts, which
  joins sdvx.in's chart layers into one strip. `./testing` draws test charts.
  Source-only.
- study/: study subjects as Markdown files (see Study below and study/README.md).
- Blog content: Markdown posts in Postgres, written in the admin editor (/admin/posts).
- The wiki (wiki.trilleo.net) is apps/web on a second host, not its own app: pages in
  src/pages/wiki/, logic in src/lib/wiki/ (see Wiki below).
- The API (api.trilleo.net) is apps/web on a third host: the dispatcher at
  src/pages/api/v1/[...path].ts, docs in src/pages/developers/, logic in src/lib/api/
  (see API below).
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
- Small labels ("About", post meta, contents) hang in a left column:
  2 of 8 columns on iPad, 2 of 12 on desktop, so content starts at column 3.
  Section headings (SectionHeader) are the exception: the "(01)" number sits right
  before the title, at its top, both from column 1.
  Right-hand asides take columns 10–12 on desktop; post text is columns 3–9.
- Fonts are self-hosted from npm (@fontsource-variable/*); no third-party requests. The
  one exception is the wiki's Minecraft font, committed in packages/wiki/src/fonts.
- Typefaces by role: the grotesk (`font-sans`) for headings, UI and quotes; the
  serif (`font-serif`, Source Serif 4 with optical sizes) for reading text: .prose
  (posts, rendered notes), .comment-body, and `type-dek`; mono for labels and code.
- Inner pages start with a breadcrumb (components/Breadcrumb.astro, `(02) Tools / Notes`):
  ancestors are links, the current page is plain text with aria-current.
- Astro scoped styles don't reach child components: wrap a child in an element
  you own if the parent's CSS must place it.
- Use the width. Content starts at column 3 only when something hangs in columns
  1–2 beside it (a label, a section number, the contents list, an info page's
  facts); a row with nothing there starts at column 1. A page's description
  (`type-lead` under the display title) spans the full width, or columns 1–9 when
  an aside takes 10–12; a label for it ("About", "Index") goes on its own line
  above it, not beside it. Reading text keeps a measure (7 columns, or a
  max-width), so it may leave the right side open.
- Tailwind v4's `col-span-*` sets the whole `grid-column`, so a wider breakpoint's
  `xl:col-span-*` drops an inherited `md:col-start-*`: repeat the start
  (`xl:col-start-3`).
- Card lists (ToolList) fill their last row on desktop: two leftover cards share
  it, a lone card runs the full width, sideways. DisplayTitle leaves room under
  words with descenders (g, j, p, q, y) so they don't touch the rule.
- Information pages and posts: on desktop with a contents list, text in columns
  3–9; without one, and on iPad (where it's hidden), columns 1–7. Without an
  aside, tables run on past the text, ten columns wide (`.prose-wide`). On phones,
  tables with a header row stack, one block per row, each cell under its heading
  (`stackTables` in src/lib/post-html.ts adds the labels). Prose tables don't use
  tabular figures: in the grotesk they widen commas, periods and colons too.
- The footer: the name, three labelled link groups (Sections, Information,
  Elsewhere), and the site's line with "Back to top" in columns 9–12.

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
  router). The header holds still; the page lifts away and the next rises in.
  Nothing morphs between pages (no shared `view-transition-name`s besides the
  header): titles don't fly from a list into the next page. The theme toggle sweeps the new theme in behind a diagonal
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
- Passkeys (passkeys.ts, webauthn.ts): WebAuthn checked by hand on node:crypto (a
  small CBOR reader, COSE keys ES256/EdDSA/RS256, no attestation, user verification
  required, a counter that goes backwards is refused). Discoverable credentials, so
  /sign-in needs no username: a "Sign in with a passkey" button plus autofill in the
  email field (`autocomplete="email webauthn"`; its errors stay quiet). JSON routes
  under /api/auth/passkeys/ (options, register, sign-in), same-origin only; each
  ceremony's challenge lives in the `trilleo_webauthn` cookie, read once. The RP ID
  is the request's hostname: WebAuthn refuses IP addresses, so e2e passkey tests use
  localhost and Chromium's virtual authenticator (e2e/security.spec.ts). Unit tests
  use webauthn-testing.ts's `FakeAuthenticator`. Up to MAX_PASSKEYS per account;
  rename and remove on /account/security/.
- The security log (activity.ts, security_events): sign-ins and how, sign-ups,
  address changes and undos, linked accounts, passkeys, usernames, sign-outs, with a
  rough browser name (never the IP); shown on /account/security/, in the export,
  purged after SECURITY_LOG_DAYS. `startSession` records every sign-in, and one from
  a browser the account hasn't used in NEW_DEVICE_DAYS emails a "new sign-in" alert
  (topic "security"; never for a new account or the first sign-in on record).
- Changing the address (email-change.ts): the old address gets an "email-changed"
  message with an undo link (/account/email/undo/<token>/, an email_codes row with
  purpose "undo-email", UNDO_EMAIL_DAYS, kept past the usual code purge). Undoing
  restores the address, signs every browser out, and removes passkeys and linked
  accounts added since the change.
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
- The wiki's host can't read the `__Host-` session cookie, so it signs in by handoff
  (src/lib/wiki/handoff.ts): wiki /-/sign-in sets a state cookie
  (`trilleo_wiki_state`) → www /auth/wiki issues a one-time ticket (wiki_sign_in_tickets,
  hashed, a minute, tied to the state) → wiki /-/auth redeems it with `startSession`
  (method "wiki"). Each host has its own session; signing out is per host.
- New private pages: add their prefix to PRIVATE_PATHS (src/lib/site.ts) to keep
  them out of robots.txt and the sitemap.
- The header's account slot (components/account/HeaderAccount.astro) is a server
  island, so pre-built pages show who's signed in too: "Sign in" (back to this
  page), or a menu (profile, account, security, Admin for the admin, sign out). Its
  Escape/click-away behaviour lives in SiteHeader's script (islands bring none).
- Avatars (src/lib/profile/avatar.ts, the `avatars` table, `users.avatar_hash`): one
  picture per account, set on /account/profile/ (#avatar, its own form posting to
  /account/avatar). The browser crops it to a square and sends an AVATAR_SIZE WebP
  (lib/profile/crop.ts; PNG where it can't write WebP); without JS the file goes as
  it is. The server sniffs the bytes (PNG/JPEG/WebP, never SVG), reads the size from
  the header (`imageInfo`), and refuses over AVATAR_MAX_BYTES / AVATAR_MAX_SIDE or
  animated. The admin skips the size limits (up to AVATAR_ADMIN_MAX_BYTES) and may
  keep a picture uncropped. Served at /avatars/<sha256> (a day's cache, so removals
  reach browsers; not for blocked accounts). Show it with components/account/
  Avatar.astro (falls back to the Monogram). The admin removes one from the person's
  /people/ page (POST /admin/avatar), or from a report (/forum/moderate/).
- Profiles (src/lib/profile/): people choose a username, a display name (falls back
  to a linked account's name, then the username), pronouns, location, a "currently"
  line, a bio (comment Markdown) and up to 5 links, whether the profile is public, and
  whether comments show their name or just @username. Pages: /account/profile/
  (edit, username included), /people/<username>/ (public, noindex; 404 when private
  or blocked, except to its owner), /account/security/ (address, passkeys, linked
  accounts, a link to sessions, recent activity), /account/sessions/ (sign other browsers out; sessions keep
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
- Cookie manager (components/CookieConsent.astro, in BaseLayout; rules in
  @trilleo/ui's consent.ts): a corner card until a visitor chooses, and a settings
  dialog from it or any `[data-cookie-settings]` link (the footer's "Cookie
  settings"). Necessary (sign-in, the choice itself) is always on; "preferences"
  (theme, signed-out tool data and game saves) is on by default, and off keeps them
  in sessionStorage (`preferenceStorage`; tool-kit mirrors the rule in
  `preferenceStore`) after deleting what was kept; "analytics" is off until allowed
  and never with Global Privacy Control. Cloudflare Web Analytics loads only through
  it: CF_ANALYTICS_TOKEN (src/lib/site.ts, or PUBLIC_CF_ANALYTICS_TOKEN at build;
  e2e uses a fake one and stubs the beacon), with Cloudflare's automatic injection
  off. Anything new kept in the browser belongs to a category: add its key to
  consent.ts and the cookie policy.
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
  keep no account data (convert, inspect, preview, qr, color) are prerendered.
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
- Preview (apps/preview) shows a document from a link or a file without saving it.
  Links: share pages rewritten to their file (links.ts: GitHub, GitLab, Bitbucket,
  Dropbox, Google, OneDrive), fetched by the browser, or, when the site sends no
  CORS, through POST /api/tools/preview/fetch (src/lib/tools/preview/fetch.ts:
  http(s) on ports 80/443 only, every resolved address and redirect checked public
  in the socket's own DNS lookup (`guardedLookup`), PREVIEW_FETCH_LIMITS, streamed,
  never stored, answered as `application/octet-stream` + `attachment` + a sandbox
  CSP). MAX_PREVIEW_BYTES on both paths. PREVIEW_ALLOW_HOSTS lets e2e's
  e2e/fake-docs.ts through; nothing else. The viewer is picked from the bytes
  (detect.ts; ZIPs by their entries), each viewer a lazy chunk: pdf.js (its CMaps,
  fonts and decoders served at /_pdfjs/<version>/ by the package's Astro integration,
  `@trilleo/tool-preview/integration`), docx-preview, SheetJS (from its own CDN
  tarball: npm's copy is stale), PPTX/ODF/EPUB/RTF readers by hand (src/formats/),
  Shiki on its JS engine with only the grammars in viewers/languages.ts. HTML from
  documents goes through sanitize.ts (DOMPurify; nothing remote loads) into a
  shadow root or .prose; web pages render in a sandboxed srcdoc frame with its own
  CSP. Microsoft's Office viewer is opt-in, after a notice. Recent links:
  `trilleo:tool:preview:recent` (preferenceStore).
- Tools work signed out, keeping data in this browser; signed in, it goes to the
  account. Notes offers to move browser data into a newly signed-in account.
- Account data: the tool_data table (user, tool, key → JSON value) behind
  /api/tools/<tool>/data[/<key>] (src/lib/tools/api.ts): sign-in and same-origin
  checks, at most 500 keys and 200 KB per value, and the tool's own
  `isValidValue` from its meta. Deleting an account deletes its tool data.

## Games

- apps/web/src/lib/games/registry.ts lists every game (`GAMES`); /games, the
  home page's Games section (03, a heading and a button to /games/), llms.txt and
  /og/games/<slug>.png read it. Game cards reuse ToolList (`code="G"`); pages use `GameLayout`
  (VideoGame JSON-LD). Adding a game follows the tool recipe (package, registry,
  workspace dependency, Dockerfile, `@source`, page, a11y), minus the data API.
- Skygrid (apps/skygrid): a Skyblock-style MMO-lite drawn in text. `./core` is the
  engine: pure and deterministic (time passed in, seeded RNG in the state), so the
  server can later replay a player's actions to check them. Content (items, nodes,
  recipes, island maps) lives in src/core/content/; src/ui/ is the browser side
  (GameSession, Controller, WorldView). Pacing guard rails: src/core/balance.test.ts.
- Skygrid has a wiki (wiki.trilleo.net/skygrid/). Its reference pages are generated
  from `@trilleo/game-skygrid/core` (apps/web/src/lib/wiki/sources/skygrid.ts), so
  changed numbers follow by themselves. When a Skygrid change adds a new kind of thing
  (a content table, a mechanic, an island feature) or renames one, update that
  generator in the same change (sources/skygrid.test.ts checks every page and link),
  and the written pages that describe it: the seed in src/lib/wiki/seed.ts for new
  databases, and say in the summary which live pages (Main Page, Getting started, …)
  need editing on the wiki, since the database owns those once created.
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
- On touch screens (`pointer-coarse`) the Use button and arrow pad sit in a strip
  under the map, never over it, and the map is a little shorter to make room.
- Server-rendered game content must be visible without JavaScript: don't start it
  at opacity 0 for an entrance animation (axe also flags it mid-fade).
- Hotfix (apps/hotfix): an endless runner in the dino game's mould, drawn as pixel
  art on a canvas. `./core` is the engine: a fixed 60 Hz step (`step`), a seeded
  RNG in the state, no clocks and no transcendental maths (Math.sin etc. may differ
  between engines), so `replay(seed, inputs, frames)` rebuilds a run exactly; the
  input log records key presses and releases by frame (held jump = higher jump).
  Content (biomes every 1000 m, obstacle patterns, power-ups, numbers) lives in
  src/core/content.ts; bump RULES_VERSION when a change would replay differently.
  core/autopilot.ts plans moves on copies of the run: the balance tests use it to
  show every seed can be run for three minutes, and the waiting screen uses it as
  a demo. src/ui/ is the browser side (Runner: real time, pause, the log; sprites.ts:
  pixel art as strings; draw.ts, colours read from the --tr-* tokens through an
  element's `color`). The engine stays at 60 Hz; the screen draws every animation
  frame (120 Hz and up) from `Runner.view()`, the run interpolated between its last
  two steps, straight onto a canvas at the screen's resolution: edges snap to
  screen pixels and sprites are pre-scaled per size (SpriteBook), so motion is
  smooth. Drawing never feeds back into the run; effects age by elapsed time.
  Each biome's scenery crossfades in over the last one's for its first
  SCENE_FADE_METRES (`sceneLayers` in ui/draw.ts, eased). The robot is our
  own design, kept plain (a block, a visor, two legs). Signed out, records (best,
  furthest, runs, tokens, the day's Daily Run best) stay in the browser
  (`trilleo:game:hotfix`) and never move into an account: only checked runs count.
- Hotfix accounts (apps/web/src/lib/games/hotfix/): signed in, each run starts from
  a ticket (hotfix_tickets: seed, mode, day; POST /api/games/hotfix/runs, fetched
  ahead by the client's `Account` so Space starts at once; TICKET_LIMITS caps unused
  ones). At the crash the browser posts the input log (/finish, `packInputs`: one
  number per input); `finishRun` deletes the ticket, replays the log
  (`replay`, no further than the real time since the ticket, CLOCK_SLACK) and counts
  what the replay comes to, never the browser's numbers: totals and achievements in
  hotfix_players, the best run per board in hotfix_bests ("endless" or
  "daily:<YYYY-MM-DD>", inputs kept with `rules` = RULES_VERSION). The Daily Run's
  seed is `dailySeed(day)` (UTC), unlimited tries, best counts.
- Achievements (core/progress.ts, ACHIEVEMENTS: pure checks on a finished run plus
  totals; runs keep `stats` for them) unlock accessories (ACCESSORIES; pixel art in
  ui/sprites.ts ACCESSORY_ART, placed against the head; previews are SVG through
  --tr-* variables, ui/SpriteSvg.tsx); /look wears one, only if unlocked.
- Leaderboards (/games/hotfix/leaderboard/?board=endless|daily|yesterday) follow the
  profile rules like Skygrid's; each row links /games/hotfix/?watch=<best id>, which
  the server-rendered game page loads (`findReplay`) and the Runner plays back
  (`watch`). A best made under other RULES_VERSION can't be played back. All of it
  is in the account export and goes with the account.
- Touch screens in Hotfix (HotfixApp's window touch listeners): as in the dino game,
  a tap anywhere jumps while a run is on (held: higher; again in the air: the double
  jump), and in the game's band starts one; taps on links, buttons and fields
  (`TAPPABLE`) pass through. There's no slide on touch, so no pattern may need one:
  the balance tests also run every seed with jumps alone (`autoplay` with
  `slide: false`).
- Reduced motion in Hotfix: no demo, sparks, shake, blinking or parallax; the
  course itself still moves. The HUD is DOM text updated from the loop, not React
  state, so the page doesn't re-render 60 times a second.

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
  About): a home page section (a heading and a button, no listings) and a footer link, not in the header. Also in
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
- Public JSON API: the site's API, /v1/minecraft/projects[/{slug}[/latest]]
  (lib/api/routes/minecraft.ts, answers built by src/lib/minecraft/api.ts). The old
  /api/minecraft/v1/… addresses still answer the old shapes, with `Deprecation` and
  `Link: rel="successor-version"` headers; remove them in a later release. Embeds: …/<slug>/embed/ sends `frame-ancestors *`,
  which browsers obey over Caddy's X-Frame-Options. Creators see 30-day download
  charts on their dashboard and each project's releases page.
- Mojang's usage guidelines: pages about the platform carry MOJANG_NOTICE ("Not an
  official Minecraft product…"); never use Mojang's textures or logo.

## Study

- /study/ is "(06) Study": public course notes made from class materials (Rain
  Classroom), shared with the teachers' permission. A home page section and a footer
  link, not in the header. Pages are prerendered from study/ at build time:
  /study/ (subjects, exams), /study/<subject>/ (contents, facts, exams),
  /study/<subject>/<lesson>/, …/glossary/ and …/formulas/ (printable). Lesson slugs
  can't be those pages' names (RESERVED_LESSON_SLUGS); "study" is a reserved wiki slug.
- Content (packages/study/src/content.ts): study/<subject>/subject.md, <NN>-<unit>/
  unit.md, <NN>-<unit>/<NN>-<lesson>.md, figures/. Front matter is read by hand
  (front-matter.ts, no YAML parser) and checked: unknown fields, missing ones, bad
  names and slugs all throw StudyContentError listing every problem, so the build fails.
  `draft: true` subjects show in `pnpm dev`, tests and the e2e build (STUDY_DRAFTS=1),
  never in production; study/sample is the draft that exercises every block.
- apps/web/src/lib/study/content.ts loads the files with import.meta.glob (raw), renders
  lessons once per build with the blog's Shiki, throws on any rendering problem, and
  gathers each subject's glossary, formulas and counts (`subjectReference`). The server
  bundle only reads the subject list (share cards, llms.txt, the home page, /sitemap/).
- Rendering (render.ts): Markdown with HTML off, KaTeX at build time (math.ts:
  `$…$`, `$$…$$`, mhchem; Pandoc's rules so "$5" stays text; inline maths may break
  after commas outside braces, `breakableTex`, so long sets wrap on phones), headings numbered by
  lesson (2.3.1), components from components/blocks.ts numbering themselves per lesson
  and emitting glossary entries, formulas, cards and islands. Mistakes render as
  `.wiki-error` and come back in `errors`; packages/study's render.test.ts renders every
  lesson in study/ and fails on any.
- Widgets are React islands (`client:visible`): the renderer leaves
  `<study-island data-id>` placeholders, LessonBody.astro splits the HTML there and
  mounts Quiz/Plot/Explore/CircuitLab (Astro only hydrates components it sees
  imported). They render on the server first; quizzes' answers open without JS.
  Browser code imports only the pure modules (quiz, expression, units, widgets,
  circuit, progress, client), never the index (KaTeX, markdown-it).
- Quizzes check answers in the browser. Numbers with units
  (units.ts: SI prefixes, 1% default tolerance, a bare number reads in the answer's own
  prefix; unitless answers may be worked out or typed as fractions, `readNumber`),
  expressions (expression.ts: a hand-written parser with implied multiplication, never
  eval; equivalence by evaluating at seeded random points; `n!`, comb/C, perm/A, gamma,
  erf and Phi for probability; worked-out answers may end in a unit and use R, k_B, N_A, c,
  `PHYSICAL_CONSTANTS`), logic
  answers (the same truth table; `dontcare:` minterm numbers, counted over the
  question's `variables:`, are skipped), choices and words.
- Circuits (circuit/): a grid text format (parse.ts: R C L V I, plus A D Z S and the
  controlled sources E F, and transistors/op-amps/transformers Q M U T placed at one
  point with fixed pins, `devicePins`), DC modified nodal analysis (solve.ts:
  capacitors open, inductors and closed switches shorted, a tiny conductance to ground;
  passive sign convention; `simulationProblem` refuses diodes, controlled sources,
  devices and symbolic values) and GB/IEC-style SVG schematics (draw.ts: boxes for
  resistors, diamonds for controlled sources, currentColor, so both themes work). `loosePins`
  (solve.ts) makes a wired-in device with an unconnected pin a render error.
- Logic (logic.ts: a hand-written Boolean parser, `A'`, side-by-side AND, `+`, `⊕`,
  `⊙`; evaluation, LaTeX, minterms, Gray code) feeds components/logic.ts: `::: logic`
  (the LogicLab island), `::: kmap` (groups are product terms, checked against the
  1s and ×s) and `::: gates` (national-standard and distinctive symbols). The same
  parser reads events as sets (`∪ ∩ −`, Ω, ∅) for `::: venn` (components/sets.ts:
  Venn diagrams in plain SVG, one panel per `shade:` line, cells shaded by
  masks and clips, so the shading is worked out from the expression).
  `::: pv` (components/thermo.ts) draws p–V diagrams: processes from their equations
  (isothermal, adiabatic with γ, …), end states checked against them, work shaded.
  `::: graph` and `::: hasse` (components/graphs.ts) draw graphs and relation diagrams
  (loops, parallel edges, weights, rows or points, a highlighted walk, degrees counted
  from the edges) and Hasse diagrams (the order closed transitively, cycles refused,
  covering pairs and levels worked out).
- For the humanities (components/humanities.ts): `::: timeline` (dated events, a
  numbered figure) and `::: thinker` (dates, key works, ideas; the name goes in the
  glossary like a definition). Plain HTML, no islands.
- Plots (widgets.ts, react/Plot.tsx) also draw `bars` (discrete distributions, at whole
  numbers) and shade `region`s (comparison chains in x and y, sampled on a grid), and
  sliders can move in steps and carry a label.
- Look: textbook-like and quieter than the rest of the site (styles/study.css): serif
  headings with section numbers, numbered boxes, equation numbers at the right margin,
  captions below figures, Chinese in `font-cjk` with lang="zh-CN". No reveals or
  morphs; only short fades. Display equations wider than the column scroll sideways
  in their own box, never the page, and so do `.study-scroll` boxes (a formula's
  symbols table); grids holding them use `minmax(0, …)` tracks so they can't widen
  the column. StudyLayout's script (`enhanceScrollableMath`, packages/study/src/
  client/scrollable.ts) makes only the overflowing ones tab stops, re-checked on
  resize. On phones the formula sheet's "Lesson" link goes under its equation.
  Content rules for axe (header words, card fronts, breaking long equations) are in
  study/README.md. study.css is unlayered, so it beats Tailwind utilities on
  the same element: give it its own classes (`study-zh-block`).
- KaTeX's stylesheet is src/katex.css, generated by packages/study/scripts/katex-css.ts
  with only WOFF2 fonts (a test fails when it's stale; rerun the script after updating
  katex). Share cards have no CJK font: keep Chinese off them (`subjectCard`).
- SEO: Course JSON-LD on subjects, LearningResource on lessons, /og/study.png and
  /og/study/<subject>.png, a "## Study" section in llms.txt, lessons in the sitemap.
- Prettier ignores study/**/*.md (it would rewrite maths and ::: blocks).
- Progress (packages/study's progress.ts): someone's record is a list of events
  (`review` grade 1–4, `attempt` right/wrong + what was answered, `studied` a lesson,
  `card` a question made a flashcard). Everything else is derived, never stored:
  FSRS schedules (ts-fsrs, replaying each card's reviews; fuzz on, seeded, so
  deterministic), what's due, new cards (a lesson's cards join once it's studied, at
  most `newPerDay` first reviews a China-time day), the mistake log (latest answer
  wrong), mastery (latest quiz results and recall; a subject counts untouched lessons
  as 0), streak and 30-day activity. So browser and account records merge by union.
- Card and question IDs (ids.ts): `c:<lesson>:<hash of the front>` and
  `q:<lesson>:<hash of the prompt>`; a trailing `{#name}` pins one, keeping its history
  through rewording. Duplicates in a lesson are render errors.
- Storage: signed out, `trilleo:study:records` in preferenceStore (a "preferences"
  key, consent.ts's `trilleo:study:` prefix); signed in, study_events (PK user + the
  browser's UUID, so resends are harmless; STUDY_LIMITS caps a request and a person)
  and study_settings, through /api/study (lib/study/api.ts: GET answers 200
  `{ signedIn: false }` signed out, so pages log no error; POST events and PUT
  settings are same-origin and checked with parseEvent/parseSettings). The client
  store (src/client/store.ts, one per page) records optimistically and retries
  account saves; the dashboard offers to move browser records into the account. In
  the account export; deleted with the account.
- Decks: /study/decks/<subject>.json (prerendered: lessons, cards, questions with
  their check data) and /study/decks/index.json feed the browser widgets.
- Pages: lessons' quizzes are `LessonQuiz` (records attempts) and end with
  `LessonTracker` (client:visible: hydrating means the reader reached the end, which
  records `studied`); /study/ has the `Dashboard`; /study/review/ (`Review`: Space
  turns the card, 1–4 grade), /study/mistakes/ and /study/<subject>/practice/
  (`practiceSet` weights wrong ×4, untried ×2, right ×1) are noindex and out of the
  sitemap (`inSitemap` in site.ts). Subjects can't be called review, mistakes or decks.
- Importing a subject from Rain Classroom: the study-import skill
  (.claude/skills/study-import/SKILL.md). The person signs in themselves; materials go
  to study-sources/ (gitignored), never into git.

## Wiki

- wiki.trilleo.net is served by apps/web: src/middleware.ts rewrites the wiki host's
  paths to src/pages/wiki/ (`wikiRewrite`, lib/wiki/host.ts); /wiki/ on www 301s there.
  Locally it's wiki.localhost:<port> (browsers resolve *.localhost; Node may not, so
  e2e talks to it from the page). Links back to www are absolute (`mainOrigin`).
- One wiki per project (wikis: slug, name, short `code`, kind game|minecraft|code|
  general, visibility public|unlisted|private, home page, sidebar `nav`, optional
  `source`). The header band shows its code, name and kind; search, sidebar, members
  and links stay inside it. Slugs can't be the main site's top-level paths
  (RESERVED_WIKI_SLUGS; wikis.test.ts checks src/pages/) since prerendered files there
  would shadow them; Caddy redirects such files to www.
- Addresses: /<wiki>/<Title> (titles.ts: underscores for spaces, first letter upper
  case, case-insensitive `key`; one canonical path, others 301). The wiki's own pages
  sit under a reserved `-` segment: /<wiki>/-/edit|history|links|move/<Title>,
  -/revision/<id>, -/diff?to=&from=, -/search, -/recent, -/pages, -/categories,
  -/wanted, -/log, -/create, -/settings, -/action (POST); site-wide /-/sign-in,
  /-/auth, /-/sign-out, /-/new (admin), /robots.txt, /sitemap.xml.
- Roles (access.ts): the admin manages every wiki; owners run one (settings, members,
  move/protect/delete); editors write pages; everyone else reads public and unlisted
  wikis (private ones 404 for them). Protected pages are owners-only.
- Pages (store.ts): wiki_pages (current HTML, toc, plain text) + wiki_revisions (never
  changed). Saving sends the revision it started from; a newer one means a conflict
  that hands back the current text. Links and categories are recorded on save
  (wiki_links, wiki_categories: backlinks, wanted pages, category lists). Deleting is
  soft and drops them until restored. Moves can leave a `#REDIRECT [[Title]]` page.
  Other actions go to wiki_log. Account deletion keeps revisions without the author.
- Markup (render.ts): markdown-it with HTML off, http(s)/site links only, images only
  from files.trilleo.net, Shiki for code (shared with the blog), headings from h2 (the
  title is the h1; "#" and "##" are both h2), plus [[Title|label]], [[Title#Section]], [[Category:X]],
  [[:Category:X]], [[@wiki:Title]] (another wiki, marked) and #REDIRECT. Links carry
  `data-wiki-key`; the view marks missing ones (`markMissing`). Bump
  WIKI_RENDER_VERSION when output changes. No user-written templates (for now).
- Generated pages (sources/): a wiki's `source` adds read-only pages written from code
  as wiki Markdown, rendered once per server (generated.ts). Their titles can't be
  written over. Skygrid's is sources/skygrid.ts (see Games).
- Built-in wikis (seed.ts) are created once per database the first time the wiki is
  used (`wikiDb()`), and never overwritten after: Skygrid, and TownyMenu
  (seed-townymenu.ts: the docs for Trilleo's Towny GUI plugin, github.com/Trilleo/TownyMenu,
  written pages whose `::: menu` mock-ups are built from its English lang file and
  menu layouts; seed.test.ts checks every page, link and section link). A TownyMenu
  change only reaches live wikis by editing the pages there.
- Layout (WikiLayout): the site's tokens and grid, denser (`.prose-wiki` in
  styles/wiki.css), sidebar in columns 1–2, page in 3–9, contents in 10–12; no
  reveals, no morphs, cross-document view transitions off, buttons with the plain
  hover (`wikiButton`). Everything works without JavaScript.
- Components (@trilleo/wiki): blocks are `::: name argument` … `:::` (nesting allowed;
  `::: name argument :::` on one line), inline ones `{{name argument}}`. Bodies are
  `key: value` fields, `== Label ==` sections, or wiki Markdown, rendered through the
  same parser (links, categories, nested components). Each component is one module
  with its documentation (summary, example, notes) and a server-side `render` that
  escapes or renders everything typed; nothing runs in the browser except tabs
  (`enhanceTabs`, loaded by WikiLayout; without JS they're sections). Unknown,
  misused, switched-off or failing components render a visible `.wiki-error`.
- Component sets: wikis.component_sets (`core` always on). Changing them marks the
  wiki's pages for re-rendering. Core: infobox, notice, tabs, collapse, navbox,
  columns, stub and outdated (add Category:Stubs / Outdated pages via
  `addCategory`), badge, kbd. /<wiki>/-/components documents what a wiki can use,
  with live examples, straight from the registry.
- The page's first top-level infobox (`data-placement="page"`) is lifted out
  (`splitInfobox`) into the layout's right column on desktop, above the contents,
  and shown in the text below xl. Infoboxes are labelled `<section>`s, not
  `<aside>`s: complementary landmarks can't nest in main.
- The minecraft set (owners switch it on; Skygrid deliberately doesn't use it):
  `{{mc §6text}}` / `::: mc` (§ codes, @trilleo/wiki's minecraft/text.ts; only §, not
  &), `::: item` on an `Item:<name>` page describes an item (name, rarity, type, icon,
  lore lines; other rows show in its infobox), `{{item Name x64}}`, `::: item-infobox
Name`, `::: inventory 3x9 Title` (slots `5: Item x64`, ranges, `row 2: A, , B`),
  `::: menu` (see Menus below). They
  look like the game in both themes (wiki-minecraft.css: game colours, tooltip, slots).
  Tooltips follow a mouse cursor as the game's do, one at a time (`placeTooltips` in
  @trilleo/wiki's client.ts); keyboard focus and touch place them under the item.
  Text is set in "Minecraft" by Jacob Debono, a free fan-made font (not Mojang's),
  committed as WOFF2 in packages/wiki/src/fonts (NOTICE.md); never ship Mojang's files.
- Items: saving an Item: page records its item in wiki_items (`recordItem`, in
  replaceLinks), and pages showing it link to its page, so a changed item marks them
  for re-rendering. `itemLookup` (lib/wiki/items.ts, cached per wiki) serves written
  items plus a source's `items()`. Components get it as the "items" resource; the
  renderer gives components a host (href, link, imageUrl, resources) and reads back
  what they emit (`item`). `href`/`link` take `Title#Section` (or `#Section`).
- Menus (minecraft set): `::: menu 6 Title` draws a plugin's chest GUI (1–6 rows of 9),
  each slot written in place: `20: bell glow x3 | §6Name | lore | | -- | §eClick! -> Page`
  (slots from 0 as plugins number them, ranges and lists; an empty part is a blank line,
  `--` a rule; `fill: material` for empty slots, without tooltips). Buttons with `->`
  link to the page they describe; the others are focusable `role="img"` slots, so
  `enhanceInventories` moves along both. Icons are @trilleo/wiki's minecraft/icons.ts:
  our own pixel sprites (shape families coloured per dye/tier, plus single drawings) as
  inline SVG, never Mojang's textures; a material without one gets a lettered swatch.
  icons.test.ts lists every material TownyMenu uses and checks each has a sprite.
- Pictures: a wiki's Files page (/<wiki>/-/files, members) uploads to the `wiki-media`
  purpose, attaching each upload to the wiki as it starts (/<wiki>/-/files/attach). A
  member's attached file is published once scanned, without review (StorageDeps'
  `waivesReview` → `wikiMemberUpload`). The wiki host passes /api/ through to the app
  so the upload widget works there; the OBS bucket's CORS must allow the wiki's origin.
  Images in pages and icons: only files.trilleo.net (or the local driver's
  /api/storage/local/ in dev and tests), `allowedImage`.
- Recipes (minecraft set): `::: recipe Station [WxH][, time]` with slots, rows or a
  `- Item x2` list, and `makes: Item x4` (@trilleo/wiki's minecraft/recipes.ts). Saved
  recipes go to wiki_recipes (`recordRecipes`, in replaceLinks; output key, input keys
  with a GIN index, the recipe and its rendered panel). Item: pages list "Made with"
  and "Used in" from it at view time (`recipesForItem`), leaving out the page's own.
  Panels are shown on other pages, so ids are unique per render (`idPrefix`).
- Calculators: `::: materials Item x3` (minecraft) follows the wiki's recipes
  (`recipeLookup`, first recipe per output) to raw materials; `::: calculator`
  (core, `input`/`result` lines, formula.ts: a hand-written arithmetic parser, never
  eval) and `::: costs` (core, a table summed between two rows). The server renders
  the defaults worked out; client.ts makes them live from a JSON script block
  (`scriptJson` escapes `<`), with the same code (calculators.ts) on both sides.
  A changed recipe re-renders pages linking its output's page.
- Proposed edits (lib/wiki/proposals.ts, wiki_proposals): signed-in readers who can't
  edit a page (`canProposeTo`: non-members, and editors on protected pages) get
  "Propose a change" instead of "View source"; the edit form then proposes. Limits:
  PROPOSAL_LIMITS (per day across wikis, waiting per wiki). Members review at
  /<wiki>/-/proposals[/<id>] (a diff against the page as it is now, and a preview);
  approving claims the proposal, then saves it with `savePage` as the proposer's
  revision on top of the current one (owners only for protected pages); declining
  keeps a note. Proposers see their own there and can withdraw. Emails: "wiki-proposal"
  to the wiki's editors and owners (owners only for protected pages), "wiki-decision"
  to the proposer (topic "wiki"). Both decisions go to wiki_log.
- Watchlists (lib/wiki/watch.ts, wiki_watches: a page key, or "" for the whole wiki):
  saving a page (unless `watch: false`) and proposing watch it; moves carry watches
  along. Buttons: WatchButton (POST /<wiki>/-/watch) at a page's foot and on Recent
  changes (the whole wiki). /-/watchlist (site-wide on the wiki host) lists others'
  edits since each watch began, only in wikis the person can still read.
  `sendWikiDigests` runs from the mail delivery pass at most hourly and emails each
  person due one (DIGEST.gapMs since their last, wiki_digests) what changed, if
  anything ("wiki-digest", topic "watchlist"); /admin/mail/ can send due ones now.
  Email links are absolute to WIKI_URL.

## Forum

- /forum/ is "(07) Forum": a home page section (a heading and a button, no topics)
  and a footer link, not in the header.
  Rules in packages/forum (pure), data in apps/web/src/lib/forum/ (store.ts reads and
  writes, tree.ts the forum tree, admin.ts the admin's forms), pages in
  src/pages/forum/, components in components/forum/, post styles in styles/forum.css.
- Structure: one `forums` table, a tree: categories at the top (kind "category",
  hold only forums), forums inside, subforums to any depth. Addressed by slug alone
  (/forum/<slug>/; RESERVED_FORUM_SLUGS are the section's own pages). Topics are
  /forum/<forum>/<id>-<slug>/, found by id: another forum or slug 301s, so renames
  and moves keep links. /forum/post/<id>/ is a post's permalink (redirects to its
  page and #post-<id>). The migration seeds Community (Announcements, General,
  Introductions) and This site (Help & feedback).
- Topics hold posts (forum_topics, forum_posts); the first post is the opening one
  (`firstPostId`). States: pending (its author and moderators see it), published,
  hidden. Deleting sets `deletedAt` (kept, out of every view); deleting the first post
  deletes the topic, which its author may do only until someone else replied. Topic
  and forum counts and last posts are caches: every write calls `refreshTopic`, which
  recounts the topic and its forum. A forum's totals include its subforums' in
  `ForumTree` (counted in memory).
- Permissions: every check is @trilleo/forum's `can(viewer, permission, place, topic,
post, now)`. People are in groups (forum_groups): guest, newcomer, member and admin
  follow the account (`groupsOf`); moderator and the admin's own groups are given
  (forum_group_members). A group allows a set of FORUM_PERMISSIONS everywhere and has
  an edit window (minutes, null: always; someone gets their groups' longest). A forum
  can allow or deny any permission for any group (forum_permissions); its subforums
  follow unless they choose again (`resolveRules`). People assigned to a forum
  (forum_moderators) moderate it and everything under it, as do groups allowed
  "moderate" there; the admin can always do everything. `loadTree` (lib/forum/
  access.ts) loads all of it; `tree.place(forum)` resolves a forum's rules and
  moderators; `forumViewer(db, tree, user)` adds groups, an active ban and the edit
  window. New permissions go in FORUM_PERMISSIONS (and the built-in groups' defaults,
  which migration 0025 wrote). Pages check before showing a button; the store checks
  again. Admin: /admin/forum/groups/[<id>/] and each forum's page (permissions matrix,
  moderators).
- Moderators (lib/forum/moderation.ts): move (to a forum they moderate), merge (posts
  join the other topic; the old one is deleted with `merged_into`, its address 301s),
  split (ticked posts, via the `form` attribute, into a new topic), edit history
  (each edit keeps the version it replaced in forum_post_revisions;
  /forum/history/<post>/), bans (forum_bans: 1/7/30 days or permanent, with a reason
  the person sees; they can still read and delete their posts; the admin lifts them
  at /admin/forum/?tab=bans) and reports (forum_reports, POST /forum/report: posts,
  and profile pictures for those who moderate everywhere; storage's
  `reporterCounts`/`reportsHide` rule auto-hides a post, and dismissing brings back a
  post the reports hid). /forum/moderate/ is the queue (waiting posts and reports)
  for anyone who moderates something, filtered to their forums; the account menu
  links it (`isForumModerator`). Everything is logged (forum_log, LOG_ACTIONS;
  /admin/forum/?tab=log).
- Moderation per forum (`forums.moderation`): none, newcomers (the default; trust is
  users.trusted_at, shared with comments: approving a post trusts its author) or all.
  A reply to its author's own waiting topic waits with it and goes live with it.
  FORUM_LIMITS caps bursts, daily posts and waiting posts (moderators are exempt).
  Waiting posts send an admin alert (kind "forum"; reports: "forum-report") and wait in
  /forum/moderate/ (the old /admin/forum/?tab=waiting redirects there).
- Formatting (packages/forum's render.ts): markdown-it with HTML and images off,
  headings shifted to start at h3, lists, tables, strikethrough, http(s)/site links
  (nofollow ugc), and @username linked for public, unblocked profiles (looked up when
  saved). Rendered on save into `html`; bump FORUM_RENDER_VERSION when its output
  changes (stale posts re-render when read). Quotes are plain Markdown (`quoteFor`).
  Changing what's enabled means updating its XSS tests.
- Layouts (`FORUM_LAYOUTS`, chosen per forum): classic (by time), qa (the question,
  the accepted answer, then by `score` from forum_votes; the asker or a moderator
  accepts, which marks the topic solved and is worth POINTS.acceptedAnswer) and
  threaded (replies keep `parent_id`, nest up to MAX_DEPTH, pages are whole
  threads). One order function for all: @trilleo/forum's `orderPosts`/`pageOf`;
  `listPosts` loads the light rows of everything visible, orders, then fetches the
  page. Blocked accounts' topics and posts are left out of views at read time.
- Engagement (lib/forum/): reactions.ts (REACTIONS, one per person per post, toggled;
  votes; accepting), reputation.ts (forum_user_stats recounted from the rows by
  `refreshStats`, which `refreshTopic` calls for a topic's authors; badges kept once
  earned; forum_ranks edited at /admin/forum/ranks/), tags.ts (free tags,
  normalized, MAX_TAGS; each forum's prefixes, edited on its admin page; solved),
  reads.ts (forum_reads + "mark all read"; before reading anything, what's older
  than the account counts as read), drafts.ts (/api/forum/drafts, autosaved by
  lib/forum/post-form.ts, which also drives the live preview through
  /api/forum/preview), notifications.ts (watches; `notifyPublished` when a post goes
  live: forum watchers for a new topic, topic watchers for a reply, and the people
  its rendered HTML mentions (`data-mention`) or quotes (`quotedPostIds`), one
  notification each, only if they can see it; reactions and accepted answers too;
  instant emails ("forum-notification", topic "forum") or digests
  ("forum-digest", from the mail delivery pass); forum_user_settings holds the
  frequency, auto-watching replies, the signature). Notifications are purged after
  NOTIFICATION_RETENTION_DAYS.
- Member actions are POST /forum/engage (`do`: react, vote, accept, unaccept,
  solved, unsolved, watch, unwatch, labels, read-all); reactions answer JSON to
  lib/forum/reactions-client.ts. Pages: /forum/unread/, /forum/tags/<tag>/,
  /forum/members/<username>/ (rank, points, badges, posts; follows the profile's
  privacy), /account/notifications/ (the account menu shows the unread count),
  /account/forum/ (settings, watching). Forum pages filter by ?filter= and ?prefix=.
- Feeds and search engines: /forum/rss.xml, /forum/<forum>/rss.xml,
  /forum/<forum>/<topic>/rss.xml (lib/forum/feeds.ts, visitors' view),
  /sitemap-forum.xml (in robots.txt), a "## Forum" section in llms.txt, share cards
  /og/forum.png and /og/forum/<topic id>.png (lib/forum/seo.ts), and
  DiscussionForumPosting JSON-LD on topics. BaseLayout's `feeds` adds a page's
  RSS links.
- Pages work without JavaScript: posting, Preview (a round trip), Quote (?quote=<id>),
  editing (/forum/edit/<id>/), and every button (POST /forum/action, with `back`).
  Search is Postgres full-text search over titles and posts (/forum/search/?q=,
  noindex). Admin: /admin/forum/ (the tree, up/down, "Add forum"; ?tab=bans, ?tab=log)
  and /admin/forum/<id>/ or new/[?parent=] (name, address, description, parent,
  layout, moderation, locked, hidden, permissions, moderators; delete only when
  empty). Posts show their author's group titles.
- Accounts: the export has `forum` (topics and posts, deleted ones too, their earlier
  versions, reports made, bans, groups, settings, watches, notifications, reactions,
  votes, points, badges, drafts, reads, polls, attachments, conversations and the
  messages they wrote, blocks). Deleting an account keeps its posts without
  the author ("Deleted account"), like wiki revisions; its bans, reports about it and
  memberships go.
- Polls (lib/forum/polls.ts; forum_polls, forum_poll_options, forum_poll_votes): one
  per topic, added on the new-topic form (PollFields, @trilleo/forum's
  `validatePoll`; permission "poll.create"), single or multiple choice (`maxChoices`),
  a closing date or closed by the asker or a moderator, votes changeable while open
  (`validVote`). Totals show after voting, when closed, or if `resultsBeforeVote`;
  moderators always see them and who voted. The mail delivery pass tells askers
  their poll closed (`notifyClosedPolls`). Votes are "poll-*" actions on /forum/engage.
- Attachments (lib/forum/attachments.ts; storage purpose "forum", forum_attachments;
  permission "post.attach"): the post form's ForumAttachments island uploads straight
  to storage and keeps each upload for the next post as it starts
  (/api/forum/attach); posting links them (ATTACHMENT_LIMITS: 10 MB, 5 per post); a
  refused or previewed post keeps them (PostForm's `pending`). Members the forum
  trusts skip review (`forumTrustedUpload`, StorageDeps' waivesReview); until public a
  file shows only to its uploader and moderators. Pictures open in Lightbox.astro
  (lib/forum/lightbox.ts, a <dialog>). Attaching needs JavaScript.
- Private messages (lib/forum/conversations.ts; forum_conversations,
  forum_conversation_members, forum_messages, forum_blocks): 2–10 people. Senders must
  be trusted (or moderate everywhere) and not banned; reaching someone follows their
  setting (forum_user_settings.messages: everyone, contacts, nobody) and blocks
  (`mayMessage`), except for staff. Pages /account/messages/[new/|<id>/] (reply,
  leave, mute, add people, block, report), counts in the account menu, "message"
  notifications (emailed per the forum email setting, never with the text). Messages
  are private: only a report (forum_reports kind "message") shows one, with
  REPORT_CONTEXT before it, to the admin alone in /forum/moderate/. MESSAGE_LIMITS caps
  bursts, daily messages and new conversations. Deleting an account deletes its
  messages and memberships.

## API

- api.trilleo.net is the API for other programs (bots, scripts), served by apps/web:
  src/middleware.ts rewrites the API host's /v1/… to src/pages/api/v1/[...path].ts and
  everything else to the docs in src/pages/developers/ (`apiRewrite`, lib/api/host.ts);
  /developers/ on www 301s there. The site's own /api/v1/… reaches the same dispatcher
  (and is exempt from the same-origin check: the API goes by keys, never cookies).
  Locally it's api.localhost:<port>. The API host has no sessions; the middleware only
  rewrites (and starts the usual background work).
- Groups: System, Site (site, tools, games), Posts (posts, tags), Minecraft, Study
  (all public, cached a few minutes), and Daily cryptic (key and scopes). Public
  routes answer from the same lib/ code the pages use, so they show only what the
  pages show; lists page with `items` + `nextCursor` (opaque base64url cursors).
- Routes are declared once with `defineRoute` (lib/api/registry.ts): method, path
  (`{name}` parameters), operationId, group (API_GROUPS), summary, description, auth
  ("public" | "key"), scope, params/query/body/response schemas, an example, the handler.
  ROUTES (lib/api/routes/index.ts) lists them. The dispatcher (dispatch.ts) checks the
  key and scope, takes from the rate limit, checks inputs, runs the handler and records
  usage; handlers throw `ApiError(code, message, details)`. The docs pages, /docs.md
  (everything in one Markdown file, for agents writing clients), /openapi.json and
  /llms.txt are all written from the same declarations (lib/api/docs/), so they can't
  drift; api.test.ts checks every route's examples against its own schemas.
- Schemas (lib/api/schema.ts): a small hand-written validator (`t.string`, `t.integer`,
  `t.object`, `t.optional`, `t.nullable`, `t.array`, `t.enum`, `t.date`, `t.dateTime`),
  each also its JSON Schema and the docs' field rows; no zod. Unknown fields are
  ignored; query values are read from text.
- Conventions (stated on the docs' Conventions and Versioning pages, so keep them
  true): JSON always; successes are the resource itself, not wrapped; errors are
  `{ error: { code, message, details?, requestId } }` with codes from ERROR_CODES
  (errors.ts); camelCase fields, null for "not set"; ISO times in UTC, `YYYY-MM-DD`
  days (UTC); lists page with `items` + `nextCursor`; every answer has Request-Id.
  Public routes send CORS `*` and may be cached (`cacheSeconds`); keyed routes are
  `private, no-store` and send no CORS. Within v1 only additions: never rename, remove
  or change the meaning of a field, route or code.
- Keys (keys.ts, api_apps, api_keys): only the admin makes apps (/admin/api/, with
  scopes and a per-key rate limit) and their keys (`trl_` + 32 characters, shown once,
  stored as SHA-256; a label, all of the app's scopes or a chosen few, an optional
  expiry; revocable). Switching an app off stops its keys. Scopes are API_SCOPES
  (scopes.ts). `Authorization: Bearer <key>`; a key sent to a public route is checked
  too. `last_used_at` is written at most once a minute.
- Limits (limits.ts, API_LIMITS; the docs quote them): token buckets in memory
  (rate-limit.ts), per key at the app's rate, or per hashed IP without a key (idle
  buckets dropped after a minute, as the privacy page says); bodies up to 64 KB.
  Usage (usage.ts): api_usage per key, UTC day and route (count, errors, time), and
  api_errors (failed requests, not 429s) for API_LIMITS.errorLogDays; both purged by the
  dispatcher at most hourly. Requests without a key aren't recorded.
- Webhooks (lib/api/webhooks/, api_webhooks, api_webhook_deliveries): the admin adds
  up to WEBHOOK_LIMITS.perApp to an app (an https address, or http to localhost; the
  events its scopes allow) on /admin/api/<id>/ (#webhooks: secret, test ping, new
  secret, on/off, recent deliveries with "Again"). Events are WEBHOOK_EVENTS
  (events.ts: summary, when, scope, data schema, example; the Webhooks guide is written
  from them): `cryptic.day`, `post.published`, `ping`. `emit` queues an event once
  per webhook and event ID (a unique index), so emitting again is harmless; run.ts
  queues what's due (today's cryptic.day, posts public within the last day) and sends
  what's queued, from a timer every minute and just after each UTC midnight
  (`startWebhooks`, started by the middleware's first server-rendered request, the
  health check: never at module load, which the build's prerendering does too, with
  no database) and at once after a test or
  redelivery (`kickWebhooks`). deliver.ts POSTs JSON `{ id, type, createdAt, data }`
  signed `Trilleo-Signature: t=…,v1=HMAC-SHA256("t.body")`; 2xx is sent, no answer,
  5xx, 408 and 429 retry on WEBHOOK_LIMITS.retryDelaysMs, anything else fails;
  WEBHOOK_LIMITS.failuresToDisable failed deliveries in a row switch the webhook off
  with an admin alert ("webhook-disabled"). Deliveries are purged after
  WEBHOOK_LIMITS.deliveryDays. A new event: add it to WEBHOOK_EVENTS, emit it from
  run.ts (or where it happens) with a stable ID, and add a changelog entry.
- The docs (DocsLayout, `.prose .prose-wiki`) are pages from lib/api/docs/pages.ts:
  the overview, the guides (guides.ts: authentication, conventions, errors, rate limits,
  versioning, changelog; webhooks.ts: webhooks) and one reference page per group (reference.ts). Guides quote
  constants from the code; what they say about behaviour is kept true by hand. Keep
  comments out of their code samples: Shiki's vesper theme greys them below WCAG
  contrast (axe checks the docs pages in e2e/a11y.spec.ts).

## Daily cryptic

- One cryptic crossword clue per UTC day, written by the admin and played through the
  API (a Discord bot: the bot fetches the clue and posts players' guesses; the site
  checks them and keeps score). There's no page for playing it on the site.
- Puzzles (lib/cryptic/puzzles.ts, cryptic_puzzles): clue, answer (upper case, as
  written), enumeration ("4,3"; empty in the form: taken from the answer), explanation,
  setter, and a `day` (null: a draft). One per day. Once its day has come a puzzle is
  live: answer, enumeration and day are locked and it can't be deleted. Numbers (#42)
  count puzzle days, so they never change for live ones.
- Players are per API app (cryptic_players: the app's own ID for them, e.g. a Discord
  user ID, and the latest name sent; deleted with the app, or by
  `DELETE /v1/cryptic/players/{id}`). Guesses (lib/cryptic/players.ts `recordGuess`):
  only letters count (case, spaces, hyphens, accents ignored); a guess with the wrong
  number of letters is refused and not a try; on today's puzzle each counted guess is
  a try until solved (cryptic_attempts, one upsert so concurrent guesses can't undo a
  solve), on a past one it's practice and nothing is kept. Ranks: fewest tries, then
  soonest. Streaks count puzzles, not days, and today's open puzzle doesn't break one
  (@trilleo/cryptic `streaks`). Leaderboards and stats are worked out per request.
- API routes are in lib/api/routes/cryptic.ts (scopes `cryptic:read`, `cryptic:play`;
  errors `no_puzzle`, `guess_wrong_length`). Answers appear only once a day is over
  (`publicPuzzle`); days to come are `no_puzzle`, like days without one.
- Admin: /admin/cryptic/ (today with its numbers, the next fortnight with gaps to
  fill, drafts, past days) and /admin/cryptic/<id>|new/ (the editor; ?day= prefills).
  When fewer than CRYPTIC_LIMITS.queueWarnDays days from today have a puzzle, /admin
  and /admin/cryptic/ warn, and the middleware's hourly check (lib/cryptic/queue.ts)
  sends an admin alert ("cryptic-queue"), once a day, while the cryptic is in use.

## CHUNITHM catalog

- The CHUNITHM chart viewer (/tools/chunithm/): its song catalog, chart pictures and
  pages. Pure rules in packages/chunithm; data, updates and builds in
  apps/web/src/lib/chunithm/ (sources.ts, sync.ts, build.ts, jackets.ts, viewer.ts,
  admin.ts), tables chuni_*; the React side in apps/chunithm (@trilleo/tool-chunithm).
- Sources: SEGA's music.json (what's in the Japanese game, official IDs; the authority),
  otoge-db (otoge-db.net: constants, note counts, designers, versions and dates, links
  to sdvx.in pages, removed songs, and each ended version's frozen constants in
  music-ex-<version>-final.json), and sdvx.in (the chart pictures: list pages, then one
  script per entry for title, artist, BPM, designer, CHAIN and each chart's page).
  sdvx.in's 配信停止 page lists songs SEGA removed from the game (with the version and
  day), not charts sdvx.in took down.
- Songs are keyed by SEGA's ID; World's End charts are songs of their own (IDs from
  8000), with a kanji and 1–5 stars. Songs and charts are never deleted: removed ones
  stay with `inGame` false. sdvx.in has hundreds more pages for songs removed before
  otoge-db's records: they have no official ID and stay unplaced ("older" on the admin
  page, never alerted).
- Links from charts to sdvx.in pages (`sdvxPath`, "11/11061mst"), strongest first: the
  admin's (chuni_sdvx_overrides, which can also ignore a page), otoge-db's, then the
  same title (+ artist; World's End also kanji and stars). One page per chart, one
  chart per page.
- Constants are kept per version (chuni_constants, tenths): the current version's from
  music-ex.json, only for songs in the game; an ended version's from its final file,
  looked for daily until it appears. `chuni_charts.constant` is the current one.
  Versions (chuni_versions) are ordered by KNOWN_VERSIONS, then unknown ones by start
  (the first day with LAUNCH_SONGS songs); the last is the game now. A new version
  works without a code change; add it to KNOWN_VERSIONS for its proper name.
- Updates (sync.ts `syncCatalog`): a timer (`startChunithmSync`, started like the
  webhooks' by the first server-rendered request; every TICK_MS it checks `passDue`) or any request starts a
  pass every SYNC_EVERY_MS, and BACKLOG_GAP_MS after the last one ended while scripts
  or jackets are waiting; "Check now" on /admin/chunithm/ starts one at once. One pass
  at a time per server. The song lists are all-or-nothing, and a SEGA list under
  MIN_SHARE_KEPT of the songs we have is refused. sdvx.in is read one request at a time
  (SDVX_PASS: 400 scripts a pass, 300 ms apart, FETCH_LIMITS.sdvxTimeoutMs each, reread
  after 30 days; songs' folders newest first, then Ultima and World's End), with our
  User-Agent; the first fill takes about half an hour. A pass stops reading at
  PASS_TIME_LIMIT_MS, or after SDVX_PASS.failuresToStop requests in a row without an
  answer; a script that got none, or whose download broke off partway (`readBody`),
  stays unread for the next pass (a 404 counts as read), and one that failed is read
  again after SDVX_PASS.retryFailedDays (the admin page lists them, with "Read again").
  Unfinished rows show as "Interrupted" once no pass is running. Each pass then copies
  JACKETS_PER_PASS jackets (JACKETS_WHILE_READING while scripts are unread) (jackets.ts: sdvx.in's PNGs, 300px or, for newer songs, up to
  1000px and 2.5 MB, shrunk to JACKET_SIDE and kept as WebP under
  `chunithm/jackets/` in storage, newest songs first, a song's own chart pages tried
  before its Ultima and World's End ones; failures are tried again after
  JACKET_RETRY_DAYS), and passes keep the BACKLOG_GAP_MS pace while any song is due
  one (`jacketsDue`, the summary's `jacketsLeft`). Opening a chart copies its song's
  missing jacket in the background (`copyJacketSoon`, from the picture route), and the
  tool's lists ask for the missing jackets of the songs they show (POST
  /api/chunithm/jackets → `wantJackets`: one worker, LIST_JACKETS caps a request and the
  queue), then load the index again after JACKET_REFRESH_MS. SEGA's
  image server can't be reached from the server, so pages only ever show our copies. Each pass is logged in chuni_syncs (the last 50). Alerts
  ("chunithm-update"): new songs, new versions, pages sdvx.in added since the first
  fill that couldn't be placed (`newPagePaths`), and four failed passes in a row.
- /admin/chunithm/: counts (jackets copied, missing and failed lately, with "Copy
  jackets now": one batch in the background, retrying recent failures too; each failed
  copy is logged with its reason), recent passes, suggested names waiting (a link to
  /admin/chunithm/aliases/), charts without a page (link one by its
  path), pages to place (link to a SEGA ID or ignore), placements by hand, withdrawn
  charts (hidden and never built; updates leave them), and versions with their
  constants.
- Settings: CHUNITHM_SYNC=off never fetches; CHUNITHM_SEGA_URL, CHUNITHM_OTOGE_URL and
  CHUNITHM_SDVX_URL point elsewhere, CHUNITHM_SDVX_DELAY_MS changes the wait between
  sdvx.in requests. E2E points them at e2e/fake-chunithm.ts (a 512-song list and one
  drawn chart, PNGs made with node:zlib) and waits for the catalog (`catalogReady`).
  Unit tests pass fetch, sources, storage and a clock to `syncCatalog` instead.
- Chart pictures (lib/chunithm/build.ts, chuni_builds; joining in packages/chunithm's
  charts.ts): sdvx.in draws a chart as three layers of the same size (bg lanes, obj
  notes or `mirror…` notes, bar measure numbers), each a row of columns COLUMN.pitch
  (200px) apart: a 50px gutter with the numbers, a 150px lane. A column reads bottom
  to top, its content runs down to the image's bottom from its own top (heights
  differ), and its top COLUMN.overlap (48) rows are the next column's bottom rows;
  the column count follows the width. A build reads the layers' URLs from the chart
  page's script (`parseSdvxImages`; never guessed: some layers are gone, and sdvx.in
  302s missing files to an HTML page, so layers are fetched with `redirect: "manual"`
  and must be PNGs of one size; notes layers run to 15 MB, slow from the mainland, so
  sources.ts `download` has no limit on the whole body, only on silence, and resumes
  a body that breaks off with Range + If-Range: LAYER_DOWNLOAD, JACKET_DOWNLOAD), checks every overlap (`checkOverlaps`: a chart that
  doesn't line up fails with a reason), finds the measures (each gutter label's
  bottom row), flattens onto black, and cuts the strip (positions counted from the
  bottom) into TILE_HEIGHT WebP tiles under `chunithm/<chart>/<variant>-<random>/` in
  storage, public unless the chart is withdrawn. No `files` rows: chuni_builds holds
  the manifest (tile keys, measures) and where the layers came from (with ETags).
- Decoding is png.ts (hand-written, on node:zlib: 8-bit, not interlaced); encoding
  webp.ts (@jsquash/webp's SIMD build, the wasm inlined with `?inline`, quality 90).
  A Master chart is about 1.5 s and 2 MB.
- Builds happen on demand: GET /api/chunithm/charts/<SEGA id>/<difficulty>
  [?variant=mirror] answers ready (the manifest, tile URLs), queued/building (202,
  ask again), failed (why, and when it's tried again) or unavailable (no-chart,
  no-page, withdrawn, storage, busy, too-many), and queues a build. One build at a
  time per server (`runBuilds`; the middleware picks up waiting ones), BUILD_LIMITS:
  perHour all together, perVisitorHourly per visitor (an in-memory hash of the IP),
  maxQueued; failures wait retryDelaysMs; a rebuild that fails keeps the old tiles.
  A failure's reason says what broke (a layer, a download cut off, storage refusing,
  or the unexpected error's own message), and the admin page lists them.
  A ready picture is rebuilt when BUILD_VERSION changes or the chart's page changes,
  and compared with sdvx.in (HEAD, ETags) when viewed after checkAfterDays. Bump
  BUILD_VERSION when tiles or the manifest would come out differently.
- Withdrawing a chart makes its tiles private (browsers may keep a copy for a day,
  PUBLIC_CACHE); restoring makes them public. /admin/chunithm/ shows the builds, builds
  one by hand, lists failures with their reasons, and throws a build away ("Rebuild").

- The tool (apps/chunithm): /tools/chunithm/ (`ChunithmApp`) loads the catalog index
  (/api/chunithm/index.json, lib/chunithm/viewer.ts `songIndex`: every song with a
  chart, viewable or not, its jacket's URL and aliases; rebuilt after each catalog
  update's catalog write, each batch of copied jackets, and each admin change to names,
  links or withdrawals (`forgetIndex`), at
  most every few minutes otherwise; its ETag is a hash of the content, and the tool
  fetches it with `cache: "no-cache"`, so changes show at once)
  and searches it in the browser (packages/chunithm's search.ts: titles, aliases,
  SEGA's readings and artists; `foldKana` writes anything typed the way SEGA writes
  readings, `romajiToKana` reads romaji; then browse.ts's filters: difficulty, level,
  constant, genre, version, in the game or removed). ?q= keeps the search.
- A chart's page, /tools/chunithm/<SEGA id>/<difficulty>/ (server-rendered, noindex,
  the tool's share card): an info box (the jacket at its own 300px, never enlarged,
  or "No jacket yet"; facts: constant per version, notes, full combo, designer,
  versions), other difficulties, a credit linking the sdvx.in page, and `ChartViewer`.
  The page only reads the build (`peekBuild`, so crawlers start none); the viewer asks
  the picture route (starting the build) and asks again every POLL_MS. Layouts: strip
  (one column, scrolled) and sheet (layout.ts `sheetColumns`: screen-tall columns side
  by side, SHEET_OVERLAP repeated). Sizes 1×–3×, drawn hard-edged (`crisp`) whenever a
  picture pixel covers whole screen pixels, so tiles are never smoothed. Mirrored notes
  from the mirror build. Measure 1 starts at the box's bottom; the page scrolls it on
  screen once. The layout and size are a "preferences" key, trilleo:tool:chunithm:view.
- Favourites and recent charts are tool data (`SavedChart`, keys f-/r-<id>-<difficulty>,
  RECENT_MAX kept, `isSavedChart` checks saves): this browser signed out, the account
  signed in. Japanese text carries lang="ja" (titles break by phrase:
  word-break: auto-phrase).

- Aliases (packages/chunithm's aliases.ts the rules, lib/chunithm/aliases.ts the
  rest; chuni_aliases, chuni_alias_suggestions): other names a song goes by, searched
  like its title, shown on its chart pages ("Also known as"). Keyed by matchKey,
  unique per song, never the song's own title, at most ALIAS_LIMITS.perSong. The admin
  adds and removes them and imports community lists (JSON `{"<id>": [names]}`, a JSON
  array of {id, aliases}, or tab-separated lines) at /admin/chunithm/aliases/.
  Signed-in people suggest names from a chart page's form (POST
  /tools/chunithm/alias, no JavaScript needed; SUGGESTION_LIMITS: per day, waiting);
  each alerts the admin ("chunithm-alias"), and the queue approves (adding the name,
  `suggestedBy` kept) or declines, with a note the person sees on the song's chart
  pages. Suggestions are in the account export (`chunithm.aliasSuggestions`) and go
  with the account; approved names stay, `suggestedBy` set null.

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
  decideAppeal, Minecraft's setHidden, and the wiki's proposals (lib/wiki/proposals.ts;
  digests come from lib/wiki/watch.ts). notify.ts reads tables directly, so those
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
  /api/health stays internal. The CSP widens per path through a `map` in
  `site_headers`: /tools/preview/ alone gets `connect-src https:` and Microsoft's
  viewer in `frame-src`. CSP is report-only for now; it allows
  'wasm-unsafe-eval' and blob: (images, media, workers) for the file tools. Its
  `frame-ancestors 'none'` and X-Frame-Options DENY don't stop Minecraft embeds,
  which send their own enforced `frame-ancestors *`; when the CSP is enforced, leave
  the embed paths out of it (deploy/README.md says how).
- wiki.trilleo.net has its own Caddy block: built assets and icons from files, other
  files (main-site pages) redirect to www, everything else to the app. Shared headers
  are the `site_headers` snippet. The Origin certificate covers `*.trilleo.net`.
- Server config (deploy/compose.yaml) ships inside the web image; changing it only
  needs a deploy. deploy/server/* changes (trilleo-deploy, trilleo-backup) need a
  manual reinstall. Server-only secrets live in /srv/trilleo/*.env, never in git
  or GitHub.
- CI's "Docker image" job builds both images and runs deploy/smoke-test.sh, which
  starts the whole stack like the server does (including a backup). Docker isn't
  installed on the dev machine, so the images are verified in CI.
- CI (.github/workflows/ci.yml) runs its checks as parallel jobs, each set up by
  .github/actions/setup: static (format, migrations, typecheck), lint, unit tests for
  every package but apps/web, apps/web's unit tests in 4 Vitest shards, build +
  check:server, e2e in 3 Playwright shards (each builds and serves its own site and
  database), and the Docker image. "CI passed" needs them all: it's the check branch
  protection requires. New packages, tests and specs are picked up by turbo and the
  shards; only a new kind of check needs a job. apps/web's lint runs `astro sync`
  first: type-aware rules need the generated .astro/ types (import.meta.env, astro:*). Raise a shard count if its jobs
  become the slowest.

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

## Adding a wiki component

1. Write it in packages/wiki/src/components/ (a new file per set): a `BlockComponent`
   or `InlineComponent` with `name`, `set`, `summary`, `example` (it must render
   without errors: the registry test checks), optional `notes`, and `render`. Escape
   everything typed (`context.escape`) or render it as wiki Markdown
   (`context.markdown` / `context.inline`); never build HTML from raw input. Report
   bad input with `context.error(...)`.
2. Add it to `COMPONENTS` (src/registry.ts). A new set also goes in
   `COMPONENT_SETS`; owners switch it on in their wiki's settings.
3. Style its classes in apps/web/src/styles/wiki.css (tokens only; it must work in
   both themes and without JavaScript). Browser behaviour goes in src/client.ts and is
   started from WikiLayout's script.
4. Tests: its rendering in packages/wiki (components.test.ts), and if it changes
   pages (categories, the infobox's placement) a case in apps/web's
   lib/wiki/render.test.ts. Bump WIKI_RENDER_VERSION when existing pages' HTML changes.
5. /<wiki>/-/components documents it by itself; e2e/a11y.spec.ts checks that page.

## Adding an API route

1. Pick or add its group in `API_GROUPS` (lib/api/registry.ts, with a one-line intro).
   A new scope goes in `API_SCOPES` (lib/api/scopes.ts); the admin then ticks it for
   the apps that need it.
2. Declare it with `defineRoute` in lib/api/routes/<group>.ts: describe every field
   (the docs' tables are made from the descriptions), give an example that fits the
   schemas, name its own error codes (`errors`), and throw `ApiError` for them. A new
   error code goes in ERROR_CODES with a description. Logic that isn't about HTTP lives
   in its feature's lib/ module, as usual.
3. Add it to `ROUTES` (lib/api/routes/index.ts) and an entry to API_CHANGELOG
   (lib/api/docs/changelog.ts). If it introduces a convention or a limit, update the
   guide that states it (lib/api/docs/guides.ts).
4. Tests: its behaviour in Vitest through `dispatch` (see lib/api/api.test.ts); the
   route-list tests check its examples and docs by themselves.
5. Check /docs.md reads well: it's what another repository's agent reads to write a
   client (`pnpm dev`, then http://api.localhost:4321/docs.md).
