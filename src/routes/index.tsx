import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useGameState, type GameState, type ResourceKey } from "@/lib/useGameState";
import { ELEMENTS } from "@/lib/elements";
import { rollEvent, type RandomEvent } from "@/lib/events";
import {
  getPlace,
  rollUndiscoveredPlace,
  rollActionReward,
  type Place,
  type PlaceAction,
} from "@/lib/places";
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
    addResource,
    unlockLava,
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
      state={state}
      onDiscoverPlace={discoverPlace}
      onApplyEvent={applyEvent}
      onAddResource={addResource}
      onUnlockLava={unlockLava}
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
  | { kind: "event"; event: RandomEvent }
  | { kind: "nothing" };

function GameScreen({
  state,
  onDiscoverPlace,
  onApplyEvent,
  onAddResource,
  onUnlockLava,
  onReset,
}: {
  state: GameState;
  onDiscoverPlace: (placeId: string) => void;
  onApplyEvent: (effect: (s: GameState) => GameState) => void;
  onAddResource: (resource: ResourceKey, amount: number) => void;
  onUnlockLava: () => void;
  onReset: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const [discovery, setDiscovery] = useState<Discovery | null>(null);

  function handleExplore() {
    const place = rollUndiscoveredPlace(state.discoveredPlaces);
    const event = rollEvent();

    // Build a list of possible outcomes and pick one at random.
    const outcomes: Discovery[] = [];
    if (place) outcomes.push({ kind: "place", place });
    if (event) outcomes.push({ kind: "event", event });

    if (outcomes.length === 0) {
      setDiscovery({ kind: "nothing" });
      return;
    }

    const chosen = outcomes[Math.floor(Math.random() * outcomes.length)];
    if (chosen.kind === "place") {
      onDiscoverPlace(chosen.place.id);
      if (chosen.place.unlocksLava) onUnlockLava();
    } else if (chosen.kind === "event" && chosen.event.apply) {
      onApplyEvent(chosen.event.apply);
    }
    setDiscovery(chosen);
  }

  function handleCollect(action: PlaceAction) {
    const amount = rollActionReward(action, state);
    onAddResource(action.resource, amount);
    return amount;
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
                  discoveredPlaces={state.discoveredPlaces}
                  onCollect={handleCollect}
                />
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
        onCollect={handleCollect}
        onDismiss={() => setDiscovery(null)}
      />
    </main>
  );
}

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  water: "water fragments",
  stone: "stone fragments",
  lava: "lava fragments",
};

/**
 * Renders the action buttons for a place. Used both on first discovery (in the
 * dialog) and when revisiting a place from the Places tab. Reports the collected
 * amount through an aria-live region so screen readers announce the result.
 */
function PlaceActions({
  place,
  onCollect,
}: {
  place: Place;
  onCollect: (action: PlaceAction) => number;
}) {
  const [result, setResult] = useState<string>("");

  if (place.actions.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {place.actions.map((action) => (
          <Button
            key={action.id}
            type="button"
            variant="secondary"
            onClick={() => {
              const amount = onCollect(action);
              setResult(`You collected ${amount} ${RESOURCE_LABELS[action.resource]}.`);
            }}
          >
            {action.label}
          </Button>
        ))}
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-foreground">
        {result}
      </p>
    </div>
  );
}

function PlacesPanel({
  discoveredPlaces,
  onCollect,
}: {
  discoveredPlaces: string[];
  onCollect: (action: PlaceAction) => number;
}) {
  const places = discoveredPlaces
    .map((id) => getPlace(id))
    .filter((p): p is Place => Boolean(p));

  if (places.length === 0) {
    return (
      <p className="mt-3 text-sm">
        You have not discovered any places yet. Explore to find them.
      </p>
    );
  }

  return (
    <ul className="mt-4 grid gap-3" role="list">
      {places.map((place) => (
        <li
          key={place.id}
          className="rounded-xl border bg-background p-4 text-left"
        >
          <h3 className="text-base font-medium text-foreground">{place.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{place.description}</p>
          <PlaceActions place={place} onCollect={onCollect} />
        </li>
      ))}
    </ul>
  );
}

function DiscoveryDialog({
  discovery,
  onCollect,
  onDismiss,
}: {
  discovery: Discovery | null;
  onCollect: (action: PlaceAction) => number;
  onDismiss: () => void;
}) {
  const open = discovery !== null;

  let title = "Nothing stirs";
  let text = "You explore for a while, but find nothing of note this time.";
  if (discovery?.kind === "place") {
    title = `You discovered ${discovery.place.name}`;
    text = discovery.place.unlocksLava
      ? `${discovery.place.description} You have unlocked the element of lava.`
      : discovery.place.description;
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
        {discovery?.kind === "place" && (
          <PlaceActions place={discovery.place} onCollect={onCollect} />
        )}
        <DialogFooter>
          <Button type="button" onClick={onDismiss}>
            Okay
          </Button>
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
