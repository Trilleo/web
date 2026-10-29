import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { adminPage, continueAs, freshLogin, toasts } from "./support";

// The e2e server runs the human check in test mode (CAPTCHA_TEST=1): only browsers
// with a trilleo_check_test cookie are checked, at that cookie's level, so other
// specs never meet it, and puzzles carry their answers in data attributes. These
// specs use the contact form signed in: signed-out messages share 127.0.0.1's limit.

async function signedInAtLevel(page: Page, level: number) {
  await page.goto("/sign-in?next=/contact/");
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, freshLogin("checked"));
  await expect(page).toHaveURL("/contact/");
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

async function solvePuzzle(page: Page) {
  const form = page.locator("form[data-answer]");
  const answer = (await form.getAttribute("data-answer")) ?? "";
  for (const cell of answer.split(",").map(Number))
    await form.locator(".check-cell").nth(cell).click();
  await form.getByRole("button", { name: "Continue" }).click();
}

// The heavy proof-of-work is about a million hashes: a second or two alone, longer
// with other browsers sharing the machine.
const sent = (page: Page) =>
  expect(page.getByRole("status")).toContainText("can’t write back", {
    timeout: 30_000,
  });

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

    await solvePuzzle(page);
    await sent(page);

    const exported = await page.request.get("/account/export.json");
    const data = (await exported.json()) as {
      contactMessages: { body: string }[];
    };
    expect(data.contactMessages.map((message) => message.body)).toContain(text);
  });
});

test("the puzzle is accessible, and its question in words passes too", async ({
  page,
}) => {
  await signedInAtLevel(page, 3);
  await fillContact(page, `Worded note ${freshLogin("words")}`);
  await expect(
    page.getByRole("heading", { name: "One quick check" }),
  ).toBeVisible();
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
  const form = page.locator("form[data-text-answer]");
  const answer = (await form.getAttribute("data-text-answer")) ?? "";
  await form.getByRole("textbox").fill(answer.toUpperCase());
  await form.getByRole("button", { name: "Continue" }).click();
  await sent(page);
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
