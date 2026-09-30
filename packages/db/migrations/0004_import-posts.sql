-- Imports the posts that used to be Markdown files in apps/web/src/content/writing,
-- as drafts. Runs once; a post whose slug is already taken is left alone.

INSERT INTO "posts" ("slug", "title", "description", "body", "tags", "status") VALUES ($post$a-home-for-small-tools$post$, $post$A home for small tools, under /tools$post$, $post$Why this site hosts small web tools next to the writing, and how a new one is added.$post$, $post$## Why tools live here

Some of what I make isn't a post. It's a small web tool: something that does one job, opens in a browser tab, and doesn't need an app store or an account to try. Those tools used to have nowhere good to live. On the old site they would have been plugins or pages bolted onto a blog theme.

On this site they're first-class. Every tool sits at `/tools/<name>`, uses the same design as the rest of the site, and shares its sign-in. The first one is [Notes](/tools/notes/), a Markdown scratchpad with search and a preview.

Every tool follows two rules:

- **It works without an account.** Signed out, your data stays in this browser and never leaves it.
- **Signing in keeps your data with you.** Sign in with GitHub and the tool saves to your account instead, so it's there on any device. When you first sign in, Notes offers to move what's already in your browser into your account.

Keeping the tools next to the writing also means a post can explain how a tool was built, and the tool is one link away.

## How a tool is added

Each tool is its own package in the repository, under `apps/<name>`. It exports two things: its details (name, description, and a check for the data it saves) and a React app. The site mounts the app on a page at `/tools/<name>/`, and the page is rendered on the server, so a signed-in visitor's data arrives with the page instead of loading afterwards.

Tools don't talk to the database directly. They save through a small shared kit that writes either to the browser or to one account API. That API checks who's asking, caps how much each person can store, and runs the tool's own validation before anything is saved. A tool that doesn't say what valid data looks like can't save to accounts at all.

Adding a tool is mostly a matter of listing it: one entry in the site's tool registry, and it shows up on [the tools page](/tools/), on the home page, and in the data API. No server changes, no new routes to configure. A tool that ever needs a server of its own will get a subdomain instead, but so far none has.
$post$, ARRAY[$post$Tools$post$]::text[], 'draft') ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
INSERT INTO "posts" ("slug", "title", "description", "body", "tags", "status") VALUES ($post$rebuilding-this-site$post$, $post$Rebuilding this site with Astro and a monorepo$post$, $post$Why the new site is one pnpm workspace — an Astro app for writing, a shared UI package, and room for small tools.$post$, $post$## Starting over

The old site ran on WordPress. The new one starts from an empty repository: a static Astro site for writing, and a place to publish small web tools alongside it.

WordPress had become slow and heavy for a site that was mostly text, and it never had a natural home for the tools I wanted to build. I also wanted a site I'd made myself, where every part is something I chose. The longer version is in [Why I moved off WordPress](/writing/why-i-moved-off-wordpress/).

## The shape of the repo

Everything lives in one pnpm workspace. Turborepo runs the tasks and caches their results, so a package that hasn't changed doesn't rebuild.[^cache]

```text
apps/
  web/        Astro site: blog, pages, and sign-in
  notes/      the first tool
packages/
  ui/         React components and Tailwind theme
  tool-kit/   what tools share: storage and hooks
  db/         database schema and migrations
turbo.json
pnpm-workspace.yaml
```

Each tool gets its own package under `apps/` and is served at `/tools/<name>`. The shared theme is plain CSS, so every app picks up the same type and color.[^theme]

> Static by default. Server-rendered only where it has to be.

## Checks on every push

Every push runs formatting, type checks, lint, unit tests, a production build, and a Playwright smoke test in CI. The end-to-end suite also scans every page for accessibility problems in both light and dark mode.

[^cache]: Turborepo hashes each task's inputs. A cache hit replays the earlier output instead of running the task again.

[^theme]: Tailwind v4 reads design tokens from CSS, so the theme is one file that every app imports.
$post$, ARRAY[$post$Astro$post$, $post$Tooling$post$]::text[], 'draft') ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
INSERT INTO "posts" ("slug", "title", "description", "body", "tags", "status") VALUES ($post$self-hosting-on-a-small-server$post$, $post$Self-hosting on a small server with Docker and Caddy$post$, $post$How this site runs on one small server, with Docker containers, Caddy in front, and a deploy on every push to main.$post$, $post$## Why a server of my own

Most of this site is static files, and a hosting platform would serve those well. But the site also has sign-in, comments, and tools that save to your account, and those need a server and a database. Split across platforms, that becomes several services, several bills, and several dashboards.

One small virtual server keeps it all in one place. It costs a fixed amount each month, I can see everything running on it, and there's nothing to learn beyond Linux and Docker. That fits a site I wanted to build and understand myself.

## The setup

The server runs three containers, described in one Docker Compose file:

- **web**: [Caddy](https://caddyserver.com/), with the site's static files built into the image. It handles HTTPS, serves any file that exists, and passes everything else to the app.
- **app**: the Astro server, for the pages that depend on who's visiting: sign-in, comments, your account, and the tools' data.
- **db**: Postgres, with a nightly backup.

Only Caddy's ports are open. The app and the database are reachable only inside the stack. Because Caddy serves the pages that are already built, the writing stays up even if the app is restarting.

Cloudflare sits in front of the server, and the server only answers Cloudflare's addresses. The connection between them is encrypted too, with a certificate Cloudflare issues for the origin.

The web and app containers run with as little as possible: read-only file systems, no extra Linux capabilities, and no `node_modules` in the app image. The server build bundles everything it needs, which keeps the image small.

## Deploying

A push to `main` starts the pipeline:

1. **CI** checks formatting and types, runs lint, unit tests and the browser tests, builds both images, and starts the whole stack once, as the server would, to check that it comes up.
2. **Deploy** builds the images again and pushes them to a container registry near the server.
3. **The server** is told to update over SSH, with a key that can run exactly one command: the deploy script. It pulls the new images, restarts the stack, and waits until the health check passes. The app applies any database changes when it starts.
4. **A final check** asks the live site which version it's running, and the deploy passes only if that's the commit that was just pushed.

The server keeps nothing that isn't in the repository, its few secret files, or the database backups. If it went away, a new one would need those restored and one deploy.
$post$, ARRAY[$post$Self-hosting$post$, $post$Docker$post$]::text[], 'draft') ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
INSERT INTO "posts" ("slug", "title", "description", "body", "tags", "status") VALUES ($post$why-i-moved-off-wordpress$post$, $post$Why I moved off WordPress$post$, $post$The old WordPress site was slow, hard to change, and had no good place for tools, so I built a new one by hand.$post$, $post$## What stopped working

WordPress got the old site online fast, and for a while that was enough. Over time, though, every page carried more than it needed: a theme built to do everything, a few plugins each loading their own scripts and styles, and a database query behind every visit. Pages that were mostly text still took a noticeable moment to appear.

Fixing that meant adding more: a caching plugin, an optimization plugin, and then settings to stop them fighting each other. Each fix was another layer I didn't write and couldn't easily see into. When something looked wrong, the answer was usually buried in a plugin's settings page rather than in code I could read.

## What I wanted instead

Three things, mostly.

A fast site. Writing should be plain HTML, built once and served as files. No database round trip for a page that hasn't changed since it was published.

A site I understand. I wanted to build it myself, from an empty repository, so that every part of it is something I chose and can change. That also makes the site a place to learn: each new feature is a small project of its own.

Room for more than a blog. I make things that aren't posts: small web tools, code, Minecraft creations. WordPress can host a tool with enough plugins and custom templates, but it always feels bolted on. I wanted tools to be first-class: their own pages, sharing the site's design and sign-in, and able to save your data to your account.

## What I gave up

Some conveniences. There's no admin screen for writing posts now; a post is a Markdown file in the repository, and publishing one means a commit and a deploy. There's no plugin to install for a new feature either; if the site needs something, I build it.

For a personal site, that trade is worth it. The new site loads quickly, does only what I asked it to, and every part of it is something I can open and read. The rest of the rebuild is in [Rebuilding this site with Astro and a monorepo](/writing/rebuilding-this-site/).
$post$, ARRAY[$post$WordPress$post$]::text[], 'draft') ON CONFLICT ("slug") DO NOTHING;
