import type { GameState } from "./useGameState";

export interface Place {
  id: string;
  /** Short name shown in the Places tab and announced first by screen readers. */
  name: string;
  /** Full descriptive text shown when the place is discovered or revisited. */
  description: string;
}

/**
 * The internal pool of discoverable places. The player never sees this list
 * directly — places move into the player's Places tab once discovered, and
 * each place can only be discovered a single time.
 * Intentionally left empty — content will be filled in later.
 */
export const PLACES: Place[] = [];

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
