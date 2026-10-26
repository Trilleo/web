import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DRAWN,
  DRAWN_MEASURES,
  DRAWN_REF,
  FAKE_CHUNITHM,
  UNDRAWN,
} from "./fake-chunithm";
import { adminPage, continueAs, freshLogin, hydrated, toasts } from "./support";

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
  // sdvx.in's notes by kind, and the credit linking its viewer.
  await expect(page.getByTestId("chart-facts")).toContainText(
    "Tap 700 · Hold 90 · Slide 120 · Air 200 · Flick 40",
  );
  await expect(
    page.getByRole("link", { name: "sdvx.in (CHUNITHM譜面保管所)" }),
  ).toHaveAttribute(
    "href",
    "https://sdvx.in/chunithm/_/viewer.php?id=11061&diff=mst",
  );
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
  // The first update moved what was kept from sdvx.in's older site (nothing, here).
  await expect(admin.getByTestId("chunithm-move")).toContainText(
    "Moved to sdvx.in’s new viewer",
  );

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

test("the score calculator works out ranks, plays and ratings", async ({
  page,
  request,
}) => {
  await catalogReady(request);
  await page.goto(`/tools/chunithm/${String(DRAWN.id)}/master/`);
  const calculator = page.getByTestId("score-calculator");
  await calculator.scrollIntoViewIfNeeded();
  await hydrated(page);
  await calculator.getByLabel("Notes").fill("1000");
  await expect(
    calculator.getByRole("row", { name: /^SSS\+/ }).getByRole("cell"),
  ).toHaveText(["1,009,000", "100", "1", "0", "16.85"]);

  const play = page.getByTestId("play-panel");
  await play.getByLabel("Justice").fill("98");
  await play.getByLabel("Attack").fill("1");
  await play.getByLabel("Miss").fill("1");
  await expect(page.getByTestId("play-score")).toHaveText("1,007,500 SSS");

  const budget = page.getByTestId("budget-panel");
  await budget.getByLabel("Rank").selectOption("SSS");
  await budget.getByLabel("Attack").fill("2");
  await expect(page.getByTestId("budget-result")).toHaveText(
    "Up to 148 Justice for SSS.",
  );

  // Constant 14.7: 16.50 needs +1.80, on the way from SS+ to SSS.
  await page.getByTestId("rating-panel").getByLabel("Rating").fill("16.5");
  await expect(page.getByTestId("rating-result")).toHaveText(
    "Needs 1,006,500 (SS+).",
  );
  expect(await axe(page)).toEqual([]);
});

