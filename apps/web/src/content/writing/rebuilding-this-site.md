---
title: Rebuilding this site with Astro and a monorepo
description: Why the new site is one pnpm workspace — an Astro app for writing, a shared UI package, and room for small tools.
tags: [Astro, Tooling]
draft: true
---

## Starting over

The old site ran on WordPress. The new one starts from an empty repository: a static Astro site for writing, and a place to publish small web tools alongside it.

[Your reasons for leaving WordPress go here.]

## The shape of the repo

Everything lives in one pnpm workspace. Turborepo runs the tasks and caches their results, so a package that hasn't changed doesn't rebuild.[^cache]

```text
apps/
  web/        Astro site: blog and pages
packages/
  ui/         React components and Tailwind theme
turbo.json
pnpm-workspace.yaml
```

Each tool will get its own package under `apps/` and be served at `/tools/<name>`. The shared theme is plain CSS, so every app picks up the same type and color.[^theme]

> Static by default. Server-rendered only where it has to be.

## Checks on every push

Every push runs formatting, type checks, lint, unit tests, a production build, and a Playwright smoke test in CI. The end-to-end suite also scans every page for accessibility problems in both light and dark mode.

[^cache]: Turborepo hashes each task's inputs. A cache hit replays the earlier output instead of running the task again.

[^theme]: Tailwind v4 reads design tokens from CSS, so the theme is one file that every app imports.
