import {
  ACCESSORIES,
  ACHIEVEMENTS,
  findAchievement,
  unlockedAccessories,
  unlockedBy,
  type AccessoryId,
} from "../core";
import type { PlayerView } from "./account";
import type { Records } from "./records";
import { RobotPicture } from "./SpriteSvg";

const pad = (value: number) => String(value).padStart(5, "0");

/** A best run with its place on the board. */
function bestLine(best: { score: number; rank: number } | null): string {
  return best ? `${pad(best.score)} · #${String(best.rank)}` : "None yet";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-t border-ink pt-2">
      <dt className="type-label text-muted">{label}</dt>
      <dd className="font-mono text-sm tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * Below the game: the player's record. Signed in, the server's (checked runs,
 * achievements, accessories); signed out, what this browser keeps.
 */
export function AccountPanel({
  player,
  records,
  signInHref,
  leaderboardHref,
  wearing,
  onWear,
}: {
  player: PlayerView | null;
  records: Records;
  signInHref: string | undefined;
  leaderboardHref: string;
  wearing: AccessoryId | null;
  onWear: ((accessory: AccessoryId | null) => void) | null;
}) {
  if (!player) {
    return (
      <section
        aria-labelledby="hotfix-you"
        className="grid-swiss gap-y-4 px-page pt-12 md:pt-16"
      >
        <h2
          id="hotfix-you"
          className="col-span-4 type-label md:col-span-2 md:col-start-1"
        >
          Your runs
        </h2>
        <div className="col-span-4 flex flex-col gap-4 md:col-span-6 md:col-start-3 xl:col-span-7 xl:col-start-3">
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Best" value={pad(records.best)} />
            <Stat label="Furthest" value={`${String(records.furthest)} m`} />
            <Stat label="Runs" value={String(records.runs)} />
            <Stat label="Tokens" value={String(records.tokens)} />
          </dl>
          <p className="text-[15px] leading-normal text-muted">
            Kept in this browser.{" "}
            {signInHref && (
              <>
                <a href={signInHref} className="text-ink underline">
                  Sign in
                </a>{" "}
                to have your runs checked and counted: you’ll earn achievements
                and accessories for the robot, and appear on the{" "}
              </>
            )}
            <a href={leaderboardHref} className="text-ink underline">
              leaderboards
            </a>
            .
          </p>
        </div>
      </section>
    );
  }

  const unlocked = unlockedAccessories(player.achievements);
  return (
    <section
      aria-labelledby="hotfix-you"
      className="grid-swiss gap-y-10 px-page pt-12 md:pt-16"
    >
      <h2
        id="hotfix-you"
        className="col-span-4 type-label md:col-span-2 md:col-start-1"
      >
        Your runs
      </h2>
      <div className="col-span-4 flex flex-col gap-4 md:col-span-6 md:col-start-3 xl:col-span-7 xl:col-start-3">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Stat label="Best (endless)" value={bestLine(player.endless)} />
          <Stat label="Today’s Daily Run" value={bestLine(player.daily)} />
          <Stat label="Furthest" value={`${String(player.furthest)} m`} />
          <Stat label="Runs" value={String(player.runs)} />
          <Stat label="Tokens" value={String(player.tokens)} />
          <Stat
            label="Achievements"
            value={`${String(player.achievements.length)} of ${String(ACHIEVEMENTS.length)}`}
          />
        </dl>
        <p className="text-[15px] leading-normal text-muted">
          Every run you finish here is checked by the server and counted.{" "}
          <a href={leaderboardHref} className="text-ink underline">
            See the leaderboards
          </a>
        </p>
      </div>

      <h3 className="col-span-4 type-label md:col-span-2 md:col-start-1">
        Look
      </h3>
      <fieldset className="col-span-4 md:col-span-6 md:col-start-3 xl:col-span-7 xl:col-start-3">
        <legend className="sr-only">What the robot wears</legend>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-7">
          {[null, ...ACCESSORIES.map((accessory) => accessory.id)].map((id) => {
            const name = id
              ? (ACCESSORIES.find((accessory) => accessory.id === id)?.name ??
                id)
              : "Nothing";
            const locked = id !== null && !unlocked.includes(id);
            const how = id ? unlockedBy(id) : undefined;
            return (
              <label
                key={id ?? "none"}
                className={`relative flex press cursor-pointer flex-col items-center gap-2 border p-2 has-[:disabled]:cursor-not-allowed has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${wearing === id ? "border-ink bg-chip" : "border-hair"} ${locked ? "opacity-40" : ""}`}
                title={locked && how ? `${how.name}: ${how.goal}` : undefined}
              >
                <input
                  type="radio"
                  name="hotfix-look"
                  className="sr-only"
                  checked={wearing === id}
                  disabled={locked || !onWear}
                  aria-describedby={locked ? `hotfix-look-${id}` : undefined}
                  onChange={() => {
                    onWear?.(id);
                  }}
                />
                <RobotPicture accessory={id} scale={2} />
                <span className="type-label">{name}</span>
                {locked && how && (
                  <span id={`hotfix-look-${id}`} className="sr-only">
                    Locked. Earn {how.name}: {how.goal}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      <h3 className="col-span-4 type-label md:col-span-2 md:col-start-1">
        Achievements
      </h3>
      <ul className="col-span-4 grid grid-cols-1 border-t border-ink md:col-span-6 md:col-start-3 md:grid-cols-2 xl:col-span-7 xl:col-start-3">
        {ACHIEVEMENTS.map((achievement) => {
          const earned = player.achievements.includes(achievement.id);
          const gives = achievement.unlocks
            ? ACCESSORIES.find((a) => a.id === achievement.unlocks)?.name
            : undefined;
          return (
            <li
              key={achievement.id}
              className={`flex items-start gap-3 border-b border-hair py-3 ${earned ? "" : "text-muted"}`}
            >
              <span
                aria-hidden="true"
                className={`mt-1 size-3 shrink-0 border border-ink ${earned ? "bg-accent" : ""}`}
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold">
                  {achievement.name}
                  <span className="sr-only">
                    {earned ? " (earned)" : " (not yet)"}
                  </span>
                </span>
                <span className="text-sm">
                  {achievement.goal}
                  {gives ? ` Unlocks the ${gives.toLowerCase()}.` : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** "Hello, world (the cap)" for an announcement. */
export function unlockedLine(ids: readonly string[]): string {
  return ids
    .map((id) => {
      const achievement = findAchievement(id);
      if (!achievement) return id;
      const gives = achievement.unlocks
        ? ACCESSORIES.find((a) => a.id === achievement.unlocks)?.name
        : undefined;
      return gives
        ? `${achievement.name} (the ${gives.toLowerCase()})`
        : achievement.name;
    })
    .join(", ");
}
