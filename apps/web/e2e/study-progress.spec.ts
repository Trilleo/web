import { expect, test, type Locator, type Page } from "@playwright/test";
import { continueAs, freshLogin } from "./support";

// Progress in the study section: lessons studied, reviews, the mistake log and
// practice. Signed out it's kept in the test's own browser; signed-in tests use fresh
// accounts (parallel tests share one database).

async function hydrated(widget: Locator): Promise<Locator> {
  await widget.scrollIntoViewIfNeeded();
  await expect(
    widget.page().locator("astro-island", { has: widget }),
  ).not.toHaveAttribute("ssr");
  return widget;
}

/** Reads a lesson to its end, which marks it studied. */
async function finishLesson(page: Page, lesson: string) {
  await page.goto(`/study/sample/${lesson}/`);
  const tracker = await hydrated(
    page.getByRole("region", { name: "Your progress" }),
  );
  await expect(tracker).toContainText("Studied");
  return tracker;
}

async function signIn(page: Page, login: string, next = "/study/") {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, login);
  await expect(page).toHaveURL(next);
}

test("finishing a lesson puts its cards in today's reviews", async ({
  page,
}) => {
  const tracker = await finishLesson(page, "voltage-current");
  await expect(tracker).toContainText("Its 3 cards join your reviews");
  await expect(tracker).toContainText("Kept in this browser");

  await page.goto("/study/");
  const dashboard = await hydrated(page.locator(".study-dashboard"));
  await expect(
    dashboard
      .getByText("3 to review · 0 new")
      .or(dashboard.getByText("0 to review · 3 new")),
  ).toBeVisible();
  await dashboard.getByRole("link", { name: "Start review" }).click();

  await expect(page).toHaveURL("/study/review/");
  const card = await hydrated(page.getByRole("article", { name: "Flashcard" }));
  await expect(card).toContainText("Unit of current?");
  await page.keyboard.press("Space");
  await expect(card).toContainText("The ampere");
  await card.getByRole("button", { name: /Easy/ }).click();
  await expect(page.getByText("1 reviewed")).toBeVisible();
  await expect(card).toContainText("Unit of voltage?");
  // Graded from the keyboard too.
  await page.keyboard.press("Space");
  await page.keyboard.press("4");
  await page.keyboard.press("Space");
  await page.keyboard.press("4");
  await expect(page.getByText("Done for now.")).toBeVisible();

  // The schedule survives a reload (kept in this browser).
  await page.reload();
  await expect(page.getByText("Nothing to review right now.")).toBeVisible();
});

test("wrong answers go to the mistake log until they're put right", async ({
  page,
}) => {
  await page.goto("/study/sample/ohms-law/");
  const quiz = await hydrated(
    page.getByRole("region", { name: /Quiz Ohm.s law/ }),
  );
  await quiz.getByLabel("Your answer to question 1").fill("3 mA");
  await quiz.getByLabel("Your answer to question 1").press("Enter");
  await expect(quiz.getByText("Not quite")).toBeVisible();

  await page.goto("/study/mistakes/");
  const mistakes = await hydrated(page.locator(".study-mistakes"));
  await expect(mistakes.getByText("1 question to put right.")).toBeVisible();
  await expect(mistakes.getByText("You answered: 3 mA")).toBeVisible();
  await mistakes.getByRole("button", { name: "Make it a flashcard" }).click();
  await expect(
    mistakes.getByText("In your reviews as a flashcard."),
  ).toBeVisible();

  const retry = mistakes.getByLabel("Your answer to question 1");
  await retry.fill("1.91 mA");
  await retry.press("Enter");
  await expect(mistakes.getByText(/No mistakes waiting/)).toBeVisible();

  // The card made from it is in the reviews, with the answer behind it.
  await page.goto("/study/review/?subject=sample");
  const card = await hydrated(page.getByRole("article", { name: "Flashcard" }));
  await expect(card).toContainText("From a mistake");
  await page.keyboard.press("Space");
  await expect(card).toContainText("1.91 mA");
});

test("practice draws a subject's or a lesson's questions and records answers", async ({
  page,
}) => {
  await page.goto("/study/sample/practice/?lesson=kirchhoff");
  const practice = await hydrated(page.locator(".study-practice"));
  await expect(practice.getByText(/From 2\.1 Kirchhoff/)).toBeVisible();
  await expect(practice.locator(".study-question")).toHaveCount(3);
  await practice.getByRole("button", { name: "New set" }).click();
  await expect(practice.getByText("Set 2")).toBeVisible();

  await page.goto("/study/sample/practice/");
  await expect(page.locator(".study-practice .study-question")).toHaveCount(8);
});

test("signed in, progress is kept in the account, on every device", async ({
  page,
  browser,
  baseURL,
}) => {
  const login = freshLogin("student");
  await signIn(page, login, "/study/sample/kirchhoff/");
  const tracker = await hydrated(
    page.getByRole("region", { name: "Your progress" }),
  );
  await expect(tracker).toContainText("Studied");
  await expect(tracker).toContainText("Saved to your account.");

  const laptop = await (await browser.newContext({ baseURL })).newPage();
  await signIn(laptop, login);
  const dashboard = await hydrated(laptop.locator(".study-dashboard"));
  await expect(
    dashboard.getByRole("row", { name: /Sample subject/ }),
  ).toContainText("1 / 3");
  await laptop.context().close();
});

test("signing in offers to move this browser's progress into the account", async ({
  page,
}) => {
  await finishLesson(page, "ohms-law");
  await signIn(page, freshLogin("mover"));
  const dashboard = await hydrated(page.locator(".study-dashboard"));
  await expect(
    dashboard.getByText("1 record from before you signed in"),
  ).toBeVisible();
  await dashboard
    .getByRole("button", { name: "Move them to my account" })
    .click();
  await expect(dashboard.getByText("Moved 1.")).toBeVisible();
  await expect(
    dashboard.getByRole("row", { name: /Sample subject/ }),
  ).toContainText("1 / 3");

  // It's in the account export.
  const exported = (await (
    await page.request.get("/account/export.json")
  ).json()) as {
    study: { events: { kind: string }[] };
  };
  expect(exported.study.events.map((event) => event.kind)).toEqual(["studied"]);
});

test("review settings are kept", async ({ page }) => {
  await page.goto("/study/");
  const dashboard = await hydrated(page.locator(".study-dashboard"));
  await dashboard.getByText("Review settings").click();
  await dashboard.getByLabel("New cards a day").fill("2");
  await dashboard.getByRole("button", { name: "Save settings" }).click();
  await expect(dashboard.getByText("Saved.")).toBeVisible();
  await finishLesson(page, "voltage-current");
  await page.goto("/study/");
  await expect(page.getByText("0 to review · 2 new · 1 waiting")).toBeVisible();
});
