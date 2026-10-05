import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { adminPage, continueAs, freshLogin, newPage } from "./support";

// People's uploads (the `shared` purpose) aren't live on the site yet, so there's no
// upload button: these tests upload through the storage API, as a feature would.
// e2e switches the purpose on (STORAGE_ENABLE_PURPOSES in playwright.config.ts).

const unique = (base: string) =>
  `${base}-${Math.random().toString(36).slice(2, 8)}`;

async function signIn(page: Page, login: string) {
  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, login);
}

/** Uploads through the API like the browser client does; returns the file. */
async function apiUpload(page: Page, name: string, body: Buffer) {
  const headers = { origin: new URL(page.url()).origin };
  const start = await page.request.post("/api/storage/uploads", {
    data: { purpose: "shared", name, size: body.length },
    headers,
  });
  expect(start.status()).toBe(201);
  const { file } = (await start.json()) as { file: { id: string } };
  const parts = await page.request.post(
    `/api/storage/uploads/${file.id}/parts`,
    { data: { parts: [1] }, headers },
  );
  const { urls } = (await parts.json()) as { urls: Record<string, string> };
  expect(
    (await page.request.put(urls["1"] ?? "", { data: body })).status(),
  ).toBe(200);
  const done = await page.request.post(
    `/api/storage/uploads/${file.id}/complete`,
    { headers },
  );
  expect(done.status()).toBe(200);
  return ((await done.json()) as { file: { id: string; status: string } }).file;
}

async function noViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

test("a newcomer's upload waits for review; a refusal can be appealed", async ({
  browser,
  baseURL,
}) => {
  const uploader = await newPage(browser, baseURL);
  await signIn(uploader, freshLogin("creator"));
  const name = `${unique("notes")}.txt`;
  const file = await apiUpload(uploader, name, Buffer.from("my build notes"));
  expect(file.status).toBe("pending_review");

  // Nobody else sees it yet.
  const visitor = await newPage(browser, baseURL);
  expect((await visitor.goto(`/files/${file.id}/`))?.status()).toBe(404);

  await uploader.goto("/account/files/");
  const mine = uploader.locator(`#file-${file.id}`);
  await expect(mine).toContainText("Waiting for review");
  await noViolations(uploader);

  // The admin refuses it, with a reason.
  const admin = await adminPage(browser, baseURL);
  await admin.goto("/admin/files/review?tab=waiting");
  const card = admin.locator(`article[data-file="${file.id}"]`);
  await expect(card).toContainText("my build notes");
  await card.locator("summary", { hasText: "Reject" }).click();
  await card
    .getByRole("textbox", { name: `Reason to reject ${name}` })
    .fill("Please add a description first");
  await card.getByRole("button", { name: `Reject ${name}` }).click();
  await expect(admin.getByRole("status")).toHaveText("Refused.");

  // The uploader sees why, and appeals.
  await uploader.goto("/account/files/");
  await expect(mine).toContainText("Please add a description first");
  await expect(uploader.getByText("1 of 3 strikes")).toBeVisible();
  await mine.locator("summary", { hasText: "Appeal" }).click();
  await mine
    .getByRole("textbox", { name: `Why ${name} should be allowed` })
    .fill("I added one in the file");
  await mine.getByRole("button", { name: "Send appeal" }).click();
  await expect(uploader.getByRole("status")).toContainText("Appeal sent");

  // The admin accepts the appeal: the file is public, and the strike is gone.
  await admin.goto("/admin/files/review?tab=appeals");
  const appeal = admin.locator(`article[data-file="${file.id}"]`);
  await expect(appeal).toContainText("I added one in the file");
  await noViolations(admin);
  await appeal.locator("summary", { hasText: "Accept appeal" }).click();
  await appeal.getByRole("button", { name: `Accept appeal ${name}` }).click();
  await expect(admin.getByRole("status")).toContainText("Appeal accepted");

  expect((await visitor.goto(`/files/${file.id}/`))?.status()).toBe(200);
  await uploader.goto("/account/files/");
  await expect(mine).toContainText("Your appeal was accepted.");
  await expect(uploader.getByText("0 of 3 strikes")).toBeVisible();
});

test("people report a file, and the admin dismisses the reports", async ({
  browser,
  baseURL,
}) => {
  const uploader = await newPage(browser, baseURL);
  await signIn(uploader, freshLogin("maker"));
  const name = `${unique("guide")}.txt`;
  const file = await apiUpload(uploader, name, Buffer.from("a fine guide"));
  const admin = await adminPage(browser, baseURL);
  await admin.goto("/admin/files/review?tab=waiting");
  await admin
    .locator(`article[data-file="${file.id}"]`)
    .getByRole("button", { name: `Approve ${name}`, exact: true })
    .click();
  await expect(admin.getByRole("status")).toHaveText("Approved.");

  const reporter = await newPage(browser, baseURL);
  await signIn(reporter, freshLogin("reader"));
  await reporter.goto(`/files/${file.id}/`);
  await reporter.locator("summary", { hasText: "Report this file" }).click();
  await reporter.getByLabel("Spam or misleading").check();
  await reporter.getByLabel("Details (optional)").fill("Looks like an ad");
  await reporter.getByRole("button", { name: "Send report" }).click();
  await expect(reporter.getByRole("status")).toContainText(
    "you’ve reported this file",
  );
  await noViolations(reporter);

  await admin.goto("/admin/files/review?tab=reports");
  const card = admin.locator(`article[data-file="${file.id}"]`);
  await expect(card).toContainText("Looks like an ad");
  await card
    .getByRole("button", { name: `Dismiss reports about ${name}` })
    .click();
  await expect(admin.getByRole("status")).toHaveText("Reports dismissed.");
  await expect(card).toHaveCount(0);
});

test("the admin bans an uploader, who then can't upload", async ({
  browser,
  baseURL,
}) => {
  const uploader = await newPage(browser, baseURL);
  const login = freshLogin("spammer");
  await signIn(uploader, login);
  await apiUpload(uploader, `${unique("a")}.txt`, Buffer.from("first"));

  const admin = await adminPage(browser, baseURL);
  await admin.goto(`/admin/files/?owner=${login}`);
  await admin.locator("summary", { hasText: "Ban uploads" }).click();
  await admin
    .getByRole("textbox", { name: `Reason to ban uploads @${login}` })
    .fill("Uploading spam");
  await admin.getByRole("button", { name: `Ban uploads @${login}` }).click();
  await expect(admin.getByRole("status")).toHaveText("Uploads banned.");

  const refused = await uploader.request.post("/api/storage/uploads", {
    data: { purpose: "shared", name: "b.txt", size: 4 },
    headers: { origin: new URL(uploader.url()).origin },
  });
  expect(refused.status()).toBe(403);
  await uploader.goto("/account/files/");
  await expect(uploader.getByText("Uploading spam")).toBeVisible();
});
