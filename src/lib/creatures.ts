export type CreatureGender = "male" | "female";

export interface ElementFlow {
  /** Element id (e.g. "air", "plant", "fire"). */
  element: string;
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
  /** The element this creature produces fragments of. */
  elementProduction: ElementFlow;
  /**
   * The element this creature consumes fragments of each tick. Required when
   * `magical` is true; must be undefined when `magical` is false.
   */
  elementConsumption?: ElementFlow;
}

export const CREATURES: Creature[] = [
  // ── Non-magical ────────────────────────────────────────────────────────────
  {
    id: "gopher",
    name: "Gopher",
    description: "a small stocky rodent with powerful claws and fur-lined cheek pouches.",
    rarity: 1,
    level: 1,
    gender: "male",
    magical: false,
    elementProduction: { element: "earth" },
  },
  {
    id: "salamander",
    name: "Salamander",
    description: "a tiny lizard with a blunt snout and short limbs.",
    rarity: 2,
    level: 1,
    gender: "male",
    magical: false,
    elementProduction: { element: "fire" },
  },
  {
    id: "duck",
    name: "Duck",
    description: "an odd, broad billed aquatic bird with webbed feet.",
    rarity: 2,
    level: 1,
    gender: "female",
    magical: false,
    elementProduction: { element: "water" },
  },
  {
    id: "mole",
    name: "Mole",
    description: "a cylindrical bodied mammal with tiny eyes and powerful digging claws.",
    rarity: 2,
    level: 1,
    gender: "male",
    magical: false,
    elementProduction: { element: "earth" },
  },
  // ── Magical ────────────────────────────────────────────────────────────────
  {
    id: "phoenix",
    name: "Phoenix",
    description: "a radiant bird of flame that rises reborn from its own ashes.",
    rarity: 6,
    level: 8,
    gender: "female",
    magical: true,
    elementProduction: { element: "fire" },
    elementConsumption: { element: "air" },
  },
  {
    id: "sea-serpent",
    name: "Sea Serpent",
    description: "a sinuous scaled leviathan coiling through the deep.",
    rarity: 3,
    level: 3,
    gender: "male",
    magical: true,
    elementProduction: { element: "water" },
    elementConsumption: { element: "earth" },
  },
  {
    id: "stone-golem",
    name: "Stone Golem",
    description: "a hulking figure of granite bound by ancient fire runes.",
    rarity: 3,
    level: 3,
    gender: "male",
    magical: true,
    elementProduction: { element: "earth" },
    elementConsumption: { element: "fire" },
  },
  {
    id: "sylph",
    name: "Sylph",
    description: "a shimmering spirit of pure wind with translucent wings.",
    rarity: 3,
    level: 3,
    gender: "female",
    magical: true,
    elementProduction: { element: "air" },
    elementConsumption: { element: "water" },
  },
  {
    id: "dryad",
    name: "Dryad",
    description: "a graceful tree spirit whose hair is woven from living vines.",
    rarity: 4,
    level: 5,
    gender: "female",
    magical: true,
    elementProduction: { element: "plant" },
    elementConsumption: { element: "water" },
  },
  {
    id: "magma-drake",
    name: "Magma Drake",
    description: "a stocky draconic beast whose veins glow with liquid rock.",
    rarity: 4,
    level: 5,
    gender: "male",
    magical: true,
    elementProduction: { element: "lava" },
    elementConsumption: { element: "fire" },
  },
  {
    id: "chrono-hare",
    name: "Chrono Hare",
    description: "a silver-furred hare that leaves faint afterimages as it darts through moments.",
    rarity: 5,
    level: 8,
    gender: "male",
    magical: true,
    elementProduction: { element: "time" },
    elementConsumption: { element: "air" },
  },
  {
    id: "luminary",
    name: "Luminary",
    description: "a celestial being whose form blazes with focused starlight.",
    rarity: 5,
    level: 8,
    gender: "female",
    magical: true,
    elementProduction: { element: "light" },
    elementConsumption: { element: "fire" },
  },
  {
    id: "shadow-wraith",
    name: "Shadow Wraith",
    description: "a drifting specter that pulls the passage of time into its dark form.",
    rarity: 5,
    level: 8,
    gender: "male",
    magical: true,
    elementProduction: { element: "darkness" },
    elementConsumption: { element: "time" },
  },
];

/**
 * Effective level for HP / damage scaling.
 * - Non-magical creatures: their template `level` (minimum 1).
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
 * Damage per hit for a creature. Rolls a random integer from effective level
 * (inclusive) up to effective level × rarity (inclusive), minimum 1.
 */
export function getCreatureDamage(creature: Creature, trainedLevel?: number): number {
  const rarity = Math.max(1, creature.rarity);
  const level = getEffectiveLevel(creature, trainedLevel);
  const min = level;
  const max = level * rarity;
  return Math.max(1, Math.floor(Math.random() * (max - min + 1)) + min);
}

/**
 * Per-tick fragment production for a creature.
 * - Non-magical: produces `rarity` fragments of their element.
 * - Magical: produces `rarity × trainedLevel` fragments; trained level
 *   defaults to `creature.level` (its encounter level) when not yet set.
 */
export function getProductionAmount(creature: Creature, trainedLevel?: number): number {
  if (!creature.magical) return Math.max(1, creature.rarity);
  const level = Math.max(1, trainedLevel ?? creature.level);
  return creature.rarity * level;
}

/**
 * Per-tick fragment consumption for a creature.
 * - Non-magical: 0 (no consumption).
 * - Magical: consumes `rarity` fragments of their consumption element.
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
 * creatures are more likely than higher-rarity ones. Filters to creatures
 * whose minimum element level the player meets, and excludes temporarily
 * shelved creatures. Returns null when no creatures are eligible.
 */
export function rollCreature(
  elementLevels: Record<string, number>,
  shelvedCreatures: Record<string, number> = {},
  now: number = Date.now(),
): Creature | null {
  const available = CREATURES.filter((c) => {
    if ((shelvedCreatures[c.id] ?? 0) > now) return false;
    return (elementLevels[c.elementProduction.element] ?? 0) >= c.level;
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
