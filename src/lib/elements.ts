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
    id: "water",
    name: "Water",
    fragmentName: "Water Fragment",
    description: "Calm and adaptable. Master of tide and frost.",
    emoji: "💧",
    accentClass: "water",
  },
  {
    id: "fire",
    name: "Fire",
    fragmentName: "Fire Fragment",
    description: "Fierce and bright. Master of flame and ember.",
    emoji: "🔥",
    accentClass: "fire",
  },
];

export function getElement(id: Element): ElementInfo {
  return ELEMENTS.find((e) => e.id === id)!;
}
