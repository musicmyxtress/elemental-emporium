# Handoff

_Last updated: 2026-06-08_

## Where I left off
- **Working on:** Setting up cross-device handoff infrastructure (desktop AIDE ↔ phone claude.ai/code)
- **Branch:** main
- **Files in flight:** `.claude/commands/handoff.md`, `HANDOFF.md`
- **Next concrete step:** Review and merge the phone Claude's pending branch `claude/menagery-tab-setup-Aw9Vy` into main, then `git pull` locally.

## Gotchas
- The phone Claude (claude.ai/code via GitHub app) opened a feature branch `claude/menagery-tab-setup-Aw9Vy` with two commits — `6c76a77 Add menagerie tab for housing and training magical creatures` and `97a3824 Add package-lock.json generated during dependency install`. It is NOT merged into main; it's waiting as a PR. Don't try to access "the menagerie tab" code on local main until you've merged it.
- `/handoff` only pushes from the current branch — it does not merge other branches. To bring the phone's work in, ask Claude to "merge the menagery-tab-setup branch into main" — that's a separate action, no browser required. GitHub's web UI is inaccessible with JAWS, so always ask Claude to do merges locally instead.
- The `/handoff` slash command lives in two places: `~\.claude\commands\handoff.md` (user-level, AIDE-only) and `.claude/commands/handoff.md` in this repo (committed, so claude.ai/code on the phone also sees it). The repo-level copy is the one being committed in this session.
- AIDE now has **Ctrl+Shift+H** as a hotkey for `/handoff` and a **close-guard popup** that warns on Alt+F4 if there are unpushed changes — but both depend on AIDE being opened on this repo's folder (`C:\Users\User\Documents\projects\elemental-emporium`), not the parent `projects` folder.
- This particular handoff run was done manually with `git -C <path>` from a session whose CWD wasn't this repo; future runs from AIDE-on-this-folder will use plain `git` and the hotkey path.
