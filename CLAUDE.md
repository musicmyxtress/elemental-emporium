# Elemental Emporium

A TanStack Start (React + Vite) idle/exploration game. Game data lives in
`src/lib/gameData.ts` (types and pure logic) and `src/lib/seedData.ts`
(content: `ELEMENTS` lives in `gameData.ts`; `CREATURES`, `SPELLS`,
`PLACES`, `RANDOM_EVENTS` live in `seedData.ts`). Game state and actions
are in `src/lib/useGame.ts`; the UI is in `src/routes/index.tsx`.

Commands: `npm run dev`, `npm run build`, `npx tsc --noEmit`, `npm run lint`.

## Adding elements

The user may introduce a new element while describing a creature or spell,
without explicitly asking to "add an element."

- If an element is mentioned that doesn't exist in `ELEMENTS`, add it
  (id, name, emoji, description) without asking.
- Do **not** add a gathering `PlaceDef` for it automatically. Instead,
  suggest one (name, emoji, description, matching the existing elemental
  places in `PLACES`) and wait for the user to accept the suggestion or
  describe their own place before adding it to `seedData.ts`.
