import { useState, useEffect, useCallback, useRef } from "react";
import { getPlace } from "./places";
import { xpToNextLevel, fragmentResourceId, FRAGMENTS_PER_CRYSTAL, LEVEL_CAP } from "./elements";
import type { CreatureGender } from "./creatures";

/** A breeding currently in progress; its parents do not produce while it lasts. */
export interface PendingBreed {
  id: string;
  creatureName: string;
  /** A template id from this species, used to spawn the offspring instances. */
  templateId: string;
  /** Number of male/female pairs locked in this breeding. */
  pairs: number;
  /** Timestamp (ms) at which the breeding resolves. */
  readyAt: number;
  /** Pre-rolled offspring genders, one per pair. */
  offspringGenders: CreatureGender[];
}

/** A resolved breeding awaiting acknowledgement from the player. */
export interface BreedingResult {
  id: string;
  creatureName: string;
  males: number;
  females: number;
}

/** How long, in ms, parents stay locked after a successful breeding. */
export const BREEDING_DURATION_MS = 30 * 60 * 1000;

/** An element id. Starters are air/earth/fire/water; others (plant, lava, etc.)
 * become available once unlocked. */
export type Element = string;

export const ALL_ELEMENTS: Element[] = ["air", "earth", "fire", "water"];

export type ElementRecord<T> = Record<string, T>;

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
  /** Map of place id -> timestamp (ms) at which the place becomes eligible again. */
  shelvedPlaces: Record<string, number>;
  /** Map of creature id -> timestamp (ms) at which the creature becomes eligible again. */
  shelvedCreatures: Record<string, number>;
  /** Ids of buildings the player has constructed in the home base. */
  buildings: string[];
  /** Tamed creature template ids; duplicates allowed (one entry per individual). */
  tamedCreatures: string[];
  /** Element ids the player has encountered during exploration. */
  discoveredElements: string[];
  /** Generation count. 1 for the original mage; +1 each time an apprentice graduates. */
  generation: number;
  /** True once the player has acknowledged the current generation's apprentice arrival. */
  apprenticeAcknowledged: boolean;
  /** Breedings in progress; their parents do not produce while pending. */
  pendingBreedings: PendingBreed[];
  /** Resolved breedings awaiting the player's acknowledgement. */
  breedingResults: BreedingResult[];
}

/** Build costs for player-constructable buildings. */
export const BUILDING_COSTS: Record<string, Record<string, number>> = {
  stable: { wood: 50, stone: 50 },
};

/** The mastered element level at which an apprentice arrives. */
export const APPRENTICE_LEVEL = 20;

const STORAGE_KEY = "mage-incremental-rpg-v1";

/** Elements unlocked by every newly-created character. */
export const STARTER_UNLOCKED_ELEMENTS: string[] = ["air", "earth", "fire", "water"];


function emptyLevels(): ElementRecord<number> {
  return {};
}

const INITIAL_STATE: GameState = {
  element: null,
  fragments: 0,
  elementLevels: emptyLevels(),
  elementXp: emptyLevels(),
  unlockedElements: STARTER_UNLOCKED_ELEMENTS,
  discoveredPlaces: [],
  resources: {},
  crystals: {},
  placeCooldowns: {},
  shelvedPlaces: {},
  shelvedCreatures: {},
  buildings: [],
  tamedCreatures: [],
  discoveredElements: STARTER_UNLOCKED_ELEMENTS,
  generation: 1,
  apprenticeAcknowledged: false,
  pendingBreedings: [],
  breedingResults: [],
};


