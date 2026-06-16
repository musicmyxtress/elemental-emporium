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
  BASE_PASSIVE,
  levelFromXp,
  xpProgressInLevel,
  type ElementDef,
  type EventEffect,
} from "@/lib/gameData";
import { CREATURES, PLACES } from "@/lib/seedData";
import { buildEncounterPool, type EncounterItem } from "@/lib/explore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
    const available = ELEMENTS.filter((e) => game.state.unlockedElements.includes(e.id));
    return <ChooseElement elements={available} onChoose={game.chooseElement} />;
  }

  return <GameScreen game={game} />;
}

function ChooseElement({
  elements,
  onChoose,
}: {
  elements: ElementDef[];
  onChoose: (id: string) => void;
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
          {elements.map((el) => (
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
  const [currentEncounter, setCurrentEncounter] = useState<EncounterItem | null>(null);
  const [encounterOpen, setEncounterOpen] = useState(false);
  const [graduateOpen, setGraduateOpen] = useState(false);

  const el = ELEMENTS.find((e) => e.id === game.state.element)!;
  const fragKey = fragmentKey(el.id);
  const fragments = Math.floor(game.state.resources[fragKey] ?? 0);
  const crystals = game.state.crystals[el.id] ?? 0;
  const passiveAmt = BASE_PASSIVE * passiveMultiplier(game.state.upgrades);
  const wood = Math.floor(game.state.resources["wood"] ?? 0);
  const stone = Math.floor(game.state.resources["stone"] ?? 0);

  function handleExplore() {
    const pool = buildEncounterPool(game.state, Date.now());
    if (pool.length === 0) {
      setAnnouncement("Nothing to explore right now. Try again later.");
      return;
    }
    setCurrentEncounter(pool[0]);
    setEncounterOpen(true);
  }

  function handleFight(defId: string) {
    const { fragmentsGained, xpGained } = game.fightCreature(defId);
    const def = CREATURES.find((c) => c.id === defId)!;
    setAnnouncement(
      `Fought ${def.name}. Gained ${fragmentsGained} ${def.elementId} fragments and ${xpGained} XP.`,
    );
    setEncounterOpen(false);
  }

  function handleTame(defId: string) {
    const ok = game.tameCreature(defId);
    const def = CREATURES.find((c) => c.id === defId)!;
    if (ok) {
      setAnnouncement(`Tamed ${def.name}. It has been added to your ${def.isMagical ? "menagerie" : "stable"}.`);
    } else {
      setAnnouncement(`You need to build a ${def.isMagical ? "menagerie" : "stable"} first.`);
    }
    setEncounterOpen(false);
  }

  function handleCollect(placeId: string) {
    const { gained, resource } = game.collectPlace(placeId);
    const def = PLACES.find((p) => p.id === placeId)!;
    if (gained > 0) {
      setAnnouncement(`Collected ${gained} ${resource} from ${def.name}.`);
    }
    setEncounterOpen(false);
  }

  function handleCollectDiscovered(placeId: string) {
    const { gained, resource } = game.collectPlace(placeId);
    const def = PLACES.find((p) => p.id === placeId)!;
    if (gained > 0) {
      setAnnouncement(`Collected ${gained} ${resource} from ${def.name}.`);
    }
  }

  function handleStudy(itemId: string, elementId: string) {
    game.studyEncounter(itemId, elementId);
    setAnnouncement(`Began studying ${elementId}. It will be unlocked in 1 hour.`);
    setEncounterOpen(false);
  }

  function handleEvent(effect: EventEffect, choiceLabel: string) {
    game.resolveEvent(effect);
    setAnnouncement(`${choiceLabel}.`);
    setEncounterOpen(false);
  }

  function handleBuildStable() {
    const ok = game.buildStable();
    if (ok) {
      setAnnouncement("Stable built. You can now tame non-magical creatures.");
    } else {
      setAnnouncement("Not enough resources to build the stable. You need 50 wood and 50 stone.");
    }
  }

  function handleBuildMenagerie() {
    const ok = game.buildMenagerie();
    if (ok) {
      setAnnouncement("Menagerie built. You can now tame magical creatures.");
    } else {
      setAnnouncement("Not enough resources to build the menagerie.");
    }
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

  function handleGraduate(giftedCreatureDefId: string | null) {
    game.graduate(giftedCreatureDefId);
    setGraduateOpen(false);
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
          <HomePanel
            elementName={el.name}
            fragments={fragments}
            crystals={crystals}
            passiveAmount={passiveAmt}
            wood={wood}
            stone={stone}
            builtStable={game.state.builtStable}
            builtMenagerie={game.state.builtMenagerie}
            generationStartElements={game.state.generationStartElements}
            genCrystals={game.state.crystals}
            hasApprentice={game.state.hasApprentice}
            masteryXp={game.state.elementXp[el.id] ?? 0}
            onExplore={handleExplore}
            onBuildStable={handleBuildStable}
            onBuildMenagerie={handleBuildMenagerie}
            onGraduate={() => setGraduateOpen(true)}
          />
        </TabsContent>

        <TabsContent value="fragments">
          <div className="grid gap-6">
            <ForgePanel
              elementName={el.name}
              fragments={fragments}
              crystals={crystals}
              onForge={handleForge}
            />
            <UpgradesPanel
              elementName={el.name}
              crystals={crystals}
              owned={game.state.upgrades}
              onBuy={handleBuyUpgrade}
            />
          </div>
        </TabsContent>

        <TabsContent value="stable">
          <StablePanel
            stable={game.state.stable}
            builtStable={game.state.builtStable}
            masteryElement={el.id}
          />
        </TabsContent>

        <TabsContent value="menagerie">
          <MenageriePanel
            menagerie={game.state.menagerie}
            builtMenagerie={game.state.builtMenagerie}
            masteryElement={el.id}
          />
        </TabsContent>

        <TabsContent value="places">
          <PlacesPanel
            discoveredPlaces={game.state.discoveredPlaces}
            cooldowns={game.state.cooldowns}
            onCollect={handleCollectDiscovered}
          />
        </TabsContent>

        <TabsContent value="stats">
          <StatsPanel
            elementXp={game.state.elementXp}
            unlockedElements={game.state.unlockedElements}
            generationNumber={game.state.generationNumber}
          />
        </TabsContent>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto max-w-3xl overflow-x-auto px-4 py-2">
            <TabsList className="flex h-auto gap-1">
              <TabsTrigger value="home-base">Home Base</TabsTrigger>
              <TabsTrigger value="fragments">Fragments and Crystals</TabsTrigger>
              <TabsTrigger value="stable">Stable</TabsTrigger>
              <TabsTrigger value="menagerie">Menagerie</TabsTrigger>
              <TabsTrigger value="places">Places</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
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

      {currentEncounter && (
        <EncounterPanel
          open={encounterOpen}
          encounter={currentEncounter}
          unlockedElements={game.state.unlockedElements}
          builtStable={game.state.builtStable}
          builtMenagerie={game.state.builtMenagerie}
          onFight={handleFight}
          onTame={handleTame}
          onCollect={handleCollect}
          onStudy={handleStudy}
          onEvent={handleEvent}
          onClose={() => setEncounterOpen(false)}
        />
      )}

      <GraduateDialog
        open={graduateOpen}
        stable={game.state.stable}
        menagerie={game.state.menagerie}
        elementXp={game.state.elementXp}
        masteryElement={el.id}
        masteryXp={game.state.elementXp[el.id] ?? 0}
        onGraduate={handleGraduate}
        onClose={() => setGraduateOpen(false)}
      />
    </main>
  );
}

function HomePanel({
  elementName,
  fragments,
  crystals,
  passiveAmount,
  wood,
  stone,
  builtStable,
  builtMenagerie,
  generationStartElements,
  genCrystals,
  hasApprentice,
  masteryXp,
  onExplore,
  onBuildStable,
  onBuildMenagerie,
  onGraduate,
}: {
  elementName: string;
  fragments: number;
  crystals: number;
  passiveAmount: number;
  wood: number;
  stone: number;
  builtStable: boolean;
  builtMenagerie: boolean;
  generationStartElements: string[];
  genCrystals: Record<string, number>;
  hasApprentice: boolean;
  masteryXp: number;
  onExplore: () => void;
  onBuildStable: () => void;
  onBuildMenagerie: () => void;
  onGraduate: () => void;
}) {
  const masteryLevel = levelFromXp(masteryXp);
  const menagerieCrystalCost = generationStartElements.map((elId) => {
    const elDef = ELEMENTS.find((e) => e.id === elId);
    return `2 ${elDef?.name ?? elId} crystals`;
  });

  return (
    <div className="grid gap-6">
      <section aria-label="Home Base" className="rounded-2xl border bg-card p-8">
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
            <dt className="text-muted-foreground">Wood</dt>
            <dd className="font-medium tabular-nums text-foreground">{wood}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Stone</dt>
            <dd className="font-medium tabular-nums text-foreground">{stone}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Passive income</dt>
            <dd className="font-medium tabular-nums text-foreground">
              {passiveAmount} fragment{passiveAmount === 1 ? "" : "s"} / 5s
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <Button type="button" size="lg" onClick={onExplore}>
            Explore
          </Button>
        </div>
      </section>

      {hasApprentice && (
        <section
          aria-label="Apprentice"
          className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-6"
        >
          <h2 className="text-lg font-semibold text-foreground">An Apprentice Has Arrived</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A young mage has come to learn from you. You may graduate them when you are ready.
            They will receive {masteryLevel * 5} {elementName} fragments and one creature of your
            choosing.
          </p>
          <div className="mt-4">
            <Button type="button" onClick={onGraduate}>
              Graduate Apprentice
            </Button>
          </div>
        </section>
      )}

      {!builtStable && (
        <section aria-label="Build Stable" className="rounded-2xl border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground">Build a Stable</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            House non-magical creatures. Costs 50 wood + 50 stone.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            You have {wood} wood and {stone} stone.
          </p>
          <div className="mt-4">
            <Button
              type="button"
              size="sm"
              onClick={onBuildStable}
              disabled={wood < 50 || stone < 50}
            >
              Build Stable
            </Button>
          </div>
        </section>
      )}

      {!builtMenagerie && (
        <section aria-label="Build Menagerie" className="rounded-2xl border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground">Build a Menagerie</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            House magical creatures. Costs 200 wood + 200 stone +{" "}
            {menagerieCrystalCost.join(", ")}.
          </p>
          <div className="mt-4">
            <Button
              type="button"
              size="sm"
              onClick={onBuildMenagerie}
              disabled={
                wood < 200 ||
                stone < 200 ||
                generationStartElements.some((elId) => (genCrystals[elId] ?? 0) < 2)
              }
            >
              Build Menagerie
            </Button>
          </div>
        </section>
      )}
    </div>
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
    <section aria-label="Forge" className="rounded-2xl border bg-card p-8">
      <h2 className="text-lg font-semibold text-foreground">Forge Crystals</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Convert {FRAGMENTS_PER_CRYSTAL} fragments into 1 crystal. Crystals are used to buy
        upgrades.
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
    <section aria-label="Upgrades" className="rounded-2xl border bg-card p-8">
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
            <li key={u.id} className="rounded-xl border bg-background p-4">
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
                    <span className="inline-block rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
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

function StablePanel({
  stable,
  builtStable,
  masteryElement,
}: {
  stable: ReturnType<typeof useGame>["state"]["stable"];
  builtStable: boolean;
  masteryElement: string;
}) {
  if (!builtStable) {
    return (
      <section aria-label="Stable" className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Build a Stable from the Home Base tab to house non-magical creatures.
        </p>
      </section>
    );
  }
  if (stable.length === 0) {
    return (
      <section aria-label="Stable" className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Your stable is empty. Tame non-magical creatures while exploring.
        </p>
      </section>
    );
  }
  return (
    <section aria-label="Stable" className="rounded-2xl border bg-card p-8">
      <h2 className="text-lg font-semibold text-foreground">Stable</h2>
      <ul className="mt-4 grid gap-3" role="list">
        {stable.map((tamed) => {
          const def = CREATURES.find((c) => c.id === tamed.defId);
          if (!def) return null;
          const output = def.rarity * (def.elementId === masteryElement ? 2 : 1);
          const elDef = ELEMENTS.find((e) => e.id === def.elementId);
          return (
            <li key={tamed.instanceId} className="rounded-xl border bg-background p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">
                  {def.emoji}
                </span>
                <div>
                  <h3 className="text-sm font-medium text-foreground">{def.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {elDef?.emoji} {elDef?.name} · Level {def.level} · {"★".repeat(def.rarity)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Produces {output} {def.elementId} fragment{output === 1 ? "" : "s"} / 5s
                    {def.elementId === masteryElement && " (mastery ×2)"}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MenageriePanel({
  menagerie,
  builtMenagerie,
  masteryElement,
}: {
  menagerie: ReturnType<typeof useGame>["state"]["menagerie"];
  builtMenagerie: boolean;
  masteryElement: string;
}) {
  if (!builtMenagerie) {
    return (
      <section aria-label="Menagerie" className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Build a Menagerie from the Home Base tab to house magical creatures.
        </p>
      </section>
    );
  }
  if (menagerie.length === 0) {
    return (
      <section aria-label="Menagerie" className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Your menagerie is empty. Tame magical creatures while exploring.
        </p>
      </section>
    );
  }
  return (
    <section aria-label="Menagerie" className="rounded-2xl border bg-card p-8">
      <h2 className="text-lg font-semibold text-foreground">Menagerie</h2>
      <ul className="mt-4 grid gap-3" role="list">
        {menagerie.map((tamed) => {
          const def = CREATURES.find((c) => c.id === tamed.defId);
          if (!def) return null;
          const consumed = def.rarity;
          const produced = def.rarity * 3 * (def.producedElementId === masteryElement ? 2 : 1);
          const consumedElDef = ELEMENTS.find((e) => e.id === def.consumedElementId);
          const producedElDef = ELEMENTS.find((e) => e.id === def.producedElementId);
          return (
            <li key={tamed.instanceId} className="rounded-xl border bg-background p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">
                  {def.emoji}
                </span>
                <div>
                  <h3 className="text-sm font-medium text-foreground">{def.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Level {def.level} · {"★".repeat(def.rarity)} · Magical
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Consumes {consumed} {consumedElDef?.name ?? def.consumedElementId} fragments / 5s
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Produces {produced} {producedElDef?.name ?? def.producedElementId} fragments / 5s
                    {def.producedElementId === masteryElement && " (mastery ×2)"}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CooldownTimer({ expiresAt }: { expiresAt: number }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()));
  useEffect(() => {
    const id = setInterval(() => {
      const left = Math.max(0, expiresAt - Date.now());
      setRemaining(left);
      if (left === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  const secs = Math.ceil(remaining / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const label = h > 0
    ? `${h}h ${String(m).padStart(2, "0")}m`
    : `${m}:${String(s).padStart(2, "0")}`;
  return <span className="text-xs text-muted-foreground">{label}</span>;
}

function PlacesPanel({
  discoveredPlaces,
  cooldowns,
  onCollect,
}: {
  discoveredPlaces: string[];
  cooldowns: Record<string, number>;
  onCollect: (placeId: string) => void;
}) {
  if (discoveredPlaces.length === 0) {
    return (
      <section aria-label="Places" className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">Explore to discover places.</p>
      </section>
    );
  }
  return (
    <section aria-label="Places" className="rounded-2xl border bg-card p-8">
      <h2 className="text-lg font-semibold text-foreground">Discovered Places</h2>
      <ul className="mt-4 grid gap-3" role="list">
        {discoveredPlaces.map((placeId) => {
          const def = PLACES.find((p) => p.id === placeId);
          if (!def) return null;
          const now = Date.now();
          const cooldownExpiry = cooldowns[placeId] ?? 0;
          const onCooldown = def.kind === "elemental" && cooldownExpiry > now;
          const elDef = def.elementId ? ELEMENTS.find((e) => e.id === def.elementId) : null;
          const yieldLabel =
            def.kind === "forest"
              ? "1 wood"
              : def.kind === "stone_mine"
                ? "1 stone"
                : `${def.rarity * 10} ${elDef?.name ?? def.elementId} fragments`;
          return (
            <li key={placeId} className="rounded-xl border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {def.emoji}
                  </span>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">{def.name}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">{def.description}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Yields: {yieldLabel}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {onCooldown ? (
                    <CooldownTimer expiresAt={cooldownExpiry} />
                  ) : (
                    <Button type="button" size="sm" onClick={() => onCollect(placeId)}>
                      Collect
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

function StatsPanel({
  elementXp,
  unlockedElements,
  generationNumber,
}: {
  elementXp: Record<string, number>;
  unlockedElements: string[];
  generationNumber: number;
}) {
  const unlocked = ELEMENTS.filter((e) => unlockedElements.includes(e.id));
  return (
    <section aria-label="Stats" className="rounded-2xl border bg-card p-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-foreground">Elemental Mastery</h2>
        <span className="text-sm text-muted-foreground">Gen {generationNumber}</span>
      </div>
      {unlocked.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No elements unlocked yet.</p>
      ) : (
        <ul className="mt-4 grid gap-4" role="list">
          {unlocked.map((el) => {
            const totalXp = elementXp[el.id] ?? 0;
            const { level, currentXp, neededXp } = xpProgressInLevel(totalXp);
            const pct = neededXp > 0 ? Math.round((currentXp / neededXp) * 100) : 100;
            return (
              <li key={el.id}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-foreground">
                    {el.emoji} {el.name}
                  </span>
                  <span className="text-muted-foreground">Level {level}</span>
                </div>
                <Progress value={pct} className="mt-1.5" aria-label={`${el.name} XP progress`} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {currentXp.toLocaleString()} / {neededXp.toLocaleString()} XP
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function EncounterPanel({
  open,
  encounter,
  unlockedElements,
  builtStable,
  builtMenagerie,
  onFight,
  onTame,
  onCollect,
  onStudy,
  onEvent,
  onClose,
}: {
  open: boolean;
  encounter: EncounterItem;
  unlockedElements: string[];
  builtStable: boolean;
  builtMenagerie: boolean;
  onFight: (defId: string) => void;
  onTame: (defId: string) => void;
  onCollect: (placeId: string) => void;
  onStudy: (itemId: string, elementId: string) => void;
  onEvent: (effect: EventEffect, label: string) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        {encounter.kind === "creature" && (
          <>
            <DialogHeader>
              <DialogTitle>
                {encounter.def.emoji} {encounter.def.name}
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 text-sm text-muted-foreground">
              {(() => {
                const elDef = ELEMENTS.find((e) => e.id === encounter.def.elementId);
                return (
                  <p>
                    {elDef?.emoji} {elDef?.name} · Level {encounter.def.level} ·{" "}
                    {"★".repeat(encounter.def.rarity)} ·{" "}
                    {encounter.def.isMagical ? "Magical" : "Non-magical"}
                  </p>
                );
              })()}
            </div>
            <DialogFooter className="flex-wrap gap-2">
              {!unlockedElements.includes(encounter.def.elementId) ? (
                <Button
                  type="button"
                  onClick={() => onStudy(encounter.def.id, encounter.def.elementId)}
                >
                  Study {ELEMENTS.find((e) => e.id === encounter.def.elementId)?.name ?? encounter.def.elementId}
                </Button>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={() => onFight(encounter.def.id)}>
                    Fight ({encounter.def.level + encounter.def.rarity * 5} fragments)
                  </Button>
                  <Button
                    type="button"
                    onClick={() => onTame(encounter.def.id)}
                    disabled={encounter.def.isMagical ? !builtMenagerie : !builtStable}
                    title={
                      encounter.def.isMagical && !builtMenagerie
                        ? "Build a Menagerie first"
                        : !encounter.def.isMagical && !builtStable
                          ? "Build a Stable first"
                          : undefined
                    }
                  >
                    Tame
                  </Button>
                </>
              )}
              <Button type="button" variant="ghost" onClick={onClose}>
                Leave
              </Button>
            </DialogFooter>
          </>
        )}

        {encounter.kind === "place" && (
          <>
            <DialogHeader>
              <DialogTitle>
                {encounter.def.emoji} {encounter.def.name}
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 text-sm text-muted-foreground">
              <p>{encounter.def.description}</p>
              {encounter.def.elementId && (
                <p className="mt-1">
                  {ELEMENTS.find((e) => e.id === encounter.def.elementId)?.emoji}{" "}
                  {ELEMENTS.find((e) => e.id === encounter.def.elementId)?.name}
                </p>
              )}
            </div>
            <DialogFooter className="flex-wrap gap-2">
              {encounter.def.elementId &&
              !unlockedElements.includes(encounter.def.elementId) ? (
                <Button
                  type="button"
                  onClick={() => onStudy(encounter.def.id, encounter.def.elementId!)}
                >
                  Study {ELEMENTS.find((e) => e.id === encounter.def.elementId)?.name ?? encounter.def.elementId}
                </Button>
              ) : (
                <Button type="button" onClick={() => onCollect(encounter.def.id)}>
                  Collect
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={onClose}>
                Leave
              </Button>
            </DialogFooter>
          </>
        )}

        {encounter.kind === "event" && (
          <>
            <DialogHeader>
              <DialogTitle>Encounter</DialogTitle>
            </DialogHeader>
            <div className="py-2 text-sm text-muted-foreground">
              <p>{encounter.def.text}</p>
            </div>
            <DialogFooter className="flex-wrap gap-2">
              {encounter.def.choices.map((choice) => (
                <Button
                  key={choice.label}
                  type="button"
                  variant="outline"
                  onClick={() => onEvent(choice.effect, choice.label)}
                >
                  {choice.label}
                </Button>
              ))}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GraduateDialog({
  open,
  stable,
  menagerie,
  elementXp,
  masteryElement,
  masteryXp,
  onGraduate,
  onClose,
}: {
  open: boolean;
  stable: ReturnType<typeof useGame>["state"]["stable"];
  menagerie: ReturnType<typeof useGame>["state"]["menagerie"];
  elementXp: Record<string, number>;
  masteryElement: string;
  masteryXp: number;
  onGraduate: (giftedCreatureDefId: string | null) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const masteryLevel = levelFromXp(masteryXp);
  const allowance = masteryLevel * 5;

  const eligibleCreatures = [...stable, ...menagerie].filter((t) => {
    const def = CREATURES.find((c) => c.id === t.defId);
    if (!def) return false;
    const lvl = levelFromXp(elementXp[def.elementId] ?? 0);
    return lvl >= 20;
  });
  const allCreatures = eligibleCreatures.length > 0 ? eligibleCreatures : [...stable, ...menagerie];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Graduate Apprentice</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            The apprentice will receive {allowance} {masteryElement} fragments as an allowance.
          </p>
          {allCreatures.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">Choose a creature to gift:</p>
              <ul className="grid gap-2" role="list">
                {allCreatures.map((tamed) => {
                  const def = CREATURES.find((c) => c.id === tamed.defId);
                  if (!def) return null;
                  const isSelected = selected === tamed.defId;
                  return (
                    <li key={tamed.instanceId}>
                      <button
                        type="button"
                        onClick={() => setSelected(isSelected ? null : tamed.defId)}
                        className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "hover:bg-muted"
                        }`}
                      >
                        {def.emoji} {def.name} — {def.isMagical ? "Magical" : "Non-magical"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">You have no creatures to gift.</p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onGraduate(selected)}
          >
            Graduate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
