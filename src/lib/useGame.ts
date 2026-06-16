import { useState, useEffect, useCallback } from "react";
import {
  fragmentKey,
  FRAGMENTS_PER_CRYSTAL,
  BASE_PASSIVE,
  PASSIVE_INTERVAL_MS,
  levelFromXp,
  type TamedCreature,
  type EventEffect,
} from "./gameData";
import { CREATURES, PLACES } from "./seedData";

export interface GameState {
  element: string | null;
  resources: Record<string, number>;
  crystals: Record<string, number>;
  unlockedElements: string[];
  elementXp: Record<string, number>;
  builtStable: boolean;
  builtMenagerie: boolean;
  stable: TamedCreature[];
  menagerie: TamedCreature[];
  discoveredPlaces: string[];
  cooldowns: Record<string, number>;
  hasApprentice: boolean;
  generationNumber: number;
  generationStartElements: string[];
}

const STORAGE_KEY = "elemental-emporium-v3";
const BASE_ELEMENTS = ["fire", "water", "earth", "air"];

function defaultState(): GameState {
  return {
    element: null,
    resources: {},
    crystals: {},
    unlockedElements: [...BASE_ELEMENTS],
    elementXp: {},
    builtStable: false,
    builtMenagerie: false,
    stable: [],
    menagerie: [],
    discoveredPlaces: [],
    cooldowns: {},
    hasApprentice: false,
    generationNumber: 1,
    generationStartElements: [...BASE_ELEMENTS],
  };
}

function isRecord(v: unknown): v is Record<string, number> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isTamedArray(v: unknown): v is TamedCreature[] {
  if (!Array.isArray(v)) return false;
  return v.every(
    (x) =>
      x !== null &&
      typeof x === "object" &&
      typeof (x as TamedCreature).instanceId === "string" &&
      typeof (x as TamedCreature).defId === "string" &&
      typeof (x as TamedCreature).tamedAt === "number",
  );
}

function loadState(): GameState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const p = JSON.parse(raw) as Record<string, unknown>;
    const d = defaultState();
    return {
      element: typeof p.element === "string" ? p.element : null,
      resources: isRecord(p.resources) ? (p.resources as Record<string, number>) : {},
      crystals: isRecord(p.crystals) ? (p.crystals as Record<string, number>) : {},
      unlockedElements: Array.isArray(p.unlockedElements)
        ? p.unlockedElements.filter((x): x is string => typeof x === "string")
        : d.unlockedElements,
      elementXp: isRecord(p.elementXp) ? (p.elementXp as Record<string, number>) : {},
      builtStable: typeof p.builtStable === "boolean" ? p.builtStable : false,
      builtMenagerie: typeof p.builtMenagerie === "boolean" ? p.builtMenagerie : false,
      stable: isTamedArray(p.stable) ? p.stable : [],
      menagerie: isTamedArray(p.menagerie) ? p.menagerie : [],
      discoveredPlaces: Array.isArray(p.discoveredPlaces)
        ? p.discoveredPlaces.filter((x): x is string => typeof x === "string")
        : [],
      cooldowns: isRecord(p.cooldowns) ? (p.cooldowns as Record<string, number>) : {},
      hasApprentice: typeof p.hasApprentice === "boolean" ? p.hasApprentice : false,
      generationNumber: typeof p.generationNumber === "number" ? p.generationNumber : 1,
      generationStartElements: Array.isArray(p.generationStartElements)
        ? p.generationStartElements.filter((x): x is string => typeof x === "string")
        : d.generationStartElements,
    };
  } catch {
    return defaultState();
  }
}

function applyStudyCooldowns(
  cooldowns: Record<string, number>,
  unlockedElements: string[],
  now: number,
): { cooldowns: Record<string, number>; unlockedElements: string[] } | null {
  let changed = false;
  const newCooldowns = { ...cooldowns };
  const newUnlocked = [...unlockedElements];
  for (const key of Object.keys(newCooldowns)) {
    if (key.startsWith("study:") && newCooldowns[key] <= now) {
      const elementId = key.slice(6);
      if (!newUnlocked.includes(elementId)) {
        newUnlocked.push(elementId);
        changed = true;
      }
      delete newCooldowns[key];
      changed = true;
    }
  }
  return changed ? { cooldowns: newCooldowns, unlockedElements: newUnlocked } : null;
}

