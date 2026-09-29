---
title: Why I moved off WordPress
description: The old WordPress site was slow, hard to change, and had no good place for tools, so I built a new one by hand.
tags: [WordPress]
draft: true
---

## What stopped working

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
