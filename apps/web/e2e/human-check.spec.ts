import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { deflateSync } from "node:zlib";
import { FAKE_DOCS } from "./fake-docs";
import { adminPage, continueAs, freshLogin, hydrated, toasts } from "./support";

// The e2e server runs the human check in test mode (CAPTCHA_TEST=1): only browsers
// with a trilleo_check_test cookie are checked, at that cookie's level, so other
// specs never meet it, and puzzles carry their answers in data attributes. These
// specs use the contact form signed in: signed-out messages share 127.0.0.1's limit.

async function signedInAtLevel(page: Page, level: number, next = "/contact/") {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, freshLogin("checked"));
  await expect(page).toHaveURL(next);
  await page.context().addCookies([
    {
      name: "trilleo_check_test",
      value: String(level),
      domain: new URL(page.url()).hostname,
      path: "/",
    },
  ]);
}

async function fillContact(page: Page, text: string) {
  await page.getByLabel("Your name").fill("Checked");
  await page.getByLabel("Message").fill(text);
  await page.getByRole("button", { name: "Send message" }).click();
}

/** Ticks the right squares in `scope` (a puzzle form or the dialog). */
async function tickAnswer(page: Page, selector: string) {
  const scope = page.locator(selector);
  const answer = (await scope.getAttribute("data-answer")) ?? "";
  for (const cell of answer.split(",").map(Number))
    await scope.locator(".check-cell").nth(cell).click();
  await scope.getByRole("button", { name: "Continue" }).click();
}

/** No axe violations on the page as it is. */
async function axeClean(page: Page) {
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
  expect(
    violations.map((v) => `${v.id} (${v.impact ?? "?"}): ${v.help}`),
  ).toEqual([]);
}

/** No axe violations in light or dark (needs JavaScript, to wait for colours). */
async function accessible(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    // Colours ease into the new theme (from the next frame on); check them once
    // they've arrived.
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await page.waitForFunction(() =>
      document
        .getAnimations()
        .every((animation) => animation.playState !== "running"),
    );
    await axeClean(page);
  }
}

// The heavy proof-of-work is about a million hashes: a second or two alone, longer
// with other browsers sharing the machine.
const sent = (page: Page) =>
  expect(page.getByRole("status")).toContainText("can’t write back", {
    timeout: 30_000,
  });

const dialog = (page: Page) => page.locator("dialog.human-check-dialog");

/** A plain PNG of one colour. */
function solidPng(width: number, height: number): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (bytes: Buffer) => {
    let c = 0xffffffff;
    for (const byte of bytes)
      c = (crcTable[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x80)]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk(
      "IDAT",
      deflateSync(Buffer.concat(Array.from({ length: height }, () => row))),
    ),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test("with JavaScript, the form's proof-of-work is solved before it's sent", async ({
  page,
}) => {
  await signedInAtLevel(page, 2);
  await fillContact(page, `Checked note ${freshLogin("js")}`);
  await sent(page);
  // No detour: the browser earned its pass on the contact page.
  await expect(page).toHaveURL("/contact/send");
  const cookies = await page.context().cookies();
  expect(cookies.some((cookie) => cookie.name === "trilleo_human")).toBe(true);
});

test("with JavaScript, the puzzle opens in a dialog, and its question passes too", async ({
  page,
}) => {
  await signedInAtLevel(page, 3);
  const text = `Worded note ${freshLogin("words")}`;
  await fillContact(page, text);
  await expect(
    dialog(page).getByRole("heading", { name: "One quick check" }),
  ).toBeVisible();
  await expect(dialog(page).locator(".check-cell")).toHaveCount(16);
  await accessible(page);

  // Closing it sends nothing, and keeps what was typed.
  await dialog(page).getByRole("button", { name: "Cancel" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page).toHaveURL("/contact/");
  await expect(page.getByLabel("Message")).toHaveValue(text);

  await page.getByRole("button", { name: "Send message" }).click();
  const answer = (await dialog(page).getAttribute("data-text-answer")) ?? "";
  await dialog(page).getByRole("textbox").fill(answer.toUpperCase());
  await dialog(page).getByRole("button", { name: "Continue" }).click();
  await sent(page);
});

test("/check/ is accessible in both themes", async ({ page }) => {
  await signedInAtLevel(page, 3);
  // Sent as a plain form (as without JavaScript), so the server sends it to /check/.
  await page.locator("[data-human-check]").evaluate((marker) => {
    const form = marker.closest("form");
    marker.remove();
    form?.addEventListener(
      "submit",
      (event) => {
        event.stopImmediatePropagation();
      },
      { capture: true },
    );
  });
  await fillContact(page, `Checked page ${freshLogin("page")}`);
  await expect(page).toHaveURL(/\/check\/\?route=contact/);
  await expect(
    page.getByRole("heading", { name: "One quick check" }),
  ).toBeVisible();
  await accessible(page);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the puzzle stands in, and the form arrives as it was", async ({
    page,
  }) => {
    await signedInAtLevel(page, 1);
    const text = `No-script note ${freshLogin("nojs")}`;
    await fillContact(page, text);

    await expect(page).toHaveURL(/\/check\/\?route=contact/);
    await expect(
      page.getByRole("heading", { name: "One quick check" }),
    ).toBeVisible();
    await expect(page.getByText(/^Select every square with a/)).toBeVisible();

    // A wrong answer: a new puzzle, and the form still carried along.
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("alert")).toContainText("wasn’t right");
    await expect(
      page.locator('form[data-answer] input[type="hidden"][name="body"]'),
    ).toHaveValue(text);

    await tickAnswer(page, "form[data-answer]");
    await sent(page);

    const exported = await page.request.get("/account/export.json");
    const data = (await exported.json()) as {
      contactMessages: { body: string }[];
    };
    expect(data.contactMessages.map((message) => message.body)).toContain(text);
  });

  test("a picture can't ride through the check, and the page says so", async ({
    page,
  }) => {
    await signedInAtLevel(page, 1, "/account/profile/");
    await page.getByLabel("Choose a picture").setInputFiles({
      name: "me.png",
      mimeType: "image/png",
      buffer: solidPng(40, 40),
    });
    await page.getByRole("button", { name: "Save picture" }).click();
    await expect(page).toHaveURL(/\/check\/\?route=avatar/);
    await expect(page.locator("[data-files-left]")).toContainText(
      "choose yours again",
    );
  });
});

