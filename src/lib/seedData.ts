import type { CreatureDef, PlaceDef, RandomEventDef, SpellDef } from "./gameData";

export const CREATURES: CreatureDef[] = [];

export const SPELLS: SpellDef[] = [];

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
  {
    id: "ember-grove",
    name: "Ember Grove",
    emoji: "🔥",
    kind: "elemental",
    elementId: "fire",
    rarity: 1,
    description: "A grove where embers smolder in the underbrush.",
  },
  {
    id: "flowing-stream",
    name: "Flowing Stream",
    emoji: "💧",
    kind: "elemental",
    elementId: "water",
    rarity: 1,
    description: "A clear stream winding through the land.",
  },
  {
    id: "tall-mountain",
    name: "Tall Mountain",
    emoji: "⛰️",
    kind: "elemental",
    elementId: "earth",
    rarity: 1,
    description: "A towering peak of solid rock.",
  },
  {
    id: "high-up-a-tree",
    name: "High Up a Tree",
    emoji: "🌳",
    kind: "elemental",
    elementId: "air",
    rarity: 1,
    description: "A perch high above the ground, open to the wind.",
  },
  {
    id: "grassy-planes",
    name: "Grassy Planes",
    emoji: "🌾",
    kind: "elemental",
    elementId: "plant",
    rarity: 1,
    description: "Rolling fields of wild grass stretching to the horizon.",
  },
];

export const RANDOM_EVENTS: RandomEventDef[] = [];