function sanitizeRecord(value: unknown): ElementRecord<number> {
  const base: ElementRecord<number> = {};
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v)) base[k] = v;
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
      const element = typeof parsed.element === "string" ? parsed.element : null;
      const elementLevels = sanitizeRecord(parsed.elementLevels);
      if (element && (elementLevels[element] ?? 0) < 1) {
        elementLevels[element] = 1;
      }
      const baseResources: Record<string, number> =
        parsed.resources && typeof parsed.resources === "object"
          ? { ...(parsed.resources as Record<string, number>) }
          : {};
      if (element && typeof parsed.fragments === "number" && parsed.fragments > 0) {
        const key = fragmentResourceId(element);
        baseResources[key] = (baseResources[key] ?? 0) + parsed.fragments;
      }
      return {
        element,
        fragments: 0,
        elementLevels,
        elementXp: sanitizeRecord(parsed.elementXp),
        unlockedElements: Array.isArray(parsed.unlockedElements)
          ? parsed.unlockedElements.filter((x): x is string => typeof x === "string")
          : STARTER_UNLOCKED_ELEMENTS,
        discoveredPlaces: Array.isArray(parsed.discoveredPlaces)
          ? parsed.discoveredPlaces
          : [],
        resources: baseResources,
        crystals:
          parsed.crystals && typeof parsed.crystals === "object"
            ? (parsed.crystals as Record<string, number>)
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
        buildings: Array.isArray(parsed.buildings)
          ? parsed.buildings.filter((x): x is string => typeof x === "string")
          : [],
        tamedCreatures: Array.isArray(parsed.tamedCreatures)
          ? parsed.tamedCreatures.filter((x): x is string => typeof x === "string")
          : [],
        discoveredElements: Array.isArray(parsed.discoveredElements)
          ? parsed.discoveredElements.filter((x): x is string => typeof x === "string")
          : STARTER_UNLOCKED_ELEMENTS,
        generation:
          typeof parsed.generation === "number" && parsed.generation >= 1
            ? parsed.generation
            : 1,
        apprenticeAcknowledged: Boolean(parsed.apprenticeAcknowledged),
        pendingBreedings: Array.isArray(parsed.pendingBreedings)
          ? (parsed.pendingBreedings as PendingBreed[]).filter(
              (p) =>
                p &&
                typeof p.id === "string" &&
                typeof p.creatureName === "string" &&
                typeof p.templateId === "string" &&
                typeof p.pairs === "number" &&
                typeof p.readyAt === "number" &&
                Array.isArray(p.offspringGenders),
            )
          : [],
        breedingResults: Array.isArray(parsed.breedingResults)
          ? (parsed.breedingResults as BreedingResult[]).filter(
              (r) =>
                r &&
                typeof r.id === "string" &&
                typeof r.creatureName === "string" &&
                typeof r.males === "number" &&
                typeof r.females === "number",
            )
          : [],
      };
    }
  } catch {
    // ignore corrupt storage
  }
  return INITIAL_STATE;
}

export const FRAGMENT_INTERVAL_MS = 5000;

export interface CollectResult {
  ok: boolean;
  remainingMs?: number;
  resourceLabel?: string;
}

/**
 * Applies XP to an element and rolls over levels while the player has enough
 * to advance. Caps at LEVEL_CAP; XP past the cap is discarded.
 */
function applyXp(
  levels: ElementRecord<number>,
  xp: ElementRecord<number>,
  element: Element,
  amount: number,
): { levels: ElementRecord<number>; xp: ElementRecord<number> } {
  const nextLevels = { ...levels };
  const nextXp = { ...xp };
  const cur = nextLevels[element] ?? 0;
  if (cur >= LEVEL_CAP) {
    nextXp[element] = 0;
    return { levels: nextLevels, xp: nextXp };
  }
  nextXp[element] = (nextXp[element] ?? 0) + amount;
  while (
    (nextLevels[element] ?? 0) >= 1 &&
    (nextLevels[element] ?? 0) < LEVEL_CAP &&
    (nextXp[element] ?? 0) >= xpToNextLevel(nextLevels[element] ?? 0)
  ) {
    nextXp[element] = (nextXp[element] ?? 0) - xpToNextLevel(nextLevels[element] ?? 0);
    nextLevels[element] = (nextLevels[element] ?? 0) + 1;
  }
  if ((nextLevels[element] ?? 0) >= LEVEL_CAP) {
    nextLevels[element] = LEVEL_CAP;
    nextXp[element] = 0;
  }
  return { levels: nextLevels, xp: nextXp };
}

