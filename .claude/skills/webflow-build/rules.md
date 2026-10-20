# Rules every Webflow skill shares

One copy, linked from `webflow-prototype`, `webflow-build`,
`webflow-style-guide`, `webflow-launch` and `webflow-audit`, so the
rules can't drift apart. Each skill adds the rules of its own phase.

## Standing rules (unless the project's own rules say otherwise)

- **Never commit or push without an explicit OK.** List the touched files
  first; group related changes into one ask. Work on the default branch.
- **Designer first.** Anything the Designer can express (classes, combos,
  variables, breakpoint styles, states, custom properties) goes in Webflow.
  Repo CSS only with a `repo-css: <tag>` reason (see `AGENTS.md`).
- **No credentials in chat.** Logins come through the team's password vault
  or the person's own sessions; never ask for, store or repeat a password,
  API key or token.
- **Manual steps** the API can't do go in `docs/handoff/MANUAL-TODO.md`
  (lettered A, B, C…) with *why* the API can't. Mark them done when the person says so.
- **Log surprises** in `GOTCHAS.md` in the same change as the fix, with the
  file's entry format; tag `template-candidate` when it would recur on any
  wf-template project.
- When the person corrects you, update the fix everywhere it applies and
  say so. Don't argue; verify.
- **Scripts live in the repo.** A script worth running twice goes in
  `scripts/` or a skill's `scripts/`, never in a session's scratch
  folder: a converter written that way on an earlier build was lost with
  the session.

## Session wrap-up

1. Everything that should be published is (build phase); repo clean or
   the commit ask made.
2. `GOTCHAS.md` updated; `docs/handoff/` current.
3. Project memory updated: where things stand, last commit, next step,
   open questions.
4. Short report, in this shape: **Done** (short points, with numbers:
   pages, sections, checks passed), **Not done** (and why), **Next**,
   **Needs you** (manual steps by letter, open questions), and one line of
   progress (e.g. "4 of 9 pages built, 2 approved"). No prose paragraphs.
5. If the session taught something the next project should know, offer to
   contribute it back (see Contributing below).


## Handing work to another session, person or device

A session's memory of the chat does not travel. Before the work moves:

- everything decided is in `docs/handoff/HANDOFF.md`, every manual step
  in `MANUAL-TODO.md`, every surprise in `GOTCHAS.md`;
- the repo is committed and pushed (with an OK), or the uncommitted files
  are listed by name; a prototype folder that is not in git is said to be
  only on this machine;
- what is in Webflow but not published, and what is on staging but not
  live, is stated;
- the next step is one sentence, and the message that starts the next
  session is written out for the person to paste
  (`webflow-prototype` › Handing over to the build has the one for the
  prototype → build step).

The next session starts from those files, never from a summary of this
conversation.

## Contributing

The skills live in the template repository this project was created from
(`template` in `.wf-template.json`), in `.claude/skills/`. Anyone
with a GitHub account can improve it: fork the repo, change the skill or
its lessons, and open a pull request. A repo created from the template
gets later skill versions with `pnpm update-skills` (recorded in
`.wf-template.json`); ask before running it, since it replaces local edits
to the skills.

**When to offer a contribution** (Claude, at wrap-up or when it happens):
- a `template-candidate` lesson that isn't in `lessons/` yet;
- a fix or improvement to a check script, or a new check worth reusing;
- a checklist item that turned out to be missing or wrong.

**How:** say what you'd contribute and why, in two or three lines, and ask.
Follow the template's `CONTRIBUTING.md` (version bump and changelog
entry).
With an OK, prepare the change against a fresh clone of `wf-template`
(never the client repo), keep it generic (no client names, URLs, people or
credentials), and open a pull request from a branch or fork with `gh pr
create`. Never push to the template's default branch unless the person
says so. If the person has no write access, fork first.

**What a good contribution looks like:**
- lessons follow the `GOTCHAS.md` entry format (without Scope), go in the
  file for their area, say what happened and why, and give a fix someone
  else can apply, with client names, copy and project details made generic;
- scripts keep working from the config file alone (no hard-coded sites);
- checklist items keep their [Claude] / [Claude checks] / [Person] tag.
