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
  {
    id: "ice",
    name: "Ice",
    emoji: "❄️",
    description: "The frozen stillness. Sharp, patient, and slow to yield its grip.",
  },
  {
    id: "lightning",
    name: "Lightning",
    emoji: "⚡",
    description: "The sudden spark. Blinding, fast, and gone before the thunder.",
  },
  {
    id: "sand",
    name: "Sand",
    emoji: "🏜️",
    description: "The shifting grains. Countless, restless, and shaped by every wind.",
  },
  {
    id: "light",
    name: "Light",
    emoji: "☀️",
    description: "The first radiance. It reveals all and hides nothing.",
  },
  {
    id: "darkness",
    name: "Darkness",
    emoji: "🌑",
    description: "The deep shade. Quiet, vast, and full of what the light forgot.",
  },
  {
    id: "poison",
    name: "Poison",
    emoji: "🧪",
    description: "The creeping venom. Subtle at first, relentless once it takes hold.",
  },
  {
    id: "sound",
    name: "Sound",
    emoji: "🔊",
    description: "The traveling vibration. Unseen, yet it moves everything it touches.",
  },
  {
    id: "force",
    name: "Force",
    emoji: "💥",
    description: "The raw push. Blunt, certain, and impossible to argue with.",
  },
  {
    id: "time",
    name: "Time",
    emoji: "⏳",
    description: "The endless current. It carries all things forward, sparing none.",
  },
  {
    id: "space",
    name: "Space",
    emoji: "🌌",
    description: "The boundless expanse. Empty, infinite, and quietly holding everything.",
  },
  {
    id: "love",
    name: "Love",
    emoji: "❤️",
    description: "The binding warmth. Gentle, stubborn, and stronger than it looks.",
  },
  {
    id: "life",
    name: "Life",
    emoji: "🌟",
    description: "The stirring spark. Fragile, insistent, and forever beginning again.",
  },
  {
    id: "magic",
    name: "Magic",
    emoji: "✨",
    description: "The woven mystery. Bending the rules the other elements obey.",
  },
  {
    id: "death",
    name: "Death",
    emoji: "💀",
    description: "The final quiet. Patient beyond measure, and certain to arrive.",
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

export type Gender = "male" | "female";

export function randomGender(): Gender {
  return Math.random() < 0.5 ? "male" : "female";
}

export function genderLabel(gender: Gender): string {
  return gender === "male" ? "Male" : "Female";
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
  gender?: Gender;
  tamedAt: number;
}

export type SpellKind = "direct" | "dot" | "utility";

export type SpellUtilityKind = "shield" | "haste";

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
  utilityKind?: SpellUtilityKind;
  hasteDurationMs?: number;
  halvesRetaliation?: boolean;
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