export function useGameState() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state, hydrated]);

  // Passive fragment generation for the mastered element.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!state.element) return;
    const masteredElement = state.element;
    intervalRef.current = setInterval(() => {
      setState((prev) => {
        const key = fragmentResourceId(masteredElement);
        return {
          ...prev,
          resources: { ...prev.resources, [key]: (prev.resources[key] ?? 0) + 1 },
        };
      });
    }, FRAGMENT_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.element]);

  // Resolve pending breedings whose timer has elapsed.
  useEffect(() => {
    if (!hydrated) return;
    const tick = () => {
      setState((prev) => {
        if (prev.pendingBreedings.length === 0) return prev;
        const now = Date.now();
        const ripe = prev.pendingBreedings.filter((p) => p.readyAt <= now);
        if (ripe.length === 0) return prev;
        const remaining = prev.pendingBreedings.filter((p) => p.readyAt > now);
        const newTames: string[] = [];
        const newResults: BreedingResult[] = [];
        for (const p of ripe) {
          const males = p.offspringGenders.filter((g) => g === "male").length;
          const females = p.offspringGenders.length - males;
          for (let i = 0; i < p.offspringGenders.length; i++) newTames.push(p.templateId);
          newResults.push({
            id: p.id,
            creatureName: p.creatureName,
            males,
            females,
          });
        }
        return {
          ...prev,
          pendingBreedings: remaining,
          tamedCreatures: [...prev.tamedCreatures, ...newTames],
          breedingResults: [...prev.breedingResults, ...newResults],
        };
      });
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [hydrated]);



  const chooseElement = useCallback((element: Element) => {
    setState((prev) => {
      const elementLevels: ElementRecord<number> = { ...prev.elementLevels };
      elementLevels[element] = Math.max(1, elementLevels[element] ?? 0);
      const elementXp: ElementRecord<number> = { ...prev.elementXp };
      if ((elementXp[element] ?? 0) === 0) elementXp[element] = 0;
      const unlockedElements = prev.unlockedElements.includes(element)
        ? prev.unlockedElements
        : [...prev.unlockedElements, element];
      const discoveredElements = prev.discoveredElements.includes(element)
        ? prev.discoveredElements
        : [...prev.discoveredElements, element];
      return {
        ...prev,
        element,
        elementLevels,
        elementXp,
        unlockedElements,
        discoveredElements,
        apprenticeAcknowledged: false,
      };
    });
  }, []);

  const discoverPlace = useCallback((placeId: string) => {
    setState((prev) =>
      prev.discoveredPlaces.includes(placeId)
        ? prev
        : { ...prev, discoveredPlaces: [...prev.discoveredPlaces, placeId] },
    );
  }, []);

  const applyEvent = useCallback((effect: (s: GameState) => GameState) => {
    setState((prev) => effect(prev));
  }, []);

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

  const collectFromPlace = useCallback((placeId: string): CollectResult => {
    const place = getPlace(placeId);
    if (!place) return { ok: false };

    const now = Date.now();
    const last = state.placeCooldowns[placeId] ?? 0;
    const elapsed = now - last;
    if (place.cooldownMs > 0 && elapsed < place.cooldownMs) {
      return { ok: false, remainingMs: place.cooldownMs - elapsed };
    }

    const amount = place.resource.element ? place.rarity * 10 : 1;
    setState((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        [place.resource.id]: (prev.resources[place.resource.id] ?? 0) + amount,
      },
      placeCooldowns: { ...prev.placeCooldowns, [placeId]: now },
    }));
    return { ok: true, resourceLabel: `${amount} ${place.resource.label}` };
  }, [state.placeCooldowns]);

  const shelvePlace = useCallback((placeId: string, rarity: number) => {
    const hours = Math.max(1, rarity);
    const until = Date.now() + hours * 60 * 60 * 1000;
    setState((prev) => ({
      ...prev,
      shelvedPlaces: { ...prev.shelvedPlaces, [placeId]: until },
    }));
  }, []);

  const shelveCreature = useCallback((creatureId: string, rarity: number) => {
    const hours = Math.max(1, rarity);
    const until = Date.now() + hours * 60 * 60 * 1000;
    setState((prev) => ({
      ...prev,
      shelvedCreatures: { ...prev.shelvedCreatures, [creatureId]: until },
    }));
  }, []);

  const unlockElement = useCallback((elementId: string) => {
    setState((prev) => {
      const alreadyUnlocked = prev.unlockedElements.includes(elementId);
      const alreadyDiscovered = prev.discoveredElements.includes(elementId);
      if (alreadyUnlocked && alreadyDiscovered) return prev;
      return {
        ...prev,
        unlockedElements: alreadyUnlocked
          ? prev.unlockedElements
          : [...prev.unlockedElements, elementId],
        discoveredElements: alreadyDiscovered
          ? prev.discoveredElements
          : [...prev.discoveredElements, elementId],
      };
    });
  }, []);

  const discoverElement = useCallback((elementId: string) => {
    setState((prev) => {
      if (prev.discoveredElements.includes(elementId)) return prev;
      return {
        ...prev,
        discoveredElements: [...prev.discoveredElements, elementId],
      };
    });
  }, []);

  const convertFragmentsToCrystal = useCallback((elementId: string): boolean => {
    const key = fragmentResourceId(elementId);
    let ok = false;
    setState((prev) => {
      const have = prev.resources[key] ?? 0;
      if (have < FRAGMENTS_PER_CRYSTAL) return prev;
      ok = true;
      return {
        ...prev,
        resources: { ...prev.resources, [key]: have - FRAGMENTS_PER_CRYSTAL },
        crystals: {
          ...prev.crystals,
          [elementId]: (prev.crystals[elementId] ?? 0) + 1,
        },
      };
    });
    return ok;
  }, []);

  const spendCrystals = useCallback((elementId: string, amount: number): boolean => {
    if (amount <= 0) return true;
    let ok = false;
    setState((prev) => {
      const have = prev.crystals[elementId] ?? 0;
      if (have < amount) return prev;
      ok = true;
      return {
        ...prev,
        crystals: { ...prev.crystals, [elementId]: have - amount },
      };
    });
    return ok;
  }, []);

  const tameCreature = useCallback((creatureId: string) => {
    setState((prev) => ({
      ...prev,
      tamedCreatures: [...prev.tamedCreatures, creatureId],
    }));
  }, []);

  const buildBuilding = useCallback((buildingId: string): boolean => {
    const costs = BUILDING_COSTS[buildingId];
    if (!costs) return false;
    let ok = false;
    setState((prev) => {
      if (prev.buildings.includes(buildingId)) return prev;
      for (const [res, amount] of Object.entries(costs)) {
        if ((prev.resources[res] ?? 0) < amount) return prev;
      }
      ok = true;
      const nextResources = { ...prev.resources };
      for (const [res, amount] of Object.entries(costs)) {
        nextResources[res] = (nextResources[res] ?? 0) - amount;
      }
      return {
        ...prev,
        resources: nextResources,
        buildings: [...prev.buildings, buildingId],
      };
    });
    return ok;
  }, []);

  /** Marks the apprentice arrival as acknowledged (dismisses the welcome popup). */
  const acknowledgeApprentice = useCallback(() => {
    setState((prev) =>
      prev.apprenticeAcknowledged ? prev : { ...prev, apprenticeAcknowledged: true },
    );
  }, []);

  /**
   * Graduates the apprentice: hands them the chosen creature plus
   * (masteredElement level)*10 fragments of the mastered element, then
   * switches POV to the apprentice. Unlocks (elements, places) carry over;
   * fragments, crystals, buildings, other creatures, and element levels do not.
   * Returns true on success.
   */
  const graduateApprentice = useCallback((creatureId: string): boolean => {
    let ok = false;
    setState((prev) => {
      if (!prev.element) return prev;
      const masteredLevel = prev.elementLevels[prev.element] ?? 0;
      if (masteredLevel < APPRENTICE_LEVEL) return prev;
      // Remove one instance of the chosen creature from the player's tames.
      const idx = prev.tamedCreatures.indexOf(creatureId);
      if (idx < 0) return prev;
      const fragmentKey = fragmentResourceId(prev.element);
      const fragmentGift = masteredLevel * 10;
      ok = true;
      return {
        ...prev,
        element: null,
        elementLevels: {},
        elementXp: {},
        resources: { [fragmentKey]: fragmentGift },
        crystals: {},
        placeCooldowns: {},
        shelvedPlaces: {},
        shelvedCreatures: {},
        buildings: [],
        tamedCreatures: [creatureId],
        // unlockedElements, discoveredElements, discoveredPlaces persist.
        generation: prev.generation + 1,
        apprenticeAcknowledged: false,
        pendingBreedings: [],
        breedingResults: [],
      };
    });
    return ok;
  }, []);

  /**
   * Attempts to breed all male/female pairs of a species in the stable.
   * Success chance = max(0, min(100, 81 - 6 * rarity))%. On success the
   * parents are locked for BREEDING_DURATION_MS and offspring genders are
   * pre-rolled. Returns the resulting state for the UI to announce.
   */
  const startBreeding = useCallback(
    (
      creatureName: string,
      templateId: string,
      pairs: number,
      rarity: number,
    ): { ok: boolean; success: boolean; chance: number; pairs: number } => {
      if (pairs <= 0) return { ok: false, success: false, chance: 0, pairs: 0 };
      const chance = Math.max(0, Math.min(100, 81 - 6 * Math.max(0, rarity)));
      const success = Math.random() * 100 < chance;
      if (!success) {
        return { ok: true, success: false, chance, pairs };
      }
      const offspringGenders: CreatureGender[] = Array.from({ length: pairs }, () =>
        Math.random() < 0.5 ? "male" : "female",
      );
      const entry: PendingBreed = {
        id: `breed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        creatureName,
        templateId,
        pairs,
        readyAt: Date.now() + BREEDING_DURATION_MS,
        offspringGenders,
      };
      setState((prev) => ({
        ...prev,
        pendingBreedings: [...prev.pendingBreedings, entry],
      }));
      return { ok: true, success: true, chance, pairs };
    },
    [],
  );

  const dismissBreedingResult = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      breedingResults: prev.breedingResults.filter((r) => r.id !== id),
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
    unlockElement,
    discoverElement,
    convertFragmentsToCrystal,
    spendCrystals,
    tameCreature,
    buildBuilding,
    acknowledgeApprentice,
    graduateApprentice,
    startBreeding,
    dismissBreedingResult,
    reset,
  };
}
