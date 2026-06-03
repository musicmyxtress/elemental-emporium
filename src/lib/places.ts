import type { GameState, ResourceKey } from "./useGameState";

export interface PlaceAction {
  id: string;
  /** Button label shown to the player. */
  label: string;
  /** Which resource this action collects. */
  resource: ResourceKey;
  /** Inclusive minimum amount collected. */
  min: number;
  /** Inclusive maximum amount collected. */
  max: number;
}

export interface Place {
  id: string;
  /** Short name shown in the Places tab and announced first by screen readers. */
  name: string;
  /** Full descriptive text shown when the place is discovered or revisited. */
  description: string;
  /** Unique actions the player can perform here, on discovery and on revisit. */
  actions: PlaceAction[];
  /** When set, discovering this place unlocks the lava element permanently. */
  unlocksLava?: boolean;
}

/**
 * The internal pool of discoverable places. The player never sees this list
 * directly — places move into the player's Places tab once discovered, and
 * each place can only be discovered a single time.
 */
export const PLACES: Place[] = [
  {
    id: "flowing-stream",
    name: "Flowing Stream",
    description: "A giggling stream winding through the meadow.",
    actions: [
      {
        id: "collect-water",
        label: "Collect water fragments",
        resource: "water",
        min: 15,
        max: 30,
      },
    ],
  },
  {
    id: "mine",
    name: "Mine",
    description: "A dark echoing stone mine.",
    actions: [
      {
        id: "mine-stone",
        label: "Mine stone",
        resource: "stone",
        min: 15,
        max: 30,
      },
    ],
  },
  {
    id: "volcano",
    name: "Volcano",
    description: "An erupting volcano spewing lava.",
    unlocksLava: true,
    actions: [
      {
        id: "collect-lava",
        label: "Collect lava",
        resource: "lava",
        min: 15,
        max: 30,
      },
    ],
  },
];

/** Looks up a place by id, or returns undefined when not found. */
export function getPlace(id: string): Place | undefined {
  return PLACES.find((p) => p.id === id);
}

/**
 * Returns a random place that has not yet been discovered, or null when every
 * place is already discovered (or the pool is empty).
 */
export function rollUndiscoveredPlace(discoveredIds: string[]): Place | null {
  const available = PLACES.filter((p) => !discoveredIds.includes(p.id));
  if (available.length === 0) return null;
  const index = Math.floor(Math.random() * available.length);
  return available[index];
}

/**
 * Returns true when the player has mastery over the resource an action collects,
 * granting the 10% bonus. Mastery comes from the chosen element (water) or from
 * the unlocked lava element (volcano).
 */
export function hasMastery(resource: ResourceKey, state: GameState): boolean {
  if (resource === "water") return state.element === "water";
  if (resource === "lava") return state.lavaUnlocked;
  return false;
}

/**
 * Rolls the reward for a place action, applying the 10% mastery bonus when the
 * player has mastery over the collected resource. Returns the final amount.
 */
export function rollActionReward(action: PlaceAction, state: GameState): number {
  const span = action.max - action.min + 1;
  const base = action.min + Math.floor(Math.random() * span);
  if (hasMastery(action.resource, state)) {
    return Math.floor(base * 1.1);
  }
  return base;
}
