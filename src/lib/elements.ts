import type { Element } from "@/lib/useGameState";

export interface ElementInfo {
  id: Element;
  name: string;
  fragmentName: string;
  description: string;
  emoji: string;
  /** Tailwind classes built from semantic tokens for this element's accent. */
  accentClass: string;
}

export const ELEMENTS: ElementInfo[] = [
  {
    id: "air",
    name: "Air",
    fragmentName: "Air Fragment",
    description: "Swift and weightless. Master of wind and storm.",
    emoji: "🌬️",
    accentClass: "air",
  },
  {
    id: "earth",
    name: "Earth",
    fragmentName: "Earth Fragment",
    description: "Steady and enduring. Master of stone and root.",
    emoji: "🌿",
    accentClass: "earth",
  },
  {
    id: "fire",
    name: "Fire",
    fragmentName: "Fire Fragment",
    description: "Fierce and bright. Master of flame and ember.",
    emoji: "🔥",
    accentClass: "fire",
  },
  {
    id: "water",
    name: "Water",
    fragmentName: "Water Fragment",
    description: "Calm and adaptable. Master of tide and frost.",
    emoji: "💧",
    accentClass: "water",
  },
];

/**
 * All element ids known to the game, including ones that are not unlockable
 * at character creation. Used by UI that needs to enumerate every element
 * (e.g. the fragments & crystals tab). The first four match `ELEMENTS`.
 */
export interface AllElementInfo {
  id: string;
  name: string;
  fragmentName: string;
  emoji: string;
}

export const ALL_ELEMENT_INFO: AllElementInfo[] = [
  { id: "air", name: "Air", fragmentName: "Air Fragment", emoji: "🌬️" },
  { id: "earth", name: "Earth", fragmentName: "Earth Fragment", emoji: "🌿" },
  { id: "fire", name: "Fire", fragmentName: "Fire Fragment", emoji: "🔥" },
  { id: "water", name: "Water", fragmentName: "Water Fragment", emoji: "💧" },
  { id: "plant", name: "Plant", fragmentName: "Plant Fragment", emoji: "🌱" },
  { id: "lava", name: "Lava", fragmentName: "Lava Fragment", emoji: "🌋" },
  { id: "time", name: "Time", fragmentName: "Time Fragment", emoji: "⏳" },
  { id: "light", name: "Light", fragmentName: "Light Fragment", emoji: "✨" },
  { id: "darkness", name: "Darkness", fragmentName: "Darkness Fragment", emoji: "🌑" },
];

/** Returns the resource id used to store an element's fragments. */
export function fragmentResourceId(elementId: string): string {
  return `${elementId}-fragment`;
}

/** Number of fragments required to create one crystal. */
export const FRAGMENTS_PER_CRYSTAL = 100;

/** Total XP required to advance from `level` to `level + 1`. */
export function xpToNextLevel(level: number): number {
  return level * 1000;
}

export function getElement(id: Element): ElementInfo {
  return ELEMENTS.find((e) => e.id === id)!;
}

