import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  useGameState,
  type CollectResult,
  type GameState,
  type TamedCreature,
  BUILDING_COSTS,
  APPRENTICE_LEVEL,
  getMaxHp,
} from "@/lib/useGameState";
import {
  ELEMENTS,
  ALL_ELEMENT_INFO,
  FRAGMENTS_PER_CRYSTAL,
  fragmentResourceId,
  xpToNextLevel,
  getElementInfo,
} from "@/lib/elements";

import { rollEvent, type RandomEvent } from "@/lib/events";
import { getPlace, rollUndiscoveredPlace, type Place } from "@/lib/places";
import {
  rollCreature,
  getCreature,
  getProductionAmount,
  getConsumptionAmount,
  getCreatureHp,
  getCreatureDamage,
  type Creature,
} from "@/lib/creatures";
import { getUnlockedSpells, getSpellDamageRange, computeIncomingDamage, type Spell, type CastResult } from "@/lib/spells";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const {
    state,
    hydrated,
    chooseElement,
    discoverPlace,
    applyEvent,
    collectFromPlace,
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
    trainMagicalCreature,
    gainElementXp,
    castSpell,
    damagePlayer,
    startSleep,
    reset,
  } = useGameState();

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-muted-foreground" role="status">
          Loading your studies…
        </p>
      </main>
    );
  }

  if (!state.element) {
    // Generation 1 picks from the four starter elements. Later generations
    // (apprentices who have graduated) may master any element previously
    // unlocked.
    const isApprentice = state.generation > 1;
    const availableIds = isApprentice
      ? state.unlockedElements
      : ELEMENTS.map((e) => e.id);
    return (
      <PreGameFlow
        isApprentice={isApprentice}
        generation={state.generation}
        availableElementIds={availableIds}
        onChoose={chooseElement}
      />
    );
  }

  return (
    <GameScreen
      element={state.element}
      generation={state.generation}
      apprenticeAcknowledged={state.apprenticeAcknowledged}
      discoveredPlaces={state.discoveredPlaces}
      resources={state.resources}
      crystals={state.crystals}
      placeCooldowns={state.placeCooldowns}
      shelvedPlaces={state.shelvedPlaces}
      shelvedCreatures={state.shelvedCreatures}
      unlockedElements={state.unlockedElements}
      discoveredElements={state.discoveredElements}
      buildings={state.buildings}
      tamedCreatures={state.tamedCreatures}
      magicalLevels={state.magicalLevels}
      pendingBreedings={state.pendingBreedings}
      breedingResults={state.breedingResults}
      onDiscoverPlace={discoverPlace}
      onShelvePlace={shelvePlace}
      onShelveCreature={shelveCreature}
      onUnlockElement={unlockElement}
      onDiscoverElement={discoverElement}
      onApplyEvent={applyEvent}
      onCollectFromPlace={collectFromPlace}
      onConvertFragments={convertFragmentsToCrystal}
      onSpendCrystals={spendCrystals}
      onTameCreature={tameCreature}
      onBuildBuilding={buildBuilding}
      onAcknowledgeApprentice={acknowledgeApprentice}
      onGraduateApprentice={graduateApprentice}
      onStartBreeding={startBreeding}
      onDismissBreedingResult={dismissBreedingResult}
      onTrainMagicalCreature={trainMagicalCreature}
      onGainElementXp={gainElementXp}
      elementLevels={state.elementLevels}
      elementXp={state.elementXp}
      currentHp={state.currentHp}
      maxHp={getMaxHp(state.levelUpsTotal)}
      sleepUntil={state.sleepUntil}
      spellBuffs={state.spellBuffs}
      onCastSpell={castSpell}
      onDamagePlayer={damagePlayer}
      onStartSleep={startSleep}
      onReset={reset}
    />
  );
}

function PreGameFlow({
  isApprentice,
  generation,
  availableElementIds,
  onChoose,
}: {
  isApprentice: boolean;
  generation: number;
  availableElementIds: string[];
  onChoose: (e: string) => void;
}) {
  const [introDone, setIntroDone] = useState(false);
  if (isApprentice && !introDone) {
    return <ApprenticeIntroScreen generation={generation} onContinue={() => setIntroDone(true)} />;
  }
  return (
    <ChooseElementScreen
      onChoose={onChoose}
      availableElementIds={availableElementIds}
      isApprentice={isApprentice}
      generation={generation}
    />
  );
}

function ApprenticeIntroScreen({
  generation,
  onContinue,
}: {
  generation: number;
  onContinue: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl font-semibold leading-relaxed text-foreground sm:text-3xl"
      >
        A new emporium awaits
      </h1>
      <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
        <p>
          You are the apprentice, generation {generation}. Your master's lessons are behind you, and
          the road ahead is your own. With the creature and fragments your master gifted you, you
          set off to a quiet corner of the world to raise your own emporium.
        </p>
        <p>
          Everything your master discovered — the elements they unlocked, the places they mapped —
          travels with you in memory. The fragments, crystals, buildings, and other creatures stay
          behind. What you build from here is yours.
        </p>
      </div>
      <div className="mt-10">
        <Button onClick={onContinue} aria-label="Continue the story as the apprentice">
          Continue as the apprentice
        </Button>
      </div>
    </main>
  );
}

