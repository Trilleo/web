import {
  COLLECTION_TIERS,
  COMBAT_DAMAGE_PER_LEVEL,
  GEAR_SLOTS,
  SET_BONUSES,
  SKILL_STATS,
  STAT_NAMES,
  playerStats,
  type GearSlot,
  type SkillId,
  type Stats,
  FORTUNE_PER_LEVEL,
  ISLAND_MAPS,
  ITEMS,
  MAX_LEVEL,
  RECIPES,
  RESOURCES,
  RESOURCE_IDS,
  SHOP,
  SKILLS,
  SKILL_NAMES,
  LEVEL_XP,
  collectionTier,
  craftableTimes,
  isUnlocked,
  itemName,
  levelOf,
  levelProgress,
  minionCapacity,
  minionInterval,
  nearMerchant,
  romanTier,
  unlocksAt,
  type GameState,
  type ItemId,
  type Recipe,
} from "../core";
import type { Tab } from "./controller";
import type { GameSession } from "./session";

export const TABS: readonly { id: Tab; label: string; key: string }[] = [
  { id: "skills", label: "Skills", key: "1" },
  { id: "gear", label: "Gear", key: "2" },
  { id: "bag", label: "Bag", key: "3" },
  { id: "craft", label: "Craft", key: "4" },
  { id: "minions", label: "Minions", key: "5" },
  { id: "collections", label: "Collections", key: "6" },
];

const smallButton =
  "press inline-flex min-h-8 items-center border border-ink px-2.5 font-mono text-xs uppercase tracking-wide hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40";

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className="h-1.5 w-full bg-chip"
    >
      <div
        className="h-full bg-ink transition-[width] duration-(--tr-dur-base) ease-swiss"
        style={{ width: `${String(Math.min(100, value * 100))}%` }}
      />
    </div>
  );
}

export function formatDuration(ms: number): string {
  if (ms < 60_000) return "under a minute";
  const minutes = Math.round(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  return hours > 0
    ? `${String(hours)}h ${String(minutes % 60).padStart(2, "0")}m`
    : `${String(minutes)}m`;
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-5 mb-2 type-label text-muted first:mt-0">{children}</h3>
  );
}

/** What a skill's levels add, e.g. "+12% drops · +6 Health". */
function skillPerks(skill: SkillId, level: number): string {
  const perks: string[] = [];
  if (skill === "farming" || skill === "mining" || skill === "foraging") {
    perks.push(`+${String(level * FORTUNE_PER_LEVEL)}% drops`);
  }
  if (skill === "combat") {
    perks.push(`+${String(level * COMBAT_DAMAGE_PER_LEVEL)}% damage`);
  }
  for (const [stat, per] of Object.entries(SKILL_STATS[skill]) as [
    keyof Stats,
    number,
  ][]) {
    perks.push(`+${formatStat(stat, per * level)} ${STAT_NAMES[stat]}`);
  }
  return perks.join(" · ");
}

function formatStat(stat: keyof Stats, value: number): string {
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return stat === "critChance" || stat === "critDamage" || stat === "strength"
    ? `${rounded}%`
    : rounded;
}

const SLOT_NAMES: Readonly<Record<GearSlot, string>> = {
  weapon: "Weapon",
  helmet: "Helmet",
  chestplate: "Chestplate",
  leggings: "Leggings",
  boots: "Boots",
};

function describeGear(stats: Partial<Stats>): string {
  return (Object.entries(stats) as [keyof Stats, number][])
    .map(([stat, value]) => `+${formatStat(stat, value)} ${STAT_NAMES[stat]}`)
    .join(" · ");
}

