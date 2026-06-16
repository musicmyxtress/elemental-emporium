export interface ElementDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export const ELEMENTS: ElementDef[] = [
  {
    id: "fire",
    name: "Fire",
    emoji: "🔥",
    description: "The consuming flame. Intense and fast-gathering.",
  },
  {
    id: "water",
    name: "Water",
    emoji: "💧",
    description: "The patient tide. Flows steadily and adapts to any vessel.",
  },
  {
    id: "earth",
    name: "Earth",
    emoji: "🌿",
    description: "The solid ground. Slow to move, but yields richly.",
  },
  {
    id: "air",
    name: "Air",
    emoji: "💨",
    description: "The unseen breath. Present everywhere, never still.",
  },
];

export const FRAGMENTS_PER_CRYSTAL = 50;
export const BASE_GATHER = 5;
export const BASE_PASSIVE = 1;
export const PASSIVE_INTERVAL_MS = 5000;

export function fragmentKey(elementId: string): string {
  return `${elementId}-fragment`;
}

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  crystalCost: number;
  requires?: string;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: "gather-2x",
    name: "Sharpened Focus",
    description: "Gathering yields twice as many fragments.",
    crystalCost: 2,
  },
  {
    id: "passive-2x",
    name: "Elemental Resonance",
    description: "Passive fragment income doubles.",
    crystalCost: 3,
  },
  {
    id: "gather-4x",
    name: "Master's Grip",
    description: "Gathering yields four times as many fragments (total).",
    crystalCost: 6,
    requires: "gather-2x",
  },
  {
    id: "passive-4x",
    name: "Deep Attunement",
    description: "Passive income quadruples (total).",
    crystalCost: 8,
    requires: "passive-2x",
  },
];

export function gatherMultiplier(upgrades: string[]): number {
  if (upgrades.includes("gather-4x")) return 4;
  if (upgrades.includes("gather-2x")) return 2;
  return 1;
}

export function passiveMultiplier(upgrades: string[]): number {
  if (upgrades.includes("passive-4x")) return 4;
  if (upgrades.includes("passive-2x")) return 2;
  return 1;
}
