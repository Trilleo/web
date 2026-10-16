import { expect, test, type Locator } from "@playwright/test";

/** Widgets hydrate when they scroll into view (client:visible): wait for it. */
async function hydrated(widget: Locator): Promise<Locator> {
  await widget.scrollIntoViewIfNeeded();
  await expect(
    widget.page().locator("astro-island", { has: widget }),
  ).not.toHaveAttribute("ssr");
  return widget;
}

// The sample subject (study/sample, a draft) is built because the e2e build sets
// STUDY_DRAFTS=1. These check the pages and widgets, not its wording.

test("the study index leads to a subject and its lessons", async ({ page }) => {
  await page.goto("/study/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Study.");
  await page
    .getByRole("listitem")
    .getByRole("link", { name: /Sample subject/ })
    .first()
    .click();
  await expect(page).toHaveURL("/study/sample/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Sample subject",
  );
  await expect(page.locator("[lang='zh-CN']").first()).toBeVisible();

  await page
    .getByRole("link", { name: /Ohm.s law/ })
    .first()
    .click();
  await expect(page).toHaveURL("/study/sample/ohms-law/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /Ohm.s law/,
  );
  // Sections are numbered like a textbook, and maths is rendered (MathML for screen readers).
  await expect(
    page.getByRole("heading", { name: /1\.2\.1\s+Resistance/ }),
  ).toBeVisible();
  await expect(page.locator(".katex math").first()).toBeAttached();
  await page.getByRole("link", { name: /Next/ }).click();
  await expect(page).toHaveURL("/study/sample/kirchhoff/");
});

test("worked examples open one step at a time", async ({ page }) => {
  await page.goto("/study/sample/ohms-law/");
  const step = page.locator(".study-step").first();
  await expect(step.locator(".study-step-body")).toBeHidden();
  await step.locator("summary").click();
  await expect(step.locator(".study-step-body")).toBeVisible();
});

test("quizzes check numbers with units, algebra and choices", async ({
  page,
}) => {
  await page.goto("/study/sample/ohms-law/");
  const quiz = await hydrated(
    page.getByRole("region", { name: /Quiz Ohm.s law/ }),
  );
  const first = quiz.getByLabel("Your answer to question 1");
  await first.fill("2 A");
  await quiz.getByRole("button", { name: "Check" }).first().click();
  await expect(quiz.getByText("Not quite")).toBeVisible();
  // The same answer in other units is right.
  await first.fill("0.00191 A");
  await first.press("Enter");
  await expect(quiz.getByText("Right.")).toBeVisible();

  const second = quiz.getByLabel("Your answer to question 2");
  await second.fill("u*u/R");
  await second.press("Enter");
  await expect(quiz.getByText("Right.")).toHaveCount(2);
  await expect(quiz.getByText("1 of 2 right first time")).toBeVisible();

  await page.goto("/study/sample/kirchhoff/");
  const choice = await hydrated(
    page.getByRole("region", { name: /Quiz Dividers/ }),
  );
  await choice.getByLabel("Kirchhoff’s current law").check();
  await choice.getByRole("button", { name: "Check" }).nth(2).click();
  await expect(choice.getByText("Right.")).toBeVisible();
});

test("the circuit simulator solves the circuit as sliders move", async ({
  page,
}) => {
  await page.goto("/study/sample/kirchhoff/");
  const lab = await hydrated(page.locator(".study-lab"));
  const readings = lab.getByRole("table");
  await expect(readings.getByRole("row", { name: /R2/ })).toContainText("8 V");
  await expect(readings.getByRole("row", { name: /V1/ })).toContainText(
    "supplies 48 mW",
  );
  // R2 to the far right of its slider: ten times its value (20 kΩ).
  await lab.getByLabel("R2", { exact: true }).fill("1000");
  await expect(readings.getByRole("row", { name: /R2/ })).toContainText(
    "11.4 V",
  );
  await expect(lab.locator("svg")).toContainText("11.4 V");
});

test("the explorer and the plot follow their sliders", async ({ page }) => {
  await page.goto("/study/sample/ohms-law/");
  const explorer = await hydrated(page.locator(".study-explore"));
  await expect(explorer.getByText("50 mA")).toBeVisible();
  await explorer.getByLabel("u", { exact: true }).fill("1000");
  await expect(explorer.getByText("120 mA")).toBeVisible();

  const plot = await hydrated(page.getByRole("img", { name: /u–i line/ }));
  await plot.focus();
  await plot.press("ArrowRight");
  await expect(page.locator(".study-plot-reading")).toContainText("i = 0.051");
});

test("the formula sheet and glossary gather every lesson's", async ({
  page,
}) => {
  await page.goto("/study/sample/formulas/");
  await expect(page.locator(".study-formula")).toHaveCount(4);
  await expect(page.getByText("(1.2.1)")).toBeVisible();
  await page.getByRole("link", { name: "Lesson 2.1" }).click();
  await expect(page).toHaveURL(/\/study\/sample\/kirchhoff\/#eq-2-1-1$/);

  await page.goto("/study/sample/glossary/");
  const resistance = page.locator("dt", { hasText: "Resistance" });
  await expect(resistance).toContainText("电阻");
  await page
    .getByRole("link", { name: /Defined in 1\.2/ })
    .first()
    .click();
  await expect(page).toHaveURL(/#def-/);
});

test("study pages are listed for search engines and assistants", async ({
  request,
}) => {
  const sitemap = await (await request.get("/sitemap-0.xml")).text();
  expect(sitemap).toContain("https://www.trilleo.net/study/</loc>");
  expect(sitemap).toContain(
    "https://www.trilleo.net/study/sample/ohms-law/</loc>",
  );
  const llms = await (await request.get("/llms.txt")).text();
  expect(llms).toContain("## Study");
  const card = await request.get("/og/study/sample.png");
  expect(card.status()).toBe(200);
  expect(card.headers()["content-type"]).toBe("image/png");
});
