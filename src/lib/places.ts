export interface PlaceResource {
  /** Stable id used as the key in GameState.resources. */
  id: string;
  /** Human-readable label, singular, used in announcements ("1 wood"). */
  label: string;
  /**
   * Optional element id this resource belongs to. When set, the player must
   * have this element unlocked to collect the resource. Unsetting it (e.g.
   * wood, stone) means the resource is non-elemental and always collectable.
   */
  element?: string;
}


export interface Place {
  id: string;
  /** Short name shown in the Places tab and announced first by screen readers. */
  name: string;
  /** Full descriptive text shown when the place is discovered or revisited. */
  description: string;
  /**
   * Rarity tier. Lower = more common. Used to weight discovery rolls so that
   * a rarity-1 place is more likely to appear than a rarity-3 place.
   */
  rarity: number;
  /** The resource the player collects when visiting this place. */
  resource: PlaceResource;
  /** Cooldown between collections in milliseconds. 0 means no cooldown. */
  cooldownMs: number;
}

/**
 * The internal pool of discoverable places. The player never sees this list
 * directly — places move into the player's Places tab once discovered, and
 * each place can only be discovered a single time.
 */
export const PLACES: Place[] = [
  {
    id: "forest",
    name: "Forest",
    description: "A dense forest of tall trees. You can collect wood here.",
    rarity: 1,
    resource: { id: "wood", label: "wood" },
    cooldownMs: 0,
  },
  {
    id: "stone-mine",
    name: "Stone mine",
    description: "An abandoned mine cut into a hillside. You can collect stone here.",
    rarity: 1,
    resource: { id: "stone", label: "stone" },
    cooldownMs: 0,
  },
  {
    id: "mountain",
    name: "Mountain",
    description: "A towering peak humming with deep magic. You can collect earth fragments here.",
    rarity: 1,
    resource: { id: "earth-fragment", label: "earth fragment" },
    cooldownMs: 10_000,
  },
  {
    id: "flowing-stream",
    name: "Flowing stream",
    description: "A clear stream winding through mossy stones. You can collect water fragments here.",
    rarity: 1,
    resource: { id: "water-fragment", label: "water fragment" },
    cooldownMs: 10_000,
  },
  {
    id: "grassy-plains",
    name: "Grassy plains",
    description: "Wide plains rippling with wildflowers and herbs. You can collect plant fragments here.",
    rarity: 3,
    resource: { id: "plant-fragment", label: "plant fragment" },
    cooldownMs: 30_000,
  },
  {
    id: "volcano",
    name: "Volcano",
    description: "A restless volcano glowing with molten light. You can collect lava fragments here.",
    rarity: 3,
    resource: { id: "lava-fragment", label: "lava fragment" },
    cooldownMs: 30_000,
  },
  {
    id: "ember-grove",
    name: "Ember grove",
    description: "A grove of trees that perpetually smolder with embers. You can collect fire fragments here.",
    rarity: 1,
    resource: { id: "fire-fragment", label: "fire fragment" },
    cooldownMs: 10_000,
  },
  {
    id: "time-vortex",
    name: "Time vortex",
    description: "A swirling tear in reality where moments pass in reverse. You can collect time fragments here.",
    rarity: 6,
    resource: { id: "time-fragment", label: "time fragment" },
    cooldownMs: 60_000,
  },
  {
    id: "rainbow-bridge",
    name: "Rainbow bridge",
    description: "An arch of prismatic light stretching across the sky. You can collect light fragments here.",
    rarity: 7,
    resource: { id: "light-fragment", label: "light fragment" },
    cooldownMs: 70_000,
  },
  {
    id: "infinite-void",
    name: "Infinite void",
    description: "A pocket of absolute nothingness that devours all light. You can collect darkness fragments here.",
    rarity: 7,
    resource: { id: "darkness-fragment", label: "darkness fragment" },
    cooldownMs: 70_000,
  },
];

/** Looks up a place by id, or returns undefined when not found. */
export function getPlace(id: string): Place | undefined {
  return PLACES.find((p) => p.id === id);
}

/**
 * Returns a random place that has not yet been discovered, weighted so that
 * lower-rarity places are more likely than higher-rarity places. Returns null
 * when every place is already discovered (or the pool is empty).
 */
export function rollUndiscoveredPlace(discoveredIds: string[]): Place | null {
  const available = PLACES.filter((p) => !discoveredIds.includes(p.id));
  if (available.length === 0) return null;
  // Weight by 1/rarity so rarity 1 is 3x as likely as rarity 3.
  const weights = available.map((p) => 1 / Math.max(1, p.rarity));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < available.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return available[i];
  }
  return available[available.length - 1];
}
