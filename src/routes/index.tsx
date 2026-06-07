import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useGameState, type CollectResult, type GameState, BUILDING_COSTS, APPRENTICE_LEVEL } from "@/lib/useGameState";
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
  type Creature,
} from "@/lib/creatures";

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
  head: () => ({
    meta: [
      { title: "Mage's Path — An Accessible Incremental RPG" },
      {
        name: "description",
        content:
          "A VoiceOver-friendly incremental RPG. Choose your element and gather fragments of your mastered magic.",
      },
      { property: "og:title", content: "Mage's Path — An Accessible Incremental RPG" },
      {
        property: "og:description",
        content:
          "A VoiceOver-friendly incremental RPG. Choose your element and gather fragments of your mastered magic.",
      },
    ],
  }),
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
      elementLevels={state.elementLevels}
      elementXp={state.elementXp}
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
          if (starter) return { id, name: starter.name, emoji: starter.emoji, description: starter.description };
          const info = getElementInfo(id);
          if (!info) return null;
          return { id, name: info.name, emoji: info.emoji, description: `Master the ${info.name.toLowerCase()} element.` };
        })
        .filter((x): x is { id: string; name: string; emoji: string; description: string } => Boolean(x))
    : ELEMENTS.map((el) => ({ id: el.id, name: el.name, emoji: el.emoji, description: el.description }));

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
                aria-label={`Specialize in ${el.name}. ${el.description}`}
              >
                <span aria-hidden="true" className="text-4xl">
                  {el.emoji}
                </span>
                <span className="text-lg font-medium text-foreground">{el.name}</span>
                <span className="text-sm text-muted-foreground">{el.description}</span>
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
  tamedCreatures: string[];
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
  onTameCreature: (creatureId: string) => void;
  onBuildBuilding: (buildingId: string) => boolean;
  onAcknowledgeApprentice: () => void;
  onGraduateApprentice: (creatureId: string) => boolean;
  onStartBreeding: (
    creatureName: string,
    templateId: string,
    pairs: number,
    rarity: number,
  ) => { ok: boolean; success: boolean; chance: number; pairs: number };
  onDismissBreedingResult: (id: string) => void;
  onReset: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [creatureAnnouncement, setCreatureAnnouncement] = useState("");

  function handleExplore() {
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
      outcomes.push(
        locked ? { kind: "locked-creature", creature } : { kind: "creature", creature },
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

  // Fight and leave-alone remain stubs until combat is implemented.
  function handleFightOrLeave() {
    setDiscovery(null);
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
    setCreatureAnnouncement(`Tamed ${c.name} for ${cost} ${c.elementProduction.element} crystals.`);
    onTameCreature(c.id);
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
        {activeTab === "home-base" && (
          <Button type="button" onClick={handleExplore}>
            Explore
          </Button>
        )}
      </header>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as (typeof TABS)[number]["value"])}
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
                  buildings={buildings}
                  onBuildBuilding={onBuildBuilding}
                  onGraduateApprentice={onGraduateApprentice}
                />
              )}
              {tab.value === "stable" && (
                <StablePanel
                  buildings={buildings}
                  tamedCreatures={tamedCreatures}
                  pendingBreedings={pendingBreedings}
                  elementLevels={elementLevels}
                  onStartBreeding={onStartBreeding}
                />
              )}
              {tab.value === "fragments-and-crystals" && (
                <FragmentsAndCrystalsPanel
                  resources={resources}
                  crystals={crystals}
                  unlockedElements={unlockedElements}
                  discoveredElements={discoveredElements}
                  onConvertFragments={onConvertFragments}
                />

              )}
              {tab.value === "stats" && (
                <StatsPanel elementLevels={elementLevels} elementXp={elementXp} generation={generation} />
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
        elementLevels={elementLevels}
        onStudy={handleStudy}
        onFightOrLeave={handleFightOrLeave}
        onTame={handleTame}
        onDismiss={() => setDiscovery(null)}
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
  onConvertFragments,
}: {
  resources: Record<string, number>;
  crystals: Record<string, number>;
  unlockedElements: string[];
  discoveredElements: string[];
  onConvertFragments: (elementId: string) => boolean;
}) {
  const [announcement, setAnnouncement] = useState("");

  function handleConvert(elementId: string, label: string) {
    const ok = onConvertFragments(elementId);
    setAnnouncement(
      ok
        ? `Converted ${FRAGMENTS_PER_CRYSTAL} ${label} fragments into 1 ${label} crystal.`
        : `Not enough ${label} fragments. ${FRAGMENTS_PER_CRYSTAL} required.`,
    );
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
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm text-foreground">
              <div>
                <dt className="text-xs text-muted-foreground">Fragments</dt>
                <dd
                  className="font-medium tabular-nums"
                  aria-label={`${fragments} ${el.name} fragments`}
                >
                  {fragments}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Crystals</dt>
                <dd
                  className="font-medium tabular-nums"
                  aria-label={`${crystalCount} ${el.name} crystals`}
                >
                  {crystalCount}
                </dd>
              </div>
            </dl>
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
  generation,
}: {
  elementLevels: GameState["elementLevels"];
  elementXp: GameState["elementXp"];
  generation: number;
}) {
  return (
    <>
      <h3 className="text-base font-medium text-foreground">Generations</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        You are on generation {generation}.
      </p>
      <ul className="mt-4 grid gap-3" role="list">
        {ELEMENTS.map((el) => {
        const level = elementLevels[el.id] ?? 0;
        const xp = elementXp[el.id] ?? 0;
        const needed = level >= 1 ? xpToNextLevel(level) : 0;
        const pct = needed > 0 ? Math.min(100, Math.round((xp / needed) * 100)) : 0;
        return (
          <li
            key={el.id}
            className="rounded-xl border bg-background p-4 text-left"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-base font-medium text-foreground">
                <span aria-hidden="true" className="mr-2">
                  {el.emoji}
                </span>
                {el.name}
              </h3>
              <span
                className="text-sm font-medium tabular-nums text-foreground"
                aria-label={`Level ${level}`}
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
                  <div
                    className="h-full bg-foreground/70"
                    style={{ width: `${pct}%` }}
                  />
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

function describeCreature(creature: Creature, elementLevels?: Record<string, number>): string {
  const genderLabel = creature.gender === "male" ? "male" : "female";
  const magicLabel = creature.magical ? "magical" : "non-magical";
  const trainedLevels = elementLevels?.[creature.elementProduction.element] ?? 0;
  const produces = `${creature.elementProduction.element} (${getProductionAmount(creature, trainedLevels)}/tick)`;
  const consumes = creature.elementConsumption
    ? ` and consumes ${creature.elementConsumption.element} (${getConsumptionAmount(creature)}/tick)`
    : "";
  return `A ${genderLabel}, ${magicLabel} creature that produces ${produces}${consumes}.`;
}

function DiscoveryDialog({
  discovery,
  crystals,
  unlockedElements,
  elementLevels,
  onStudy,
  onFightOrLeave,
  onTame,
  onDismiss,
}: {
  discovery: Discovery | null;
  crystals: Record<string, number>;
  unlockedElements: string[];
  elementLevels: Record<string, number>;
  onStudy: () => void;
  onFightOrLeave: () => void;
  onTame: () => void;
  onDismiss: () => void;
}) {
  const open = discovery !== null;

  // Re-evaluate lock status at render time so that if an element was
  // unlocked elsewhere (e.g. by studying a different place/creature) the
  // dialog switches to the normal action set instead of showing Study.
  const isElementLocked = (id: string | undefined) =>
    id !== undefined && !unlockedElements.includes(id);

  const isPlaceLocked =
    discovery?.kind === "locked-place" &&
    isElementLocked(discovery.place.resource.element);
  const isCreatureLocked =
    discovery?.kind === "locked-creature" &&
    isElementLocked(discovery.creature.elementProduction.element);

  let title = "Nothing stirs";
  let text = "You explore for a while, but find nothing of note this time.";
  if (discovery?.kind === "place" || (discovery?.kind === "locked-place" && !isPlaceLocked)) {
    const place = discovery.place;
    title = `You discovered ${place.name}`;
    text = place.description;
  } else if (isPlaceLocked) {
    title = `You came across ${discovery.place.name}`;
    text = `${discovery.place.description} You have not yet unlocked the magic of this place, so you cannot draw on it. You may study it from a distance and move on.`;
  } else if (discovery?.kind === "creature" || (discovery?.kind === "locked-creature" && !isCreatureLocked)) {
    const creature = discovery.creature;
    title = `You encountered ${creature.name}`;
    text = `${creature.description} ${describeCreature(creature, elementLevels)}`;
  } else if (isCreatureLocked) {
    title = `You encountered ${discovery.creature.name}`;
    text = `${discovery.creature.description} ${describeCreature(discovery.creature, elementLevels)} You have not yet unlocked its element, so you cannot engage with it directly.`;
  } else if (discovery?.kind === "event") {
    title = discovery.event.title;
    text = discovery.event.text;
  }

  // Compute tame cost / affordability for live creature encounters.
  const creatureForTame =
    discovery?.kind === "creature" || (discovery?.kind === "locked-creature" && !isCreatureLocked)
      ? discovery?.creature
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
            <Button type="button" onClick={onStudy}>
              Study and move on
            </Button>
          )}
          {isCreatureLocked && (
            <>
              <Button type="button" onClick={onStudy}>
                Study
              </Button>
              <Button type="button" variant="outline" onClick={onFightOrLeave}>
                Leave alone
              </Button>
            </>
          )}
          {creatureForTame && (
            <>
              <Button type="button" onClick={onFightOrLeave}>
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
              <Button type="button" variant="outline" onClick={onFightOrLeave}>
                Leave alone
              </Button>
            </>
          )}
          {(discovery?.kind === "place" ||
            discovery?.kind === "event" ||
            discovery?.kind === "nothing" ||
            (discovery?.kind === "locked-place" && !isPlaceLocked)) && (
            <Button type="button" onClick={onDismiss}>
              Okay
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
  buildings,
  onBuildBuilding,
  onGraduateApprentice,
}: {
  masteredElement: string;
  masteredLevel: number;
  generation: number;
  tamedCreatures: string[];
  resources: Record<string, number>;
  buildings: string[];
  onBuildBuilding: (buildingId: string) => boolean;
  onGraduateApprentice: (creatureId: string) => boolean;
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

  const wood = resources["wood"] ?? 0;
  const stone = resources["stone"] ?? 0;

  const hasApprentice = masteredLevel >= APPRENTICE_LEVEL;
  const masteredInfo = getElementInfo(masteredElement);
  const masteredName = masteredInfo?.name ?? masteredElement;

  // Eligible creatures to gift: tamed creatures whose production element
  // matches the player's mastered element. Group by template id with counts.
  const eligible = tamedCreatures
    .map((id) => ({ id, creature: getCreature(id) }))
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
  elementLevels,
  onStartBreeding,
}: {
  buildings: string[];
  tamedCreatures: string[];
  pendingBreedings: GameState["pendingBreedings"];
  elementLevels: Record<string, number>;
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
    .map((id) => getCreature(id))
    .filter((c): c is Creature => Boolean(c) && !c!.magical);

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
        <dl className="mt-3 grid gap-2 text-sm text-foreground">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Total fragment production</dt>
            <dd
              className="font-medium tabular-nums"
              aria-label={`${totalProduction} ${element} fragments per tick`}
            >
              {totalProduction} {element} per tick
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Available males</dt>
            <dd className="font-medium tabular-nums">{males}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Available females</dt>
            <dd className="font-medium tabular-nums">{females}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Male/female pairs</dt>
            <dd className="font-medium tabular-nums">{pairs}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Breeding success chance</dt>
            <dd className="font-medium tabular-nums">{chance}%</dd>
          </div>
          {locked > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Pairs currently breeding</dt>
              <dd className="font-medium tabular-nums">{locked}</dd>
            </div>
          )}
        </dl>
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


const TABS = [
  { value: "home-base", label: "Home Base" },
  { value: "fragments-and-crystals", label: "Fragments and Crystals" },
  { value: "places", label: "Places" },
  { value: "stable", label: "Stable" },
  { value: "menagerie", label: "Menagerie" },
  { value: "stats", label: "Stats" },
] as const;
