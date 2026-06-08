# Fix: "Explored for a while" message shows on dismissal

## Problem
After dismissing a place discovery dialog, the dialog content briefly flashes to "Nothing stirs / You explore for a while, but find nothing of note this time." That fallback text is the default for the title/text variables in `DiscoveryDialog` (src/routes/index.tsx ~line 1183-1184), and it renders whenever the cached `shown` value doesn't match one of the explicit branches (place / locked-place / creature / locked-creature / event). It is never gated on `shown?.kind === "nothing"`.

## Fix
In `DiscoveryDialog` (src/routes/index.tsx):

1. Stop using the "Nothing stirs" copy as the default. Initialize `title` and `text` to empty strings.
2. Add an explicit branch `else if (shown?.kind === "nothing")` that sets the title to "Nothing stirs" and the text to "You explore for a while, but find nothing of note this time." — so that copy only renders when exploration genuinely returned nothing.
3. Leave the cached `shown` / `lastDiscoveryRef` logic in place so the dialog still keeps its real content during the close animation; with empty defaults, even if `shown` ever fell through, the dialog would render blank rather than a misleading message.

No other files need changes.
