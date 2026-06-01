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

  return <GameScreen fragments={state.fragments} element={state.element} onReset={reset} />;
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
  element,
  onReset,
}: {
  fragments: number;
  element: (typeof ELEMENTS)[number]["id"];
  onReset: () => void;
}) {
  const info = getElement(element);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Fragments accumulate silently in the background — referenced to avoid unused warnings.
  void fragments;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-12">
      <header>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="flex items-center gap-3 text-2xl font-semibold text-foreground sm:text-3xl"
        >
          <span aria-hidden="true" className="text-4xl">
            {info.emoji}
          </span>
          {info.name} Mage
        </h1>
        <p className="mt-2 text-muted-foreground">{info.description}</p>
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
    </main>
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
