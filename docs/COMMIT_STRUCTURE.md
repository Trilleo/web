# Commit messages

Every commit says what it changes in one line, starting with a tag, so the history
reads as a list of what the site gained, fixed and tidied.

## The subject line

```
<Tag>: <What changes>
```

- One tag from the table below, a colon and a space.
- Then a sentence in the imperative present ("Add", "Show", "Stop", "Read"), starting
  with a capital and ending without a full stop.
- Name the part of the site it touches ("CHUNITHM", "the wiki", "Skygrid's Bazaar",
  "the human check"), so the line makes sense without the diff.
- Say what changes for the person using the site, not which files moved: "Keep the
  CHUNITHM chart box a fixed height on phones", not "Change dvh to svh in viewer.css".
- One line, however long it needs to be (most are 40–100 characters). Two related
  changes can share it with "and" or a comma; two unrelated ones are two commits.
- A short reason or source can follow in parentheses: "(CodeQL)".

## Tags

| Tag             | For                                                                                                | Example                                                                  |
| :-------------- | :------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------- |
| **Feature**     | Something people couldn't do before: a new tool, game, page, route, setting or section.            | `Feature: Add the CHUNITHM charts tool: search, chart pages, favourites` |
| **Fix**         | Something that was wrong: a bug, a crash, a broken layout, a security finding.                     | `Fix: Draw dropdowns' arrow 12px in from the edge, site-wide`            |
| **Improvement** | Something that already worked, made better: how it looks, reads, feels, or how fast it runs.       | `Improvement: Make site breadcrumbs clickable`                           |
| **Internal**    | Nothing a visitor would notice: documentation, agent instructions and skills, comments, refactors. | `Internal: Update agent skill to include recent study platform changes`  |
| **Backend**     | How the site is built and shipped: dependencies, build and tooling config, CI, Docker, deployment. | `Backend: Run checks as parallel jobs and shard the slow tests`          |

TownyMenu's **Update** tag (version releases) isn't used: the site has no versions, every
push to main deploys.

### Choosing between them

- **Backend isn't server code.** A new API route or server page is a Feature; a bug in
  one is a Fix. Backend is the machinery around the code (package.json, turbo.json,
  .github/, the Dockerfile, deploy/).
- **Feature or Improvement?** If the change gives people a new thing to do or see, it's
  a Feature, even when it grows an existing tool ("Add a score calculator to CHUNITHM
  chart pages"). If they do the same thing as before, only better, it's an Improvement.
- **Performance** is an Improvement ("Improvement: Draw Hotfix at the screen's refresh
  rate"), unless it was slow enough to be broken (timeouts, failed builds): then a Fix.
- **Tag the main change.** A feature's tests, docs and migration ride in its commit
  under its tag; updating CLAUDE.md alongside doesn't make it Internal.
- Older history also has `CI:` and `Perf:`; new commits use Backend and Improvement.

## Verbs

Pick the verb that says what happens now, not the tag again:

- `Fix: Copy newer CHUNITHM jackets up to 2.5 MB`, not `Fix: Fix oversized jackets`.
- `Feature: Add …`, `Show …`, `Let the admin …`, `Build …`, `Read …`.
- `Fix: Stop …`, `Keep …`, `Handle …`, `Escape …`, `Retry …`.
- `Improvement: Make …`, `Tidy …`, `Rework …`, `Narrow …`.

## Body and trailers

Most commits are the subject alone. Add a body (after a blank line, wrapped at 72) only
when the reason isn't obvious from the subject and the diff: what was going wrong and
why this is the fix. Trailers such as `Co-Authored-By:` go last, after another blank
line.

```
Fix: Keep the CHUNITHM chart box a fixed height on phones

The box was sized in dvh, which follows the mobile address bar as it
slides in and out, so the box resized mid-scroll. svh stays the same size.
```

## Follow-ups

A commit that finishes the one before it (a file left out, a test forgotten) says so,
under the tag of what it completes:
`Fix: Add the CHUNITHM score rules left out of the calculator commit`.

## For agents

Don't commit (CLAUDE.md). At the end of a task, or of each phase of a longer one, give
the commit message for the change in a code block, written by these rules.
