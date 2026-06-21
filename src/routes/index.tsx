import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/lib/useGame";
import {
  ELEMENTS,
  FRAGMENTS_PER_CRYSTAL,
  fragmentKey,
  BASE_PASSIVE,
  levelFromXp,
  xpProgressInLevel,
  playerMaxHp,
  creatureMaxHp,
  isSpellUnlocked,
  type ElementDef,
  type EventEffect,
  type SpellDef,
} from "@/lib/gameData";
import { CREATURES, PLACES, SPELLS } from "@/lib/seedData";
import { rollCreatureDamage, rollSpellDamage, type ActiveDot } from "@/lib/combat";
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
  const [encounterSeq, setEncounterSeq] = useState(0);
  const [encounterOpen, setEncounterOpen] = useState(false);
  const [graduateOpen, setGraduateOpen] = useState(false);

  const el = ELEMENTS.find((e) => e.id === game.state.element)!;
  const passiveAmt = BASE_PASSIVE;
  const wood = Math.floor(game.state.resources["wood"] ?? 0);
  const stone = Math.floor(game.state.resources["stone"] ?? 0);
  const maxHp = playerMaxHp(game.state.elementXp, game.state.unlockedElements);

  function handleExplore() {
    const pool = buildEncounterPool(game.state, Date.now());
    if (pool.length === 0) {
      setAnnouncement("Nothing to explore right now. Try again later.");
      return;
    }
    setCurrentEncounter(pool[0]);
    setEncounterSeq((s) => s + 1);
    setEncounterOpen(true);
  }

  function handleSleep() {
    const ok = game.startSleep();
    setAnnouncement(ok ? "You lie down to rest." : "You are already at full health.");
  }

  function handleCastUtilitySpell(spellId: string) {
    const spell = SPELLS.find((s) => s.id === spellId);
    const ok = game.castSpell(spellId);
    setAnnouncement(ok && spell ? `Cast ${spell.name}.` : "Unable to cast that spell.");
  }

  function handleTame(defId: string) {
    const ok = game.tameCreature(defId);
    const def = CREATURES.find((c) => c.id === defId)!;
    if (ok) {
      setAnnouncement(`Tamed ${def.name}. It has been added to your ${def.isMagical ? "menagerie" : "stable"}.`);
    } else if (def.isMagical ? !game.state.builtMenagerie : !game.state.builtStable) {
      setAnnouncement(`You need to build a ${def.isMagical ? "menagerie" : "stable"} first.`);
    } else {
      const cost = def.rarity * 2 + def.level;
      setAnnouncement(`Not enough ${def.elementId} crystals to tame ${def.name}. You need ${cost}.`);
    }
    setEncounterOpen(false);
  }

  function handleCollect(placeId: string) {
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

  function handleForge(elementId: string) {
    const elDef = ELEMENTS.find((e) => e.id === elementId)!;
    const currentFragments = Math.floor(game.state.resources[fragmentKey(elementId)] ?? 0);
    const currentCrystals = game.state.crystals[elementId] ?? 0;
    const ok = game.forgeCrystal(elementId);
    if (ok) {
      setAnnouncement(
        `Forged 1 ${elDef.name.toLowerCase()} crystal from ${FRAGMENTS_PER_CRYSTAL} fragments. You have ${currentCrystals + 1} crystal${currentCrystals + 1 === 1 ? "" : "s"}.`,
      );
    } else {
      setAnnouncement(
        `Not enough fragments to forge. You need ${FRAGMENTS_PER_CRYSTAL} but only have ${currentFragments}.`,
      );
    }
  }

  function handleGraduate(giftedCreatureDefId: string | null) {
    game.graduate(giftedCreatureDefId);
    setGraduateOpen(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 pt-10 pb-32">
      <header>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold text-foreground sm:text-3xl"
        >
          Elemental Emporium
        </h1>
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
            passiveAmount={passiveAmt}
            wood={wood}
            stone={stone}
            builtStable={game.state.builtStable}
            builtMenagerie={game.state.builtMenagerie}
            generationStartElements={game.state.generationStartElements}
            genCrystals={game.state.crystals}
            hasApprentice={game.state.hasApprentice}
            masteryXp={game.state.elementXp[el.id] ?? 0}
            playerHp={game.state.playerHp}
            playerMaxHp={maxHp}
            sleepUntil={game.state.sleepUntil}
            elementXp={game.state.elementXp}
            unlockedElements={game.state.unlockedElements}
            resources={game.state.resources}
            onExplore={handleExplore}
            onBuildStable={handleBuildStable}
            onBuildMenagerie={handleBuildMenagerie}
            onGraduate={() => setGraduateOpen(true)}
            onSleep={handleSleep}
            onCastUtilitySpell={handleCastUtilitySpell}
          />
        </TabsContent>

        <TabsContent value="fragments">
          <ForgePanel
            elements={ELEMENTS.filter((e) => game.state.unlockedElements.includes(e.id))}
            resources={game.state.resources}
            crystals={game.state.crystals}
            masteryElementId={el.id}
            onForge={handleForge}
          />
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
            onCollect={handleCollect}
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
          key={encounterSeq}
          open={encounterOpen}
          encounter={currentEncounter}
          unlockedElements={game.state.unlockedElements}
          builtStable={game.state.builtStable}
          builtMenagerie={game.state.builtMenagerie}
          crystals={game.state.crystals}
          cooldowns={game.state.cooldowns}
          playerHp={game.state.playerHp}
          playerMaxHp={maxHp}
          elementXp={game.state.elementXp}
          onCastSpell={game.castSpell}
          onCreatureDamage={game.takeDamage}
          onWinFight={game.winFight}
          onTame={handleTame}
          onCollect={handleCollect}
          onStudy={handleStudy}
          onEvent={handleEvent}
          onAnnounce={setAnnouncement}
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
  passiveAmount,
  wood,
  stone,
  builtStable,
  builtMenagerie,
  generationStartElements,
  genCrystals,
  hasApprentice,
  masteryXp,
  playerHp,
  playerMaxHp,
  sleepUntil,
  elementXp,
  unlockedElements,
  resources,
  onExplore,
  onBuildStable,
  onBuildMenagerie,
  onGraduate,
  onSleep,
  onCastUtilitySpell,
}: {
  elementName: string;
  passiveAmount: number;
  wood: number;
  stone: number;
  builtStable: boolean;
  builtMenagerie: boolean;
  generationStartElements: string[];
  genCrystals: Record<string, number>;
  hasApprentice: boolean;
  masteryXp: number;
  playerHp: number;
  playerMaxHp: number;
  sleepUntil: number | null;
  elementXp: Record<string, number>;
  unlockedElements: string[];
  resources: Record<string, number>;
  onExplore: () => void;
  onBuildStable: () => void;
  onBuildMenagerie: () => void;
  onGraduate: () => void;
  onSleep: () => void;
  onCastUtilitySpell: (spellId: string) => void;
}) {
  const masteryLevel = levelFromXp(masteryXp);
  const menagerieCrystalCost = generationStartElements.map((elId) => {
    const elDef = ELEMENTS.find((e) => e.id === elId);
    return `2 ${elDef?.name ?? elId} crystals`;
  });
  const utilitySpells = SPELLS.filter(
    (s) => s.kind === "utility" && isSpellUnlocked(s, elementXp, unlockedElements),
  );

  return (
    <div className="grid gap-6">
      <section aria-label="Home Base" className="rounded-2xl border bg-card p-8">
        <Button type="button" size="lg" onClick={onExplore}>
          Explore
        </Button>

        <h2 className="mt-6 text-lg font-semibold text-foreground">Health</h2>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>HP</span>
            <span>
              {playerHp} / {playerMaxHp}
            </span>
          </div>
          <Progress
            value={playerMaxHp > 0 ? (playerHp / playerMaxHp) * 100 : 0}
            className="mt-1.5"
            aria-label="Player HP"
          />
        </div>
        <div className="mt-3">
          <SleepControl
            playerHp={playerHp}
            playerMaxHp={playerMaxHp}
            sleepUntil={sleepUntil}
            onSleep={onSleep}
          />
        </div>

        <h2 className="mt-6 text-lg font-semibold text-foreground">Resources</h2>
        <dl className="mt-4 grid gap-2 text-sm">
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
      </section>

      <section aria-label="Utility Spells" className="rounded-2xl border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">Utility Spells</h2>
        {utilitySpells.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No utility spells unlocked yet.</p>
        ) : (
          <ul className="mt-4 grid gap-2" role="list">
            {utilitySpells.map((spell) => {
              const cost = spell.power ?? 0;
              const available = resources[fragmentKey(spell.elementId)] ?? 0;
              const canAfford = available >= cost;
              return (
                <li key={spell.id}>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onCastUtilitySpell(spell.id)}
                    disabled={!canAfford}
                    title={!canAfford ? `Need ${cost} ${spell.elementId} fragments` : undefined}
                  >
                    {spell.emoji} {spell.name}
                    {cost > 0 ? ` (${cost} fragments)` : ""}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
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
  elements,
  resources,
  crystals,
  masteryElementId,
  onForge,
}: {
  elements: ElementDef[];
  resources: Record<string, number>;
  crystals: Record<string, number>;
  masteryElementId: string;
  onForge: (elementId: string) => void;
}) {
  return (
    <section aria-label="Forge" className="rounded-2xl border bg-card p-8">
      <h2 className="text-lg font-semibold text-foreground">Forge Crystals</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Convert {FRAGMENTS_PER_CRYSTAL} fragments into 1 crystal. Crystals are used to build the
        Menagerie, where magical creatures are tamed.
      </p>
      <ul className="mt-6 grid gap-4" role="list">
        {elements.map((elDef) => {
          const fragments = Math.floor(resources[fragmentKey(elDef.id)] ?? 0);
          const elCrystals = crystals[elDef.id] ?? 0;
          const canForge = fragments >= FRAGMENTS_PER_CRYSTAL;
          const isMastery = elDef.id === masteryElementId;
          return (
            <li key={elDef.id} className="rounded-xl border bg-background p-4">
              <h3 className="text-sm font-medium text-foreground">
                {elDef.emoji} {elDef.name}
                {isMastery && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">(Mastery)</span>
                )}
              </h3>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{elDef.name} fragments</dt>
                  <dd className="font-medium tabular-nums text-foreground">{fragments}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{elDef.name} crystals</dt>
                  <dd className="font-medium tabular-nums text-foreground">{elCrystals}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onForge(elDef.id)}
                  disabled={!canForge}
                  aria-label={
                    canForge
                      ? `Forge 1 ${elDef.name.toLowerCase()} crystal from ${FRAGMENTS_PER_CRYSTAL} fragments`
                      : `Need ${FRAGMENTS_PER_CRYSTAL} ${elDef.name.toLowerCase()} fragments to forge a crystal. You have ${fragments}.`
                  }
                >
                  Forge crystal ({FRAGMENTS_PER_CRYSTAL} fragments)
                </Button>
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

function SleepControl({
  playerHp,
  playerMaxHp,
  sleepUntil,
  onSleep,
}: {
  playerHp: number;
  playerMaxHp: number;
  sleepUntil: number | null;
  onSleep: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const asleep = sleepUntil !== null && sleepUntil > now;
  useEffect(() => {
    if (!asleep) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [asleep]);

  if (asleep && sleepUntil !== null) {
    return (
      <p className="text-sm text-muted-foreground">
        Resting… <CooldownTimer expiresAt={sleepUntil} /> remaining.
      </p>
    );
  }

  const full = playerHp >= playerMaxHp;
  return (
    <Button type="button" size="sm" variant="outline" onClick={onSleep} disabled={full}>
      {full ? "Fully rested" : "Sleep"}
    </Button>
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

function PlaceCollectControl({
  placeId,
  cooldownExpiry,
  onCollect,
  size,
}: {
  placeId: string;
  cooldownExpiry: number;
  onCollect: (placeId: string) => void;
  size?: "sm" | "default" | "lg";
}) {
  const [now, setNow] = useState(Date.now());
  const onCooldown = cooldownExpiry > now;
  useEffect(() => {
    if (!onCooldown) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [onCooldown, cooldownExpiry]);
  if (onCooldown) {
    return <CooldownTimer expiresAt={cooldownExpiry} />;
  }
  return (
    <Button type="button" size={size} onClick={() => onCollect(placeId)}>
      Collect
    </Button>
  );
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
          const cooldownExpiry = def.kind === "elemental" ? cooldowns[placeId] ?? 0 : 0;
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
                  <PlaceCollectControl
                    placeId={placeId}
                    cooldownExpiry={cooldownExpiry}
                    onCollect={onCollect}
                    size="sm"
                  />
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
  crystals,
  cooldowns,
  playerHp,
  playerMaxHp,
  elementXp,
  onCastSpell,
  onCreatureDamage,
  onWinFight,
  onTame,
  onCollect,
  onStudy,
  onEvent,
  onAnnounce,
  onClose,
}: {
  open: boolean;
  encounter: EncounterItem;
  unlockedElements: string[];
  builtStable: boolean;
  builtMenagerie: boolean;
  crystals: Record<string, number>;
  cooldowns: Record<string, number>;
  playerHp: number;
  playerMaxHp: number;
  elementXp: Record<string, number>;
  onCastSpell: (spellId: string) => boolean;
  onCreatureDamage: (amount: number) => { died: boolean };
  onWinFight: (defId: string) => { fragmentsGained: number; xpGained: number };
  onTame: (defId: string) => void;
  onCollect: (placeId: string) => void;
  onStudy: (itemId: string, elementId: string) => void;
  onEvent: (effect: EventEffect, label: string) => void;
  onAnnounce: (message: string) => void;
  onClose: () => void;
}) {
  const creatureDef = encounter.kind === "creature" ? encounter.def : null;
  const creatureMaxHpVal = creatureDef ? creatureMaxHp(creatureDef) : 0;
  const [creatureHp, setCreatureHp] = useState(creatureMaxHpVal);
  const [activeDots, setActiveDots] = useState<ActiveDot[]>([]);
  const [combatLog, setCombatLog] = useState("");
  const [combatEnded, setCombatEnded] = useState(false);

  const availableSpells = SPELLS.filter(
    (s) =>
      (s.kind === "direct" || s.kind === "dot") && isSpellUnlocked(s, elementXp, unlockedElements),
  );

  function handleCastSpell(spell: SpellDef) {
    if (!creatureDef || combatEnded) return;
    const ok = onCastSpell(spell.id);
    if (!ok) {
      setCombatLog(`Not enough ${spell.elementId} fragments to cast ${spell.name}.`);
      return;
    }

    let hp = creatureHp;
    const messages: string[] = [];

    let dotDamage = 0;
    const survivingDots: ActiveDot[] = [];
    for (const dot of activeDots) {
      dotDamage += dot.damagePerTick;
      const remaining = dot.remainingRounds - 1;
      if (remaining > 0) survivingDots.push({ ...dot, remainingRounds: remaining });
    }
    if (dotDamage > 0) {
      hp -= dotDamage;
      messages.push(`Lingering effects deal ${dotDamage} damage.`);
    }

    const spellDamage = rollSpellDamage(spell, elementXp);
    hp -= spellDamage;
    messages.push(`You cast ${spell.name} for ${spellDamage} damage.`);
    if (spell.kind === "dot") {
      const remaining = (spell.durationRounds ?? 1) - 1;
      if (remaining > 0) {
        survivingDots.push({
          spellId: spell.id,
          elementId: spell.elementId,
          remainingRounds: remaining,
          damagePerTick: spellDamage,
        });
      }
    }
    setActiveDots(survivingDots);

    if (hp <= 0) {
      setCreatureHp(0);
      setCombatEnded(true);
      const { fragmentsGained, xpGained } = onWinFight(creatureDef.id);
      const log = `${messages.join(" ")} ${creatureDef.name} is defeated! Gained ${fragmentsGained} ${creatureDef.elementId} fragments and ${xpGained} XP.`;
      setCombatLog(log);
      onAnnounce(log);
      return;
    }
    setCreatureHp(hp);

    const retaliation = rollCreatureDamage(creatureDef);
    const { died } = onCreatureDamage(retaliation);
    messages.push(`${creatureDef.name} hits you for ${retaliation} damage.`);
    if (died) {
      messages.push("You have fallen! Resting to recover...");
      setCombatEnded(true);
    }
    const log = messages.join(" ");
    setCombatLog(log);
    onAnnounce(log);
  }

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
            <div className="py-2 text-sm text-muted-foreground space-y-3">
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
              <p>{encounter.def.description}</p>
              {unlockedElements.includes(encounter.def.elementId) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="flex justify-between text-xs">
                      <span>{encounter.def.name} HP</span>
                      <span>
                        {Math.max(0, creatureHp)} / {creatureMaxHpVal}
                      </span>
                    </div>
                    <Progress
                      value={
                        creatureMaxHpVal > 0
                          ? (Math.max(0, creatureHp) / creatureMaxHpVal) * 100
                          : 0
                      }
                      className="mt-1"
                      aria-label={`${encounter.def.name} HP`}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs">
                      <span>Your HP</span>
                      <span>
                        {playerHp} / {playerMaxHp}
                      </span>
                    </div>
                    <Progress
                      value={playerMaxHp > 0 ? (playerHp / playerMaxHp) * 100 : 0}
                      className="mt-1"
                      aria-label="Your HP"
                    />
                  </div>
                </div>
              )}
              {combatLog && <p>{combatLog}</p>}
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
                  {!combatEnded &&
                    (availableSpells.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No combat spells unlocked yet.
                      </p>
                    ) : (
                      availableSpells.map((spell) => (
                        <Button
                          key={spell.id}
                          type="button"
                          variant="outline"
                          onClick={() => handleCastSpell(spell)}
                        >
                          {spell.emoji} {spell.name}
                        </Button>
                      ))
                    ))}
                  {(() => {
                    const built = encounter.def.isMagical ? builtMenagerie : builtStable;
                    const cost = encounter.def.rarity * 2 + encounter.def.level;
                    const available = crystals[encounter.def.elementId] ?? 0;
                    const canAfford = available >= cost;
                    return (
                      <Button
                        type="button"
                        onClick={() => onTame(encounter.def.id)}
                        disabled={!built || !canAfford}
                        title={
                          !built
                            ? `Build a ${encounter.def.isMagical ? "Menagerie" : "Stable"} first`
                            : !canAfford
                              ? `Need ${cost} ${encounter.def.elementId} crystals`
                              : undefined
                        }
                      >
                        Tame ({cost} crystal{cost === 1 ? "" : "s"})
                      </Button>
                    );
                  })()}
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
            <DialogFooter className="flex-wrap items-center gap-2">
              {encounter.def.elementId &&
              !unlockedElements.includes(encounter.def.elementId) ? (
                <Button
                  type="button"
                  onClick={() => onStudy(encounter.def.id, encounter.def.elementId!)}
                >
                  Study {ELEMENTS.find((e) => e.id === encounter.def.elementId)?.name ?? encounter.def.elementId}
                </Button>
              ) : (
                <PlaceCollectControl
                  placeId={encounter.def.id}
                  cooldownExpiry={encounter.def.kind === "elemental" ? cooldowns[encounter.def.id] ?? 0 : 0}
                  onCollect={onCollect}
                />
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
