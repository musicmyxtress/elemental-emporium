/**
 * Offensive spells the player can cast in combat. The list is intentionally
 * empty for now — specific spells (with names, costs, damage ranges and
 * action text) will be filled in later. The combat UI lists every unlocked
 * spell and falls back to a helpful message when none are unlocked.
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
  /** Inclusive minimum damage roll. */
  damageMin: number;
  /** Inclusive maximum damage roll. */
  damageMax: number;
}

export const SPELLS: Spell[] = [];

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

/** Rolls a damage value within a spell's inclusive range. */
export function rollSpellDamage(spell: Spell): number {
  const min = Math.min(spell.damageMin, spell.damageMax);
  const max = Math.max(spell.damageMin, spell.damageMax);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
