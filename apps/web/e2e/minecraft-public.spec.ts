import AxeBuilder from "@axe-core/playwright";
import { makeZip } from "@trilleo/storage/testing";
import { expect, test, type Page } from "@playwright/test";
import { adminPage, continueAs, freshLogin, newPage } from "./support";

// The public side of the Minecraft platform: the admin's uploads publish at once, so
// they make the projects here (through the same endpoints the editor uses).

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function noViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

/** Uploads a file through the storage API, attached as it starts. */
async function upload(
  page: Page,
  purpose: string,
  name: string,
  body: Buffer,
  target: Record<string, unknown>,
) {
  const headers = { origin: new URL(page.url()).origin };
  const start = await page.request.post("/api/storage/uploads", {
    data: { purpose, name, size: body.length },
    headers,
  });
  expect(start.status()).toBe(201);
  const { file } = (await start.json()) as { file: { id: string } };
  const attach = await page.request.post("/api/minecraft/attach", {
    data: { ...target, file: file.id },
    headers,
  });
  expect(attach.status()).toBe(200);
  const parts = await page.request.post(
    `/api/storage/uploads/${file.id}/parts`,
    {
      data: { parts: [1] },
      headers,
    },
  );
  const { urls } = (await parts.json()) as { urls: Record<string, string> };
  await page.request.put(urls["1"] ?? "", { data: body });
  const done = await page.request.post(
    `/api/storage/uploads/${file.id}/complete`,
    { headers },
  );
  expect(done.status()).toBe(200);
}

/** A published mod with a picture and one release; returns its slug. */
async function publishMod(page: Page, name: string, summary: string) {
  const slug = freshLogin("mod");
  const origin = new URL(page.url()).origin;
  const made = await page.request.post("/account/minecraft/new/", {
    form: {
      type: "mod",
      name,
      slug,
      summary,
      description: "## Features\n\nIt *works*.",
      edition: "java",
      tags: "redstone",
      license: "MIT",
      state: "public",
    },
    headers: { origin },
  });
  const id = Number(/minecraft\/(\d+)\//.exec(made.url())?.[1]);
  expect(id).toBeGreaterThan(0);
  await upload(page, "minecraft-media", "shot.png", PNG, {
    project: id,
    caption: "The workbench",
  });
  const release = await page.request.post(
    `/account/minecraft/${String(id)}/releases/new/`,
    {
      form: {
        version: "1.0.0",
        gameVersions: "1.21.4",
        loaders: "fabric",
        changelog: "First release.",
      },
      headers: { origin, accept: "application/json" },
    },
  );
  expect(release.status()).toBe(201);
  const { releaseId } = (await release.json()) as { releaseId: number };
  await upload(
    page,
    "minecraft",
    `${slug}-1.0.0.jar`,
    Buffer.from(makeZip([{ name: "fabric.mod.json", data: "{}" }])),
    { project: id, release: releaseId, primary: true },
  );
  return slug;
}

test("visitors find, read and download a project", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const name = `Gizmo ${freshLogin("x")}`;
  const slug = await publishMod(admin, name, "A tiny redstone gizmo.");

  const visitor = await newPage(browser, baseURL);

  // The front page, the listing and search all find it.
  await visitor.goto("/minecraft/");
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Minecraft.",
  );
  await noViolations(visitor);
  await visitor.goto(`/minecraft/mods/?q=${encodeURIComponent(name)}`);
  const cards = visitor.getByTestId("project-cards");
  await expect(cards).toContainText(name);
  await expect(cards).toContainText("1.21.4");
  await noViolations(visitor);
  await visitor.goto("/minecraft/browse/?loader=forge&version=1.21.4");
  await expect(
    visitor.getByTestId("project-cards").getByText(name),
  ).toHaveCount(0);

  // Its page: facts, the picture, the description and Download.
  await visitor.goto(`/minecraft/mods/${slug}/`);
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(visitor.getByTestId("project-facts")).toContainText("Fabric");
  await expect(visitor.getByTestId("project-facts")).toContainText("MIT");
  await expect(visitor.locator(".prose h3")).toHaveText("Features");
  await expect(visitor.getByRole("figure")).toContainText("The workbench");
  expect(
    await visitor.locator('script[type="application/ld+json"]').textContent(),
  ).toContain('"SoftwareApplication"');
  await noViolations(visitor);

  const download = await visitor.request.get(
    `/minecraft/mods/${slug}/download/`,
    {
      maxRedirects: 0,
    },
  );
  expect(download.status()).toBe(302);
  expect(download.headers().location).toMatch(/^\/d\/[a-z0-9]{12}$/);
  expect(
    (
      await visitor.request.get(
        `/minecraft/mods/${slug}/download/?loader=forge`,
        {
          maxRedirects: 0,
        },
      )
    ).status(),
  ).toBe(404);

  // A wrong kind in the address redirects; the release has its own page.
  await visitor.goto(`/minecraft/worlds/${slug}/`);
  await expect(visitor).toHaveURL(`/minecraft/mods/${slug}/`);
  await visitor.goto(`/minecraft/mods/${slug}/releases/1.0.0/`);
  await expect(visitor.getByTestId("release-versions")).toHaveText("1.21.4");
  await expect(visitor.locator(".prose")).toContainText("First release.");
  await noViolations(visitor);

  // The creator's page, the share card, the sitemap and llms.txt.
  await visitor.goto("/minecraft/creators/site-owner/");
  await expect(visitor.getByTestId("project-cards")).toContainText(name);
  await noViolations(visitor);
  const image = await visitor.request.get(`/og/minecraft/${slug}.png`);
  expect(image.headers()["content-type"]).toBe("image/png");
  expect(
    await (await visitor.request.get("/sitemap-minecraft.xml")).text(),
  ).toContain(`/minecraft/mods/${slug}/`);
  expect(await (await visitor.request.get("/llms.txt")).text()).toContain(name);
});

