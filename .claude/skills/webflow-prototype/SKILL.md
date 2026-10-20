---
name: webflow-prototype
description: Start a Webflow project and build its design as a localhost prototype that mirrors Webflow, before anything is written to Webflow. Covers setting up the repo and workspace from wf-template (pnpm new-project), collecting the inputs, reading a Figma design, taking the Webflow snapshot, building the style guide and then each page with the site's own variables and class names, and the handoff pack for the Webflow build. Use for "New project: Webflow site <name>, Figma <link>", setting up a repo and workspace, reading a Figma file, starting or continuing a localhost prototype, proposing variables and classes, or preparing the handoff to the Webflow build. For building in Webflow, use webflow-build.
---

# Webflow prototype: design → approved localhost prototype

The first phase of a project. The design is built in code, at the real
URLs and breakpoints, with the variables and class names Webflow will
have, and approved page by page. What comes out is not a mock: it is the
markup, the classes, the modules and the list of manual steps the Webflow
build starts from.

**This phase never writes to Webflow.** It reads the site (the snapshot)
and proposes changes; the writes belong to the `webflow-build` skill, in
its own session, after the prototype is approved.

- [checklists.md](checklists.md) gates the inputs, each prototype page and
  the handoff.
- [prototype-starter/](prototype-starter/README.md) is the prototype
  folder a project starts from (`pnpm new-project` copies it).
- [figma.md](figma.md) reads a design from a Figma link through the Figma
  connector: frames per breakpoint, screenshots, variables, measurements.
- The `webflow-style-guide` skill makes the style guide, the first page
  of the prototype.
- [conventions.md](../webflow-build/conventions.md) (in `webflow-build`)
  sets the page and section structure and the class and variable naming
  the prototype follows; [lessons/](../webflow-build/lessons/README.md)
  holds what cost time on earlier builds.
- [rules.md](../webflow-build/rules.md) has the rules every Webflow skill
  shares (no commit or push without an OK, Designer first, no credentials
  in chat), the session wrap-up and how to contribute back.

