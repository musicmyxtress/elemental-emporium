import { useState, useEffect, useCallback } from "react";
import {
  fragmentKey,
  FRAGMENTS_PER_CRYSTAL,
  BASE_PASSIVE,
  PASSIVE_INTERVAL_MS,
  levelFromXp,
  playerMaxHp,
  isSpellUnlocked,
  type TamedCreature,
  type EventEffect,
  type Gender,
} from "./gameData";
import { CREATURES, PLACES, SPELLS } from "./seedData";

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
  playerHp: number;
  sleepUntil: number | null;
  lastPassiveAt: number | null;
  shieldAmount: number;
  hasteUntil: number | null;
  hasteReductionSeconds: number;
}

const STORAGE_KEY = "elemental-emporium-v3";
const BASE_ELEMENTS = ["fire", "water", "earth", "air"];
const DEATH_SLEEP_MS = 60_000;
const SLEEP_MS_PER_HP = 3000;
// Cap how much elapsed real time we pay out in one catch-up, so returning to a
// long-backgrounded tab awards a sane amount instead of an enormous lump sum.
const MAX_CATCHUP_TICKS = 720; // 1 hour at a 5s interval

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
    playerHp: playerMaxHp({}, BASE_ELEMENTS),
    sleepUntil: null,
    lastPassiveAt: null,
    shieldAmount: 0,
    hasteUntil: null,
    hasteReductionSeconds: 0,
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
      typeof (x as TamedCreature).tamedAt === "number" &&
      ((x as TamedCreature).gender === undefined ||
        (x as TamedCreature).gender === "male" ||
        (x as TamedCreature).gender === "female"),
  );
}

function loadState(): GameState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const p = JSON.parse(raw) as Record<string, unknown>;
    const d = defaultState();
    const unlockedElements = Array.isArray(p.unlockedElements)
      ? p.unlockedElements.filter((x): x is string => typeof x === "string")
      : d.unlockedElements;
    const elementXp = isRecord(p.elementXp) ? (p.elementXp as Record<string, number>) : {};
    const element = typeof p.element === "string" ? p.element : null;
    return {
      element,
      resources: isRecord(p.resources) ? (p.resources as Record<string, number>) : {},
      crystals: isRecord(p.crystals) ? (p.crystals as Record<string, number>) : {},
      unlockedElements,
      elementXp,
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
      playerHp:
        typeof p.playerHp === "number" ? p.playerHp : playerMaxHp(elementXp, unlockedElements),
      sleepUntil: typeof p.sleepUntil === "number" ? p.sleepUntil : null,
      lastPassiveAt: typeof p.lastPassiveAt === "number" ? p.lastPassiveAt : element ? Date.now() : null,
      shieldAmount: typeof p.shieldAmount === "number" ? p.shieldAmount : 0,
      hasteUntil: typeof p.hasteUntil === "number" ? p.hasteUntil : null,
      hasteReductionSeconds:
        typeof p.hasteReductionSeconds === "number" ? p.hasteReductionSeconds : 0,
    };
  } catch {
    return defaultState();
  }
}

function applyEffect(effect: EventEffect, prev: GameState): GameState {
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
  if (effect.type === "heal") {
    const maxHp = playerMaxHp(prev.elementXp, prev.unlockedElements);
    return { ...prev, playerHp: Math.min(maxHp, prev.playerHp + effect.amount) };
  }
  return prev;
}

