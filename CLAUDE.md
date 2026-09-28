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
- packages/ui: shared components and Tailwind preset.
- packages/db: Drizzle schema + client (Postgres).
- Blog content: Markdown/MDX in Astro content collections.

## Commands
- pnpm install / pnpm dev / pnpm build
- pnpm typecheck / pnpm lint / pnpm test / pnpm test:e2e
- Always run typecheck, lint, and tests before declaring a task done.

## Rules
- TypeScript strict everywhere; no `any` without a comment explaining why.
- Every API route and server page that touches user data must check auth.
- Secrets live only in .env files (gitignored); read them at runtime via
  process.env, never import.meta.env, so they aren't inlined into builds.
- New features need tests: Vitest for logic, Playwright for user flows.
- Preserve old WordPress URLs or add redirects for them.

## Adding a new tool
(Fill in once the first tool is added; this becomes the checklist.)