---
description: Snapshot session progress to HANDOFF.md, commit everything, and push.
---

You are wrapping up a working session in this repo and handing off to a future session (possibly on a different device — the user often continues on their phone via claude.ai/code).

Do the following in order. Be concise in your replies; the user wants this to feel like one keystroke.

1. **Verify this is a git repo.** Run `git rev-parse --show-toplevel`. If it fails, tell the user "Not in a git repo — handoff aborted." and stop.

2. **Write or overwrite `HANDOFF.md` at the repo root** (the path from step 1). Use exactly this structure, filling each field from this session's actual work — not boilerplate:

   ```markdown
   # Handoff

   _Last updated: <ISO date>_

   ## Where I left off
   - **Working on:** <feature or bug in one phrase>
   - **Branch:** <current branch name>
   - **Files in flight:** <paths touched this session, comma-separated>
   - **Next concrete step:** <one sentence — the very first thing the next session should do>

   ## Gotchas
   - <anything non-obvious the next session needs: half-done refactors, decisions made and why, things verified vs unverified, pitfalls, open questions>
   ```

   Overwrite, don't append. The file is a snapshot of *now*, not a log.

3. **Stage everything**: `git add -A`

4. **Check what's staged**: `git diff --cached --stat`. If nothing is staged and HANDOFF.md was unchanged, tell the user "Nothing to commit — already in sync." and stop.

5. **Commit** with a one-line message summarizing what the session actually accomplished — *not* "WIP handoff" or "update HANDOFF.md." Examples of good messages: `Add NVDA fallback for SAPI failures`, `Fix crash when prompt is empty on send`. The HANDOFF.md update rides along in the same commit.

6. **Push.** Try `git push` first. If it fails because the branch has no upstream, run `git push -u origin <current-branch>` instead. Don't force push under any circumstance.

7. **Report back** in 2-3 lines: branch name, short commit hash, push result. Example:

   > Handed off on branch `feature/triggers`. Commit `a1b2c3d`: Add trigger pattern matching. Pushed to origin.

If any git step fails for a reason that isn't "no upstream," stop and surface the error — don't try to recover by force-pushing or resetting.
