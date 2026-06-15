import { useState, useEffect, useCallback } from "react";
import {
  fragmentKey,
  FRAGMENTS_PER_CRYSTAL,
  BASE_GATHER,
  BASE_PASSIVE,
  PASSIVE_INTERVAL_MS,
  UPGRADES,
  gatherMultiplier,
  passiveMultiplier,
} from "./gameData";

export interface GameState {
  element: string | null;
  resources: Record<string, number>;
  crystals: Record<string, number>;
  upgrades: string[];
}

const STORAGE_KEY = "elemental-emporium-v2";

function defaultState(): GameState {
  return { element: null, resources: {}, crystals: {}, upgrades: [] };
}

function isRecord(v: unknown): v is Record<string, number> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function loadState(): GameState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const p = JSON.parse(raw) as Partial<GameState>;
    return {
      element: typeof p.element === "string" ? p.element : null,
      resources: isRecord(p.resources) ? (p.resources as Record<string, number>) : {},
      crystals: isRecord(p.crystals) ? (p.crystals as Record<string, number>) : {},
      upgrades: Array.isArray(p.upgrades)
        ? p.upgrades.filter((x): x is string => typeof x === "string")
        : [],
    };
  } catch {
    return defaultState();
  }
}

export function useGame() {
  const [state, setState] = useState<GameState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
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

  // Passive fragment generation
  useEffect(() => {
    if (!state.element) return;
    const element = state.element;
    const id = setInterval(() => {
      setState((prev) => {
        const amount = BASE_PASSIVE * passiveMultiplier(prev.upgrades);
        const key = fragmentKey(element);
        return {
          ...prev,
          resources: { ...prev.resources, [key]: (prev.resources[key] ?? 0) + amount },
        };
      });
    }, PASSIVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [state.element]);

  const chooseElement = useCallback((elementId: string) => {
    setState((prev) => ({ ...prev, element: elementId }));
  }, []);

  /** Returns the number of fragments gathered. */
  const gather = useCallback((): number => {
    let gained = 0;
    setState((prev) => {
      if (!prev.element) return prev;
      gained = BASE_GATHER * gatherMultiplier(prev.upgrades);
      const key = fragmentKey(prev.element);
      return {
        ...prev,
        resources: { ...prev.resources, [key]: (prev.resources[key] ?? 0) + gained },
      };
    });
    return gained;
  }, []);

  /** Returns true if successful. */
  const forgeCrystal = useCallback((elementId: string): boolean => {
    const key = fragmentKey(elementId);
    let ok = false;
    setState((prev) => {
      const have = prev.resources[key] ?? 0;
      if (have < FRAGMENTS_PER_CRYSTAL) return prev;
      ok = true;
      return {
        ...prev,
        resources: { ...prev.resources, [key]: have - FRAGMENTS_PER_CRYSTAL },
        crystals: { ...prev.crystals, [elementId]: (prev.crystals[elementId] ?? 0) + 1 },
      };
    });
    return ok;
  }, []);

  /** Returns true if successful. */
  const buyUpgrade = useCallback((upgradeId: string): boolean => {
    const def = UPGRADES.find((u) => u.id === upgradeId);
    if (!def) return false;
    let ok = false;
    setState((prev) => {
      if (!prev.element) return prev;
      if (prev.upgrades.includes(upgradeId)) return prev;
      if (def.requires && !prev.upgrades.includes(def.requires)) return prev;
      const available = prev.crystals[prev.element] ?? 0;
      if (available < def.crystalCost) return prev;
      ok = true;
      return {
        ...prev,
        crystals: { ...prev.crystals, [prev.element]: available - def.crystalCost },
        upgrades: [...prev.upgrades, upgradeId],
      };
    });
    return ok;
  }, []);

  const reset = useCallback(() => setState(defaultState()), []);

  return { state, hydrated, chooseElement, gather, forgeCrystal, buyUpgrade, reset };
}
