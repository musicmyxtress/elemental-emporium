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
  {
    id: "plant",
    name: "Plant",
    emoji: "🌱",
    description: "The quiet growth. Patient, persistent, and ever-spreading.",
  },
  {
    id: "mud",
    name: "Mud",
    emoji: "🟫",
    description: "The mixing of earth and water. Sticky, grounding, and full of hidden life.",
  },
];

export const FRAGMENTS_PER_CRYSTAL = 100;
export const BASE_PASSIVE = 1;
export const PASSIVE_INTERVAL_MS = 5000;

export function fragmentKey(elementId: string): string {
  return `${elementId}-fragment`;
}

export interface CreatureDef {
  id: string;
  name: string;
  emoji: string;
  elementId: string;
  level: number;
  rarity: number;
  isMagical: boolean;
  description: string;
  consumedElementId?: string;
  producedElementId?: string;
}

export function creatureMaxHp(def: CreatureDef): number {
  return (def.level + def.rarity) * 2;
}

export function playerMaxHp(elementXp: Record<string, number>, unlockedElements: string[]): number {
  const levelSum = unlockedElements.reduce((sum, id) => sum + levelFromXp(elementXp[id] ?? 0), 0);
  return 2 * levelSum;
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
  | { type: "heal"; amount: number }
  | { type: "nothing" };

export interface TamedCreature {
  instanceId: string;
  defId: string;
  tamedAt: number;
}

export type SpellKind = "direct" | "dot" | "utility";

export interface SpellDef {
  id: string;
  name: string;
  emoji: string;
  elementId: string;
  kind: SpellKind;
  unlockLevel: number;
  power?: number;
  durationRounds?: number;
  effect?: EventEffect;
  description: string;
}

export function isSpellUnlocked(
  spell: SpellDef,
  elementXp: Record<string, number>,
  unlockedElements: string[],
): boolean {
  return (
    unlockedElements.includes(spell.elementId) &&
    levelFromXp(elementXp[spell.elementId] ?? 0) >= spell.unlockLevel
  );
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
