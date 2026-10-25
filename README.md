# web

Personal site, blog, tools, games, a Minecraft creator platform, study notes, file
storage, a wiki for each project and an API for other programs behind
<https://www.trilleo.net>, <https://wiki.trilleo.net> and <https://api.trilleo.net>. A pnpm + Turborepo monorepo with an Astro site and shared
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
apps/preview        @trilleo/tool-preview: Preview, documents from links or files (/tools/preview/)
apps/qr             @trilleo/tool-qr: QR codes (/tools/qr/)
apps/color          @trilleo/tool-color: colors (/tools/color/)
apps/skygrid        @trilleo/game-skygrid: Skygrid, a text-drawn Skyblock-style game (/games/skygrid/)
apps/hotfix         @trilleo/game-hotfix: Hotfix, a pixel-art endless runner (/games/hotfix/)
packages/ui         @trilleo/ui: shared React components + Tailwind theme (theme.css)
packages/db         @trilleo/db: Drizzle schema, migrations, and database client
packages/tool-kit   @trilleo/tool-kit: what tools share (storage, data hook, file helpers)
packages/storage    @trilleo/storage: file storage (OBS and local drivers, upload client,
                    moderation rules, ClamAV client)
packages/mail       @trilleo/mail: email (template, address rules, SMTP and capture drivers)
packages/mc-files   @trilleo/mc-files: reads Minecraft files in the browser (NBT, mod and
                    pack metadata, builds' blocks, 3D preview format and mesher)
packages/forum      @trilleo/forum: the forum's rules (addresses, layouts, permissions,
                    limits, post formatting)
packages/wiki       @trilleo/wiki: wiki components (infobox, notice, tabs, …): registry,
                    markdown-it plugin, and the tabs script
packages/study      @trilleo/study: the study section's engine (content loader, lesson
                    renderer with KaTeX, quizzes, circuits, React widgets)
study/              Study subjects: Markdown lessons, one folder per subject (see study/README.md)
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
the API's `/v1/minecraft/`) and `/account/minecraft/` (creators); the admin moderates it at
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

The wiki is the same app on another host: open <http://wiki.localhost:4321/> next to
`pnpm dev` (browsers send `*.localhost` to your machine). It starts with the Skygrid
wiki, whose reference pages are generated from the game's data
(`apps/web/src/lib/wiki/sources/`). Signing in there goes through the main site at
`localhost:4321`. Anyone signed in can propose edits for a wiki's members to review,
and watch pages (a watchlist, plus a daily digest email).

The API for other programs (bots, scripts) is the same app again, at
<http://api.localhost:4321/>: `/v1/…` is the API and everything else its docs, written
from the routes' own declarations (`apps/web/src/lib/api/`), along with `/docs.md` (all
the docs in one file, for agents working on a client) and `/openapi.json`. Public routes
(no key) read posts, tags, tools, games, Minecraft projects and study subjects. The admin
makes apps and their keys at `/admin/api/`, which also shows each app's usage and
recent failures. The first thing on it is a daily cryptic crossword clue, written at
`/admin/cryptic/` and played through a Discord bot, which fetches each day's clue and
sends players' guesses for the site to check and score. Apps can also be sent events
as they happen (webhooks: the day's cryptic at midnight, new posts), signed with a
secret shown in the same panel.

The CHUNITHM chart viewer (`/tools/chunithm/`) searches every chart (titles and community
aliases, in English, Japanese, romaji or Chinese) and shows each as one picture, read from the bottom up. Its
catalog is kept up to date by the server: SEGA's song list, otoge-db's constants and links, and sdvx.in's chart pages,
merged by SEGA's IDs (`packages/chunithm`, `apps/web/src/lib/chunithm/`). A chart's
picture is joined from sdvx.in's layers the first time someone asks for it
(`/api/chunithm/charts/<id>/<difficulty>`) and kept as WebP tiles in storage. The admin
watches both at `/admin/chunithm/`. `pnpm dev` starts filling it on the first requests
(a few hours of slow passes over sdvx.in); set `CHUNITHM_SYNC=off` in `apps/web/.env`
to keep it from fetching.

Charts can also be built on your own computer, over your own network, and imported:
download the to-do list from `/admin/chunithm/import/`, then run

```bash
pnpm --filter @trilleo/web chunithm:bundle ~/Downloads/chunithm-todo-2026-10-25.json
```

It writes `chunithm-bundle-<day>-<n>.zip` files (about 200 MB each) into
`chunithm-bundles/` beside the list; upload them on the same page and import them.
It downloads three charts at once (`--parallel 1` to `8`) and joins them one at a
time. A block at the bottom shows each chart in progress and the layer coming in
(how much, how fast, and whether it had to resume), with a total line under it.
Ctrl-C lets the charts in progress finish; a second Ctrl-C drops them. Running it
again carries on where it stopped (`--limit`, `--delay`, `--out` and
`--retry-failed` change what it does).

The study section (`/study/`) is built from the Markdown in `study/`: each subject is a
folder of numbered units and lessons, with maths, numbered definitions and formulas,
quizzes, flashcards, plots and circuits (`study/README.md` says how to write them).
`pnpm dev` also shows draft subjects, like the sample one; production builds leave them
out. Lessons are checked as the site builds: a mistake fails the build. Progress
(flashcard reviews scheduled with FSRS, quiz answers, the mistake log) is kept in the
browser when signed out and in the account (`study_events`) when signed in.

The forum (`/forum/`) starts with a few categories and forums from its migration; the
admin changes them at `/admin/forum/` (forums, groups and permissions, bans, the
moderation log, ranks), and moderators work through waiting posts and reports at
`/forum/moderate/`. Forums can be classic, Q&A or threaded; members react, vote,
watch topics and get notifications (in the outbox in development, like all mail),
add polls and attachments to posts, and send each other private messages. People add a
profile picture on `/account/profile/` (cropped in the browser, kept in the database).

Lint, format, and TypeScript base configs live at the repo root (`eslint.config.js`,
`.prettierrc.json`, `tsconfig.base.json`).

## Deploying

Pushing to `main` deploys to <https://www.trilleo.net> (and the wiki and the API) once CI passes. Setup, rollback,
and troubleshooting: [deploy/README.md](deploy/README.md). File storage (the OBS bucket,
`files.trilleo.net`, its certificate, ClamAV and moderation):
[deploy/storage.md](deploy/storage.md). Email (Tencent Cloud SES, the sender domain,
SMTP settings): [deploy/mail.md](deploy/mail.md).

Conventions and architecture notes for contributors (and AI assistants) are in
[CLAUDE.md](CLAUDE.md). Keep these documents current: update them in the same change as
the code they describe.