test("a new profile picture waits for the puzzle in a dialog", async ({
  page,
}) => {
  await signedInAtLevel(page, 3, "/account/profile/");
  await page.waitForLoadState("load");
  await page.getByLabel("Choose a picture").setInputFiles({
    name: "me.png",
    mimeType: "image/png",
    buffer: solidPng(300, 200),
  });
  await expect(page.getByRole("img", { name: /^Crop preview/ })).toBeVisible();
  await page.getByRole("button", { name: "Save picture" }).click();
  await expect(dialog(page)).toBeVisible();
  await tickAnswer(page, "dialog.human-check-dialog");
  await expect(page).toHaveURL("/account/profile/?avatar=saved#avatar");
});

test("starting an upload answers 428 until the check is passed", async ({
  page,
}) => {
  await signedInAtLevel(page, 2, "/account/");
  const response = await page.request.post("/api/storage/uploads", {
    data: { purpose: "shared", name: "a.txt", size: 5 },
    headers: { origin: new URL(page.url()).origin },
  });
  expect(response.status()).toBe(428);
  expect(await response.json()).toMatchObject({
    humanCheck: { route: "upload", level: 2 },
  });
});

test("Preview's server fetch earns its pass on the way", async ({ page }) => {
  await signedInAtLevel(page, 1, "/tools/preview/");
  await hydrated(page);
  await page
    .getByLabel("Link to a document")
    .fill(`${FAKE_DOCS}/plain/table.csv`);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Chengdu" })).toBeVisible({
    timeout: 30_000,
  });
});

test("/check/ only leads back to the guarded pages", async ({
  request,
  baseURL,
}) => {
  const response = await request.post(
    "/check/?route=contact&to=https%3A%2F%2Fevil.example%2F",
    {
      form: { body: "x" },
      headers: { origin: new URL(baseURL ?? "").origin },
      maxRedirects: 0,
    },
  );
  expect(response.status()).toBe(400);
});

test("the admin sets the mode, and the dashboard says so", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  try {
    await admin.goto("/admin/captcha/");
    await admin.getByRole("radio", { name: "Raised" }).check();
    await admin.getByLabel("For", { exact: true }).selectOption("1");
    await admin.getByRole("button", { name: "Save mode" }).click();
    await expect(toasts(admin)).toContainText("Mode saved.");
    await expect(admin.locator("[data-mode-now]")).toContainText(
      "Raised until",
    );
    await admin.goto("/admin/");
    await expect(admin.locator("[data-check-warning]")).toContainText(
      "The human check is Raised",
    );
  } finally {
    await admin.goto("/admin/captcha/");
    await admin.getByRole("radio", { name: "Normal" }).check();
    await admin.getByRole("button", { name: "Save mode" }).click();
    await expect(admin.locator("[data-mode-now]")).toContainText("Normal");
    await admin.context().close();
  }
});