function GearPanel({
  state,
  session,
}: {
  state: GameState;
  session: GameSession;
}) {
  const stats = playerStats(state);
  const spare = Object.keys(state.inventory).filter(
    (item) => ITEMS[item]?.gear,
  );
  return (
    <div>
      <Heading>Stats</Heading>
      <dl className="grid grid-cols-2 gap-x-4 font-mono text-sm">
        {(Object.keys(STAT_NAMES) as (keyof Stats)[]).map((stat) => (
          <div
            key={stat}
            className="flex justify-between border-b border-hair py-1.5"
          >
            <dt className="text-muted">{STAT_NAMES[stat]}</dt>
            <dd>{formatStat(stat, stats[stat])}</dd>
          </div>
        ))}
      </dl>
      <Heading>Wearing</Heading>
      <ul className="flex flex-col">
        {GEAR_SLOTS.map((slot) => {
          const item = state.equipment[slot];
          const gear = item ? ITEMS[item]?.gear : undefined;
          return (
            <li
              key={slot}
              className="flex min-h-10 items-center justify-between gap-2 border-b border-hair py-1.5"
            >
              <span className="min-w-0">
                <span className="block type-label text-muted">
                  {SLOT_NAMES[slot]}
                </span>
                <span className="block">{item ? itemName(item) : "—"}</span>
                {gear && (
                  <span className="block font-mono text-xs text-muted">
                    {describeGear(gear.stats)}
                  </span>
                )}
              </span>
              {item && (
                <button
                  type="button"
                  className={smallButton}
                  onClick={() => session.act({ k: "unequip", slot })}
                  aria-label={`Take off ${itemName(item)}`}
                >
                  Take off
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm text-muted">
        A full set of four armor pieces adds a bonus:{" "}
        {Object.values(SET_BONUSES)
          .map((set) => `${set.name} ${describeGear(set.stats)}`)
          .join("; ")}
        .
      </p>
      <Heading>In your bag</Heading>
      {spare.length === 0 ? (
        <p className="text-sm text-muted">
          No gear to put on. Swords and armor are in Craft; the merchant sells a
          Wooden Sword.
        </p>
      ) : (
        <ul className="flex flex-col">
          {spare.map((item) => {
            const gear = ITEMS[item]?.gear;
            return (
              <li
                key={item}
                className="flex min-h-10 items-center justify-between gap-2 border-b border-hair py-1.5"
              >
                <span className="min-w-0">
                  <span className="block">{itemName(item)}</span>
                  {gear && (
                    <span className="block font-mono text-xs text-muted">
                      {SLOT_NAMES[gear.slot]} · {describeGear(gear.stats)}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  className={smallButton}
                  onClick={() => session.act({ k: "equip", item })}
                  aria-label={`Put on ${itemName(item)}`}
                >
                  Put on
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SkillsPanel({ state }: { state: GameState }) {
  return (
    <ul className="flex flex-col gap-4">
      {SKILLS.map((skill) => {
        const xp = state.skills[skill];
        const level = levelOf(xp);
        const next = LEVEL_XP[level + 1];
        return (
          <li key={skill} className="flex flex-col gap-1.5">
            <p className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">{SKILL_NAMES[skill]}</span>
              <span className="font-mono text-sm">
                {level >= MAX_LEVEL ? "MAX" : `Lv ${String(level)}`}
              </span>
            </p>
            <Bar
              value={levelProgress(xp)}
              label={`${SKILL_NAMES[skill]} progress`}
            />
            <p className="flex justify-between font-mono text-xs text-muted">
              <span>
                {next === undefined
                  ? `${xp.toLocaleString("en")} XP`
                  : `${xp.toLocaleString("en")} / ${next.toLocaleString("en")} XP`}
              </span>
              <span>{skillPerks(skill, level)}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function BagPanel({
  state,
  session,
}: {
  state: GameState;
  session: GameSession;
}) {
  const trading = nearMerchant(state);
  const items = Object.entries(state.inventory).sort(([a], [b]) =>
    itemName(a).localeCompare(itemName(b)),
  );
  return (
    <div>
      {!trading && (
        <p className="mb-4 text-sm text-muted">
          Visit the merchant (<span className="font-mono">M</span>) in the Hub
          to buy tools and sell what you gather.
        </p>
      )}
      <Heading>Your bag</Heading>
      {items.length === 0 ? (
        <p className="text-sm text-muted">
          Empty. Walk into a tree or a crop to start.
        </p>
      ) : (
        <ul className="flex flex-col">
          {items.map(([item, n]) => {
            const price = ITEMS[item]?.price ?? 0;
            return (
              <li
                key={item}
                className="flex min-h-10 items-center justify-between gap-2 border-b border-hair py-1"
              >
                <span className="min-w-0">
                  {itemName(item)}{" "}
                  <span className="font-mono text-sm text-muted">
                    ×{n.toLocaleString("en")}
                  </span>
                </span>
                {trading && price > 0 && (
                  <span className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      className={smallButton}
                      onClick={() => session.act({ k: "sell", item, n: 1 })}
                      aria-label={`Sell one ${itemName(item)} for ${String(price)} coins`}
                    >
                      Sell 1
                    </button>
                    <button
                      type="button"
                      className={smallButton}
                      onClick={() => session.act({ k: "sell", item, n })}
                      aria-label={`Sell all ${itemName(item)} for ${String(price * n)} coins`}
                    >
                      All · {(price * n).toLocaleString("en")}
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {trading && (
        <>
          <Heading>Merchant’s wares</Heading>
          <ul className="flex flex-col">
            {SHOP.map(({ item, price }) => (
              <li
                key={item}
                className="flex min-h-10 items-center justify-between gap-2 border-b border-hair py-1"
              >
                <span>{itemName(item)}</span>
                <button
                  type="button"
                  className={smallButton}
                  disabled={state.coins < price}
                  onClick={() => session.act({ k: "buy", item, n: 1 })}
                  aria-label={`Buy ${itemName(item)} for ${String(price)} coins`}
                >
                  Buy · {price}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

const CRAFT_GROUPS: readonly { label: string; kinds: readonly string[] }[] = [
  { label: "Tools", kinds: ["tool"] },
  { label: "Weapons and armor", kinds: ["gear"] },
  { label: "Minions", kinds: ["minion"] },
  { label: "Enchanted", kinds: ["enchanted"] },
];

function RecipeRow({
  recipe,
  state,
  session,
}: {
  recipe: Recipe;
  state: GameState;
  session: GameSession;
}) {
  const times = craftableTimes(state, recipe);
  return (
    <li className="flex items-start justify-between gap-2 border-b border-hair py-2">
      <span className="min-w-0">
        <span className="block">{itemName(recipe.output)}</span>
        <span className="block font-mono text-xs text-muted">
          {Object.entries(recipe.inputs)
            .map(
              ([item, n]) =>
                `${itemName(item)} ${String(Math.min(state.inventory[item] ?? 0, n))}/${String(n)}`,
            )
            .join(" · ")}
        </span>
      </span>
      <button
        type="button"
        className={smallButton}
        disabled={times < 1}
        onClick={() => session.act({ k: "craft", recipe: recipe.id, times: 1 })}
        aria-label={`Craft ${itemName(recipe.output)}`}
      >
        Craft
      </button>
    </li>
  );
}

function CraftPanel({
  state,
  session,
}: {
  state: GameState;
  session: GameSession;
}) {
  const unlocked = RECIPES.filter((recipe) => isUnlocked(state, recipe));
  const locked = RECIPES.length - unlocked.length;
  return (
    <div>
      {CRAFT_GROUPS.map(({ label, kinds }) => {
        const recipes = unlocked.filter((recipe) =>
          kinds.includes(ITEMS[recipe.output]?.kind ?? ""),
        );
        if (recipes.length === 0) return null;
        return (
          <section key={label}>
            <Heading>{label}</Heading>
            <ul>
              {recipes.map((recipe) => (
                <RecipeRow
                  key={recipe.id}
                  recipe={recipe}
                  state={state}
                  session={session}
                />
              ))}
            </ul>
          </section>
        );
      })}
      <p className="mt-4 text-sm text-muted">
        {locked} more {locked === 1 ? "recipe unlocks" : "recipes unlock"} as
        your collections grow.
      </p>
    </div>
  );
}

function MinionsPanel({
  state,
  session,
  selected,
  now,
}: {
  state: GameState;
  session: GameSession;
  selected: number | null;
  now: number;
}) {
  const home = state.pos.island === "home";
  const owned = Object.keys(state.inventory).filter(
    (item) => ITEMS[item]?.minion,
  );
  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Minions work on the <span className="font-mono">_</span> slots of your
        island, even while you’re away. Walk up to a slot to place or empty one.
      </p>
      <ol className="flex flex-col">
        {state.minions.map((minion, slot) => {
          const tile = ISLAND_MAPS.home.slots[slot];
          const near =
            home &&
            tile !== undefined &&
            Math.abs(tile.x - state.pos.x) + Math.abs(tile.y - state.pos.y) ===
              1;
          return (
            <li
              key={slot}
              className={`flex flex-col gap-2 border-b border-hair py-3 ${selected === slot ? "border-l-2 border-l-accent pl-2" : ""}`}
            >
              <p className="flex justify-between gap-2">
                <span className="font-semibold">
                  {minion
                    ? `${itemName(minion.kind)} Minion ${romanTier(minion.tier)}`
                    : "Empty slot"}
                </span>
                <span className="type-label text-muted">Slot {slot + 1}</span>
              </p>
              {minion && <MinionStatus minion={minion} now={now} />}
              {near && (
                <div className="flex flex-wrap gap-1.5">
                  {minion ? (
                    <>
                      <button
                        type="button"
                        className={smallButton}
                        disabled={minion.stored === 0}
                        onClick={() => session.act({ k: "collect", slot })}
                      >
                        Collect
                      </button>
                      <button
                        type="button"
                        className={smallButton}
                        onClick={() => session.act({ k: "pickup", slot })}
                      >
                        Pick up
                      </button>
                    </>
                  ) : owned.length > 0 ? (
                    owned.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={smallButton}
                        onClick={() => session.act({ k: "place", slot, item })}
                      >
                        Place {itemName(item)}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted">
                      You have no minions to place. Craft one first.
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function MinionStatus({
  minion,
  now,
}: {
  minion: NonNullable<GameState["minions"][number]>;
  now: number;
}) {
  const capacity = minionCapacity(minion);
  const interval = minionInterval(minion);
  const full = minion.stored >= capacity;
  const left = (capacity - minion.stored) * interval - (now - minion.lastAt);
  return (
    <>
      <Bar
        value={minion.stored / capacity}
        label={`${itemName(minion.kind)} minion storage`}
      />
      <p className="flex justify-between font-mono text-xs text-muted">
        <span>
          {minion.stored} / {capacity}
        </span>
        <span>
          {full ? "Full: collect it!" : `Full in ${formatDuration(left)}`}
        </span>
      </p>
    </>
  );
}

function CollectionsPanel({ state }: { state: GameState }) {
  return (
    <ul className="flex flex-col">
      {RESOURCE_IDS.map((item) => {
        const n = state.collections[item] ?? 0;
        if (n === 0) {
          return (
            <li
              key={item}
              className="border-b border-hair py-2 font-mono text-sm text-muted"
            >
              ??? <span className="sr-only">(not found yet)</span>
            </li>
          );
        }
        const tier = collectionTier(n);
        const next = COLLECTION_TIERS[tier];
        const previous = COLLECTION_TIERS[tier - 1] ?? 0;
        const unlocks = next === undefined ? [] : unlocksAt(item, tier + 1);
        return (
          <li
            key={item}
            className="flex flex-col gap-1.5 border-b border-hair py-2"
          >
            <p className="flex justify-between gap-2">
              <span className="font-semibold">{RESOURCES[item].name}</span>
              <span className="font-mono text-sm">
                {tier === 0 ? "—" : romanTier(tier)}
              </span>
            </p>
            <Bar
              value={
                next === undefined ? 1 : (n - previous) / (next - previous)
              }
              label={`${RESOURCES[item].name} collection progress`}
            />
            <p className="font-mono text-xs text-muted">
              {n.toLocaleString("en")}
              {next !== undefined && ` / ${next.toLocaleString("en")}`}
              {unlocks.length > 0 && ` · next: ${unlocks.join(", ")}`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function PanelBody({
  tab,
  state,
  session,
  selectedSlot,
  now,
}: {
  tab: Tab;
  state: GameState;
  session: GameSession;
  selectedSlot: number | null;
  now: number;
}) {
  switch (tab) {
    case "skills":
      return <SkillsPanel state={state} />;
    case "gear":
      return <GearPanel state={state} session={session} />;
    case "bag":
      return <BagPanel state={state} session={session} />;
    case "craft":
      return <CraftPanel state={state} session={session} />;
    case "minions":
      return (
        <MinionsPanel
          state={state}
          session={session}
          selected={selectedSlot}
          now={now}
        />
      );
    case "collections":
      return <CollectionsPanel state={state} />;
  }
}

export type { ItemId };
