import { useState, useEffect, useCallback, useRef } from "react";

export type Element = "air" | "water" | "fire";

export interface GameState {
  element: Element | null;
  fragments: number;
  /** Ids of places the player has discovered. Places are discovered once. */
  discoveredPlaces: string[];
}

const STORAGE_KEY = "mage-incremental-rpg-v1";

const INITIAL_STATE: GameState = { element: null, fragments: 0, discoveredPlaces: [] };

function loadState(): GameState {
  if (typeof window === "undefined") return INITIAL_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameState;
      if (
        (parsed.element === "air" ||
          parsed.element === "water" ||
          parsed.element === "fire" ||
          parsed.element === null) &&
        typeof parsed.fragments === "number"
      ) {
        return {
          ...parsed,
          discoveredPlaces: Array.isArray(parsed.discoveredPlaces)
            ? parsed.discoveredPlaces
            : [],
        };
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return INITIAL_STATE;
}

export const FRAGMENT_INTERVAL_MS = 5000;

export function useGameState() {
  const [state, setState] = useState<GameState>({ element: null, fragments: 0 });
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

  const reset = useCallback(() => {
    setState({ element: null, fragments: 0 });
  }, []);

  return { state, hydrated, chooseElement, reset };
}