test("the admin adds, removes and decides names on a chart page", async ({
  browser,
  baseURL,
  page,
  request,
}) => {
  await catalogReady(request);
  const chart = `/tools/chunithm/${String(DRAWN.id)}/master/`;
  const added = `直接${freshLogin("e2e").slice(4)}`;
  const suggested = `提案${freshLogin("e2e").slice(4)}`;

  await page.goto(`/sign-in?next=${encodeURIComponent(chart)}`);
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, freshLogin("namer"));
  await expect(page).toHaveURL(chart);
  // Everyone else suggests; only the admin adds.
  await expect(page.getByLabel("Add a name")).toHaveCount(0);
  await page.getByLabel("Suggest a name").fill(suggested);
  await page.getByRole("button", { name: "Suggest", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Thanks" }),
  ).toBeVisible();
  // A forged admin form is refused.
  const forged = await page.request.post("/tools/chunithm/alias", {
    form: { intent: "add", song: String(DRAWN.id), alias: "forged" },
    headers: { Origin: baseURL ?? "" },
    maxRedirects: 0,
  });
  expect(forged.status()).toBe(403);

  const admin = await adminPage(browser, baseURL);
  await admin.goto(chart);
  await admin.getByLabel("Add a name").fill(added);
  await admin.getByRole("button", { name: "Add", exact: true }).click();
  await expect(toasts(admin).getByRole("status")).toHaveText(
    "Name added: it’s searchable now.",
  );
  await expect(admin.getByTestId("chart-facts")).toContainText(added);

  const waiting = admin
    .getByTestId("admin-suggestions")
    .getByRole("listitem")
    .filter({ hasText: suggested });
  await waiting.getByLabel("Note (optional)").fill("Welcome");
  await waiting.getByRole("button", { name: "Approve" }).click();
  await expect(toasts(admin).getByRole("status")).toHaveText(
    "Approved: the name is searchable now.",
  );
  await expect(admin.getByTestId("admin-names")).toContainText(suggested);
  expect(await axe(admin)).toEqual([]);

  for (const name of [added, suggested]) {
    await admin.getByRole("button", { name: `Remove ${name}` }).click();
    await expect(toasts(admin).getByRole("status")).toHaveText("Name removed.");
  }
  await expect(admin.getByTestId("chart-facts")).not.toContainText(added);

  await page.reload();
  await expect(page.getByTestId("my-suggestions")).toContainText(
    `${suggested} · added · Welcome`,
  );
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

test("the admin bundles charts on their computer and imports them", async ({
  browser,
  baseURL,
  request,
}) => {
  await catalogReady(request);
  const admin = await adminPage(browser, baseURL);
  await admin.goto("/admin/chunithm/");
  await admin
    .getByRole("link", { name: "Build them on your computer and import" })
    .click();
  await expect(
    admin.getByRole("heading", { level: 1, name: "Import" }),
  ).toBeVisible();

  // The to-do list downloads as JSON the script reads.
  const download = admin.waitForEvent("download");
  await admin.getByTestId("chunithm-todo").click();
  const todo = JSON.parse(
    readFileSync(await (await download).path(), "utf8"),
  ) as { kind: string; buildVersion: number; charts: unknown[] };
  expect(todo.kind).toBe("chunithm-todo");

  // The real script, on plain Node, against the fake sdvx.in. The list names the
  // drawn chart under a chart the catalog doesn't have, so whichever specs
  // have built what, the import's answer is the same.
  const dir = mkdtempSync(join(tmpdir(), "chunithm-e2e-"));
  writeFileSync(
    join(dir, "todo.json"),
    JSON.stringify({
      ...todo,
      charts: [
        {
          chartId: 999_999,
          songId: DRAWN.id,
          title: DRAWN.title,
          difficulty: "master",
          sdvxRef: DRAWN_REF,
          variant: "normal",
        },
      ],
    }),
  );
  execFileSync(
    process.execPath,
    [
      "--experimental-transform-types",
      "--disable-warning=ExperimentalWarning",
      "--import",
      "./scripts/ts-hooks.mjs",
      "scripts/chunithm-bundle.ts",
      join(dir, "todo.json"),
      "--delay",
      "0",
    ],
    {
      env: { ...process.env, CHUNITHM_SDVX_URL: FAKE_CHUNITHM, INIT_CWD: dir },
    },
  );
  const out = join(dir, "chunithm-bundles");
  const [name] = readdirSync(out).filter((file) => file.endsWith(".zip"));
  expect(name).toMatch(/^chunithm-bundle-.*\.zip$/);

  await hydrated(admin);
  await admin.getByTestId("file-input").setInputFiles({
    name: name ?? "",
    mimeType: "application/zip",
    buffer: readFileSync(join(out, name ?? "")),
  });
  await expect(
    admin
      .getByRole("list", { name: "Uploads" })
      .getByRole("listitem")
      .filter({ hasText: name ?? "" }),
  ).toContainText("Uploaded", { timeout: 30_000 });

  await admin.reload();
  const bundle = admin
    .getByTestId("chunithm-bundles")
    .getByRole("listitem")
    .filter({ hasText: name ?? "" });
  await bundle.getByRole("button", { name: "Import" }).click();
  await expect(admin.getByRole("status")).toContainText(
    "Importing in the background",
  );
  const result = admin
    .getByTestId("chunithm-imports")
    .getByRole("listitem")
    .filter({ hasText: name ?? "" });
  await expect(async () => {
    await admin.reload();
    await expect(result).toContainText("0 imported, 1 skipped, 0 refused.", {
      timeout: 1000,
    });
  }).toPass({ timeout: 30_000 });
  await result.getByText("Skipped and refused charts").click();
  await expect(result).toContainText("it isn't in the catalog");
  expect(await axe(admin)).toEqual([]);
});
