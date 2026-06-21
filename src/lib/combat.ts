import type { CreatureDef, SpellDef } from "./gameData";
import { levelFromXp } from "./gameData";

export interface ActiveDot {
  spellId: string;
  elementId: string;
  remainingRounds: number;
  damagePerTick: number;
}

export function rollCreatureDamage(def: CreatureDef): number {
  const min = def.level;
  const max = def.level * def.rarity;
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function rollSpellDamage(spell: SpellDef, elementXp: Record<string, number>): number {
  const level = levelFromXp(elementXp[spell.elementId] ?? 0);
  const power = spell.power ?? 1;
  const min = level;
  const max = level * power;
  return Math.floor(min + Math.random() * (max - min + 1));
}