export function useGame() {
  const [state, setState] = useState<GameState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadState();
    const update = applyStudyCooldowns(loaded.cooldowns, loaded.unlockedElements, Date.now());
    setState(update ? { ...loaded, ...update } : loaded);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  }, [state, hydrated]);

  useEffect(() => {
    if (!state.element) return;
    const masteryElement = state.element;
    const id = setInterval(() => {
      setState((prev) => {
        const now = Date.now();
        const newResources = { ...prev.resources };

        const baseAmount = BASE_PASSIVE;
        const masteryKey = fragmentKey(masteryElement);
        newResources[masteryKey] = (newResources[masteryKey] ?? 0) + baseAmount;

        for (const tamed of prev.stable) {
          const def = CREATURES.find((c) => c.id === tamed.defId);
          if (!def) continue;
          const output = def.rarity * (def.elementId === masteryElement ? 2 : 1);
          const key = fragmentKey(def.elementId);
          newResources[key] = (newResources[key] ?? 0) + output;
        }

        for (const tamed of prev.menagerie) {
          const def = CREATURES.find((c) => c.id === tamed.defId);
          if (!def?.consumedElementId || !def.producedElementId) continue;
          const consumeKey = fragmentKey(def.consumedElementId);
          const produceKey = fragmentKey(def.producedElementId);
          const consumed = def.rarity;
          const produced = def.rarity * 3 * (def.producedElementId === masteryElement ? 2 : 1);
          if ((newResources[consumeKey] ?? 0) >= consumed) {
            newResources[consumeKey] -= consumed;
            newResources[produceKey] = (newResources[produceKey] ?? 0) + produced;
          }
        }

        const cooldownUpdate = applyStudyCooldowns(prev.cooldowns, prev.unlockedElements, now);
        return { ...prev, resources: newResources, ...(cooldownUpdate ?? {}) };
      });
    }, PASSIVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [state.element]);

  const chooseElement = useCallback((elementId: string) => {
    setState((prev) => ({ ...prev, element: elementId }));
  }, []);

  const forgeCrystal = useCallback((elementId: string): boolean => {
    const key = fragmentKey(elementId);
    let ok = false;
    setState((prev) => {
      const have = prev.resources[key] ?? 0;
      if (have < FRAGMENTS_PER_CRYSTAL) return prev;
      ok = true;
      const level = levelFromXp(prev.elementXp[elementId] ?? 0);
      const xpGained = 100 * level;
      const newXp = { ...prev.elementXp, [elementId]: (prev.elementXp[elementId] ?? 0) + xpGained };
      const masteryLevel = prev.element ? levelFromXp(newXp[prev.element] ?? 0) : 0;
      return {
        ...prev,
        resources: { ...prev.resources, [key]: have - FRAGMENTS_PER_CRYSTAL },
        crystals: { ...prev.crystals, [elementId]: (prev.crystals[elementId] ?? 0) + 1 },
        elementXp: newXp,
        hasApprentice: prev.hasApprentice || (prev.element !== null && masteryLevel >= 20),
      };
    });
    return ok;
  }, []);

  const fightCreature = useCallback((defId: string): { fragmentsGained: number; xpGained: number } => {
    const def = CREATURES.find((c) => c.id === defId);
    if (!def) return { fragmentsGained: 0, xpGained: 0 };
    const amount = def.level + def.rarity * 5;
    const key = fragmentKey(def.elementId);
    setState((prev) => {
      const newXp = { ...prev.elementXp, [def.elementId]: (prev.elementXp[def.elementId] ?? 0) + amount };
      const masteryLevel = prev.element ? levelFromXp(newXp[prev.element] ?? 0) : 0;
      return {
        ...prev,
        resources: { ...prev.resources, [key]: (prev.resources[key] ?? 0) + amount },
        elementXp: newXp,
        hasApprentice: prev.hasApprentice || (prev.element !== null && masteryLevel >= 20),
      };
    });
    return { fragmentsGained: amount, xpGained: amount };
  }, []);

  const tameCreature = useCallback((defId: string): boolean => {
    const def = CREATURES.find((c) => c.id === defId);
    if (!def) return false;
    let ok = false;
    setState((prev) => {
      if (def.isMagical ? !prev.builtMenagerie : !prev.builtStable) return prev;
      ok = true;
      const tamed: TamedCreature = { instanceId: crypto.randomUUID(), defId, tamedAt: Date.now() };
      const amount = def.level + def.rarity * 5;
      const newXp = { ...prev.elementXp, [def.elementId]: (prev.elementXp[def.elementId] ?? 0) + amount };
      const masteryLevel = prev.element ? levelFromXp(newXp[prev.element] ?? 0) : 0;
      return {
        ...prev,
        stable: def.isMagical ? prev.stable : [...prev.stable, tamed],
        menagerie: def.isMagical ? [...prev.menagerie, tamed] : prev.menagerie,
        elementXp: newXp,
        hasApprentice: prev.hasApprentice || (prev.element !== null && masteryLevel >= 20),
      };
    });
    return ok;
  }, []);

  const collectPlace = useCallback((placeId: string): { gained: number; resource: string } => {
    const def = PLACES.find((p) => p.id === placeId);
    if (!def) return { gained: 0, resource: "" };
    let result = { gained: 0, resource: "" };
    setState((prev) => {
      const now = Date.now();
      if (def.kind === "elemental" && (prev.cooldowns[placeId] ?? 0) > now) return prev;
      const newResources = { ...prev.resources };
      const newCooldowns = { ...prev.cooldowns };
      if (def.kind === "forest") {
        newResources["wood"] = (newResources["wood"] ?? 0) + 1;
        result = { gained: 1, resource: "wood" };
      } else if (def.kind === "stone_mine") {
        newResources["stone"] = (newResources["stone"] ?? 0) + 1;
        result = { gained: 1, resource: "stone" };
      } else {
        const gained = def.rarity * 10;
        const key = fragmentKey(def.elementId!);
        newResources[key] = (newResources[key] ?? 0) + gained;
        newCooldowns[placeId] = now + def.rarity * 2 * 1000;
        result = { gained, resource: `${def.elementId} fragments` };
      }
      const newDiscovered = prev.discoveredPlaces.includes(placeId)
        ? prev.discoveredPlaces
        : [...prev.discoveredPlaces, placeId];
      return { ...prev, resources: newResources, cooldowns: newCooldowns, discoveredPlaces: newDiscovered };
    });
    return result;
  }, []);

  const resolveEvent = useCallback((effect: EventEffect) => {
    setState((prev) => {
      if (effect.type === "nothing") return prev;
      if (effect.type === "fragments") {
        const key = fragmentKey(effect.elementId);
        return { ...prev, resources: { ...prev.resources, [key]: (prev.resources[key] ?? 0) + effect.amount } };
      }
      if (effect.type === "xp") {
        const newXp = { ...prev.elementXp, [effect.elementId]: (prev.elementXp[effect.elementId] ?? 0) + effect.amount };
        const masteryLevel = prev.element ? levelFromXp(newXp[prev.element] ?? 0) : 0;
        return { ...prev, elementXp: newXp, hasApprentice: prev.hasApprentice || (prev.element !== null && masteryLevel >= 20) };
      }
      return prev;
    });
  }, []);

  const studyEncounter = useCallback((itemId: string, elementId: string) => {
    const expiry = Date.now() + 3_600_000;
    setState((prev) => ({
      ...prev,
      cooldowns: { ...prev.cooldowns, [itemId]: expiry, [`study:${elementId}`]: expiry },
    }));
  }, []);

  const buildStable = useCallback((): boolean => {
    let ok = false;
    setState((prev) => {
      if (prev.builtStable) return prev;
      if ((prev.resources["wood"] ?? 0) < 50 || (prev.resources["stone"] ?? 0) < 50) return prev;
      ok = true;
      return {
        ...prev,
        builtStable: true,
        resources: { ...prev.resources, wood: (prev.resources["wood"] ?? 0) - 50, stone: (prev.resources["stone"] ?? 0) - 50 },
      };
    });
    return ok;
  }, []);

  const buildMenagerie = useCallback((): boolean => {
    let ok = false;
    setState((prev) => {
      if (prev.builtMenagerie) return prev;
      if ((prev.resources["wood"] ?? 0) < 200 || (prev.resources["stone"] ?? 0) < 200) return prev;
      for (const elId of prev.generationStartElements) {
        if ((prev.crystals[elId] ?? 0) < 2) return prev;
      }
      ok = true;
      const newCrystals = { ...prev.crystals };
      for (const elId of prev.generationStartElements) {
        newCrystals[elId] = (newCrystals[elId] ?? 0) - 2;
      }
      return {
        ...prev,
        builtMenagerie: true,
        resources: { ...prev.resources, wood: (prev.resources["wood"] ?? 0) - 200, stone: (prev.resources["stone"] ?? 0) - 200 },
        crystals: newCrystals,
      };
    });
    return ok;
  }, []);

  const graduate = useCallback((giftedCreatureDefId: string | null) => {
    setState((prev) => {
      if (!prev.element) return prev;
      const masteryXp = prev.elementXp[prev.element] ?? 0;
      const masteryLevel = levelFromXp(masteryXp);
      const allowance = masteryLevel * 5;
      const masteryKey = fragmentKey(prev.element);

      let newStable: TamedCreature[] = [];
      let newMenagerie: TamedCreature[] = [];
      let giftedBuiltStable = false;
      let giftedBuiltMenagerie = false;

      if (giftedCreatureDefId) {
        const allCreatures = [...prev.stable, ...prev.menagerie];
        const gifted = allCreatures.find((c) => c.defId === giftedCreatureDefId);
        const def = CREATURES.find((c) => c.id === giftedCreatureDefId);
        if (gifted && def) {
          if (def.isMagical) {
            newMenagerie = [gifted];
            giftedBuiltMenagerie = true;
          } else {
            newStable = [gifted];
            giftedBuiltStable = true;
          }
        }
      }

      return {
        element: null,
        resources: { [masteryKey]: allowance },
        crystals: {},
        unlockedElements: [...prev.unlockedElements],
        elementXp: {},
        builtStable: giftedBuiltStable,
        builtMenagerie: giftedBuiltMenagerie,
        stable: newStable,
        menagerie: newMenagerie,
        discoveredPlaces: [],
        cooldowns: {},
        hasApprentice: false,
        generationNumber: prev.generationNumber + 1,
        generationStartElements: [...prev.unlockedElements],
      };
    });
  }, []);

  const reset = useCallback(() => setState(defaultState()), []);

  return {
    state,
    hydrated,
    chooseElement,
    forgeCrystal,
    fightCreature,
    tameCreature,
    collectPlace,
    resolveEvent,
    studyEncounter,
    buildStable,
    buildMenagerie,
    graduate,
    reset,
  };
}