function settleSleep(state: GameState, now: number): GameState {
  if (state.sleepUntil === null || state.sleepUntil > now) return state;
  return {
    ...state,
    sleepUntil: null,
    playerHp: playerMaxHp(state.elementXp, state.unlockedElements),
  };
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

// One 5-second passive income step. Extracted so we can replay it N times to
// catch up real time that elapsed while the browser throttled or paused our
// timer (background tabs freeze setInterval). Behavior of a single tick is
// identical to before.
function passiveTick(prev: GameState, now: number): GameState {
  if (!prev.element) return prev;
  const masteryElement = prev.element;
  const newResources = { ...prev.resources };

  const asleep = prev.sleepUntil !== null && prev.sleepUntil > now;
  if (!asleep) {
    const masteryKey = fragmentKey(masteryElement);
    newResources[masteryKey] = (newResources[masteryKey] ?? 0) + BASE_PASSIVE;
  }

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

  // Pay out passive income based on the real time that has actually elapsed
  // since the last payout, replaying whole 5s ticks. This survives background
  // tabs: browsers throttle/pause setInterval when the game is not the focused
  // tab, so a naive per-tick counter silently stops earning. Driven by a timer
  // AND by focus/visibility regain so income catches up the instant you return.
  const accruePassive = useCallback(() => {
    setState((prev) => {
      if (!prev.element) return prev;
      const now = Date.now();
      if (prev.lastPassiveAt === null) return { ...prev, lastPassiveAt: now };
      const last = prev.lastPassiveAt;
      const elapsed = now - last;
      const ticks = Math.min(Math.floor(elapsed / PASSIVE_INTERVAL_MS), MAX_CATCHUP_TICKS);
      if (ticks <= 0) return prev;
      let next = prev;
      for (let i = 0; i < ticks; i++) next = passiveTick(next, now);
      return { ...next, lastPassiveAt: last + ticks * PASSIVE_INTERVAL_MS };
    });
  }, []);

  useEffect(() => {
    if (!state.element) return;
    const id = setInterval(accruePassive, PASSIVE_INTERVAL_MS);
    const onVisible = () => {
      if (!document.hidden) accruePassive();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", accruePassive);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", accruePassive);
    };
  }, [state.element, accruePassive]);

  useEffect(() => {
    if (state.sleepUntil === null) return;
    const delay = Math.max(0, state.sleepUntil - Date.now());
    const id = setTimeout(() => {
      setState((prev) => {
        if (prev.sleepUntil === null) return prev;
        return {
          ...prev,
          sleepUntil: null,
          playerHp: playerMaxHp(prev.elementXp, prev.unlockedElements),
        };
      });
    }, delay);
    return () => clearTimeout(id);
  }, [state.sleepUntil]);

  const chooseElement = useCallback((elementId: string) => {
    setState((prev) => ({ ...prev, element: elementId, lastPassiveAt: Date.now() }));
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

  const winFight = useCallback((defId: string): { fragmentsGained: number; xpGained: number } => {
    const def = CREATURES.find((c) => c.id === defId);
    if (!def) return { fragmentsGained: 0, xpGained: 0 };
    const amount = (def.level + def.rarity) * 2;
    const xpGained = amount * 10;
    const key = fragmentKey(def.elementId);
    setState((prev) => {
      const newXp = { ...prev.elementXp, [def.elementId]: (prev.elementXp[def.elementId] ?? 0) + xpGained };
      const masteryLevel = prev.element ? levelFromXp(newXp[prev.element] ?? 0) : 0;
      return {
        ...prev,
        resources: { ...prev.resources, [key]: (prev.resources[key] ?? 0) + amount },
        elementXp: newXp,
        hasApprentice: prev.hasApprentice || (prev.element !== null && masteryLevel >= 20),
      };
    });
    return { fragmentsGained: amount, xpGained };
  }, []);

  const tameCreature = useCallback((defId: string, gender?: Gender): boolean => {
    const def = CREATURES.find((c) => c.id === defId);
    if (!def) return false;
    let ok = false;
    setState((prev) => {
      if (def.isMagical ? !prev.builtMenagerie : !prev.builtStable) return prev;
      const cost = def.rarity * 2 + def.level;
      const available = prev.crystals[def.elementId] ?? 0;
      if (available < cost) return prev;
      ok = true;
      const tamed: TamedCreature = { instanceId: crypto.randomUUID(), defId, gender, tamedAt: Date.now() };
      const xpGained = (def.level + def.rarity) * 2 * 10;
      const newXp = { ...prev.elementXp, [def.elementId]: (prev.elementXp[def.elementId] ?? 0) + xpGained };
      const masteryLevel = prev.element ? levelFromXp(newXp[prev.element] ?? 0) : 0;
      return {
        ...prev,
        crystals: { ...prev.crystals, [def.elementId]: available - cost },
        stable: def.isMagical ? prev.stable : [...prev.stable, tamed],
        menagerie: def.isMagical ? [...prev.menagerie, tamed] : prev.menagerie,
        elementXp: newXp,
        hasApprentice: prev.hasApprentice || (prev.element !== null && masteryLevel >= 20),
      };
    });
    return ok;
  }, []);

  const castCombatSpell = useCallback(
    (
      spellId: string,
      retaliation: number | null,
    ): { cast: boolean; dealt: number; blocked: number; died: boolean } => {
      const spell = SPELLS.find((s) => s.id === spellId);
      let result = { cast: false, dealt: 0, blocked: 0, died: false };
      if (!spell) return result;
      setState((prev) => {
        if (!isSpellUnlocked(spell, prev.elementXp, prev.unlockedElements)) return prev;
        const cost = spell.power ?? 0;
        const key = fragmentKey(spell.elementId);
        if ((prev.resources[key] ?? 0) < cost) return prev;

        const current = settleSleep(prev, Date.now());
        const xpGained = spell.unlockLevel;
        const newXp = {
          ...current.elementXp,
          [spell.elementId]: (current.elementXp[spell.elementId] ?? 0) + xpGained,
        };
        const masteryLevel = current.element ? levelFromXp(newXp[current.element] ?? 0) : 0;
        const afterCost = {
          ...current,
          resources: { ...current.resources, [key]: (current.resources[key] ?? 0) - cost },
          elementXp: newXp,
          hasApprentice: current.hasApprentice || (current.element !== null && masteryLevel >= 20),
        };

        if (retaliation === null) {
          result = { cast: true, dealt: 0, blocked: 0, died: false };
          return afterCost;
        }

        const blocked = Math.min(afterCost.shieldAmount, retaliation);
        const dealt = retaliation - blocked;
        const shieldAmount = afterCost.shieldAmount > 0 ? 0 : afterCost.shieldAmount;
        const newHp = Math.max(0, afterCost.playerHp - dealt);
        const died = newHp <= 0;
        result = { cast: true, dealt, blocked, died };
        return {
          ...afterCost,
          playerHp: newHp,
          shieldAmount,
          sleepUntil: died ? Date.now() + DEATH_SLEEP_MS : afterCost.sleepUntil,
        };
      });
      return result;
    },
    [],
  );

  const startSleep = useCallback((): boolean => {
    let ok = false;
    setState((prev) => {
      const current = settleSleep(prev, Date.now());
      if (current.sleepUntil !== null) return current;
      const maxHp = playerMaxHp(current.elementXp, current.unlockedElements);
      if (current.playerHp >= maxHp) return current;
      ok = true;
      return { ...current, sleepUntil: Date.now() + (maxHp - current.playerHp) * SLEEP_MS_PER_HP };
    });
    return ok;
  }, []);

  const castSpell = useCallback((spellId: string): boolean => {
    const spell = SPELLS.find((s) => s.id === spellId);
    if (!spell) return false;
    let ok = false;
    setState((prev) => {
      if (!isSpellUnlocked(spell, prev.elementXp, prev.unlockedElements)) return prev;
      const cost = spell.power ?? 0;
      const key = fragmentKey(spell.elementId);
      if ((prev.resources[key] ?? 0) < cost) return prev;
      ok = true;
      const xpGained = spell.unlockLevel;
      const newXp = { ...prev.elementXp, [spell.elementId]: (prev.elementXp[spell.elementId] ?? 0) + xpGained };
      const masteryLevel = prev.element ? levelFromXp(newXp[prev.element] ?? 0) : 0;
      const afterCost = {
        ...prev,
        resources: { ...prev.resources, [key]: (prev.resources[key] ?? 0) - cost },
        elementXp: newXp,
        hasApprentice: prev.hasApprentice || (prev.element !== null && masteryLevel >= 20),
      };
      if (spell.kind !== "utility") return afterCost;
      if (spell.utilityKind === "shield") {
        const level = levelFromXp(prev.elementXp[spell.elementId] ?? 0);
        return { ...afterCost, shieldAmount: (spell.power ?? 0) * level };
      }
      if (spell.utilityKind === "haste") {
        const level = levelFromXp(prev.elementXp[spell.elementId] ?? 0);
        return {
          ...afterCost,
          hasteUntil: Date.now() + (spell.hasteDurationMs ?? 0),
          hasteReductionSeconds: (spell.power ?? 0) * level,
        };
      }
      if (spell.effect) return applyEffect(spell.effect, afterCost);
      return afterCost;
    });
    return ok;
  }, []);

  const discoverPlace = useCallback((placeId: string) => {
    setState((prev) =>
      prev.discoveredPlaces.includes(placeId)
        ? prev
        : { ...prev, discoveredPlaces: [...prev.discoveredPlaces, placeId] },
    );
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
        const hasteActive = prev.hasteUntil !== null && prev.hasteUntil > now;
        const reductionMs = hasteActive ? prev.hasteReductionSeconds * 1000 : 0;
        newCooldowns[placeId] = now + Math.max(0, def.rarity * 5 * 1000 - reductionMs);
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
    setState((prev) => applyEffect(effect, prev));
  }, []);

  const studyEncounter = useCallback((itemId: string, elementId: string): boolean => {
    let ok = false;
    setState((prev) => {
      const now = Date.now();
      // Only one element may be studied at a time. Block if a different
      // element's study is still in progress.
      const studyingAnother = Object.entries(prev.cooldowns).some(
        ([key, expiry]) =>
          key.startsWith("study:") && key !== `study:${elementId}` && expiry > now,
      );
      if (studyingAnother) return prev;
      ok = true;
      const expiry = now + 3_600_000;
      return {
        ...prev,
        cooldowns: { ...prev.cooldowns, [itemId]: expiry, [`study:${elementId}`]: expiry },
      };
    });
    return ok;
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
      let builtStable = false;
      let builtMenagerie = false;

      if (giftedCreatureDefId) {
        const allCreatures = [...prev.stable, ...prev.menagerie];
        const gifted = allCreatures.find((c) => c.defId === giftedCreatureDefId);
        const def = CREATURES.find((c) => c.id === giftedCreatureDefId);
        if (gifted && def) {
          if (def.isMagical) {
            newMenagerie = [gifted];
            builtMenagerie = true;
          } else {
            newStable = [gifted];
            builtStable = true;
          }
        }
      }

      // Start from defaultState() so any status effect (shield, haste, future
      // spell buffs, etc.) clears on graduation without needing a line here.
      return {
        ...defaultState(),
        resources: { [masteryKey]: allowance },
        unlockedElements: [...prev.unlockedElements],
        builtStable,
        builtMenagerie,
        stable: newStable,
        menagerie: newMenagerie,
        generationNumber: prev.generationNumber + 1,
        generationStartElements: [...prev.unlockedElements],
        playerHp: playerMaxHp({}, prev.unlockedElements),
      };
    });
  }, []);

  const reset = useCallback(() => setState(defaultState()), []);

  return {
    state: settleSleep(state, Date.now()),
    hydrated,
    chooseElement,
    forgeCrystal,
    winFight,
    tameCreature,
    castCombatSpell,
    startSleep,
    castSpell,
    discoverPlace,
    collectPlace,
    resolveEvent,
    studyEncounter,
    buildStable,
    buildMenagerie,
    graduate,
    reset,
  };
}
