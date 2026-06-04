import { useState, useEffect, useCallback, useRef } from "react";
import { getPlace } from "./places";
import { xpToNextLevel, fragmentResourceId, FRAGMENTS_PER_CRYSTAL } from "./elements";

export type Element = "air" | "earth" | "fire" | "water";

export const ALL_ELEMENTS: Element[] = ["air", "earth", "fire", "water"];

export type ElementRecord<T> = Record<Element, T>;

export interface GameState {
  /** The element the player mastered at character creation. */
  element: Element | null;
  /**
   * Legacy passive-fragment counter for the mastered element. New code stores
   * passive fragments directly in `resources[<element>-fragment]`; this field
   * is kept only so older saves can be migrated on load. Always 0 after load.
   */
  fragments: number;

  /** Current level in each element. The mastered element starts at 1; others at 0. */
  elementLevels: ElementRecord<number>;
  /** XP accumulated toward the next level in each element. */
  elementXp: ElementRecord<number>;
  /**
   * Element ids the player has unlocked (i.e. can gain fragments of). All four
   * starter elements are unlocked by default; others (plant, lava, time,
   * light, darkness, ...) must be unlocked later through gameplay.
   */
  unlockedElements: string[];
  /** Ids of places the player has discovered. Places are discovered once. */
  discoveredPlaces: string[];
  /** Map of resource id -> amount the player owns. */
  resources: Record<string, number>;
  /** Map of element id -> number of crystals of that element the player owns. */
  crystals: Record<string, number>;
  /** Map of place id -> timestamp (ms) of the last collection at that place. */

  placeCooldowns: Record<string, number>;
  /**
   * Map of place id -> timestamp (ms) at which the place becomes eligible to
   * appear in exploration again. Set when the player studies a place whose
   * element they have not unlocked.
   */
  shelvedPlaces: Record<string, number>;
  /**
   * Map of creature id -> timestamp (ms) at which the creature becomes
   * eligible to encounter again. Set when the player studies a creature whose
   * element they have not unlocked.
   */
  shelvedCreatures: Record<string, number>;
}


const STORAGE_KEY = "mage-incremental-rpg-v1";

/** Elements unlocked by every newly-created character. */
export const STARTER_UNLOCKED_ELEMENTS: string[] = ["air", "earth", "fire", "water"];


function zeroLevels(): ElementRecord<number> {
  return { air: 0, earth: 0, fire: 0, water: 0 };
}

const INITIAL_STATE: GameState = {
  element: null,
  fragments: 0,
  elementLevels: zeroLevels(),
  elementXp: zeroLevels(),
  unlockedElements: STARTER_UNLOCKED_ELEMENTS,
  discoveredPlaces: [],
  resources: {},
  placeCooldowns: {},
  shelvedPlaces: {},
  shelvedCreatures: {},
};



function isElement(value: unknown): value is Element {
  return (
    value === "air" || value === "earth" || value === "fire" || value === "water"
  );
}

function sanitizeRecord(
  value: unknown,
): ElementRecord<number> {
  const base = zeroLevels();
  if (value && typeof value === "object") {
    for (const key of ALL_ELEMENTS) {
      const v = (value as Record<string, unknown>)[key];
      if (typeof v === "number" && Number.isFinite(v)) base[key] = v;
    }
  }
  return base;
}

function loadState(): GameState {
  if (typeof window === "undefined") return INITIAL_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GameState>;
      if (
        (isElement(parsed.element) || parsed.element === null) &&
        typeof parsed.fragments === "number"
      ) {
        const elementLevels = sanitizeRecord(parsed.elementLevels);
        // Migrate: if a mastered element exists but has no level recorded,
        // grant it level 1 to match the new mechanic.
        if (parsed.element && elementLevels[parsed.element] < 1) {
          elementLevels[parsed.element] = 1;
        }
        return {
          element: parsed.element ?? null,
          fragments: parsed.fragments,
          elementLevels,
          elementXp: sanitizeRecord(parsed.elementXp),
          unlockedElements: Array.isArray(parsed.unlockedElements)
            ? parsed.unlockedElements.filter((x): x is string => typeof x === "string")
            : STARTER_UNLOCKED_ELEMENTS,
          discoveredPlaces: Array.isArray(parsed.discoveredPlaces)
            ? parsed.discoveredPlaces
            : [],
          resources:
            parsed.resources && typeof parsed.resources === "object"
              ? (parsed.resources as Record<string, number>)
              : {},
          placeCooldowns:
            parsed.placeCooldowns && typeof parsed.placeCooldowns === "object"
              ? (parsed.placeCooldowns as Record<string, number>)
              : {},
          shelvedPlaces:
            parsed.shelvedPlaces && typeof parsed.shelvedPlaces === "object"
              ? (parsed.shelvedPlaces as Record<string, number>)
              : {},
          shelvedCreatures:
            parsed.shelvedCreatures && typeof parsed.shelvedCreatures === "object"
              ? (parsed.shelvedCreatures as Record<string, number>)
              : {},
        };

      }
    }
  } catch {
    // ignore corrupt storage

  }
  return INITIAL_STATE;
}

