import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useGameState, type CollectResult, type GameState } from "@/lib/useGameState";
import { ELEMENTS, xpToNextLevel } from "@/lib/elements";
import { rollEvent, type RandomEvent } from "@/lib/events";
import { getPlace, rollUndiscoveredPlace, type Place } from "@/lib/places";
import { rollCreature, type Creature } from "@/lib/creatures";

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
    convertFragmentsToCrystal,
    spendCrystals,
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
    return <ChooseElementScreen onChoose={chooseElement} />;
  }

  return (
    <GameScreen
      discoveredPlaces={state.discoveredPlaces}
      resources={state.resources}
      crystals={state.crystals}
      placeCooldowns={state.placeCooldowns}
      shelvedPlaces={state.shelvedPlaces}
      shelvedCreatures={state.shelvedCreatures}
      unlockedElements={state.unlockedElements}
      onDiscoverPlace={discoverPlace}
      onShelvePlace={shelvePlace}
      onShelveCreature={shelveCreature}
      onApplyEvent={applyEvent}
      onCollectFromPlace={collectFromPlace}
      onConvertFragments={convertFragmentsToCrystal}
      onSpendCrystals={spendCrystals}
      elementLevels={state.elementLevels}
      elementXp={state.elementXp}
      onReset={reset}
    />
  );
}




