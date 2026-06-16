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

export interface CreatureDef {
  id: string;
  name: string;
  emoji: string;
  elementId: string;
  level: number;
  rarity: number;
  isMagical: boolean;
  consumedElementId?: string;
  producedElementId?: string;
}

export type PlaceKind = "elemental" | "forest" | "stone_mine";

export interface PlaceDef {
  id: string;
  name: string;
  emoji: string;
  kind: PlaceKind;
  elementId?: string;
  rarity: number;
  description: string;
}

export interface RandomEventChoice {
  label: string;
  effect: EventEffect;
}

export interface RandomEventDef {
  id: string;
  text: string;
  choices: RandomEventChoice[];
}

export type EventEffect =
  | { type: "fragments"; elementId: string; amount: number }
  | { type: "xp"; elementId: string; amount: number }
  | { type: "nothing" };

export interface TamedCreature {
  instanceId: string;
  defId: string;
  tamedAt: number;
}

export function xpForLevel(level: number): number {
  return (level * (level - 1) / 2) * 1000;
}

export function levelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;
  const k = totalXp / 1000;
  return Math.floor((1 + Math.sqrt(1 + 8 * k)) / 2);
}

export function xpProgressInLevel(totalXp: number): { level: number; currentXp: number; neededXp: number } {
  const level = levelFromXp(totalXp);
  return {
    level,
    currentXp: totalXp - xpForLevel(level),
    neededXp: xpForLevel(level + 1) - xpForLevel(level),
  };
}
