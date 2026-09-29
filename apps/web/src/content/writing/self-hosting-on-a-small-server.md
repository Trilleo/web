---
title: Self-hosting on a small server with Docker and Caddy
description: How this site runs on one small server, with Docker containers, Caddy in front, and a deploy on every push to main.
tags: [Self-hosting, Docker]
draft: true
---

## Why a server of my own

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
