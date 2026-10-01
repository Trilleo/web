import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { continueAs, freshLogin, newPage } from "./support";

// Parallel tests share one database: each signs in as a fresh account (see
// comments.spec.ts), and browser-kept notes live in each test's own browser.

const NOTES = "/tools/notes/";

const notesList = (page: Page) =>
  page.getByRole("region", { name: "Your notes" });
const saveStatus = (page: Page) =>
  page.getByRole("region", { name: "Note" }).getByRole("status");

async function writeNote(page: Page, text: string) {
  await page.getByRole("button", { name: "New note" }).click();
  await page.getByLabel("Note text").fill(text);
  await expect(saveStatus(page)).toHaveText("Saved");
}

async function signIn(page: Page, login: string) {
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, login);
  await expect(page).toHaveURL(NOTES);
}

test("/tools lists Notes, and it's in the sitemap", async ({
  page,
  request,
}) => {
  await page.goto("/tools/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tools.");
  await page.getByRole("link", { name: /Notes/ }).click();
  await expect(page).toHaveURL(NOTES);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Notes");

  const sitemap = await (await request.get("/sitemap-0.xml")).text();
  expect(sitemap).toContain("https://www.trilleo.net/tools/</loc>");
  expect(sitemap).toContain("https://www.trilleo.net/tools/notes/</loc>");
});

test("clicking anywhere on a tool or game card opens it", async ({ page }) => {
  // The title's link covers the card, so a click near a corner (on the number,
  // the icon or the description) lands on it.
  await page.goto("/tools/");
  const notes = page.getByRole("listitem").filter({ hasText: "Notes" });
  const box = await notes.boundingBox();
  if (!box) throw new Error("no Notes card");
  await notes.click({ position: { x: box.width - 12, y: box.height - 12 } });
  await expect(page).toHaveURL(NOTES);

  await page.goto("/games/");
  await page
    .getByRole("listitem")
    .filter({ hasText: "Skygrid" })
    .click({ position: { x: 12, y: 12 } });
  await expect(page).toHaveURL("/games/skygrid/");
});

test("a card's icon fills in its accent on hover and on focus", async ({
  page,
}) => {
  await page.goto("/tools/");
  const accent = page.locator("[data-icon=notes] .icon-accent");
  const orange = "rgb(229, 71, 15)";
  await expect(accent).not.toHaveCSS("fill", orange);

  await page.getByRole("listitem").filter({ hasText: "Notes" }).hover();
  await expect(accent).toHaveCSS("fill", orange);

  await page.mouse.move(0, 0);
  await expect(accent).not.toHaveCSS("fill", orange);
  await page.getByRole("link", { name: "Notes", exact: true }).focus();
  await expect(accent).toHaveCSS("fill", orange);
});

test("signed out, notes stay in this browser", async ({ page }) => {
  await page.goto(NOTES);
  await expect(
    page.getByText("Notes are kept in this browser only."),
  ).toBeVisible();
  await writeNote(page, "# Kept locally\nin this browser");

  await page.reload();
  await expect(notesList(page).getByText("Kept locally")).toBeVisible();

  await notesList(page).getByText("Kept locally").click();
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(
    page
      .getByRole("region", { name: "Note" })
      .getByRole("heading", { name: "Kept locally" }),
  ).toBeVisible();
});

test("signing in keeps notes in the account, on every device", async ({
  page,
  browser,
  baseURL,
}) => {
  const me = freshLogin("writer");
  const title = `Notes of ${me}`;

  // Written before signing in, then moved into the account.
  await page.goto(NOTES);
  await writeNote(page, `${title}\nwritten signed out`);
  await signIn(page, me);
  await page.getByRole("button", { name: "Move to your account" }).click();
  await expect(page.getByText("Moved 1 note into your account.")).toBeVisible();
  await expect(notesList(page).getByText(title)).toBeVisible();

  // Another browser, same account.
  const laptop = await newPage(browser, baseURL);
  await laptop.goto(NOTES);
  await signIn(laptop, me);
  await notesList(laptop).getByText(title).click();
  const editor = laptop.getByLabel("Note text");
  await expect(editor).toHaveValue(`${title}\nwritten signed out`);
  await editor.fill(`${title}\nedited on the laptop`);
  await expect(saveStatus(laptop)).toHaveText("Saved");

  await page.reload();
  await notesList(page).getByText(title).click();
  await expect(page.getByLabel("Note text")).toHaveValue(
    `${title}\nedited on the laptop`,
  );
  await page.getByRole("button", { name: "Delete note" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(notesList(page).getByText(title)).toHaveCount(0);

  await laptop.reload();
  await expect(notesList(laptop).getByText(title)).toHaveCount(0);
  await laptop.context().close();
});

test("the data API is only for signed-in people", async ({ request }) => {
  const response = await request.get("/api/tools/notes/data");
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toEqual({
    error: "Sign in to save to your account.",
  });
});

test("Notes has no accessibility violations while writing", async ({
  page,
}) => {
  await page.goto(NOTES);
  await writeNote(page, "# Accessible\nA note being written.");
  await page.evaluate(() => document.fonts.ready);
  const { violations } = await new AxeBuilder({ page })
    .withTags([
      "wcag2a",
      "wcag2aa",
      "wcag21a",
      "wcag21aa",
      "wcag22aa",
      "best-practice",
    ])
    .analyze();
  expect(violations.map((violation) => violation.id)).toEqual([]);
});
