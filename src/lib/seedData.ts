import type { CreatureDef, PlaceDef, RandomEventDef } from "./gameData";

export const CREATURES: CreatureDef[] = [];

export const PLACES: PlaceDef[] = [
  {
    id: "forest",
    name: "Forest",
    emoji: "🌲",
    kind: "forest",
    rarity: 1,
    description: "A dense woodland. Gather wood here.",
  },
  {
    id: "stone-mine",
    name: "Stone Mine",
    emoji: "⛏️",
    kind: "stone_mine",
    rarity: 1,
    description: "A rocky mine shaft. Gather stone here.",
  },
];

export const RANDOM_EVENTS: RandomEventDef[] = [];
