---
title: Rebuilding this site with Astro and a monorepo
description: Why the new site is one pnpm workspace — an Astro app for writing, a shared UI package, and room for small tools.
tags: [Astro, Tooling]
draft: true
---

## Starting over

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
