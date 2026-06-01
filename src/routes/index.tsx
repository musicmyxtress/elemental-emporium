import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useGameState } from "@/lib/useGameState";
import { ELEMENTS, getElement } from "@/lib/elements";

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
  const [announced, setAnnounced] = useState(false);

  useEffect(() => {
    headingRef.current?.focus();
    setAnnounced(true);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-12">
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

      <section
        aria-labelledby="fragments-label"
        className="mt-10 rounded-2xl border bg-card p-8 text-center"
      >
        <h2 id="fragments-label" className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {info.fragmentName}s gathered
        </h2>
        {/* Polite live region: VoiceOver announces the running total as it grows. */}
        <p
          className="mt-3 text-6xl font-bold tabular-nums text-foreground"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="sr-only">{fragments} {info.fragmentName}s</span>
          <span aria-hidden="true">{fragments}</span>
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          You gather one {info.fragmentName} every five seconds.
        </p>
      </section>

      <p className="sr-only" role="status">
        {announced
          ? `You are now a ${info.name} mage. Fragments will accumulate automatically.`
          : ""}
      </p>

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
