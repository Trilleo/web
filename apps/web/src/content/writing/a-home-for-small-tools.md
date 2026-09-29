---
title: A home for small tools, under /tools
description: Why this site hosts small web tools next to the writing, and how a new one is added.
tags: [Tools]
draft: true
---

## Why tools live here

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
