---
description: Record an implemented feature in IMPLEMENTED.md (browsable later via Ctrl+I in AIDE).
---

You are recording a feature the user just had you build, so they can browse "what did I already ask for?" later via Ctrl+I in AIDE. This is a memory aid for the user, not a changelog for the world.

The user may have invoked `/log` bare (no headline) — in which case derive the headline from the actual work in this session. Or they may have invoked `/log <headline text>` — in which case use that as the headline verbatim.

Do the following:

1. **Determine the headline.** Short noun phrase, sentence-case, no trailing period. Examples: "Cross-device handoff workflow", "Trigger pattern matching with regex support", "NVDA fallback when SAPI fails". If headline was provided as an argument, use it. Otherwise: pick the *most user-visible* thing this session accomplished — what would the user describe to a friend? Not "refactored ToolHandler"; instead "Faster startup on big projects".

2. **Find or create `IMPLEMENTED.md` at the repo root** (run `git rev-parse --show-toplevel` to find it; if not a git repo, use the current working directory). The file's header is:

   ```markdown
   # Implemented features

   _Newest first. Browse in AIDE with Ctrl+I._
   ```

   New entries go **at the top**, immediately after the header.

3. **Write the new entry** with this exact structure:

   ```markdown
   ## <YYYY-MM-DD> — <Headline>
   <1-3 sentences in plain English: what was built, what it enables.>
   - Files: <comma-separated top-level paths touched>
   - Commit: <short SHA of the most recent commit, if there is one this session>
   ```

   If there's no commit yet (the work is uncommitted), omit the Commit line. The user can still log uncommitted work — sometimes they want a marker before committing.

4. **If in a git repo,** stage IMPLEMENTED.md, commit with message `Log feature: <Headline>`, and push if the branch has an upstream. If push fails for any non-"no upstream" reason, surface the error and stop — don't force-push or reset. If no upstream, run `git push -u origin <branch>` once.

5. **If not in a git repo,** just save the file. No commit, no push. That's fine for projects like MUDBall that aren't repo-backed.

6. **Report back in one line:**

   > Logged "<Headline>" (<N> features total in this project). [Commit <sha>, pushed.]

   The bracketed bit only if a commit/push actually happened.

Keep it tight — this is meant to be a one-keystroke flow.
