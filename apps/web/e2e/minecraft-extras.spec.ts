import AxeBuilder from "@axe-core/playwright";
import { writeNbt } from "@trilleo/mc-files/testing";
import { expect, test, type Page } from "@playwright/test";
import { adminPage, freshLogin, hydrated, newPage } from "./support";

// The platform's extras: a build's 3D preview, materials and automatic cover, the
// JSON API, embeds, and creators' download stats.

/** A 3 × 2 × 1 Sponge schematic: two stone, one oak planks, three air. */
function schematic(): Buffer {
  return Buffer.from(
    writeNbt(
      {
        Version: { int: 2 },
        DataVersion: { int: 4189 },
        Width: { short: 3 },
        Height: { short: 2 },
        Length: { short: 1 },
        Palette: {
          compound: {
            "minecraft:air": { int: 0 },
            "minecraft:stone": { int: 1 },
            "minecraft:oak_planks": { int: 2 },
          },
        },
        BlockData: { bytes: [1, 1, 2, 0, 0, 0] },
      },
      { gzip: true },
    ),
  );
}

async function noViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

test("a build gets a 3D view, materials, a cover, an API entry and an embed", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const slug = freshLogin("hut");

  // The project, then a release from the dropped schematic.
  await admin.goto("/account/minecraft/new/");
  await admin.getByLabel("Build", { exact: true }).check();
  await admin.getByLabel("Name", { exact: true }).fill("Tiny Hut");
  await admin.locator("#slug").fill(slug);
  await admin.getByLabel("Summary").fill("Three blocks of house.");
  await admin.getByRole("button", { name: "Create project" }).click();
  await expect(admin).toHaveURL(/\/gallery\/\?done=created$/);
  const editor = admin.url().replace(/gallery\/.*$/, "");

  await admin.goto(`${editor}releases/new/`);
  await hydrated(admin);
  await admin.locator('input[type="file"]').setInputFiles({
    name: "tiny-hut.schem",
    mimeType: "application/octet-stream",
    buffer: schematic(),
  });
  await expect(
    admin.getByText("Sponge schematic · 3 × 2 × 1 blocks"),
  ).toBeVisible();
  await expect(admin.getByRole("checkbox", { name: "1.21.4" })).toBeChecked();
  await admin.getByLabel("Version", { exact: true }).fill("1.0");
  await admin
    .getByRole("button", { name: "Create release and upload" })
    .click();
  await expect(admin).toHaveURL(/\/releases\/\d+\/\?done=created$/);

  // Visitors: the 3D view loads on request, and the materials are listed.
  const visitor = await newPage(browser, baseURL);
  await visitor.goto(`/minecraft/builds/${slug}/`);
  const materials = visitor.getByTestId("materials");
  await expect(materials).toContainText("2 kinds · 3 blocks");
  await expect(materials).toContainText("Stone");
  await expect(visitor.getByRole("figure")).toContainText("Isometric view");
  await noViolations(visitor);
  await hydrated(visitor);
  await visitor.getByRole("button", { name: "View in 3D" }).click();
  await expect(
    visitor.getByRole("img", {
      name: /Tiny Hut, 3 × 2 × 1 blocks, drawn in 3D/,
    }),
  ).toBeVisible();
  await expect(visitor.getByLabel(/Layers 1–2/)).toBeVisible();
  await noViolations(visitor);

  // The JSON API, open to other sites.
  const api = await visitor.request.get(`/api/minecraft/v1/projects/${slug}`);
  expect(api.headers()["access-control-allow-origin"]).toBe("*");
  expect(await api.json()).toMatchObject({
    name: "Tiny Hut",
    type: "builds",
    releases: [{ version: "1.0", files: [{ name: "tiny-hut.schem" }] }],
  });

  // The embed card may be framed anywhere.
  const embed = await visitor.request.get(`/minecraft/builds/${slug}/embed/`);
  expect(embed.headers()["content-security-policy"]).toBe("frame-ancestors *");
  expect(await embed.text()).toContain("Tiny Hut");
  await visitor.goto(`/minecraft/builds/${slug}/`);
  await visitor.locator("summary", { hasText: "Embed on your site" }).click();
  await expect(visitor.locator("textarea[readonly]")).toHaveValue(
    new RegExp(`<iframe src="[^"]+/minecraft/builds/${slug}/embed/"`),
  );

  // The creator sees downloads on their dashboard and the project's releases.
  await admin.goto("/account/minecraft/");
  await expect(admin.getByRole("heading", { name: "Downloads" })).toBeVisible();
  await expect(
    admin.getByRole("img", {
      name: /Downloads of your projects: \d+ in the last 30 days/,
    }),
  ).toBeVisible();
  await admin.goto(`${editor}releases/`);
  await expect(
    admin.getByRole("img", { name: /Downloads of Tiny Hut/ }),
  ).toBeVisible();
});

test("previews stay private until their file is out", async ({
  browser,
  baseURL,
}) => {
  const visitor = await newPage(browser, baseURL);
  expect(
    (await visitor.request.get("/minecraft/preview/abcdefghijkl.bin")).status(),
  ).toBe(404);
  const refused = await visitor.request.post(
    "/api/minecraft/preview?file=abcdefghijkl",
    { data: Buffer.from("x"), headers: { origin: baseURL ?? "" } },
  );
  expect(refused.status()).toBe(401);
});
