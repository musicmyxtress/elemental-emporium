import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useGameState } from "@/lib/useGameState";
import { ELEMENTS, getElement } from "@/lib/elements";
import { rollEvent, type GameEvent } from "@/lib/events";
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
  const { state, hydrated, chooseElement, reset } = useGameState();

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

  return <GameScreen fragments={state.fragments} onReset={reset} />;
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

function GameScreen({
  fragments,
  onReset,
}: {
  fragments: number;
  onReset: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Fragments accumulate silently in the background — referenced to avoid unused warnings.
  void fragments;

  const [activeEvent, setActiveEvent] = useState<GameEvent | null>(null);
  const [noEvent, setNoEvent] = useState(false);

  function handleExplore() {
    const event = rollEvent();
    if (event) {
      setActiveEvent(event);
    } else {
      // No places or events have been added yet.
      setNoEvent(true);
    }
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

      <EventDialog
        event={activeEvent}
        noEvent={noEvent}
        onDismiss={() => {
          setActiveEvent(null);
          setNoEvent(false);
        }}
      />
    </main>
  );
}

function EventDialog({
  event,
  noEvent,
  onDismiss,
}: {
  event: GameEvent | null;
  noEvent: boolean;
  onDismiss: () => void;
}) {
  const open = event !== null || noEvent;

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onDismiss() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? event.title : "Nothing stirs"}</DialogTitle>
          <DialogDescription>
            {event
              ? event.text
              : "You explore for a while, but find nothing of note this time."}
          </DialogDescription>
        </DialogHeader>
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
