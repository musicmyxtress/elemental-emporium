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
  /** Minimum element level required for this creature to appear in exploration. */
  level: number;
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

export const CREATURES: Creature[] = [
  {
    id: "salamander",
    name: "Salamander",
    description: "a tiny lizard with a blunt snout and short limbs.",
    rarity: 2,
    level: 1,
    gender: "male",
    magical: false,
    elementProduction: { element: "fire", amount: 2 },
  },
  {
    id: "duck",
    name: "Duck",
    description: "an odd, broad billed aquatic bird with webbed feet.",
    rarity: 2,
    level: 1,
    gender: "female",
    magical: false,
    elementProduction: { element: "water", amount: 2 },
  },
  {
    id: "mole",
    name: "Mole",
    description: "A cylindrical bodied mammal with tiny eyes and powerful digging claws.",
    rarity: 2,
    level: 1,
    gender: "male",
    magical: false,
    elementProduction: { element: "earth", amount: 2 },
  },
];

/**
 * Effective level for HP / production scaling.
 * - Non-magical creatures: fixed at their template `level`.
 * - Magical creatures: their trained level (defaults to 1).
 */
export function getEffectiveLevel(creature: Creature, trainedLevel?: number): number {
  if (!creature.magical) return Math.max(1, creature.level);
  return Math.max(1, trainedLevel ?? 1);
}

/** Maximum HP for a creature. HP = (rarity + effective level) × 5. */
export function getCreatureHp(creature: Creature, trainedLevel?: number): number {
  const rarity = Math.max(1, creature.rarity);
  const level = getEffectiveLevel(creature, trainedLevel);
  return (rarity + level) * 5;
}

/**
 * Damage per hit for a creature.
 * Rolls a random integer from effective level (inclusive) up to
 * effective level × rarity (inclusive).
 */
export function getCreatureDamage(creature: Creature, trainedLevel?: number): number {
  const rarity = Math.max(1, creature.rarity);
  const level = getEffectiveLevel(creature, trainedLevel);
  const min = level;
  const max = level * rarity;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Per-tick production amount for a creature.
 * - Non-magical creatures produce their rarity in their production element.
 * - Magical creatures produce 2× rarity, plus another `rarity` for every 3
 *   trained levels (so rarity 5 magical gains +5 production every 3 levels).
 */
export function getProductionAmount(creature: Creature, trainedLevel?: number): number {
  const base = Math.max(1, creature.rarity);
  if (!creature.magical) return base;
  const trained = Math.max(1, trainedLevel ?? 1);
  return base * 2 + base * Math.floor(trained / 3);
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
  elementLevels: Record<string, number>,
  shelvedCreatures: Record<string, number> = {},
  now: number = Date.now(),
): Creature | null {
  const available = CREATURES.filter((c) => {
    const shelvedUntil = shelvedCreatures[c.id] ?? 0;
    if (shelvedUntil > now) return false;
    const playerLevel = elementLevels[c.elementProduction.element] ?? 0;
    return playerLevel >= c.level;
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
