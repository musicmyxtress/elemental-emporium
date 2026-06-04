export type CreatureGender = "male" | "female";

export interface ElementFlow {
  /** Element id (e.g. "air", "plant", "fire"). */
  element: string;
  /** Amount produced or consumed per tick (units to be defined later). */
  amount: number;
}

export interface Creature {
  id: string;
  /** Short name shown when encountered and announced first by screen readers. */
  name: string;
  /** Full descriptive text shown when the creature is encountered. */
  description: string;
  /**
   * Rarity tier. Lower = more common. Used to weight encounter rolls so a
   * rarity-1 creature is more likely to appear than a rarity-3 creature.
   */
  rarity: number;
  gender: CreatureGender;
  /** Whether the creature wields magic. Magical creatures also consume an element. */
  magical: boolean;
  /** The element this creature produces. */
  elementProduction: ElementFlow;
  /**
   * The element this creature consumes. Required when `magical` is true; must
   * be undefined when `magical` is false.
   */
  elementConsumption?: ElementFlow;
}

/**
 * The internal pool of encounterable creatures. The player never sees this
 * list directly — creatures appear during exploration. Intentionally left
 * empty for now; specific creatures will be added later.
 */
export const CREATURES: Creature[] = [];

/**
 * Per-tick production amount for a creature.
 * - Non-magical creatures produce their rarity level in their production element.
 * - Magical creatures produce double their rarity level in their production element.
 */
export function getProductionAmount(creature: Creature): number {
  const base = Math.max(1, creature.rarity);
  return creature.magical ? base * 2 : base;
}

/**
 * Per-tick consumption amount for a creature.
 * - Non-magical creatures consume nothing (returns 0).
 * - Magical creatures consume their rarity level in their consumption element.
 */
export function getConsumptionAmount(creature: Creature): number {
  if (!creature.magical || !creature.elementConsumption) return 0;
  return Math.max(1, creature.rarity);
}

/** Looks up a creature by id, or returns undefined when not found. */
export function getCreature(id: string): Creature | undefined {
  return CREATURES.find((c) => c.id === id);
}

/**
 * Returns a random creature eligible to encounter, weighted so lower-rarity
 * creatures are more likely than higher-rarity ones. Filters out creatures
 * that are temporarily shelved (e.g. because the player studied one whose
 * element they have not unlocked). Returns null when no creatures remain.
 */
export function rollCreature(
  shelvedCreatures: Record<string, number> = {},
  now: number = Date.now(),
): Creature | null {
  const available = CREATURES.filter((c) => {
    const shelvedUntil = shelvedCreatures[c.id] ?? 0;
    return shelvedUntil <= now;
  });
  if (available.length === 0) return null;
  const weights = available.map((c) => 1 / Math.max(1, c.rarity));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < available.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return available[i];
  }
  return available[available.length - 1];
}
