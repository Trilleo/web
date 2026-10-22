import { expect, test, type Page } from "@playwright/test";
import { continueAs, freshLogin } from "./support";

const GAME = "/games/hotfix/";

const field = (page: Page) => page.getByRole("application", { name: /Hotfix/ });

test("a run starts with Space, ends in a crash, and its best score is kept", async ({
  page,
}) => {
  await page.goto(GAME);
  await expect(field(page)).toBeFocused();
  await expect(page.getByTestId("best")).toHaveText("00000");

  // Standing still: the first obstacle ends the run within a few seconds.
  await page.keyboard.press("Space");
  const over = field(page).getByRole("status");
  await expect(over).toHaveText(/bug|stack trace|drone|404/, {
    timeout: 15_000,
  });
  const best = await page.getByTestId("best").textContent();
  expect(Number(best)).toBeGreaterThan(0);
  await expect(page.getByTestId("score")).toHaveText(best ?? "");

  // Kept in this browser; Space runs again.
  await page.reload();
  await expect(page.getByTestId("best")).toHaveText(best ?? "");
  await field(page).focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: /^Run/ })).toBeHidden();
});

test("leaving the game pauses it, and Space carries on", async ({ page }) => {
  await page.goto(GAME);
  await expect(field(page)).toBeFocused();
  const paused = field(page).getByText("Paused", { exact: true });
  await page.keyboard.press("Space");
  await page.getByRole("link", { name: "All games" }).focus();
  await expect(paused).toBeVisible();
  await field(page).focus();
  await page.keyboard.press("Space");
  await expect(paused).toBeHidden();
});

test("the games list links to Hotfix", async ({ page }) => {
  await page.goto("/games/");
  await page
    .getByRole("listitem")
    .filter({ hasText: "Hotfix" })
    .click({ position: { x: 12, y: 12 } });
  await expect(page).toHaveURL(GAME);
});

test("signed in, a run is checked by the server, ranked, and can be watched", async ({
  page,
}) => {
  const me = freshLogin("runner");
  const ticket = page.waitForResponse(
    (response) =>
      response.url().includes("/api/games/hotfix/runs") && response.ok(),
  );
  await page.goto(`/auth/github?next=${encodeURIComponent(GAME)}`);
  await continueAs(page, me);
  await expect(page).toHaveURL(GAME);
  await ticket;
  await expect(field(page)).toBeFocused();

  await page.keyboard.press("Space");
  await expect(field(page).getByRole("status")).toHaveText(
    /bug|stack trace|drone|404/,
    { timeout: 15_000 },
  );
  await expect(field(page).getByText("New best")).toBeVisible();
  await expect(field(page).getByTestId("unlocked")).toContainText(
    "Hello, world",
  );

  // The cap it unlocked can be worn, and stays on.
  await page.getByText("Cap", { exact: true }).click();
  await expect(page.getByRole("radio", { name: /Cap/ })).toBeChecked();
  await page.waitForResponse((r) => r.url().includes("/api/games/hotfix/look"));
  await page.reload();
  await expect(page.getByRole("radio", { name: /Cap/ })).toBeChecked();

  // On the board, and watchable.
  await page.goto(`${GAME}leaderboard/`);
  const row = page.getByRole("listitem").filter({ hasText: me });
  await expect(row).toBeVisible();
  await row.getByRole("link", { name: /^Watch/ }).click();
  await field(page).getByRole("button", { name: "Watch" }).click();
  await expect(field(page).getByRole("status")).toHaveText(/^Replay over/, {
    timeout: 15_000,
  });
});

test("the Daily Run keeps its own best", async ({ page }) => {
  await page.goto(GAME);
  await expect(field(page)).toBeFocused();
  await page.locator("label", { hasText: /^Daily Run ·/ }).click();
  await expect(page.getByText("Today’s best")).toBeVisible();
  await field(page).focus();
  await page.keyboard.press("Space");
  await expect(field(page).getByRole("status")).toBeVisible({
    timeout: 15_000,
  });
  expect(Number(await page.getByTestId("best").textContent())).toBeGreaterThan(
    0,
  );
  await page.locator("label", { hasText: /^Endless$/ }).click();
  await expect(page.getByTestId("best")).toHaveText("00000");
});
