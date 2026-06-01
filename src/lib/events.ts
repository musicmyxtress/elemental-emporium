export interface GameEvent {
  id: string;
  /** Short title announced first by screen readers. */
  title: string;
  /** Full descriptive text shown in the dialog body. */
  text: string;
}

/**
 * The pool of places and events that can be discovered while exploring.
 * Intentionally left empty — content will be filled in later.
 */
export const EVENTS: GameEvent[] = [];

/** Returns a random event from the pool, or null when the pool is empty. */
export function rollEvent(): GameEvent | null {
  if (EVENTS.length === 0) return null;
  const index = Math.floor(Math.random() * EVENTS.length);
  return EVENTS[index];
}