function ChooseElementScreen({
  onChoose,
}: {
  onChoose: (e: (typeof ELEMENTS)[number]["id"]) => void;
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
        Welcome young mage. In you studies you have grown an affinity to an element. What element do
        you specialize in?
      </h1>

      <fieldset className="mt-10 border-0 p-0">
        <legend className="sr-only">Choose your specialized element</legend>
        <ul className="grid gap-4 sm:grid-cols-3" role="list">
          {ELEMENTS.map((el) => (
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
  discoveredPlaces,
  resources,
  crystals,
  placeCooldowns,
  shelvedPlaces,
  shelvedCreatures,
  unlockedElements,
  elementLevels,
  elementXp,
  onDiscoverPlace,
  onShelvePlace,
  onShelveCreature,
  onApplyEvent,
  onCollectFromPlace,
  onConvertFragments,
  onSpendCrystals,
  onReset,
}: {
  discoveredPlaces: string[];
  resources: Record<string, number>;
  crystals: Record<string, number>;
  placeCooldowns: Record<string, number>;
  shelvedPlaces: Record<string, number>;
  shelvedCreatures: Record<string, number>;
  unlockedElements: string[];
  elementLevels: GameState["elementLevels"];
  elementXp: GameState["elementXp"];
  onDiscoverPlace: (placeId: string) => void;
  onShelvePlace: (placeId: string, rarity: number) => void;
  onShelveCreature: (creatureId: string, rarity: number) => void;
  onApplyEvent: (effect: (s: GameState) => GameState) => void;
  onCollectFromPlace: (placeId: string) => CollectResult;
  onConvertFragments: (elementId: string) => boolean;
  onSpendCrystals: (elementId: string, amount: number) => boolean;
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
    const creature = rollCreature(shelvedCreatures);

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
    } else if (chosen.kind === "event" && chosen.event.apply) {
      onApplyEvent(chosen.event.apply);
    }
    setDiscovery(chosen);
  }

  function handleStudy() {
    if (discovery?.kind === "locked-place") {
      onShelvePlace(discovery.place.id, discovery.place.rarity);
    } else if (discovery?.kind === "locked-creature") {
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
    setDiscovery(null);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold text-foreground sm:text-3xl"
        >
          Mage's Path
        </h1>
        <Button type="button" onClick={handleExplore}>
          Explore
        </Button>
      </header>

      <Tabs defaultValue="home-base" className="mt-10">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <section
              aria-label={tab.label}
              className="rounded-2xl border bg-card p-8 text-muted-foreground"
            >
              <h2 className="text-lg font-medium text-foreground">{tab.label}</h2>
              {tab.value === "places" && (
                <PlacesPanel
                  discoveredPlaces={discoveredPlaces}
                  placeCooldowns={placeCooldowns}
                  onCollectFromPlace={onCollectFromPlace}
                />
              )}
              {tab.value === "resources" && <ResourcesPanel resources={resources} />}
              {tab.value === "fragments-and-crystals" && (
                <FragmentsAndCrystalsPanel
                  resources={resources}
                  crystals={crystals}
                  unlockedElements={unlockedElements}
                  onConvertFragments={onConvertFragments}
                />
              )}
              {tab.value === "stats" && (
                <StatsPanel elementLevels={elementLevels} elementXp={elementXp} />
              )}
            </section>
          </TabsContent>
        ))}
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
        onStudy={handleStudy}
        onCreatureAction={handleCreatureAction}
        onDismiss={() => setDiscovery(null)}
      />


    </main>
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
      setAnnouncement(`Collected 1 ${result.resourceLabel} from ${place.name}.`);
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

function ResourcesPanel({ resources }: { resources: Record<string, number> }) {
  const entries = Object.entries(resources).filter(([, n]) => n > 0);

  if (entries.length === 0) {
    return (
      <p className="mt-3 text-sm">
        You have no resources yet. Discover places and collect from them.
      </p>
    );
  }

  return (
    <ul className="mt-4 grid gap-2" role="list">
      {entries.map(([id, amount]) => (
        <li
          key={id}
          className="flex items-center justify-between rounded-lg border bg-background px-4 py-2 text-sm text-foreground"
        >
          <span>{id.replace(/-/g, " ")}</span>
          <span className="font-medium tabular-nums">{amount}</span>
        </li>
      ))}
    </ul>
  );
}

function StatsPanel({
  elementLevels,
  elementXp,
}: {
  elementLevels: GameState["elementLevels"];
  elementXp: GameState["elementXp"];
}) {
  return (
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
  );
}

function describeCreature(creature: Creature): string {
  const genderLabel = creature.gender === "male" ? "male" : "female";
  const magicLabel = creature.magical ? "magical" : "non-magical";
  const produces = `${creature.elementProduction.element} (${creature.elementProduction.amount}/tick)`;
  const consumes = creature.elementConsumption
    ? ` and consumes ${creature.elementConsumption.element} (${creature.elementConsumption.amount}/tick)`
    : "";
  return `A ${genderLabel}, ${magicLabel} creature that produces ${produces}${consumes}.`;
}

function DiscoveryDialog({
  discovery,
  onStudy,
  onCreatureAction,
  onDismiss,
}: {
  discovery: Discovery | null;
  onStudy: () => void;
  onCreatureAction: () => void;
  onDismiss: () => void;
}) {
  const open = discovery !== null;

  let title = "Nothing stirs";
  let text = "You explore for a while, but find nothing of note this time.";
  if (discovery?.kind === "place") {
    title = `You discovered ${discovery.place.name}`;
    text = discovery.place.description;
  } else if (discovery?.kind === "locked-place") {
    title = `You came across ${discovery.place.name}`;
    text = `${discovery.place.description} You have not yet unlocked the magic of this place, so you cannot draw on it. You may study it from a distance and move on.`;
  } else if (discovery?.kind === "creature") {
    title = `You encountered ${discovery.creature.name}`;
    text = `${discovery.creature.description} ${describeCreature(discovery.creature)}`;
  } else if (discovery?.kind === "locked-creature") {
    title = `You encountered ${discovery.creature.name}`;
    text = `${discovery.creature.description} ${describeCreature(discovery.creature)} You have not yet unlocked its element, so you cannot engage with it directly.`;
  } else if (discovery?.kind === "event") {
    title = discovery.event.title;
    text = discovery.event.text;
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onDismiss() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{text}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-wrap gap-2 sm:flex-row">
          {discovery?.kind === "locked-place" && (
            <Button type="button" onClick={onStudy}>
              Study and move on
            </Button>
          )}
          {discovery?.kind === "locked-creature" && (
            <>
              <Button type="button" onClick={onStudy}>
                Study
              </Button>
              <Button type="button" variant="outline" onClick={onCreatureAction}>
                Leave alone
              </Button>
            </>
          )}
          {discovery?.kind === "creature" && (
            <>
              <Button type="button" onClick={onCreatureAction}>
                Fight
              </Button>
              <Button type="button" onClick={onCreatureAction}>
                Tame
              </Button>
              <Button type="button" variant="outline" onClick={onCreatureAction}>
                Leave alone
              </Button>
            </>
          )}
          {(discovery?.kind === "place" ||
            discovery?.kind === "event" ||
            discovery?.kind === "nothing") && (
            <Button type="button" onClick={onDismiss}>
              Okay
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



const TABS = [
  { value: "home-base", label: "Home Base" },
  { value: "resources", label: "Resources" },
  { value: "fragments-and-crystals", label: "Fragments and Crystals" },
  { value: "places", label: "Places" },
  { value: "stable", label: "Stable" },
  { value: "menagerie", label: "Menagerie" },
  { value: "stats", label: "Stats" },
] as const;
