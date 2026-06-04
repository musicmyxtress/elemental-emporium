import { useState, useEffect, useCallback, useRef } from "react";
import { getPlace } from "./places";

export type Element = "air" | "water" | "fire";

export interface GameState {
  element: Element | null;
  fragments: number;
  /** Ids of places the player has discovered. Places are discovered once. */
  discoveredPlaces: string[];
  /** Map of resource id -> amount the player owns. */
  resources: Record<string, number>;
  /** Map of place id -> timestamp (ms) of the last collection at that place. */
  placeCooldowns: Record<string, number>;
}

const STORAGE_KEY = "mage-incremental-rpg-v1";

const INITIAL_STATE: GameState = {
  element: null,
  fragments: 0,
  discoveredPlaces: [],
  resources: {},
  placeCooldowns: {},
};

function loadState(): GameState {
  if (typeof window === "undefined") return INITIAL_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GameState>;
      if (
        (parsed.element === "air" ||
          parsed.element === "water" ||
          parsed.element === "fire" ||
          parsed.element === null) &&
        typeof parsed.fragments === "number"
      ) {
        return {
          element: parsed.element ?? null,
          fragments: parsed.fragments,
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

  // Passive fragment generation.
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
    setState((prev) => ({ ...prev, element }));
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
    reset,
  };
}