export const FRAGMENT_INTERVAL_MS = 5000;

export interface CollectResult {
  ok: boolean;
  /** Milliseconds remaining on cooldown when ok is false. */
  remainingMs?: number;
  /** Resource label that was collected when ok is true. */
  resourceLabel?: string;
}

/**
 * Applies XP to an element and rolls over levels while the player has enough
 * to advance. The cost to reach level N+1 from N is N * 1000 XP.
 */
function applyXp(
  levels: ElementRecord<number>,
  xp: ElementRecord<number>,
  element: Element,
  amount: number,
): { levels: ElementRecord<number>; xp: ElementRecord<number> } {
  const nextLevels = { ...levels };
  const nextXp = { ...xp };
  nextXp[element] = (nextXp[element] ?? 0) + amount;
  // Level 0 has no advancement cost (untrained); only level >=1 levels up.
  while (
    nextLevels[element] >= 1 &&
    nextXp[element] >= xpToNextLevel(nextLevels[element])
  ) {
    nextXp[element] -= xpToNextLevel(nextLevels[element]);
    nextLevels[element] += 1;
  }
  return { levels: nextLevels, xp: nextXp };
}

export function useGameState() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on the client only (avoids SSR mismatch).
  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  // Persist on change.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore write failures
    }
  }, [state, hydrated]);

  // Passive fragment generation for the mastered element.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!state.element) return;
    intervalRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, fragments: prev.fragments + 1 }));
    }, FRAGMENT_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.element]);

  const chooseElement = useCallback((element: Element) => {
    setState((prev) => {
      const elementLevels = zeroLevels();
      elementLevels[element] = 1;
      return {
        ...prev,
        element,
        elementLevels,
        elementXp: zeroLevels(),
      };
    });
  }, []);

  /** Records a discovered place (no-op if already discovered). */
  const discoverPlace = useCallback((placeId: string) => {
    setState((prev) =>
      prev.discoveredPlaces.includes(placeId)
        ? prev
        : { ...prev, discoveredPlaces: [...prev.discoveredPlaces, placeId] },
    );
  }, []);

  /** Applies a random event's effect to the current state. */
  const applyEvent = useCallback((effect: (s: GameState) => GameState) => {
    setState((prev) => effect(prev));
  }, []);

  /** Grants XP to an element. Levels up as long as XP allows. */
  const gainElementXp = useCallback((element: Element, amount: number) => {
    if (amount <= 0) return;
    setState((prev) => {
      const { levels, xp } = applyXp(
        prev.elementLevels,
        prev.elementXp,
        element,
        amount,
      );
      return { ...prev, elementLevels: levels, elementXp: xp };
    });
  }, []);

  /**
   * Collects the resource from a discovered place, respecting its cooldown.
   * Returns whether the collection succeeded; on failure, includes the
   * milliseconds remaining on the cooldown.
   */
  const collectFromPlace = useCallback((placeId: string): CollectResult => {
    const place = getPlace(placeId);
    if (!place) return { ok: false };

    const now = Date.now();
    const last = state.placeCooldowns[placeId] ?? 0;
    const elapsed = now - last;
    if (place.cooldownMs > 0 && elapsed < place.cooldownMs) {
      return { ok: false, remainingMs: place.cooldownMs - elapsed };
    }

    setState((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        [place.resource.id]: (prev.resources[place.resource.id] ?? 0) + 1,
      },
      placeCooldowns: { ...prev.placeCooldowns, [placeId]: now },
    }));
    return { ok: true, resourceLabel: place.resource.label };
  }, [state.placeCooldowns]);

  /**
   * Shelves a place for `rarity` hours, removing it from the exploration pool
   * during that window. Used when the player studies a place whose element is
   * not yet unlocked; the place is dismissed without being discovered.
   */
  const shelvePlace = useCallback((placeId: string, rarity: number) => {
    const hours = Math.max(1, rarity);
    const until = Date.now() + hours * 60 * 60 * 1000;
    setState((prev) => ({
      ...prev,
      shelvedPlaces: { ...prev.shelvedPlaces, [placeId]: until },
    }));
  }, []);

  /**
   * Shelves a creature for `rarity` hours, removing it from the encounter pool
   * during that window. Used when the player studies a creature whose element
   * is not yet unlocked.
   */
  const shelveCreature = useCallback((creatureId: string, rarity: number) => {
    const hours = Math.max(1, rarity);
    const until = Date.now() + hours * 60 * 60 * 1000;
    setState((prev) => ({
      ...prev,
      shelvedCreatures: { ...prev.shelvedCreatures, [creatureId]: until },
    }));
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    hydrated,
    chooseElement,
    discoverPlace,
    applyEvent,
    collectFromPlace,
    gainElementXp,
    shelvePlace,
    shelveCreature,

    reset,
  };
}