function ChooseElementScreen({
  onChoose,
  availableElementIds,
  isApprentice = false,
  generation = 1,
}: {
  onChoose: (e: string) => void;
  availableElementIds?: string[];
  isApprentice?: boolean;
  generation?: number;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Build the candidate option list. For the original mage, use the four
  // starter ELEMENTS (full info). For apprentices, derive from the unlocked
  // element ids using ALL_ELEMENT_INFO.
  const options = availableElementIds
    ? availableElementIds
        .map((id) => {
          const starter = ELEMENTS.find((e) => e.id === id);
          if (starter) return { id, name: starter.name, emoji: starter.emoji };
          const info = getElementInfo(id);
          if (!info) return null;
          return { id, name: info.name, emoji: info.emoji };
        })
        .filter((x): x is { id: string; name: string; emoji: string } => Boolean(x))
    : ELEMENTS.map((el) => ({ id: el.id, name: el.name, emoji: el.emoji }));

  const heading = isApprentice
    ? `You are the new apprentice, generation ${generation}. Your master sent you out into the world to build your own emporium. Which of your unlocked elements will you specialize in?`
    : "Welcome young mage. In you studies you have grown an affinity to an element. What element do you specialize in?";

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl font-semibold leading-relaxed text-foreground sm:text-3xl"
      >
        {heading}
      </h1>

      <fieldset className="mt-10 border-0 p-0">
        <legend className="sr-only">Choose your specialized element</legend>
        <ul className="grid gap-4 sm:grid-cols-3" role="list">
          {options.map((el) => (
            <li key={el.id}>
              <button
                type="button"
                onClick={() => onChoose(el.id)}
                className="group flex h-full w-full flex-col items-start gap-2 rounded-xl border bg-card p-5 text-left transition-colors hover:bg-muted focus-visible:bg-muted"
                aria-label={`Specialize in ${el.name}`}
              >
                <span aria-hidden="true" className="text-4xl">
                  {el.emoji}
                </span>
                <span className="text-lg font-medium text-foreground">Specialize in {el.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </fieldset>
    </main>
  );
}

type Discovery =
  | { kind: "place"; place: Place }
  | { kind: "locked-place"; place: Place }
  | { kind: "creature"; creature: Creature }
  | { kind: "locked-creature"; creature: Creature }
  | { kind: "event"; event: RandomEvent }
  | { kind: "nothing" };

/** A damage-over-time effect applied to the enemy. */
interface DotEffect {
  spellId: string;
  spellName: string;
  /** Damage dealt when the counter expires. */
  damage: number;
  /** Enemy turns remaining until the next tick. */
  turnsUntilNext: number;
  /** Enemy turns between ticks (used to reset after triggering). */
  triggerEvery: number;
}

/** Active turn-based encounter state. */
interface CombatState {
  creature: Creature;
  creatureHp: number;
  creatureMaxHp: number;
  log: string[];
  /** 'player' = waiting for a spell choice; 'win'/'lose' = encounter over. */
  phase: "player" | "win" | "fled" | "lose";
  dotEffects: DotEffect[];
}

/** Ticks all active DoTs, returning updated effects and any triggered damage. */
function tickDots(dotEffects: DotEffect[]): {
  updatedDots: DotEffect[];
  dotLogs: string[];
  totalDamage: number;
} {
  let totalDamage = 0;
  const dotLogs: string[] = [];
  const updatedDots = dotEffects.map((dot) => {
    const next = dot.turnsUntilNext - 1;
    if (next <= 0) {
      totalDamage += dot.damage;
      dotLogs.push(`${dot.spellName} surges — ${dot.damage} damage seeps through.`);
      return { ...dot, turnsUntilNext: dot.triggerEvery };
    }
    return { ...dot, turnsUntilNext: next };
  });
  return { updatedDots, dotLogs, totalDamage };
}

function GameScreen({
  element,
  generation,
  apprenticeAcknowledged,
  discoveredPlaces,
  resources,
  crystals,
  placeCooldowns,
  shelvedPlaces,
  shelvedCreatures,
  unlockedElements,
  discoveredElements,
  buildings,
  tamedCreatures,
  magicalLevels,
  pendingBreedings,
  breedingResults,
  elementLevels,
  elementXp,
  onDiscoverPlace,
  onShelvePlace,
  onShelveCreature,
  onUnlockElement,
  onDiscoverElement,
  onApplyEvent,
  onCollectFromPlace,
  onConvertFragments,
  onSpendCrystals,
  onTameCreature,
  onBuildBuilding,
  onAcknowledgeApprentice,
  onGraduateApprentice,
  onStartBreeding,
  onDismissBreedingResult,
  onTrainMagicalCreature,
  onGainElementXp,
  currentHp,
  maxHp,
  sleepUntil,
  spellBuffs,
  onCastSpell,
  onDamagePlayer,
  onStartSleep,
  onReset,
}: {
  element: string;
  generation: number;
  apprenticeAcknowledged: boolean;
  discoveredPlaces: string[];
  resources: Record<string, number>;
  crystals: Record<string, number>;
  placeCooldowns: Record<string, number>;
  shelvedPlaces: Record<string, number>;
  shelvedCreatures: Record<string, number>;
  unlockedElements: string[];
  discoveredElements: string[];
  buildings: string[];
  tamedCreatures: TamedCreature[];
  magicalLevels: GameState["magicalLevels"];
  pendingBreedings: GameState["pendingBreedings"];
  breedingResults: GameState["breedingResults"];
  elementLevels: GameState["elementLevels"];
  elementXp: GameState["elementXp"];
  onDiscoverPlace: (placeId: string) => void;
  onShelvePlace: (placeId: string, rarity: number) => void;
  onShelveCreature: (creatureId: string, rarity: number) => void;
  onUnlockElement: (elementId: string) => void;
  onDiscoverElement: (elementId: string) => void;
  onApplyEvent: (effect: (s: GameState) => GameState) => void;
  onCollectFromPlace: (placeId: string) => CollectResult;
  onConvertFragments: (elementId: string) => boolean;
  onSpendCrystals: (elementId: string, amount: number) => boolean;
  onTameCreature: (creatureId: string, gender: TamedCreature["gender"]) => void;
  onBuildBuilding: (buildingId: string, crystalCosts?: Record<string, number>) => boolean;
  onAcknowledgeApprentice: () => void;
  onGraduateApprentice: (creatureId: string) => boolean;
  onStartBreeding: (
    creatureName: string,
    templateId: string,
    pairs: number,
    rarity: number,
  ) => { ok: boolean; success: boolean; chance: number; pairs: number };
  onDismissBreedingResult: (id: string) => void;
  onTrainMagicalCreature: (creatureId: string) => number | null;
  onGainElementXp: (element: string, amount: number) => void;
  currentHp: number;
  maxHp: number;
  sleepUntil: number;
  spellBuffs: GameState["spellBuffs"];
  onCastSpell: (spellId: string) => CastResult | null;
  onDamagePlayer: (amount: number) => void;
  onStartSleep: () => boolean;
  onReset: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [creatureAnnouncement, setCreatureAnnouncement] = useState("");
  const [combat, setCombat] = useState<CombatState | null>(null);

  // Drives the sleep countdown / HP bar re-render once per second.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const isSleeping = sleepUntil > now;
  const sleepRemainingMs = isSleeping ? sleepUntil - now : 0;

  function handleExplore() {
    if (isSleeping) return;
    const place = rollUndiscoveredPlace(discoveredPlaces, shelvedPlaces);
    const event = rollEvent();
    const creature = rollCreature(elementLevels, shelvedCreatures);

    const outcomes: Discovery[] = [];
    if (place) {
      const elementId = place.resource.element;
      const locked = elementId !== undefined && !unlockedElements.includes(elementId);
      outcomes.push(
        locked ? { kind: "locked-place", place } : { kind: "place", place },
      );
    }
    if (creature) {
      const elementId = creature.elementProduction.element;
      const locked = !unlockedElements.includes(elementId);
      const rolledCreature = { ...creature, gender: Math.random() < 0.5 ? "male" as const : "female" as const };
      outcomes.push(
        locked ? { kind: "locked-creature", creature: rolledCreature } : { kind: "creature", creature: rolledCreature },
      );
    }
    if (event) outcomes.push({ kind: "event", event });

    if (outcomes.length === 0) {
      setDiscovery({ kind: "nothing" });
      return;
    }

    const chosen = outcomes[Math.floor(Math.random() * outcomes.length)];
    if (chosen.kind === "place") {
      onDiscoverPlace(chosen.place.id);
      if (chosen.place.resource.element) onDiscoverElement(chosen.place.resource.element);
    } else if (chosen.kind === "locked-place") {
      if (chosen.place.resource.element) onDiscoverElement(chosen.place.resource.element);
    } else if (chosen.kind === "creature") {
      onDiscoverElement(chosen.creature.elementProduction.element);
    } else if (chosen.kind === "locked-creature") {
      onDiscoverElement(chosen.creature.elementProduction.element);
    } else if (chosen.kind === "event" && chosen.event.apply) {
      onApplyEvent(chosen.event.apply);
    }
    setDiscovery(chosen);
  }

  function handleStudy() {
    if (discovery?.kind === "locked-place") {
      const elementId = discovery.place.resource.element;
      if (elementId) onUnlockElement(elementId);
      onShelvePlace(discovery.place.id, discovery.place.rarity);
    } else if (discovery?.kind === "locked-creature") {
      const elementId = discovery.creature.elementProduction.element;
      onUnlockElement(elementId);
      onShelveCreature(discovery.creature.id, discovery.creature.rarity);
    }
    setDiscovery(null);
  }

  /** Closes the discovery dialog. Used for "Leave alone". */
  function handleLeave() {
    setDiscovery(null);
  }

  /** Begins turn-based combat against the discovered creature. */
  function handleFight() {
    if (isSleeping) return;
    if (discovery?.kind !== "creature") return;
    const creature = discovery.creature;
    setDiscovery(null);
    setCombat({
      creature,
      creatureHp: getCreatureHp(creature),
      creatureMaxHp: getCreatureHp(creature),
      log: [`A wild ${creature.name} squares up to fight.`],
      phase: "player",
      dotEffects: [],
    });
  }

  /** Player casts a spell, then the creature counter-attacks (or combat ends). */
  function handleCast(spellId: string) {
    if (!combat || combat.phase !== "player" || isSleeping) return;
    const cast = onCastSpell(spellId);
    if (!cast) {
      setCombat({ ...combat, log: [...combat.log, "You can't afford to cast that spell."] });
      return;
    }

    let log = [...combat.log];
    let creatureHp = combat.creatureHp;
    let dotEffects = combat.dotEffects;

    if ("buffApplied" in cast) {
      log = [...log, cast.spell.actionText, `You are shielded by ${cast.spell.name}.`];
    } else if ("dotApplied" in cast) {
      const triggerEvery = cast.spell.dotEvery ?? 2;
      const newDot: DotEffect = {
        spellId: cast.spell.id,
        spellName: cast.spell.name,
        damage: cast.dotDamage,
        turnsUntilNext: triggerEvery,
        triggerEvery,
      };
      const existingIdx = dotEffects.findIndex((d) => d.spellId === cast.spell.id);
      dotEffects = existingIdx >= 0
        ? dotEffects.map((d, i) => (i === existingIdx ? newDot : d))
        : [...dotEffects, newDot];
      log = [...log, cast.spell.actionText, `${cast.spell.name} takes hold — ${cast.dotDamage} damage every ${triggerEvery} turns.`];
    } else {
      // Offensive spell — deal immediate damage to creature.
      creatureHp = Math.max(0, creatureHp - cast.damage);
      log = [...log, cast.spell.actionText, `${cast.spell.name} deals ${cast.damage} damage to ${combat.creature.name}.`];
      if (creatureHp === 0) {
        const reward = (combat.creature.level + combat.creature.rarity) * 5;
        const fragElement = combat.creature.elementProduction.element;
        onApplyEvent((s) => ({
          ...s,
          resources: { ...s.resources, [fragmentResourceId(fragElement)]: (s.resources[fragmentResourceId(fragElement)] ?? 0) + reward },
        }));
        onGainElementXp(element, reward);
        setCombat({ ...combat, creatureHp: 0, dotEffects, log: [...log, `You defeated ${combat.creature.name}! Gained ${reward} ${fragElement} fragments and ${reward} XP.`], phase: "win" });
        return;
      }
    }

    // Creature retaliates. Resolve block chance here (pure, before any setState)
    // so the log message reflects the real damage rather than the default 0.
    const raw = getCreatureDamage(combat.creature);
    const { actualDamage, blocked } = computeIncomingDamage(raw, spellBuffs, elementLevels);
    const defeated = currentHp - actualDamage <= 0;
    onDamagePlayer(actualDamage);
    log = blocked
      ? [...log, `${combat.creature.name} strikes at you, but your Water Wall absorbs the blow!`]
      : [...log, `${combat.creature.name} strikes you for ${actualDamage} damage.`];
    if (defeated) {
      setCombat({ ...combat, creatureHp, dotEffects, log: [...log, "You collapse. Half of your fragments slip away as you fall into a forced sleep."], phase: "lose" });
      return;
    }

    // Tick active DoTs after each enemy turn.
    const { updatedDots, dotLogs, totalDamage } = tickDots(dotEffects);
    log = [...log, ...dotLogs];
    dotEffects = updatedDots;
    if (totalDamage > 0) {
      creatureHp = Math.max(0, creatureHp - totalDamage);
      if (creatureHp === 0) {
        const reward = (combat.creature.level + combat.creature.rarity) * 5;
        const fragElement = combat.creature.elementProduction.element;
        onApplyEvent((s) => ({
          ...s,
          resources: { ...s.resources, [fragmentResourceId(fragElement)]: (s.resources[fragmentResourceId(fragElement)] ?? 0) + reward },
        }));
        onGainElementXp(element, reward);
        setCombat({ ...combat, creatureHp: 0, dotEffects, log: [...log, `You defeated ${combat.creature.name}! Gained ${reward} ${fragElement} fragments and ${reward} XP.`], phase: "win" });
        return;
      }
    }

    setCombat({ ...combat, creatureHp, dotEffects, log, phase: "player" });
  }

  function handleFlee() {
    if (!combat) return;
    setCombat({ ...combat, log: [...combat.log, "You flee from combat."], phase: "fled" });
  }

  function handleCloseCombat() {
    setCombat(null);
  }

  function handleTame() {
    if (discovery?.kind !== "creature") return;
    const c = discovery.creature;
    const cost = c.rarity * 2;
    const ok = onSpendCrystals(c.elementProduction.element, cost);
    if (!ok) {
      setCreatureAnnouncement(
        `Not enough ${c.elementProduction.element} crystals to tame ${c.name}. ${cost} required.`,
      );
      return;
    }
    const reward = (c.level + c.rarity) * 5;
    onGainElementXp(element, reward);
    setCreatureAnnouncement(`Tamed ${c.name} for ${cost} ${c.elementProduction.element} crystals. Gained ${reward} XP.`);
    onTameCreature(c.id, c.gender);
    setDiscovery(null);
  }

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["value"]>(() => {
    if (typeof window === "undefined") return "home-base";
    const saved = window.localStorage.getItem("mage-incremental-active-tab");
    return (TABS.find((t) => t.value === saved)?.value) ?? "home-base";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("mage-incremental-active-tab", activeTab);
    }
  }, [activeTab]);
  const activeTabLabel = TABS.find((t) => t.value === activeTab)?.label ?? "";

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 pt-12 pb-32">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold text-foreground sm:text-3xl"
        >
          {activeTabLabel}
        </h1>
        <div className="flex items-center gap-3">
          {activeTab === "home-base" && (
            <Button
              type="button"
              onClick={handleExplore}
              disabled={isSleeping}
              aria-label={isSleeping ? "You are sleeping; cannot explore" : "Explore"}
            >
              Explore
            </Button>
          )}
        </div>
      </header>
      {isSleeping && (
        <p
          role="status"
          aria-live="polite"
          className="mt-4 rounded-md border bg-muted/50 p-3 text-sm text-foreground"
        >
          Sleeping… you wake in {Math.ceil(sleepRemainingMs / 1000)}s. Your creatures keep producing fragments.
        </p>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as (typeof TABS)[number]["value"])}
        activationMode="manual"
        className="mt-6"
      >
        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <section
              aria-label={tab.label}
              className="rounded-2xl border bg-card p-8 text-muted-foreground"
            >
              {tab.value === "places" && (
                <PlacesPanel
                  discoveredPlaces={discoveredPlaces}
                  placeCooldowns={placeCooldowns}
                  onCollectFromPlace={onCollectFromPlace}
                />
              )}
              {tab.value === "home-base" && (
                <HomeBasePanel
                  masteredElement={element}
                  masteredLevel={elementLevels[element] ?? 0}
                  generation={generation}
                  tamedCreatures={tamedCreatures}
                  resources={resources}
                  crystals={crystals}
                  unlockedElements={unlockedElements}
                  buildings={buildings}
                  currentHp={currentHp}
                  maxHp={maxHp}
                  isSleeping={isSleeping}
                  onBuildBuilding={onBuildBuilding}
                  onGraduateApprentice={onGraduateApprentice}
                  onStartSleep={onStartSleep}
                />
              )}
              {tab.value === "stable" && (
                <StablePanel
                  buildings={buildings}
                  tamedCreatures={tamedCreatures}
                  pendingBreedings={pendingBreedings}
                  onStartBreeding={onStartBreeding}
                />
              )}
              {tab.value === "menagerie" && (
                <MenageriePanel
                  buildings={buildings}
                  tamedCreatures={tamedCreatures}
                  magicalLevels={magicalLevels}
                  pendingBreedings={pendingBreedings}
                  onTrainMagicalCreature={onTrainMagicalCreature}
                  onStartBreeding={onStartBreeding}
                />
              )}
              {tab.value === "fragments-and-crystals" && (
                <FragmentsAndCrystalsPanel
                  resources={resources}
                  crystals={crystals}
                  unlockedElements={unlockedElements}
                  discoveredElements={discoveredElements}
                  elementLevels={elementLevels}
                  onConvertFragments={onConvertFragments}
                  onGainElementXp={onGainElementXp}
                />

              )}
              {tab.value === "stats" && (
                <StatsPanel
                  elementLevels={elementLevels}
                  elementXp={elementXp}
                  unlockedElements={unlockedElements}
                  generation={generation}
                />
              )}
            </section>
          </TabsContent>
        ))}

        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto max-w-3xl overflow-x-auto px-4 py-2">
            <TabsList className="flex h-auto w-max gap-1">
              {TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>
      </Tabs>

      <div className="mt-8">
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:bg-muted"
        >
          Start over and choose a new element
        </button>
      </div>

      <DiscoveryDialog
        discovery={discovery}
        crystals={crystals}
        unlockedElements={unlockedElements}
        onStudy={handleStudy}
        onFight={handleFight}
        onLeave={handleLeave}
        onTame={handleTame}
        onCollect={() => {
          if (discovery?.kind === "place") {
            onCollectFromPlace(discovery.place.id);
          }
        }}
        onDismiss={() => setDiscovery(null)}
      />
      <CombatDialog
        combat={combat}
        currentHp={currentHp}
        maxHp={maxHp}
        spells={getUnlockedSpells(elementLevels, unlockedElements)}
        resources={resources}
        elementLevels={elementLevels}
        onCast={handleCast}
        onFlee={handleFlee}
        onClose={handleCloseCombat}
      />
      <ApprenticeArrivalDialog
        open={(elementLevels[element] ?? 0) >= APPRENTICE_LEVEL && !apprenticeAcknowledged}
        masteredElement={element}
        onAcknowledge={onAcknowledgeApprentice}
      />
      <BreedingResultDialog
        result={breedingResults[0] ?? null}
        onDismiss={onDismissBreedingResult}
      />
      <div role="status" aria-live="polite" className="sr-only">
        {creatureAnnouncement}
      </div>
    </main>
  );
}

function BreedingResultDialog({
  result,
  onDismiss,
}: {
  result: GameState["breedingResults"][number] | null;
  onDismiss: (id: string) => void;
}) {
  const open = Boolean(result);
  const total = result ? result.males + result.females : 0;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && result && onDismiss(result.id)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Breeding complete</DialogTitle>
          <DialogDescription>
            {result
              ? `Your ${result.creatureName} pairs produced ${total} offspring: ${result.males} male${result.males === 1 ? "" : "s"} and ${result.females} female${result.females === 1 ? "" : "s"}.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => result && onDismiss(result.id)} autoFocus>
            Welcome them to the stable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApprenticeArrivalDialog({
  open,
  masteredElement,
  onAcknowledge,
}: {
  open: boolean;
  masteredElement: string;
  onAcknowledge: () => void;
}) {
  const masteredName = getElementInfo(masteredElement)?.name ?? masteredElement;
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onAcknowledge() : undefined)}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>A young person seeks your guidance</DialogTitle>
          <DialogDescription>
            Word of your skill with {masteredName} has spread. A young person arrives at your door
            and asks to become your apprentice. You agree. From now on, an Apprentice section will
            appear on your Home Base with a Graduate button. When you graduate them, you will gift
            them a creature and fragments of your mastered element, and take their point of view as
            the next generation.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={onAcknowledge}>
            Okay
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlacesPanel({
  discoveredPlaces,
  placeCooldowns,
  onCollectFromPlace,
}: {
  discoveredPlaces: string[];
  placeCooldowns: Record<string, number>;
  onCollectFromPlace: (placeId: string) => CollectResult;
}) {
  const places = discoveredPlaces
    .map((id) => getPlace(id))
    .filter((p): p is Place => Boolean(p));

  // Tick once per second so cooldown countdowns update.
  const [, setTick] = useState(0);
  useEffect(() => {
    const hasCooldown = places.some((p) => p.cooldownMs > 0);
    if (!hasCooldown) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [places]);

  const [announcement, setAnnouncement] = useState("");

  if (places.length === 0) {
    return (
      <p className="mt-3 text-sm">
        You have not discovered any places yet. Explore to find them.
      </p>
    );
  }

  function handleCollect(place: Place) {
    const result = onCollectFromPlace(place.id);
    if (result.ok) {
      setAnnouncement(`Collected ${result.resourceLabel} from ${place.name}.`);
    } else if (result.remainingMs !== undefined) {
      const secs = Math.ceil(result.remainingMs / 1000);
      setAnnouncement(`${place.name} is on cooldown. ${secs} seconds remaining.`);
    }
  }

  const now = Date.now();

  return (
    <>
      <ul className="mt-4 grid gap-3" role="list">
        {places.map((place) => {
          const last = placeCooldowns[place.id] ?? 0;
          const remaining = place.cooldownMs > 0 ? Math.max(0, place.cooldownMs - (now - last)) : 0;
          const onCooldown = remaining > 0;
          const secs = Math.ceil(remaining / 1000);
          return (
            <li
              key={place.id}
              className="rounded-xl border bg-background p-4 text-left"
            >
              <h3 className="text-base font-medium text-foreground">{place.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{place.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleCollect(place)}
                  disabled={onCooldown}
                  aria-label={
                    onCooldown
                      ? `Collect ${place.resource.label} from ${place.name}, on cooldown, ${secs} seconds remaining`
                      : `Collect ${place.resource.label} from ${place.name}`
                  }
                >
                  {onCooldown ? `Ready in ${secs}s` : `Collect ${place.resource.label}`}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </>
  );
}

function FragmentsAndCrystalsPanel({
  resources,
  crystals,
  unlockedElements,
  discoveredElements,
  elementLevels,
  onConvertFragments,
  onGainElementXp,
}: {
  resources: Record<string, number>;
  crystals: Record<string, number>;
  unlockedElements: string[];
  discoveredElements: string[];
  elementLevels: Record<string, number>;
  onConvertFragments: (elementId: string) => boolean;
  onGainElementXp: (element: string, amount: number) => void;
}) {
  const [announcement, setAnnouncement] = useState("");

  function handleConvert(elementId: string, label: string) {
    const ok = onConvertFragments(elementId);
    if (ok) {
      const xp = 50 * Math.max(1, elementLevels[elementId] ?? 1);
      onGainElementXp(elementId, xp);
      setAnnouncement(`Converted ${FRAGMENTS_PER_CRYSTAL} ${label} fragments into 1 ${label} crystal. Gained ${xp} ${label} XP.`);
    } else {
      setAnnouncement(`Not enough ${label} fragments. ${FRAGMENTS_PER_CRYSTAL} required.`);
    }
  }

  const unlocked = ALL_ELEMENT_INFO.filter((el) => unlockedElements.includes(el.id));
  const discoveredOnly = ALL_ELEMENT_INFO.filter(
    (el) => !unlockedElements.includes(el.id) && discoveredElements.includes(el.id),
  );

  function renderElement(el: (typeof ALL_ELEMENT_INFO)[number], isUnlocked: boolean) {
    const fragments = resources[fragmentResourceId(el.id)] ?? 0;
    const crystalCount = crystals[el.id] ?? 0;
    const canConvert = fragments >= FRAGMENTS_PER_CRYSTAL;
    return (
      <li
        key={el.id}
        className="rounded-xl border bg-background p-4 text-left"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-medium text-foreground">
            <span aria-hidden="true" className="mr-2">
              {el.emoji}
            </span>
            {el.name}
          </h3>
          {!isUnlocked && (
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Locked
            </span>
          )}
        </div>
        {isUnlocked ? (
          <>
            <div className="mt-2 space-y-0.5 text-sm text-foreground">
              <p className="tabular-nums">{fragments} {el.name.toLowerCase()} fragments</p>
              <p className="tabular-nums">{crystalCount} {el.name.toLowerCase()} crystals</p>
            </div>
            <div className="mt-3">
              <Button
                type="button"
                size="sm"
                onClick={() => handleConvert(el.id, el.name.toLowerCase())}
                disabled={!canConvert}
                aria-label={
                  canConvert
                    ? `Convert ${FRAGMENTS_PER_CRYSTAL} ${el.name} fragments into 1 ${el.name} crystal`
                    : `Need ${FRAGMENTS_PER_CRYSTAL} ${el.name} fragments to forge a crystal`
                }
              >
                Forge crystal ({FRAGMENTS_PER_CRYSTAL} fragments)
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Study a place or creature of this element to unlock its fragments.
          </p>
        )}
      </li>
    );
  }

  return (
    <>
      <p className="mt-3 text-sm">
        {FRAGMENTS_PER_CRYSTAL} fragments forge 1 crystal of the same element. Crystals are also
        the currency for taming creatures (a creature's rarity times two).
      </p>

      {unlocked.length > 0 && (
        <ul className="mt-4 grid gap-3" role="list">
          {unlocked.map((el) => renderElement(el, true))}
        </ul>
      )}

      {discoveredOnly.length > 0 && (
        <>
          <h3 className="mt-6 text-base font-medium text-foreground">Discovered</h3>
          <ul className="mt-3 grid gap-3" role="list">
            {discoveredOnly.map((el) => renderElement(el, false))}
          </ul>
        </>
      )}

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </>
  );
}

function StatsPanel({
  elementLevels,
  elementXp,
  unlockedElements,
  generation,
}: {
  elementLevels: GameState["elementLevels"];
  elementXp: GameState["elementXp"];
  unlockedElements: string[];
  generation: number;
}) {
  const elements = ALL_ELEMENT_INFO.filter((el) => unlockedElements.includes(el.id));

  return (
    <>
      <p className="mt-3 text-sm text-muted-foreground">
        Generation {generation}.
      </p>
      <ul className="mt-4 grid gap-3" role="list">
        {elements.map((el) => {
          const level = elementLevels[el.id] ?? 0;
          const xp = elementXp[el.id] ?? 0;
          const needed = level >= 1 ? xpToNextLevel(level) : 0;
          const pct = needed > 0 ? Math.min(100, Math.round((xp / needed) * 100)) : 0;
          return (
            <li key={el.id} className="rounded-xl border bg-background p-4 text-left">
              <div className="flex items-baseline justify-between gap-3">
                <h3
                  className="text-base font-medium text-foreground"
                  aria-label={level >= 1 ? `${el.name}, Level ${level}` : `${el.name}, untrained`}
                >
                  <span aria-hidden="true" className="mr-2">
                    {el.emoji}
                  </span>
                  <span aria-hidden="true">{el.name}</span>
                </h3>
                <span
                  className="text-sm font-medium tabular-nums text-foreground"
                  aria-hidden="true"
                >
                  Level {level}
                </span>
              </div>
              {level >= 1 ? (
                <>
                  <div
                    className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={needed}
                    aria-valuenow={xp}
                    aria-label={`${el.name} experience: ${xp} of ${needed} toward level ${level + 1}`}
                  >
                    <div className="h-full bg-foreground/70" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                    {xp} / {needed} XP toward level {level + 1}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Untrained. Master this element to begin gaining levels.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function describeCreature(creature: Creature): string {
  const genderLabel = creature.gender === "male" ? "male" : "female";
  const magicLabel = creature.magical ? "magical" : "non-magical";
  const produces = `${creature.elementProduction.element} (${getProductionAmount(creature)}/tick)`;
  const consumes = creature.elementConsumption
    ? ` and consumes ${creature.elementConsumption.element} (${getConsumptionAmount(creature)}/tick)`
    : "";
  return `A ${genderLabel}, ${magicLabel} creature that produces ${produces}${consumes}.`;
}

function DiscoveryDialog({
  discovery,
  crystals,
  unlockedElements,
  onStudy,
  onFight,
  onLeave,
  onTame,
  onCollect,
  onDismiss,
}: {
  discovery: Discovery | null;
  crystals: Record<string, number>;
  unlockedElements: string[];
  onStudy: () => void;
  onFight: () => void;
  onLeave: () => void;
  onTame: () => void;
  onCollect: () => void;
  onDismiss: () => void;
}) {
  const open = discovery !== null;
  // Hold onto the last non-null discovery so that the dialog content does not
  // flash to the "Nothing stirs" fallback while it animates closed.
  const lastDiscoveryRef = useRef<Discovery | null>(null);
  if (discovery !== null) lastDiscoveryRef.current = discovery;
  const shown = discovery ?? lastDiscoveryRef.current;

  // Re-evaluate lock status at render time so that if an element was
  // unlocked elsewhere (e.g. by studying a different place/creature) the
  // dialog switches to the normal action set instead of showing Study.
  const isElementLocked = (id: string | undefined) =>
    id !== undefined && !unlockedElements.includes(id);

  const isPlaceLocked =
    shown?.kind === "locked-place" &&
    isElementLocked(shown.place.resource.element);
  const isCreatureLocked =
    shown?.kind === "locked-creature" &&
    isElementLocked(shown.creature.elementProduction.element);

  let title = "";
  let text = "";
  if (shown?.kind === "place" || (shown?.kind === "locked-place" && !isPlaceLocked)) {
    const place = shown.place;
    title = `You discovered ${place.name}`;
    text = place.description;
  } else if (isPlaceLocked) {
    title = `You came across ${shown.place.name}`;
    text = `${shown.place.description} You have not yet unlocked the magic of this place, so you cannot draw on it. You may study it from a distance and move on.`;
  } else if (shown?.kind === "creature" || (shown?.kind === "locked-creature" && !isCreatureLocked)) {
    const creature = shown.creature;
    title = `You encountered ${creature.name}`;
    text = `${creature.description} ${describeCreature(creature)}`;
  } else if (isCreatureLocked) {
    title = `You encountered ${shown.creature.name}`;
    text = `${shown.creature.description} ${describeCreature(shown.creature)} You have not yet unlocked its element, so you cannot engage with it directly.`;
  } else if (shown?.kind === "event") {
    title = shown.event.title;
    text = shown.event.text;
  } else if (shown?.kind === "nothing") {
    title = "Nothing stirs";
    text = "You explore for a while, but find nothing of note this time.";
  }

  // Compute tame cost / affordability for live creature encounters.
  const creatureForTame =
    shown?.kind === "creature" || (shown?.kind === "locked-creature" && !isCreatureLocked)
      ? shown?.creature
      : undefined;
  const tameCost = creatureForTame ? creatureForTame.rarity * 2 : 0;
  const tameElement = creatureForTame ? creatureForTame.elementProduction.element : "";
  const tameAvailable = (crystals[tameElement] ?? 0) >= tameCost;

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onDismiss() : undefined)}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{text}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-wrap gap-2 sm:flex-row">
          {isPlaceLocked && (
            <>
              <Button type="button" onClick={onStudy}>
                Study
              </Button>
              <Button type="button" variant="outline" onClick={onDismiss}>
                Okay
              </Button>
            </>
          )}
          {isCreatureLocked && (
            <>
              <Button type="button" onClick={onStudy}>
                Study
              </Button>
              <Button type="button" variant="outline" onClick={onLeave}>
                Leave alone
              </Button>
            </>
          )}
          {creatureForTame && (
            <>
              <Button type="button" onClick={onFight}>
                Fight
              </Button>
              <Button
                type="button"
                onClick={onTame}
                disabled={!tameAvailable}
                aria-label={
                  tameAvailable
                    ? `Tame for ${tameCost} ${tameElement} crystals`
                    : `Tame requires ${tameCost} ${tameElement} crystals — not enough`
                }
              >
                Tame ({tameCost} {tameElement} crystals)
              </Button>
              <Button type="button" variant="outline" onClick={onLeave}>
                Leave alone
              </Button>
            </>
          )}
          {shown?.kind === "place" && (
            <Button type="button" onClick={onCollect}>
              Collect {shown.place.resource.label}
            </Button>
          )}
          {(shown?.kind === "place" ||
            shown?.kind === "event" ||
            shown?.kind === "nothing" ||
            (shown?.kind === "locked-place" && !isPlaceLocked)) && (
            <Button type="button" variant="outline" onClick={onDismiss}>
              Okay
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CombatDialog({
  combat,
  currentHp,
  maxHp,
  spells,
  resources,
  elementLevels,
  onCast,
  onFlee,
  onClose,
}: {
  combat: CombatState | null;
  currentHp: number;
  maxHp: number;
  spells: Spell[];
  resources: Record<string, number>;
  elementLevels: Record<string, number>;
  onCast: (spellId: string) => void;
  onFlee: () => void;
  onClose: () => void;
}) {
  if (!combat) return null;
  const { creature, creatureHp, creatureMaxHp, log, phase } = combat;
  const open = true;
  const isOver = phase === "win" || phase === "fled" || phase === "lose";
  const title = isOver
    ? phase === "win"
      ? `Victory over ${creature.name}`
      : phase === "fled"
        ? "You fled from combat."
        : `${creature.name} defeats you`
    : `Fighting ${creature.name}`;
  return (
    <Dialog open={open} onOpenChange={(o) => (!o && isOver ? onClose() : undefined)}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            You: {currentHp} / {maxHp} HP. {creature.name}: {creatureHp} / {creatureMaxHp} HP.
          </DialogDescription>
        </DialogHeader>
        <div
          role="log"
          aria-live="polite"
          className="max-h-48 space-y-1 overflow-y-auto rounded-md border bg-muted/40 p-3 text-sm text-foreground"
        >
          {log.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        <DialogFooter className="flex flex-wrap gap-2 sm:flex-row">
          {phase === "player" && spells.length === 0 && (
            <p className="text-sm text-muted-foreground">
              You have no spells unlocked yet. You may only flee.
            </p>
          )}
          {phase === "player" &&
            spells.map((spell) => {
              const have = resources[fragmentResourceId(spell.element)] ?? 0;
              const affordable = have >= spell.cost;
              let label: string;
              if (spell.type === "offensive") {
                const { min, max } = getSpellDamageRange(spell, elementLevels);
                label = `Cast ${spell.name}, costs ${spell.cost} ${spell.element} fragments, deals ${min} to ${max} damage`;
              } else if (spell.type === "dot") {
                const dotDmg = spell.dotScaleElement
                  ? Math.max(1, elementLevels[spell.dotScaleElement] ?? 1)
                  : 1;
                label = `Cast ${spell.name}, costs ${spell.cost} ${spell.element} fragments, deals ${dotDmg} damage every ${spell.dotEvery ?? 2} enemy turns`;
              } else {
                label = `Cast ${spell.name}, costs ${spell.cost} ${spell.element} fragments, defensive buff`;
              }
              return (
                <Button
                  key={spell.id}
                  type="button"
                  onClick={() => onCast(spell.id)}
                  disabled={!affordable}
                  aria-label={
                    affordable
                      ? label
                      : `Cast ${spell.name} requires ${spell.cost} ${spell.element} fragments — not enough`
                  }
                >
                  {spell.name} ({spell.cost} {spell.element})
                </Button>
              );
            })}
          {phase === "player" && (
            <Button type="button" variant="outline" onClick={onFlee}>
              Flee
            </Button>
          )}
          {isOver && (
            <Button type="button" onClick={onClose} autoFocus>
              Continue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HomeBasePanel({
  masteredElement,
  masteredLevel,
  generation,
  tamedCreatures,
  resources,
  crystals,
  unlockedElements,
  buildings,
  currentHp,
  maxHp,
  isSleeping,
  onBuildBuilding,
  onGraduateApprentice,
  onStartSleep,
}: {
  masteredElement: string;
  masteredLevel: number;
  generation: number;
  tamedCreatures: TamedCreature[];
  resources: Record<string, number>;
  crystals: Record<string, number>;
  unlockedElements: string[];
  buildings: string[];
  currentHp: number;
  maxHp: number;
  isSleeping: boolean;
  onBuildBuilding: (buildingId: string, crystalCosts?: Record<string, number>) => boolean;
  onGraduateApprentice: (creatureId: string) => boolean;
  onStartSleep: () => boolean;
}) {
  const [announcement, setAnnouncement] = useState("");
  const [graduateOpen, setGraduateOpen] = useState(false);
  const [selectedCreatureId, setSelectedCreatureId] = useState<string | null>(null);

  const stableBuilt = buildings.includes("stable");
  const stableCosts = BUILDING_COSTS.stable;
  const canBuildStable =
    !stableBuilt &&
    Object.entries(stableCosts).every(([res, amt]) => (resources[res] ?? 0) >= amt);

  function handleBuildStable() {
    const ok = onBuildBuilding("stable");
    setAnnouncement(
      ok
        ? "Stable built. The Stable tab is now available."
        : "Not enough resources to build the stable.",
    );
  }

  const costsLabel = Object.entries(stableCosts)
    .map(([res, amt]) => `${amt} ${res}`)
    .join(" and ");

  const menagerieBuilt = buildings.includes("menagerie");
  const menagerieCosts = BUILDING_COSTS.menagerie;
  const menagerieCrystalCosts = Object.fromEntries(unlockedElements.map((id) => [id, 2]));
  const canBuildMenagerie =
    !menagerieBuilt &&
    Object.entries(menagerieCosts).every(([res, amt]) => (resources[res] ?? 0) >= amt) &&
    unlockedElements.every((id) => (crystals[id] ?? 0) >= 2);

  function handleBuildMenagerie() {
    const ok = onBuildBuilding("menagerie", menagerieCrystalCosts);
    setAnnouncement(
      ok
        ? "Menagerie built. The Menagerie tab is now available."
        : "Not enough resources or crystals to build the menagerie.",
    );
  }

  const menagerieResourceLabel = Object.entries(menagerieCosts)
    .map(([res, amt]) => `${amt} ${res}`)
    .join(", ");
  const menagerieCrystalLabel = unlockedElements.length > 0
    ? `2 of each unlocked crystal (${unlockedElements.join(", ")})`
    : "2 of each unlocked crystal";

  const wood = resources["wood"] ?? 0;
  const stone = resources["stone"] ?? 0;

  const hasApprentice = masteredLevel >= APPRENTICE_LEVEL;
  const masteredInfo = getElementInfo(masteredElement);
  const masteredName = masteredInfo?.name ?? masteredElement;

  // Eligible creatures to gift: tamed creatures whose production element
  // matches the player's mastered element. Group by template id with counts.
  const eligible = tamedCreatures
    .map((tc) => ({ id: tc.id, creature: getCreature(tc.id) }))
    .filter((x): x is { id: string; creature: Creature } =>
      Boolean(x.creature) && x.creature!.elementProduction.element === masteredElement,
    );
  const eligibleGroups = new Map<string, { creature: Creature; count: number }>();
  for (const { id, creature } of eligible) {
    const existing = eligibleGroups.get(id);
    if (existing) existing.count += 1;
    else eligibleGroups.set(id, { creature, count: 1 });
  }

  function openGraduate() {
    setSelectedCreatureId(eligibleGroups.size > 0 ? Array.from(eligibleGroups.keys())[0] : null);
    setGraduateOpen(true);
  }

  function confirmGraduate() {
    if (!selectedCreatureId) return;
    const ok = onGraduateApprentice(selectedCreatureId);
    if (ok) {
      setGraduateOpen(false);
      // After graduation the parent unmounts this panel; no further state needed.
    } else {
      setAnnouncement("Could not graduate the apprentice.");
    }
  }

  return (
    <>
      <p className="mt-1 text-sm text-muted-foreground">
        Generation {generation}. You are mastering {masteredName} (level {masteredLevel}).
      </p>

      <h3 className="mt-6 text-base font-medium text-foreground">Health</h3>
      <p className="mt-1 text-sm text-foreground tabular-nums" aria-label={`${currentHp} of ${maxHp} HP`}>
        {`${currentHp} / ${maxHp} HP`}
      </p>
      {currentHp < maxHp && (
        <div className="mt-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const ok = onStartSleep();
              setAnnouncement(
                ok
                  ? "You lie down to sleep for a minute. Your creatures keep working while you rest."
                  : "You can't sleep right now.",
              );
            }}
            disabled={isSleeping}
            aria-label={
              isSleeping
                ? "Already sleeping"
                : "Sleep for one minute to restore HP"
            }
          >
            {isSleeping ? "Sleeping…" : "Sleep (1 min)"}
          </Button>
        </div>
      )}

      <h3 className="mt-6 text-base font-medium text-foreground">Resources</h3>
      <p className="mt-1 text-sm text-foreground">Wood: {wood}</p>
      <p className="text-sm text-foreground">Stone: {stone}</p>

      {hasApprentice && (
        <>
          <h3 className="mt-6 text-base font-medium text-foreground">Apprentice</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            A young person has come to study under you. When you graduate them, you will gift them
            one of your {masteredName} creatures and {masteredLevel * 10} {masteredName.toLowerCase()} fragments,
            then send them out to found their own emporium. You will take their point of view as the
            next generation. Unlocked elements and discovered places carry over; everything else does not.
          </p>
          <div className="mt-3">
            <Button
              type="button"
              size="sm"
              onClick={openGraduate}
              aria-label="Graduate the apprentice"
            >
              Graduate apprentice
            </Button>
          </div>
        </>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        Construct buildings to expand what you can do. Each building unlocks a new tab.
      </p>
      <ul className="mt-4 grid gap-3" role="list">
        <li className="rounded-xl border bg-background p-4 text-left">
          <h3 className="text-base font-medium text-foreground">Stable</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Shelter your tamed non-magical creatures and let them breed. Costs {costsLabel}.
          </p>
          <div className="mt-3">
            {stableBuilt ? (
              <p className="text-sm text-foreground">Built. Open the Stable tab to manage it.</p>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleBuildStable}
                disabled={!canBuildStable}
                aria-label={
                  canBuildStable
                    ? `Build the stable for ${costsLabel}`
                    : `Building the stable requires ${costsLabel}`
                }
              >
                Build stable ({costsLabel})
              </Button>
            )}
          </div>
        </li>
        <li className="rounded-xl border bg-background p-4 text-left">
          <h3 className="text-base font-medium text-foreground">Menagerie</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            House your tamed magical creatures and train them to produce more fragments.
            Costs {menagerieResourceLabel}, plus {menagerieCrystalLabel}.
          </p>
          <div className="mt-3">
            {menagerieBuilt ? (
              <p className="text-sm text-foreground">Built. Open the Menagerie tab to manage it.</p>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleBuildMenagerie}
                disabled={!canBuildMenagerie}
                aria-label={
                  canBuildMenagerie
                    ? `Build the menagerie for ${menagerieResourceLabel} and ${menagerieCrystalLabel}`
                    : `Building the menagerie requires ${menagerieResourceLabel} and ${menagerieCrystalLabel}`
                }
              >
                Build menagerie ({menagerieResourceLabel})
              </Button>
            )}
          </div>
        </li>
      </ul>

      <Dialog open={graduateOpen} onOpenChange={(next) => (!next ? setGraduateOpen(false) : undefined)}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Graduate your apprentice</DialogTitle>
            <DialogDescription>
              Choose one of your tamed {masteredName} creatures to give to your apprentice. They will
              also receive {masteredLevel * 10} {masteredName.toLowerCase()} fragments. After graduation
              you will take the apprentice's point of view.
            </DialogDescription>
          </DialogHeader>
          {eligibleGroups.size === 0 ? (
            <p className="text-sm text-muted-foreground">
              You have no tamed {masteredName} creatures to gift. Tame one first.
            </p>
          ) : (
            <fieldset className="grid gap-2">
              <legend className="sr-only">Choose a creature</legend>
              {Array.from(eligibleGroups.entries()).map(([id, { creature, count }]) => (
                <label
                  key={id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background p-3 text-sm text-foreground"
                >
                  <input
                    type="radio"
                    name="graduate-creature"
                    value={id}
                    checked={selectedCreatureId === id}
                    onChange={() => setSelectedCreatureId(id)}
                  />
                  <span>
                    {creature.name}
                    {count > 1 ? ` (you have ${count})` : ""}
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          <DialogFooter className="flex flex-wrap gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setGraduateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmGraduate}
              disabled={!selectedCreatureId}
            >
              Graduate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </>
  );
}

function StablePanel({
  buildings,
  tamedCreatures,
  pendingBreedings,
  onStartBreeding,
}: {
  buildings: string[];
  tamedCreatures: TamedCreature[];
  pendingBreedings: GameState["pendingBreedings"];
  onStartBreeding: (
    creatureName: string,
    templateId: string,
    pairs: number,
    rarity: number,
  ) => { ok: boolean; success: boolean; chance: number; pairs: number };
}) {
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // Force re-render every 30s so the pending countdown stays fresh.
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  if (!buildings.includes("stable")) {
    return (
      <p className="mt-3 text-sm">
        You have not built a stable yet. Visit the Home Base tab to construct one.
      </p>
    );
  }

  // Resolve tamed instances into creature templates, then keep only non-magical
  // ones (the stable shelters non-magical creatures).
  const instances = tamedCreatures
    .flatMap((tc): Creature[] => {
      const c = getCreature(tc.id);
      return c && !c.magical ? [{ ...c, gender: tc.gender }] : [];
    });

  if (instances.length === 0) {
    return (
      <p className="mt-3 text-sm">
        Your stable is empty. Tame non-magical creatures during exploration to house them here.
      </p>
    );
  }

  // Group by creature name (species) so duplicates roll up into a single entry.
  const groups = new Map<string, Creature[]>();
  for (const c of instances) {
    const list = groups.get(c.name) ?? [];
    list.push(c);
    groups.set(c.name, list);
  }
  const sortedNames = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));

  // Total pairs currently locked in a breeding per species name.
  const lockedPairs = new Map<string, number>();
  for (const p of pendingBreedings) {
    lockedPairs.set(p.creatureName, (lockedPairs.get(p.creatureName) ?? 0) + p.pairs);
  }

  if (selectedName && groups.has(selectedName)) {
    const members = groups.get(selectedName)!;
    const totalMales = members.filter((m) => m.gender === "male").length;
    const totalFemales = members.filter((m) => m.gender === "female").length;
    const locked = lockedPairs.get(selectedName) ?? 0;
    const males = Math.max(0, totalMales - locked);
    const females = Math.max(0, totalFemales - locked);
    const pairs = Math.min(males, females);
    const rarity = members[0].rarity;
    const element = members[0].elementProduction.element;
    // Only unlocked (i.e. not busy breeding) members produce resources.
    const activeMembers = [
      ...members.filter((m) => m.gender === "male").slice(locked),
      ...members.filter((m) => m.gender === "female").slice(locked),
    ];
    const totalProduction = activeMembers.reduce((sum, m) => sum + getProductionAmount(m), 0);
    const chance = Math.max(0, Math.min(100, 81 - 6 * rarity));
    const speciesPendings = pendingBreedings.filter((p) => p.creatureName === selectedName);

    function handleBreed() {
      if (pairs <= 0) return;
      const res = onStartBreeding(selectedName!, members[0].id, pairs, rarity);
      if (!res.ok) return;
      if (res.success) {
        setAnnouncement(
          `Breeding succeeded with ${res.pairs} pair${res.pairs === 1 ? "" : "s"}. Parents will rest for 30 minutes.`,
        );
      } else {
        setAnnouncement(
          `Breeding failed (chance was ${res.chance}%). Try again when you're ready.`,
        );
      }
    }

    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setSelectedName(null)}
          className="text-sm text-foreground underline underline-offset-2 hover:no-underline focus-visible:no-underline"
        >
          Back to stable
        </button>
        <h3 className="mt-3 text-base font-medium text-foreground">{selectedName}</h3>
        <div className="mt-3 grid gap-2 text-sm text-foreground">
          <p className="flex justify-between">
            <span className="text-muted-foreground" aria-hidden="true">Total fragment production</span>
            <span className="font-medium tabular-nums" aria-hidden="true">{totalProduction} {element} per tick</span>
            <span className="sr-only">Total fragment production: {totalProduction} {element} fragments per tick</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground" aria-hidden="true">Available males</span>
            <span className="font-medium tabular-nums" aria-hidden="true">{males}</span>
            <span className="sr-only">Available males: {males}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground" aria-hidden="true">Available females</span>
            <span className="font-medium tabular-nums" aria-hidden="true">{females}</span>
            <span className="sr-only">Available females: {females}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground" aria-hidden="true">Male/female pairs</span>
            <span className="font-medium tabular-nums" aria-hidden="true">{pairs}</span>
            <span className="sr-only">Male/female pairs: {pairs}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground" aria-hidden="true">Breeding success chance</span>
            <span className="font-medium tabular-nums" aria-hidden="true">{chance}%</span>
            <span className="sr-only">Breeding success chance: {chance}%</span>
          </p>
          {locked > 0 && (
            <p className="flex justify-between">
              <span className="text-muted-foreground" aria-hidden="true">Pairs currently breeding</span>
              <span className="font-medium tabular-nums" aria-hidden="true">{locked}</span>
              <span className="sr-only">Pairs currently breeding: {locked}</span>
            </p>
          )}
        </div>
        {speciesPendings.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground" role="list">
            {speciesPendings.map((p) => {
              const minsLeft = Math.max(0, Math.ceil((p.readyAt - Date.now()) / 60000));
              return (
                <li key={p.id}>
                  {p.pairs} pair{p.pairs === 1 ? "" : "s"} breeding — about {minsLeft} minute
                  {minsLeft === 1 ? "" : "s"} left.
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4">
          <Button
            type="button"
            size="sm"
            onClick={handleBreed}
            disabled={pairs === 0}
            aria-label={
              pairs === 0
                ? `Breed ${selectedName}, requires at least one available male/female pair`
                : `Breed ${selectedName}, ${chance}% chance of success`
            }
          >
            Breed ({chance}%)
          </Button>
        </div>
        <div role="status" aria-live="polite" className="sr-only">
          {announcement}
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="mt-3 text-sm">
        Your non-magical creatures. Select one to see details and breed.
      </p>
      <ul className="mt-4 grid gap-2" role="list">
        {sortedNames.map((name) => {
          const count = groups.get(name)!.length;
          return (
            <li key={name}>
              <button
                type="button"
                onClick={() => setSelectedName(name)}
                className="flex w-full items-center justify-between rounded-lg border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:bg-muted"
                aria-label={`${name}, ${count}. View details.`}
              >
                <span>{name}</span>
                <span className="font-medium tabular-nums">{count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}


function MenageriePanel({
  buildings,
  tamedCreatures,
  magicalLevels,
  pendingBreedings,
  onTrainMagicalCreature,
  onStartBreeding,
}: {
  buildings: string[];
  tamedCreatures: TamedCreature[];
  magicalLevels: Record<string, number>;
  pendingBreedings: GameState["pendingBreedings"];
  onTrainMagicalCreature: (creatureId: string) => number | null;
  onStartBreeding: (
    creatureName: string,
    templateId: string,
    pairs: number,
    rarity: number,
  ) => { ok: boolean; success: boolean; chance: number; pairs: number };
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  if (!buildings.includes("menagerie")) {
    return (
      <p className="mt-3 text-sm">
        You have not built a menagerie yet. Visit the Home Base tab to construct one.
      </p>
    );
  }

  const instances = tamedCreatures
    .flatMap((tc): Creature[] => {
      const c = getCreature(tc.id);
      return c && c.magical ? [{ ...c, gender: tc.gender }] : [];
    });

  if (instances.length === 0) {
    return (
      <p className="mt-3 text-sm">
        Your menagerie is empty. Tame magical creatures during exploration to house them here.
      </p>
    );
  }

  // Group by template id; track individual members for gender breakdown.
  const groups = new Map<string, { creature: Creature; members: Creature[] }>();
  for (const c of instances) {
    const existing = groups.get(c.id);
    if (existing) existing.members.push(c);
    else groups.set(c.id, { creature: c, members: [c] });
  }
  const sortedIds = Array.from(groups.keys()).sort((a, b) =>
    groups.get(a)!.creature.name.localeCompare(groups.get(b)!.creature.name),
  );

  // Pairs locked in a breeding per species name.
  const lockedPairs = new Map<string, number>();
  for (const p of pendingBreedings) {
    lockedPairs.set(p.creatureName, (lockedPairs.get(p.creatureName) ?? 0) + p.pairs);
  }

  if (selectedId && groups.has(selectedId)) {
    const { creature, members } = groups.get(selectedId)!;
    const trainedLevel = magicalLevels[selectedId] ?? creature.level;
    const production = getProductionAmount(creature, trainedLevel);
    const consumption = getConsumptionAmount(creature);
    const productionElement = creature.elementProduction.element;
    const consumptionElement = creature.elementConsumption?.element ?? "";
    const totalMales = members.filter((m) => m.gender === "male").length;
    const totalFemales = members.filter((m) => m.gender === "female").length;
    const locked = lockedPairs.get(creature.name) ?? 0;
    const males = Math.max(0, totalMales - locked);
    const females = Math.max(0, totalFemales - locked);
    const pairs = Math.min(males, females);
    const chance = Math.max(0, Math.min(100, 81 - 6 * creature.rarity));
    const speciesPendings = pendingBreedings.filter((p) => p.creatureName === creature.name);

    function handleTrain() {
      const next = onTrainMagicalCreature(selectedId!);
      if (next !== null) {
        setAnnouncement(`${creature.name} trained to level ${next}.`);
      }
    }

    function handleBreed() {
      if (pairs <= 0) return;
      const res = onStartBreeding(creature.name, creature.id, pairs, creature.rarity);
      if (!res.ok) return;
      if (res.success) {
        setAnnouncement(
          `Breeding succeeded with ${res.pairs} pair${res.pairs === 1 ? "" : "s"}. Parents will rest for 30 minutes.`,
        );
      } else {
        setAnnouncement(`Breeding failed (chance was ${res.chance}%). Try again when you're ready.`);
      }
    }

    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="text-sm text-foreground underline underline-offset-2 hover:no-underline focus-visible:no-underline"
        >
          Back to menagerie
        </button>
        <h3 className="mt-3 text-base font-medium text-foreground">{creature.name}</h3>
        <div className="mt-3 grid gap-2 text-sm text-foreground">
          <p className="flex justify-between">
            <span className="text-muted-foreground" aria-hidden="true">Trained level</span>
            <span className="font-medium tabular-nums" aria-hidden="true">{trainedLevel}</span>
            <span className="sr-only">Trained level: {trainedLevel}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground" aria-hidden="true">Fragment production</span>
            <span className="font-medium tabular-nums" aria-hidden="true">+{production} {productionElement} per tick</span>
            <span className="sr-only">Fragment production: {production} {productionElement} fragments per tick</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground" aria-hidden="true">Fragment consumption</span>
            <span className="font-medium tabular-nums" aria-hidden="true">−{consumption} {consumptionElement} per tick</span>
            <span className="sr-only">Fragment consumption: {consumption} {consumptionElement} fragments consumed per tick</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground" aria-hidden="true">Available males</span>
            <span className="font-medium tabular-nums" aria-hidden="true">{males}</span>
            <span className="sr-only">Available males: {males}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground" aria-hidden="true">Available females</span>
            <span className="font-medium tabular-nums" aria-hidden="true">{females}</span>
            <span className="sr-only">Available females: {females}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground" aria-hidden="true">Male/female pairs</span>
            <span className="font-medium tabular-nums" aria-hidden="true">{pairs}</span>
            <span className="sr-only">Male/female pairs: {pairs}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground" aria-hidden="true">Breeding success chance</span>
            <span className="font-medium tabular-nums" aria-hidden="true">{chance}%</span>
            <span className="sr-only">Breeding success chance: {chance}%</span>
          </p>
          {locked > 0 && (
            <p className="flex justify-between">
              <span className="text-muted-foreground" aria-hidden="true">Pairs currently breeding</span>
              <span className="font-medium tabular-nums" aria-hidden="true">{locked}</span>
              <span className="sr-only">Pairs currently breeding: {locked}</span>
            </p>
          )}
        </div>
        {speciesPendings.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground" role="list">
            {speciesPendings.map((p) => {
              const minsLeft = Math.max(0, Math.ceil((p.readyAt - Date.now()) / 60000));
              return (
                <li key={p.id}>
                  {p.pairs} pair{p.pairs === 1 ? "" : "s"} breeding — about {minsLeft} minute
                  {minsLeft === 1 ? "" : "s"} left.
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleTrain}
            aria-label={`Train ${creature.name} from level ${trainedLevel} to level ${trainedLevel + 1}`}
          >
            Train (level {trainedLevel} → {trainedLevel + 1})
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleBreed}
            disabled={pairs === 0}
            aria-label={
              pairs === 0
                ? `Breed ${creature.name}, requires at least one available male/female pair`
                : `Breed ${creature.name}, ${chance}% chance of success`
            }
          >
            Breed ({chance}%)
          </Button>
        </div>
        <div role="status" aria-live="polite" className="sr-only">
          {announcement}
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="mt-3 text-sm">
        Your magical creatures. Select one to see details and train them.
      </p>
      <ul className="mt-4 grid gap-2" role="list">
        {sortedIds.map((id) => {
          const { creature, count } = groups.get(id)!;
          const trainedLevel = magicalLevels[id] ?? creature.level;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setSelectedId(id)}
                className="flex w-full items-center justify-between rounded-lg border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:bg-muted"
                aria-label={`${creature.name}, ${count}, level ${trainedLevel}. View details.`}
              >
                <span>{creature.name}</span>
                <span className="font-medium tabular-nums text-muted-foreground">
                  {count} · lv {trainedLevel}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

const TABS = [
  { value: "home-base", label: "Home Base" },
  { value: "fragments-and-crystals", label: "Fragments and Crystals" },
  { value: "places", label: "Places" },
  { value: "stable", label: "Stable" },
  { value: "menagerie", label: "Menagerie" },
  { value: "stats", label: "Stats" },
] as const;
