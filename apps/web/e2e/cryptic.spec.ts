import { expect, test, type Page } from "@playwright/test";
import { adminPage } from "./support";

const today = () => new Date().toISOString().slice(0, 10);

/** A key with the cryptic scopes, made in the control panel. */
async function cryptKey(admin: Page): Promise<string> {
  await admin.goto("/admin/api/");
  await admin.getByLabel("Name").fill(`Cryptic bot ${String(Date.now())}`);
  await admin.getByRole("checkbox", { name: /cryptic:read/ }).check();
  await admin.getByRole("checkbox", { name: /cryptic:play/ }).check();
  await admin.getByRole("button", { name: "Make the app" }).click();
  await admin.getByLabel("Label (where it runs)").fill("Bot");
  await admin.getByRole("button", { name: "Make a key" }).click();
  return (
    (
      await admin.getByTestId("new-key").locator("[data-key]").textContent()
    )?.trim() ?? ""
  );
}

test("the admin sets today's clue, a bot plays it, and the answer stays locked", async ({
  browser,
  baseURL,
  request,
}) => {
  const admin = await adminPage(browser, baseURL);
  await admin.goto("/admin/cryptic/");
  // A retry finds today's puzzle already there.
  if ((await admin.getByTestId("cryptic-today").count()) === 0) {
    await admin.goto(`/admin/cryptic/new/?day=${today()}`);
    await admin
      .getByLabel("Clue (without the enumeration)")
      .fill("Silent arrangement to hear");
    await admin.getByLabel("Answer").fill("tinsels");
    // The editor says when the answer doesn't fit.
    await admin.getByLabel("Enumeration", { exact: true }).fill("6");
    await expect(
      admin.getByText("The answer as written is (7), not (6)."),
    ).toBeVisible();
    await admin.getByLabel("Answer").fill("listen");
    await expect(
      admin.getByText("The answer as written is (6): it fits."),
    ).toBeVisible();
    await admin
      .getByLabel("How it works (shown after its day)")
      .fill("An anagram of SILENT.");
    await admin.getByRole("button", { name: "Save" }).click();
    await expect(admin.getByText("Saved.")).toBeVisible();
  }
  // Live: the answer can't be changed any more.
  await admin.goto("/admin/cryptic/");
  await admin
    .getByTestId("cryptic-today")
    .getByRole("link", { name: "Edit" })
    .click();
  await expect(admin.getByLabel("Answer")).toBeDisabled();
  await expect(
    admin.getByRole("button", { name: "Delete this puzzle" }),
  ).toHaveCount(0);

  const key = await cryptKey(admin);
  const auth = { Authorization: `Bearer ${key}` };
  const clue = await request.get("/api/v1/cryptic/today", { headers: auth });
  expect(clue.status()).toBe(200);
  const puzzle = (await clue.json()) as Record<string, unknown>;
  expect(puzzle).toMatchObject({
    date: today(),
    enumeration: "(6)",
    answer: null,
  });

  const wrong = await request.post(`/api/v1/cryptic/days/${today()}/guesses`, {
    headers: auth,
    data: { player: { id: "42", name: "Ada" }, guess: "tinsel" },
  });
  expect(await wrong.json()).toMatchObject({ correct: false, tries: 1 });
  const right = await request.post(`/api/v1/cryptic/days/${today()}/guesses`, {
    headers: auth,
    data: { player: { id: "42", name: "Ada" }, guess: "Listen" },
  });
  expect(await right.json()).toMatchObject({
    correct: true,
    tries: 2,
    solved: true,
    rank: 1,
  });
  const board = await request.get(
    `/api/v1/cryptic/days/${today()}/leaderboard`,
    {
      headers: auth,
    },
  );
  expect(await board.json()).toMatchObject({
    solvers: 1,
    items: [{ rank: 1, player: { id: "42", name: "Ada" }, tries: 2 }],
  });

  // The admin sees who's playing.
  await admin.goto("/admin/cryptic/");
  await expect(admin.getByTestId("cryptic-today")).toContainText("solved");
});

test("drafts are saved without a day and can be deleted", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const clue = `Draft ${String(Date.now())}`;
  await admin.goto("/admin/cryptic/new/");
  await admin.getByLabel("Clue (without the enumeration)").fill(clue);
  await admin.getByLabel("Answer").fill("ice cream");
  await admin.getByRole("button", { name: "Save" }).click();
  await expect(admin.getByText("Saved.")).toBeVisible();
  // The enumeration came from the answer.
  await expect(admin.getByLabel("Enumeration", { exact: true })).toHaveValue(
    "3,5",
  );
  await admin.goto("/admin/cryptic/");
  await expect(admin.getByTestId("cryptic-drafts")).toContainText(clue);
  await admin.getByRole("link", { name: clue }).click();
  await admin.getByRole("button", { name: "Delete this puzzle" }).click();
  await expect(admin.getByText("Puzzle deleted.")).toBeVisible();
  await expect(admin.getByRole("link", { name: clue })).toHaveCount(0);
});
