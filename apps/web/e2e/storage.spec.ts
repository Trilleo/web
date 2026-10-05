import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  adminPage,
  continueAs,
  freshLogin,
  hydrated,
  newPage,
} from "./support";

// Uploads go to the e2e server's in-memory storage (STORAGE_URL=memory:// in
// playwright.config.ts), through the same signed part URLs OBS would give.

/** A 1×1 PNG. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
  "base64",
);

const unique = (base: string) =>
  `${base}-${Math.random().toString(36).slice(2, 8)}`;

async function uploadAsAdmin(page: Page, name: string, buffer: Buffer) {
  await page.goto("/admin/files/");
  await hydrated(page);
  await page.getByTestId("file-input").setInputFiles({
    name,
    mimeType: "application/octet-stream",
    buffer,
  });
  const uploads = page.getByRole("list", { name: "Uploads" });
  return uploads.getByRole("listitem").filter({ hasText: name });
}

test("the admin uploads a file, and anyone can download it", async ({
  browser,
  baseURL,
}) => {
  const page = await adminPage(browser, baseURL);
  const name = `${unique("pixel")}.png`;
  const item = await uploadAsAdmin(page, name, PNG);
  await expect(item).toContainText("Uploaded");

  await item.getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByTestId("sha256")).toHaveText(
    "bc09c2590d2502c8ffaf1a3c09aa89df222e03d186a8daa0c7fce6321fb6e928",
  );
  const fileUrl = page.url();

  // Signed out: the page, the preview and the download all work.
  const visitor = await newPage(browser, baseURL);
  await visitor.goto(fileUrl);
  await expect(visitor.getByRole("img", { name })).toBeVisible();
  const download = await visitor.request.get(
    (await visitor.getByTestId("download").getAttribute("href")) ?? "",
  );
  expect(download.status()).toBe(200);
  expect(download.headers()["content-type"]).toBe("image/png");
  expect(Buffer.from(await download.body())).toEqual(PNG);

  const { violations } = await new AxeBuilder({ page: visitor })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test("a file whose bytes don't match its name is refused", async ({
  browser,
  baseURL,
}) => {
  const page = await adminPage(browser, baseURL);
  const name = `${unique("fake")}.png`;
  const item = await uploadAsAdmin(
    page,
    name,
    Buffer.from("<html><script>alert(1)</script></html>"),
  );
  await expect(item.getByRole("alert")).toHaveText(
    "That file isn’t what its name says it is.",
  );
});

test("the admin takes a file down and restores it", async ({
  browser,
  baseURL,
}) => {
  const page = await adminPage(browser, baseURL);
  const name = `${unique("notes")}.txt`;
  const item = await uploadAsAdmin(page, name, Buffer.from("hello"));
  await expect(item).toContainText("Uploaded");
  const fileUrl = new URL(
    (await item.getByRole("link", { name }).getAttribute("href")) ?? "",
    page.url(),
  ).href;

  await page.goto(`/admin/files/?q=${encodeURIComponent(name)}`);
  const row = page.getByRole("listitem").filter({ hasText: name });
  await row.locator("summary", { hasText: "Take down" }).click();
  await row
    .getByRole("textbox", { name: `Reason to take down ${name}` })
    .fill("Test takedown");
  await row.getByRole("button", { name: `Take down ${name}` }).click();
  await expect(page.getByRole("status")).toHaveText("Taken down.");
  await expect(row).toContainText("Test takedown");

  const visitor = await newPage(browser, baseURL);
  expect((await visitor.goto(fileUrl))?.status()).toBe(404);

  await page
    .getByRole("listitem")
    .filter({ hasText: name })
    .getByRole("button", { name: `Restore ${name}` })
    .click();
  await expect(page.getByRole("status")).toHaveText("Restored.");
  expect((await visitor.goto(fileUrl))?.status()).toBe(200);

  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test("only the admin can upload site files", async ({ browser, baseURL }) => {
  const page = await newPage(browser, baseURL);
  const signedOut = await page.request.post("/api/storage/uploads", {
    data: { purpose: "site", name: "a.txt", size: 5 },
    headers: { origin: new URL(baseURL ?? "").origin },
  });
  expect(signedOut.status()).toBe(401);

  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, freshLogin("uploader"));
  const refused = await page.request.post("/api/storage/uploads", {
    data: { purpose: "site", name: "a.txt", size: 5 },
    headers: { origin: new URL(baseURL ?? "").origin },
  });
  expect(refused.status()).toBe(403);
  expect((await page.goto("/admin/files/"))?.status()).toBe(403);
});
