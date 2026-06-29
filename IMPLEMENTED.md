# Implemented features

_Newest first. Browse in AIDE with Ctrl+I._

## 2026-06-29 — Troll and Nyad magical creatures
Two new magical creatures that fit the produce/consume chains alongside Cinderling, Sylf, and Dryad. Troll (earth, level 4, rarity 3) eats plant and makes earth; Nyad (water, level 2, rarity 3) eats air and makes water — so Nyad feeds plant-makers and Troll consumes their plant, closing a loop.
- Files: src/lib/seedData.ts
- Commit: 7a8eaf1

## 2026-06-27 — Creature roster expansion and rarity-tuned exploring
A big content-and-balance pass on the exploring/taming loop. Added a whole new tier of creatures, the elements and gathering places to support them, randomized creature gender, two new spells, and reworked how often things appear so rarity actually matters.
- Random creature gender: every creature you find is randomly male or female (rolled per encounter, not per species), announced in the encounter dialog and kept on tamed creatures in the Stable and Menagerie.
- 14 new level-1 creatures, each with a description: penguin, eel, crab, firefly, cat, skunk, cricket, dog, dragonfly, sea turtle, rabbit, chicken, fox, crow.
- 14 new elements: ice, lightning, sand, light, darkness, poison, sound, force, time, space, love, life, magic, death.
- 14 new elemental gathering places (Glacier, Storm Cloud, Desert Dunes, Sunlit Clearing, Shadow Cavern, Toxic Bog, Echoing Canyon, Gravity Well, Time Vortex, Astral Void, Heartspring Grotto, Thriving Rainforest, Faerie Ring, Graveyard), each at place rarity = creature rarity + 1.
- Rarity-weighted exploring: encounters scale as 1 / rarity², so high-rarity creatures and places are genuinely scarce (a rarity-8 is about a 1-in-200 sighting). Building-material places (wood, stone) get an outsized weight so they turn up almost immediately — about 2.5 explores to find both.
- Elemental place rarity floor: all elemental places are now rarity 2 or higher; rarity 1 is reserved for building-material places so wood and stone stay trivially easy to find.
- Two new level-1 spells: Zap (lightning, direct damage) and Poison Spray (poison, damage-over-time).
- One-element-at-a-time study lock: starting a study while another element is still being studied is blocked, with a clear screen-reader announcement naming the element in progress.
- Files: src/lib/gameData.ts, src/lib/seedData.ts, src/lib/explore.ts, src/lib/useGame.ts, src/routes/index.tsx
- Commit: df815dd