Every checklist item says who does it: **[Claude]**, **[Claude checks]**
(Claude verifies and reports; a person fixes what Claude can't) or
**[Person]** (Claude may remind and track it, never claim it).

## Session start (every session)

1. Read the workspace `CLAUDE.md`, then the repo's `AGENTS.md` and
   `GOTCHAS.md`, then `docs/handoff/`. Skim
   [lessons/README.md](../webflow-build/lessons/README.md); the importer
   lessons in `lessons/mcp.md` decide how prototype markup is written.
2. Read the project memory: where the last session stopped, open
   questions. Say in one line where things stand and what's next.
3. On a new project, run **Before the prototype** in
   [checklists.md](checklists.md) first. If an input is missing, ask for
   it; don't guess content, states or SEO fields.
4. The prototype dev server is running (`pnpm dev` in `prototype/`).
5. Today's scope is one page. Say which.

## Project setup (new project)

The flow starts from one message (README › Starting a project), e.g.
*"New project: Webflow site <name>, Figma <link>. Set up the repo and
workspace, run Before the prototype, then build the prototype page by page;
wait for my go-ahead before any Webflow change."*

Before it, a person has created the repo from the template on GitHub,
cloned it into its own client folder (`<Client>/wf-<client>/`), and
duplicated the starter site under the client's name
([starter-site.md](../webflow-build/starter-site.md)).

1. **Skills first.** Offer `pnpm update-skills` (ask; it replaces local
   skill edits), so the project starts on the latest lessons.
2. **Find the site.** Through the Webflow connector, list the sites and
   match the name the person gave: the site ID and the short name (the
   staging subdomain, `<short name>.webflow.io`). Two matches or none →
   ask. Read the GitHub org and repo from `git remote get-url origin`.
3. **Fill in the repo and set up the workspace:**

   ```bash
   pnpm install
   pnpm new-project --client "<Client>" --slug <short name> --org <org> --site-id <id>
   ```

   It fills in the project facts in `AGENTS.md`, the `package.json` name,
   `REPO` in `loader.html` and the handoff title, and writes
   `webflow-build.config.json`. Around the repo it creates the workspace:
   `<Client>/CLAUDE.md` (imports `AGENTS.md`, `GOTCHAS.md` and
   `docs/handoff/`), `.mcp.json`, links to the skills, `prototype/` (a copy
   of [prototype-starter/](prototype-starter/README.md)) and `Assets/`.
   Write the Figma link into the workspace `CLAUDE.md` (Design line). Ask
   for any value you can't find; never guess.
4. **List the person's steps, in this order,** and track them in
   `docs/handoff/MANUAL-TODO.md` until done:
   1. Repo Settings → Pages → Source: GitHub Actions; add the developers
      team.
   2. First push: Claude asks to commit the setup; after the push the
      staging workflow must pass (`https://<org>.github.io/<repo>/styles.css`
      loads).
   3. Paste the loader from `loader.html` (ORG and REPO are now filled
      in): head code and footer code in Site settings. Embeds 2a and 2b
      already sit in G | Components with placeholders: Claude fills
      them in through the MCP after the go-ahead, or the person pastes
      them.
   4. Staging password and noindex until launch.
5. **Move to the workspace.** From the next session, Claude is opened in
   `<Client>/`, not in the repo: that is where the MCP server, the skills
   and the imports are set up. Run `pnpm install` in `prototype/`.
6. **Inputs, then the prototype.** Run **Before the prototype** in
   [checklists.md](checklists.md) (it includes the component plan and the video list),
   read the design ([figma.md](figma.md)), take the Webflow snapshot, and
   build the prototype: **the style guide first**
   (`webflow-style-guide` skill), approved before any content page, then
   page by page, each passing **Prototype page done**.
7. Fill in `docs/handoff/HANDOFF.md` from the design; keep
   `MANUAL-TODO.md` and `BUILD-NOTES.md` current from the first session.

## The prototype

- **It mirrors Webflow:** the same URLs, the same breakpoints (991, 767,
  479), the Webflow class names, and the page shell and section structure
  of `conventions.md`. Nav and footer are single partials (one component
  each).
- **It reads the site's variables** from a snapshot of Webflow
  ([prototype-starter/README.md](prototype-starter/README.md) › Webflow
  snapshot). After writing or refreshing the snapshot: `pnpm css`, then
  `pnpm check:snapshot`, then `pnpm check:drift`, which compares the
  snapshot with the stylesheet the staging site publishes and lists every
  variable, class and value that differs (publish to staging first).
- **No Webflow connector?** (not set up yet, signed in to another site,
  or no MCP call allowed) `pnpm css:published <staging URL>` builds
  `tokens.css`, `webflow.css` and `webflow-base.css` from the CSS the
  site publishes (GET only; per-page CSS is read page by page and
  merged), and recovers the snapshot as far as the CSS allows. The CSS is
  exact; Designer names, mode names, empty classes and interactions are
  not in it (the script's header lists everything it guesses), so say in
  `HANDOFF.md` that the snapshot is a stand-in, never propose a variable
  or class by a guessed name without checking it in the Designer, and
  replace the snapshot from the MCP as soon as it is available (delete
  `webflow-snapshot/source.json`, then `pnpm css`). While `source.json`
  exists, `pnpm css` refuses to run.
- **Variable changes are proposed, never made:** as old → new in
  `proposed.css`, grouped and lettered for approval. New classes go in
  `new-classes*.css`, written as the Designer can hold them.
- **Markup is written for the importer:** shapes are `div`s, not empty
  spans; form controls sit in a `<form>`; boolean attributes carry a
  value; a line break has `&nbsp;` before it; modules depend on `data-*`
  hooks, not class names. `pnpm wf:preflight` checks all of it.

**Order.**

1. Snapshot, `pnpm css`, `pnpm check:snapshot`, `pnpm check:drift` (no
   connector: `pnpm css:published`, then the same checks).
2. **The style guide** (`webflow-style-guide` skill), approved before any
   content page.
3. Pages, one at a time. For each: build it; add the row for every class
   or component it introduced (`pnpm style-guide`); `pnpm screens` (every
   width from 2560 to 360: overflow and errors) and `pnpm check:states`
   (focus and pressed states); run **Prototype page done**; the person
   approves it at 1440, 820 and 390.
4. The handoff (below).

## Handing over to the build

Run **Prototype handoff** in [checklists.md](checklists.md). The pack the
build session starts from:

- `docs/handoff/HANDOFF.md`: pages, variables and classes, CMS,
  components to make, modules and their hooks, the video list.
- `pnpm wf:styles`: every new class sorted into what the connector can
  create, what a person sets by hand in the Designer (already rows in
  `MANUAL-TODO.md`) and what goes to repo CSS.
- `pnpm wf:preflight`: the known importer steps per page.
- The approved prototype itself, running, as the reference the build is
  compared against (`pnpm wf:compare`, `wf:pass`).

Then give the person the message that starts the build session, filled
in, to paste into a new session opened in the workspace folder:

> Continue <Client>: build in Webflow. The prototype is approved (every
> page and the style guide, <date>). Read the workspace CLAUDE.md,
> docs/handoff/ and the webflow-build skill. Start with the foundation:
> propose the variable batch from proposed.css and wait for my go-ahead
> before each Webflow write. Then tag styles, classes (from the styles
> plan), CMS collections, the repo port and the loader, the style guide
> page, the media page (if the video list has entries), components, and
> pages, one page per session.

The build runs in its own session so that it loads only the build rules,
and so the prototype stays untouched as the reference.

## Working rhythm

- **One page per session, finished completely:** built, checked at every
  width, its states done, **Prototype page done** run, handoff updated.
- **`docs/handoff/` stays current** during the session, not at the end:
  a decision goes into `HANDOFF.md` when it is made.
- **Lessons go back.** At wrap-up, offer every `template-candidate`
  lesson to the template ([rules.md](../webflow-build/rules.md) ›
  Contributing).
