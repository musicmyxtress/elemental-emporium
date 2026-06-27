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

// Encounter chance scales as 1 / rarity^2 — a curve steep enough that higher
// rarities feel genuinely scarce: a rarity-1 is 4x as likely as a rarity-2,
// 9x a rarity-3, and 100x a rarity-10. Change the exponent to make the whole
// curve steeper (higher) or flatter (lower).
export function encounterWeight(rarity: number): number {
  const r = Math.max(1, rarity);
  return 1 / (r * r);
}

// Building-material places (wood, stone) get an outsized weight so they turn up
// almost immediately. They drop out of the pool once discovered, so this just
// makes the basics trivially easy to find without touching the creature curve.
const MATERIAL_WEIGHT = 50;

function itemWeight(item: EncounterItem): number {
  if (item.kind === "place" && item.def.kind !== "elemental") {
    return MATERIAL_WEIGHT;
  }
  return encounterWeight(itemRarity(item));
}

// Weighted shuffle (Efraimidis-Spirakis): each item gets a key of
// random^(1/weight); sorting by descending key makes the first item a
// weighted random draw, so the caller can just take pool[0].
function weightedShuffle(items: EncounterItem[]): EncounterItem[] {
  return items
    .map((item) => ({
      item,
      key: Math.pow(Math.random(), 1 / itemWeight(item)),
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
