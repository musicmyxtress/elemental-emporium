import type { CreatureDef, Gender, PlaceDef, RandomEventDef } from "./gameData";
import { randomGender } from "./gameData";
import type { GameState } from "./useGame";
import { CREATURES, PLACES, RANDOM_EVENTS } from "./seedData";

export type EncounterItem =
  | { kind: "creature"; def: CreatureDef; gender: Gender }
  | { kind: "place"; def: PlaceDef }
  | { kind: "event"; def: RandomEventDef };

function itemRarity(item: EncounterItem): number {
  return item.kind === "event" ? 1 : item.def.rarity;
}

// Encounter chance scales as 1 / rarity, so a rarity-1 creature is ten times
// as likely to appear as a rarity-10 one (and twice as likely as a rarity-2).
// To steepen or flatten that curve later, change this single weight function.
export function encounterWeight(rarity: number): number {
  return 1 / Math.max(1, rarity);
}

// Weighted shuffle (Efraimidis-Spirakis): each item gets a key of
// random^(1/weight); sorting by descending key makes the first item a
// weighted random draw, so the caller can just take pool[0].
function weightedShuffle(items: EncounterItem[]): EncounterItem[] {
  return items
    .map((item) => ({
      item,
      key: Math.pow(Math.random(), 1 / encounterWeight(itemRarity(item))),
    }))
    .sort((a, b) => b.key - a.key)
    .map((x) => x.item);
}

export function buildEncounterPool(state: GameState, now: number): EncounterItem[] {
  const items: EncounterItem[] = [
    ...CREATURES.map((def) => ({ kind: "creature" as const, def, gender: randomGender() })),
    ...PLACES.filter((def) => !state.discoveredPlaces.includes(def.id)).map((def) => ({
      kind: "place" as const,
      def,
    })),
    ...RANDOM_EVENTS.map((def) => ({ kind: "event" as const, def })),
  ];
  const filtered = items.filter((item) => (state.cooldowns[item.def.id] ?? 0) <= now);
  return weightedShuffle(filtered);
}