test("drafts stay out of sight, and people can report a project", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const slug = await publishMod(admin, `Reported ${freshLogin("x")}`, "Spam?");

  const reader = await newPage(browser, baseURL);
  await reader.goto(`/sign-in?next=/minecraft/mods/${slug}/`);
  await reader.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(reader, freshLogin("reader"));
  await expect(reader).toHaveURL(`/minecraft/mods/${slug}/`);
  await reader.locator("summary", { hasText: "Report this project" }).click();
  await reader.getByLabel("Spam or misleading").check();
  await reader.getByRole("button", { name: "Send report" }).click();
  await expect(reader.getByRole("status")).toContainText("Thanks");

  // A draft is a 404 to everyone but its owner.
  const draft = freshLogin("draft");
  const origin = new URL(admin.url()).origin;
  await admin.request.post("/account/minecraft/new/", {
    form: {
      type: "world",
      name: "Secret World",
      slug: draft,
      summary: "Not yet.",
      edition: "java",
      license: "ARR",
      state: "draft",
    },
    headers: { origin },
  });
  expect((await reader.goto(`/minecraft/worlds/${draft}/`))?.status()).toBe(
    404,
  );
  await admin.goto(`/minecraft/worlds/${draft}/`);
  await expect(
    admin.getByText("A draft: only you can see this page."),
  ).toBeVisible();
});

test("the home page and footer lead to the platform", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#minecraft-title")).toHaveText("Minecraft");
  await expect(page.getByRole("contentinfo")).toContainText(
    "Not an official Minecraft product.",
  );
  await page
    .getByRole("navigation", { name: "Sections" })
    .getByRole("link", { name: "Minecraft" })
    .click();
  await expect(page).toHaveURL("/minecraft/");
});

test("the admin features, hides and settles reports about projects", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const name = `Moderated ${freshLogin("x")}`;
  const slug = await publishMod(admin, name, "To be moderated.");

  // Featured: it leads the front page.
  await admin.goto(`/admin/minecraft/?q=${slug}`);
  const row = admin
    .getByTestId("admin-projects")
    .locator("li", { hasText: name });
  await row.getByRole("button", { name: `Feature ${name}` }).click();
  await expect(admin.getByRole("status")).toHaveText(
    "Featured on the front page.",
  );
  await noViolations(admin);
  const visitor = await newPage(browser, baseURL);
  await visitor.goto("/minecraft/");
  await expect(
    visitor.locator("section", { has: visitor.locator("#featured-title") }),
  ).toContainText(name);

  // A report shows up for the admin, who finds nothing wrong.
  const reader = await newPage(browser, baseURL);
  await reader.goto(`/sign-in?next=/minecraft/mods/${slug}/`);
  await reader.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(reader, freshLogin("reader"));
  await reader.locator("summary", { hasText: "Report this project" }).click();
  await reader.getByLabel("Something else").check();
  await reader.getByLabel("Details (optional)").fill("Looks odd to me");
  await reader.getByRole("button", { name: "Send report" }).click();
  await admin.goto("/admin/minecraft/?tab=reports");
  const card = admin
    .getByTestId("project-reports")
    .locator("article", { hasText: name });
  await expect(card).toContainText("Looks odd to me");
  await noViolations(admin);
  await card
    .getByRole("button", { name: `Dismiss reports about ${name}` })
    .click();
  await expect(admin.getByRole("status")).toHaveText("Reports dismissed.");

  // Hidden: gone for everyone else, with the reason for the creator.
  await admin.goto(`/admin/minecraft/?q=${slug}`);
  await row.locator("summary", { hasText: "Hide" }).click();
  await row
    .getByRole("textbox", { name: `Reason to hide ${name}` })
    .fill("Misleading pictures");
  await row.getByRole("button", { name: `Hide ${name}` }).click();
  await expect(admin.getByRole("status")).toHaveText("Hidden.");
  expect((await visitor.goto(`/minecraft/mods/${slug}/`))?.status()).toBe(404);
  await admin.goto(`/minecraft/mods/${slug}/`);
  await expect(
    admin.getByText("Hidden by the site owner: Misleading pictures."),
  ).toBeVisible();

  await admin.goto(`/admin/minecraft/?q=${slug}`);
  await row.getByRole("button", { name: `Show ${name} again` }).click();
  await expect(admin.getByRole("status")).toHaveText("Shown again.");
  expect((await visitor.goto(`/minecraft/mods/${slug}/`))?.status()).toBe(200);
});
