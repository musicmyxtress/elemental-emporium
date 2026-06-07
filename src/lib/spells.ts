/**
 * Offensive and defensive spells the player can cast in combat. Specific
 * spells (with names, costs, damage ranges, action text, and effects) are
 * listed in SPELLS. The combat UI lists every unlocked spell.
 */
export interface Spell {
  id: string;
  /** Display name. */
  name: string;
  /** Element this spell belongs to. Must be one the player has unlocked. */
  element: string;
  /** Minimum level required in `element` for this spell to be unlocked. */
  level: number;
  /**
   * Fragment cost, paid from that element's fragment pool when cast. May be
   * 0 for a free starter spell.
   */
  cost: number;
  /** Narrative line announced when the spell is cast. */
  actionText: string;
  /** Inclusive minimum damage roll (or multiplier when damageScaleElement is set). */
  damageMin: number;
  /** Inclusive maximum damage roll (or multiplier when damageScaleElement is set). */
  damageMax: number;
  /** If set, damageMin and damageMax are multiplied by the player's level in this element. */
  damageScaleElement?: string;
  type: "offensive" | "defensive";
  /** Duration in ms for defensive buffs. */
  durationMs?: number;
  /** Block chance percent per level in the spell's element. Only for defensive spells. */
  blockChancePerLevel?: number;
}

export const SPELLS: Spell[] = [
  {
    id: "flaming-dart",
    name: "Flaming Dart",
    element: "fire",
    level: 1,
    cost: 3,
    actionText:
      "creates a tiny, flickering dart of fire which you hurl at your enemy.",
    damageMin: 1,
    damageMax: 2,
    damageScaleElement: "fire",
    type: "offensive",
  },
  {
    id: "water-wall",
    name: "Water Wall",
    element: "water",
    level: 1,
    cost: 5,
    actionText:
      "A shimmering wall of water rises before you, ready to deflect blows.",
    damageMin: 0,
    damageMax: 0,
    type: "defensive",
    durationMs: 5 * 60 * 1000,
    blockChancePerLevel: 2,
  },
];

export type CastResult =
  | { spell: Spell; damage: number }
  | { spell: Spell; buffApplied: true };

/** Returns every spell whose element is unlocked and whose level is met. */
export function getUnlockedSpells(
  elementLevels: Record<string, number>,
  unlockedElements: string[],
): Spell[] {
  return SPELLS.filter(
    (s) =>
      unlockedElements.includes(s.element) &&
      (elementLevels[s.element] ?? 0) >= s.level,
  );
}

/** Computes the actual damage range for a spell given current element levels. */
export function getSpellDamageRange(
  spell: Spell,
  elementLevels: Record<string, number>,
): { min: number; max: number } {
  const scale = spell.damageScaleElement
    ? Math.max(1, elementLevels[spell.damageScaleElement] ?? 0)
    : 1;
  const min = spell.damageMin * scale;
  const max = spell.damageMax * scale;
  return { min: Math.max(0, min), max: Math.max(min, max) };
}

/** Rolls a damage value within a spell's inclusive range, scaled by element level if configured. */
export function rollSpellDamage(
  spell: Spell,
  elementLevels: Record<string, number>,
): number {
  const { min, max } = getSpellDamageRange(spell, elementLevels);
  if (max < min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
