# Elemental Emporium

A TanStack Start (React + Vite) idle/exploration game. Game data lives in
`src/lib/gameData.ts` (types and pure logic) and `src/lib/seedData.ts`
(content: `ELEMENTS` lives in `gameData.ts`; `CREATURES`, `SPELLS`,
`PLACES`, `RANDOM_EVENTS` live in `seedData.ts`). Game state and actions
are in `src/lib/useGame.ts`; the UI is in `src/routes/index.tsx`.

Commands: `npm run dev`, `npm run build`, `npx tsc --noEmit`, `npm run lint`.

## Deployment

The user tests the game via a Netlify deployment that builds from `main`.
Push finished, verified work directly to `main` (not a feature/task
branch) so it shows up in the deployed build the user actually tests
against. A fix that only exists on a side branch is invisible to them
and will look like it "didn't work."

## Accessibility: keep each line one screen-reader item

The user navigates with VoiceOver, where every separate accessibility
node is its own swipe stop. When a line splits into several nodes — and
especially when a value in it changes — the cursor "flicks" between the
pieces. Keep each logical line a **single** screen-reader item.

Two things cause an unwanted split:

1. **Mixing literal JSX text with `{interpolations}`.** React renders
   `<p>You gained {n} gold</p>` as multiple text nodes, and VoiceOver
   reads each as its own item. Build the whole string as one
   template-literal expression instead: `<p>{`You gained ${n} gold`}</p>`
   renders one text node, hence one item.
2. **Decorative emoji, rarity stars (`★`), progress bars, or
   label/value columns** sitting beside the text. These add extra items
   and (for bars) announce a redundant percentage.

The pattern used throughout `src/routes/index.tsx`: put the full reading
in a single `sr-only` element (one template literal) and mark the visual
layout `aria-hidden="true"`. See the `HpBar` and `StatRow` helpers and
the creature/stats meta lines for examples. Decorative emoji should
always be wrapped in `<span aria-hidden="true">`.

`<button>` and heading elements coalesce their child text into one
accessible name automatically, so those don't need the treatment — only
free-standing text containers (`<p>`, `<li>`, `<dd>`, `<span>`) do.

When adding a new dialog or UI element, apply this from the start rather
than retrofitting it.

## Adding elements

The user may introduce a new element while describing a creature or spell,
without explicitly asking to "add an element."

- If an element is mentioned that doesn't exist in `ELEMENTS`, add it
  (id, name, emoji, description) without asking.
- Do **not** add a gathering `PlaceDef` for it automatically. Instead,
  suggest one (name, emoji, description, matching the existing elemental
  places in `PLACES`) and wait for the user to accept the suggestion or
  describe their own place before adding it to `seedData.ts`.
