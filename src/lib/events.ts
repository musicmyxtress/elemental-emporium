import type { GameState } from "./useGameState";

export interface RandomEvent {
  id: string;
  /** Short title announced first by screen readers. */
  title: string;
  /** Full descriptive text shown in the dialog body. */
  text: string;
  /**
   * Optional effect applied each time the event occurs. Random events can
   * happen any number of times, and may cause the player to lose or gain
   * something. Return the next game state (or a partial patch is merged by the
   * caller). Leave undefined for purely flavour events.
   */
  apply?: (state: GameState) => GameState;
}

/**
 * The internal pool of random events. The player never sees this list directly.
 * Unlike places, random events can trigger any number of times.
 * Intentionally left empty — content will be filled in later.
 */
export const EVENTS: RandomEvent[] = [];

/** Returns a random event from the pool, or null when the pool is empty. */
export function rollEvent(): RandomEvent | null {
  if (EVENTS.length === 0) return null;
  const index = Math.floor(Math.random() * EVENTS.length);
  return EVENTS[index];
}
