import type { CreatureDef, PlaceDef, RandomEventDef } from "./gameData";
import type { GameState } from "./useGame";
import { CREATURES, PLACES, RANDOM_EVENTS } from "./seedData";

export type EncounterItem =
  | { kind: "creature"; def: CreatureDef }
  | { kind: "place"; def: PlaceDef }
  | { kind: "event"; def: RandomEventDef };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildEncounterPool(state: GameState, now: number): EncounterItem[] {
  const items: EncounterItem[] = [
    ...CREATURES.map((def) => ({ kind: "creature" as const, def })),
    ...PLACES.map((def) => ({ kind: "place" as const, def })),
    ...RANDOM_EVENTS.map((def) => ({ kind: "event" as const, def })),
  ];
  const filtered = items.filter((item) => (state.cooldowns[item.def.id] ?? 0) <= now);
  return shuffle(filtered);
}
