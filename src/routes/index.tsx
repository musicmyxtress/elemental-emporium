import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/lib/useGame";
import {
  ELEMENTS,
  UPGRADES,
  FRAGMENTS_PER_CRYSTAL,
  fragmentKey,
  gatherMultiplier,
  passiveMultiplier,
  BASE_GATHER,
  BASE_PASSIVE,
} from "@/lib/gameData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const game = useGame();

  if (!game.hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p role="status" className="text-muted-foreground">
          Loading your emporium…
        </p>
      </main>
    );
  }

  if (!game.state.element) {
    return <ChooseElement onChoose={game.chooseElement} />;
  }

  return <GameScreen game={game} />;
}

function ChooseElement({ onChoose }: { onChoose: (id: string) => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl font-semibold text-foreground sm:text-3xl"
      >
        Welcome to the Elemental Emporium
      </h1>
      <p className="mt-4 text-muted-foreground">
        You are a young mage. Choose the element you feel most drawn to.
      </p>

      <fieldset className="mt-8 border-0 p-0">
        <legend className="sr-only">Choose your element</legend>
        <ul className="grid gap-4 sm:grid-cols-2" role="list">
          {ELEMENTS.map((el) => (
            <li key={el.id}>
              <button
                type="button"
                onClick={() => onChoose(el.id)}
                className="group flex h-full w-full flex-col items-start gap-2 rounded-xl border bg-card p-5 text-left transition-colors hover:bg-muted focus-visible:bg-muted"
                aria-label={`Choose ${el.name}`}
              >
                <span aria-hidden="true" className="text-4xl">
                  {el.emoji}
                </span>
                <span className="text-lg font-medium text-foreground">{el.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </fieldset>
    </main>
  );
}

function GameScreen({ game }: { game: ReturnType<typeof useGame> }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const [announcement, setAnnouncement] = useState("");
  const [activeTab, setActiveTab] = useState("home-base");

  const el = ELEMENTS.find((e) => e.id === game.state.element)!;
  const fragKey = fragmentKey(el.id);
  const fragments = Math.floor(game.state.resources[fragKey] ?? 0);
  const crystals = game.state.crystals[el.id] ?? 0;
  const gatherAmt = BASE_GATHER * gatherMultiplier(game.state.upgrades);
  const passiveAmt = BASE_PASSIVE * passiveMultiplier(game.state.upgrades);

  function handleGather() {
    const gained = game.gather();
    setAnnouncement(`Gathered ${gained} ${el.name.toLowerCase()} fragments. You have ${fragments + gained}.`);
  }

  function handleForge() {
    const ok = game.forgeCrystal(el.id);
    if (ok) {
      setAnnouncement(
        `Forged 1 ${el.name.toLowerCase()} crystal from ${FRAGMENTS_PER_CRYSTAL} fragments. You have ${crystals + 1} crystal${crystals + 1 === 1 ? "" : "s"}.`,
      );
    } else {
      setAnnouncement(
        `Not enough fragments to forge. You need ${FRAGMENTS_PER_CRYSTAL} but only have ${fragments}.`,
      );
    }
  }

  function handleBuyUpgrade(upgradeId: string) {
    const def = UPGRADES.find((u) => u.id === upgradeId)!;
    const ok = game.buyUpgrade(upgradeId);
    if (ok) {
      setAnnouncement(`Purchased ${def.name}. ${def.description}`);
    } else {
      setAnnouncement(
        `Cannot purchase ${def.name}. You need ${def.crystalCost} ${el.name.toLowerCase()} crystal${def.crystalCost === 1 ? "" : "s"}.`,
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 pt-10 pb-32">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold text-foreground sm:text-3xl"
        >
          Elemental Emporium
        </h1>
        <p className="text-sm text-muted-foreground" aria-live="off">
          {`${fragments} fragment${fragments === 1 ? "" : "s"} · ${crystals} crystal${crystals === 1 ? "" : "s"}`}
        </p>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        activationMode="manual"
        className="mt-6"
      >
        <TabsContent value="home-base">
          <GatherPanel
            elementName={el.name}
            fragments={fragments}
            crystals={crystals}
            passiveAmount={passiveAmt}
            onExplore={() => {}}
          />
        </TabsContent>

        <TabsContent value="fragments">
          <ForgePanel
            elementName={el.name}
            fragments={fragments}
            crystals={crystals}
            onForge={handleForge}
          />
        </TabsContent>

        <TabsContent value="stable">
          <UpgradesPanel
            elementName={el.name}
            crystals={crystals}
            owned={game.state.upgrades}
            onBuy={handleBuyUpgrade}
          />
        </TabsContent>

        <TabsContent value="menagerie">
          <div className="py-12 text-center text-muted-foreground">
            <p>Your menagerie is empty for now.</p>
          </div>
        </TabsContent>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto max-w-3xl px-4 py-2">
            <TabsList className="flex h-auto gap-1">
              <TabsTrigger value="home-base">Home Base</TabsTrigger>
              <TabsTrigger value="fragments">Fragments and Crystals</TabsTrigger>
              <TabsTrigger value="stable">Stable</TabsTrigger>
              <TabsTrigger value="menagerie">Menagerie</TabsTrigger>
            </TabsList>
          </div>
        </div>
      </Tabs>

      <div className="mt-10">
        <button
          type="button"
          onClick={() => {
            game.reset();
            setAnnouncement("Your progress has been reset.");
          }}
          className="rounded-lg border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:bg-muted"
        >
          Reset and choose a new element
        </button>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </main>
  );
}

function GatherPanel({
  elementName,
  fragments,
  crystals,
  passiveAmount,
  onExplore,
}: {
  elementName: string;
  fragments: number;
  crystals: number;
  passiveAmount: number;
  onExplore: () => void;
}) {
  return (
    <section
      aria-label="Home Base"
      className="rounded-2xl border bg-card p-8"
    >
      <h2 className="text-lg font-semibold text-foreground">Resources</h2>
      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{elementName} fragments</dt>
          <dd className="font-medium tabular-nums text-foreground">{fragments}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{elementName} crystals</dt>
          <dd className="font-medium tabular-nums text-foreground">{crystals}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Passive income</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {passiveAmount} fragment{passiveAmount === 1 ? "" : "s"} / 5s
          </dd>
        </div>
      </dl>

      <div className="mt-6">
        <Button
          type="button"
          size="lg"
          onClick={onExplore}
        >
          Explore
        </Button>
      </div>
    </section>
  );
}

function ForgePanel({
  elementName,
  fragments,
  crystals,
  onForge,
}: {
  elementName: string;
  fragments: number;
  crystals: number;
  onForge: () => void;
}) {
  const canForge = fragments >= FRAGMENTS_PER_CRYSTAL;
  return (
    <section
      aria-label="Forge"
      className="rounded-2xl border bg-card p-8"
    >
      <h2 className="text-lg font-semibold text-foreground">Forge Crystals</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Convert {FRAGMENTS_PER_CRYSTAL} fragments into 1 crystal. Crystals are used to buy upgrades.
      </p>

      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{elementName} fragments</dt>
          <dd className="font-medium tabular-nums text-foreground">{fragments}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{elementName} crystals</dt>
          <dd className="font-medium tabular-nums text-foreground">{crystals}</dd>
        </div>
      </dl>

      <div className="mt-6">
        <Button
          type="button"
          onClick={onForge}
          disabled={!canForge}
          aria-label={
            canForge
              ? `Forge 1 ${elementName.toLowerCase()} crystal from ${FRAGMENTS_PER_CRYSTAL} fragments`
              : `Need ${FRAGMENTS_PER_CRYSTAL} ${elementName.toLowerCase()} fragments to forge a crystal. You have ${fragments}.`
          }
        >
          Forge crystal ({FRAGMENTS_PER_CRYSTAL} fragments)
        </Button>
      </div>
    </section>
  );
}

function UpgradesPanel({
  elementName,
  crystals,
  owned,
  onBuy,
}: {
  elementName: string;
  crystals: number;
  owned: string[];
  onBuy: (id: string) => void;
}) {
  return (
    <section
      aria-label="Upgrades"
      className="rounded-2xl border bg-card p-8"
    >
      <h2 className="text-lg font-semibold text-foreground">Upgrades</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        You have {crystals} {elementName.toLowerCase()} crystal{crystals === 1 ? "" : "s"}.
      </p>

      <ul className="mt-4 grid gap-3" role="list">
        {UPGRADES.map((u) => {
          const isOwned = owned.includes(u.id);
          const isUnlocked = !u.requires || owned.includes(u.requires);
          const canAfford = crystals >= u.crystalCost;
          const available = isUnlocked && !isOwned;

          let ariaLabel: string;
          if (isOwned) {
            ariaLabel = `${u.name}, owned. ${u.description}`;
          } else if (!isUnlocked) {
            const dep = UPGRADES.find((d) => d.id === u.requires)!;
            ariaLabel = `${u.name}, locked. Requires ${dep.name} first.`;
          } else if (!canAfford) {
            ariaLabel = `${u.name}, costs ${u.crystalCost} ${elementName.toLowerCase()} crystal${u.crystalCost === 1 ? "" : "s"}, not enough. ${u.description}`;
          } else {
            ariaLabel = `Buy ${u.name} for ${u.crystalCost} ${elementName.toLowerCase()} crystal${u.crystalCost === 1 ? "" : "s"}. ${u.description}`;
          }

          return (
            <li
              key={u.id}
              className="rounded-xl border bg-background p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-foreground">{u.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{u.description}</p>
                  {!isUnlocked && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Requires: {UPGRADES.find((d) => d.id === u.requires)?.name}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {isOwned ? (
                    <span
                      className="inline-block rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                      aria-hidden="true"
                    >
                      Owned
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onBuy(u.id)}
                      disabled={!available || !canAfford}
                      aria-label={ariaLabel}
                    >
                      {u.crystalCost} crystal{u.crystalCost === 1 ? "" : "s"}
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
