import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { DRAWN, DRAWN_MEASURES, UNDRAWN } from "./fake-chunithm";
import { adminPage, continueAs, freshLogin } from "./support";

// The catalog comes from e2e/fake-chunithm.ts: an update starts with the server's
// first requests and takes a few seconds. Specs wait for it.
async function catalogReady(request: APIRequestContext): Promise<void> {
  await expect
    .poll(
      async () => {
        const response = await request.get("/api/chunithm/index.json");
        if (!response.ok()) return 0;
        const index = (await response.json()) as {
          songs: { id: number; charts: { viewable: boolean }[] }[];
        };
        return index.songs
          .find((song) => song.id === DRAWN.id)
          ?.charts.some((chart) => chart.viewable)
          ? 1
          : 0;
      },
      { timeout: 90_000, intervals: [1000] },
    )
    .toBe(1);
}

async function axe(page: Page): Promise<string[]> {
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
  return violations.map((violation) => violation.id);
}

test("someone finds a chart by romaji, opens its picture and keeps it", async ({
  page,
  request,
}) => {
  await catalogReady(request);
  await page.goto("/tools/chunithm/");
  await page.getByLabel("Title, artist or alias").fill("konkuesuto");
  const results = page.getByTestId("chunithm-results").last();
  await expect(results.getByText(DRAWN.title)).toBeVisible();
  await expect(page).toHaveURL(/\?q=konkuesuto/);

  await results
    .getByRole("link", { name: `${DRAWN.title}, Master 14+ (14.7)` })
    .click();
  await expect(page).toHaveURL(`/tools/chunithm/${String(DRAWN.id)}/master/`);
  await expect(
    page.getByRole("heading", { level: 1, name: DRAWN.title }),
  ).toBeVisible();
  // The first view builds the picture; the page asks until it's there.
  await expect(page.getByTestId("chart-picture")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTestId("chart-measure")).toHaveText(
    `Measure 1 of ${String(DRAWN_MEASURES)}`,
  );
  await expect(page.getByTestId("chart-facts")).toContainText("14.7 (Mate)");
  // Its jacket sits in the info box, from our own storage (copied by the update, or
  // when the chart was opened), at its own size.
  await expect(async () => {
    await page.reload();
    await expect(page.getByTestId("chart-jacket")).toBeVisible({
      timeout: 1000,
    });
  }).toPass({ timeout: 30_000 });
  await expect(page.getByTestId("chart-jacket")).toHaveAttribute(
    "src",
    /\/chunithm\/jackets\/3062-/,
  );
  // The original goes straight to sdvx.in, never through this site.
  const original = page.getByTestId("chart-jacket-original");
  await expect(original).toHaveAttribute(
    "href",
    "https://sdvx.in/chunithm/11/jacket/11061.png",
  );
  await expect(original).toHaveAttribute("target", "_blank");
  await expect(page.getByTestId("chart-picture")).toBeVisible();
  expect(await axe(page)).toEqual([]);

  // Both layouts draw it.
  await page.getByText("Strip", { exact: true }).click();
  await expect(page.getByTestId("chart-picture")).toHaveAttribute(
    "data-mode",
    "strip",
  );
  await page.getByText("Sheet", { exact: true }).click();
  await expect(page.getByTestId("chart-picture")).toHaveAttribute(
    "data-mode",
    "sheet",
  );

  // A favourite, kept in this browser, shows on the tool's page.
  await page.getByRole("button", { name: "☆ Save" }).click();
  await expect(page.getByRole("button", { name: "★ Saved" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.goto("/tools/chunithm/");
  const favourites = page.getByRole("region", { name: "(02) Favourites" });
  await expect(
    favourites.getByRole("link", { name: `MAS ${DRAWN.title}` }),
  ).toBeVisible();
});

test("a chart sdvx.in hasn't drawn says so", async ({ page, request }) => {
  await catalogReady(request);
  await page.goto(`/tools/chunithm/${String(UNDRAWN.id)}/master/`);
  await expect(
    page.getByRole("heading", { level: 1, name: UNDRAWN.title }),
  ).toBeVisible();
  await expect(page.getByTestId("chart-status")).toHaveText(
    "sdvx.in hasn't drawn this chart yet.",
  );
  // A chart that doesn't exist is a 404, as is a difficulty that doesn't.
  expect((await page.goto("/tools/chunithm/1/master/"))?.status()).toBe(404);
  expect(
    (
      await request.get(`/api/chunithm/charts/${String(DRAWN.id)}/hardest`)
    ).status(),
  ).toBe(404);
});

test("the admin's CHUNITHM panel shows the catalog", async ({
  browser,
  baseURL,
  request,
}) => {
  await catalogReady(request);
  const admin = await adminPage(browser, baseURL);
  await admin.goto("/admin/chunithm/");
  await expect(
    admin.getByRole("heading", { level: 1, name: "CHUNITHM" }),
  ).toBeVisible();
  await expect(admin.getByTestId("chunithm-counts")).toContainText("Mate");

  // Withdrawing a chart that isn't there says so.
  const withdraw = admin.locator("form", {
    has: admin.getByRole("button", { name: "Withdraw" }),
  });
  await withdraw.getByLabel("Song ID").fill("99999");
  await withdraw.getByLabel("Reason").fill("Asked to");
  await withdraw.getByRole("button", { name: "Withdraw" }).click();
  await expect(admin.getByRole("alert")).toHaveText(
    "There's no such chart in the catalog.",
  );

  // Building ahead can be paused for a while, and resumed.
  const prebuild = admin.getByTestId("chunithm-prebuild-controls");
  await prebuild.getByLabel("Pause for").selectOption({ label: "6 hours" });
  await prebuild.getByRole("button", { name: "Pause" }).click();
  await expect(admin.getByTestId("chunithm-prebuild")).toContainText(
    "Paused until",
  );
  expect(await axe(admin)).toEqual([]);
  await prebuild.getByRole("button", { name: "Resume" }).click();
  await expect(admin.getByTestId("chunithm-prebuild")).not.toContainText(
    "Paused",
  );
  await expect(prebuild.getByRole("button", { name: "Pause" })).toBeVisible();
});

test("a suggested name, once approved, finds the song", async ({
  browser,
  baseURL,
  page,
  request,
}) => {
  await catalogReady(request);
  const chart = `/tools/chunithm/${String(DRAWN.id)}/master/`;
  const name = `征服${freshLogin("e2e").slice(4)}`;

  // Signed out, the page says how to suggest one.
  await page.goto(chart);
  await expect(
    page.getByText("to suggest a name for this song."),
  ).toBeVisible();

  await page.goto(`/sign-in?next=${encodeURIComponent(chart)}`);
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, freshLogin("namer"));
  await expect(page).toHaveURL(chart);
  await page.getByLabel("Suggest a name").fill(name);
  await page.getByRole("button", { name: "Suggest", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Thanks" }),
  ).toBeVisible();
  await expect(page.getByTestId("my-suggestions")).toContainText(
    `${name} · waiting`,
  );
  // The same name again waits with the first.
  await page.getByLabel("Suggest a name").fill(name);
  await page.getByRole("button", { name: "Suggest", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "That name has been suggested already and is waiting for a look.",
  );

  const admin = await adminPage(browser, baseURL);
  await admin.goto("/admin/chunithm/aliases/");
  const item = admin
    .getByTestId("alias-queue")
    .getByRole("listitem")
    .filter({ hasText: name });
  await item.getByLabel("Note (they see it)").fill("Nice one");
  await item.getByRole("button", { name: "Approve" }).click();
  await expect(admin.getByRole("status")).toHaveText(
    "Approved: the name is searchable now.",
  );
  expect(await axe(admin)).toEqual([]);

  await page.goto(chart);
  await expect(page.getByTestId("my-suggestions")).toContainText(
    `${name} · added · Nice one`,
  );
  await expect(page.getByTestId("chart-facts")).toContainText(name);

  await page.goto(`/tools/chunithm/?q=${encodeURIComponent(name)}`);
  await expect(
    page.getByTestId("chunithm-results").last().getByText(DRAWN.title),
  ).toBeVisible();
});

test("a list asks the server for the jackets it's missing", async ({
  page,
  request,
}) => {
  await catalogReady(request);
  const asked = page.waitForRequest(
    (sent) =>
      sent.url().endsWith("/api/chunithm/jackets") && sent.method() === "POST",
  );
  await page.goto(`/tools/chunithm/?q=${encodeURIComponent(UNDRAWN.title)}`);
  const sent = await asked;
  expect((sent.postDataJSON() as { songs: number[] }).songs).toContain(
    UNDRAWN.id,
  );
  expect((await sent.response())?.status()).toBe(202);
});
