import AxeBuilder from "@axe-core/playwright";
import { makeZip } from "@trilleo/storage/testing";
import { expect, test, type Page } from "@playwright/test";
import {
  adminPage,
  continueAs,
  freshLogin,
  hydrated,
  newPage,
} from "./support";

// The creator's side of the Minecraft platform: making a project, adding pictures,
// releasing a mod (its form filled in from the jar), and the admin's review that
// puts it out.

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function fabricJar(id: string): Buffer {
  return Buffer.from(
    makeZip([
      { name: "META-INF/MANIFEST.MF", data: "Manifest-Version: 1.0\n" },
      {
        name: "fabric.mod.json",
        deflate: true,
        data: JSON.stringify({
          schemaVersion: 1,
          id,
          version: "2.0.0",
          name: "Test Mod",
          depends: { minecraft: "~1.21.4", "fabric-api": "*" },
        }),
      },
    ]),
  );
}

async function signIn(page: Page, login: string, next: string) {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, login);
  await expect(page).toHaveURL(next);
}

async function noViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

test("a creator makes a project, adds a picture and releases a mod", async ({
  browser,
  baseURL,
}) => {
  const login = freshLogin("modder");
  const slug = `test-mod-${login.split("-").at(-1) ?? "x"}`;
  const creator = await newPage(browser, baseURL);
  await signIn(creator, login, "/account/minecraft/");
  await expect(creator.getByText("Nothing yet.")).toBeVisible();
  await noViolations(creator);

  // The project: refused without a summary, then made.
  await creator.getByRole("link", { name: "New project" }).click();
  await creator.getByLabel("Mod", { exact: true }).check();
  await creator.getByLabel("Name", { exact: true }).fill("Test Mod");
  await creator.locator("#slug").fill(slug);
  await creator.getByRole("button", { name: "Create project" }).click();
  await expect(creator.getByRole("alert")).toContainText("Not saved");
  await expect(creator.locator("#summary-hint")).toContainText(
    "Say in a line what it is.",
  );
  await creator.getByLabel("Summary").fill("A mod made by a test.");
  await creator.getByLabel("Description").fill("## Hello\n\nIt *works*.");
  await creator.getByRole("button", { name: "Create project" }).click();
  await expect(creator).toHaveURL(
    /\/account\/minecraft\/\d+\/gallery\/\?done=created$/,
  );
  const projectUrl = creator.url().replace(/gallery\/.*$/, "");
  await noViolations(creator);

  // A picture: it waits for review (a newcomer).
  await hydrated(creator);
  await creator.locator('input[type="file"]').setInputFiles({
    name: "shot.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(creator.getByRole("list", { name: "Uploads" })).toContainText(
    "waiting for review",
    { ignoreCase: true },
  );
  await creator.reload();
  const gallery = creator.getByTestId("gallery");
  await expect(gallery).toContainText("Waiting for review");
  await expect(gallery).toContainText("Cover");
  await gallery.getByLabel("Caption").fill("The workbench");
  await gallery.getByRole("button", { name: "Save" }).click();
  await expect(creator.getByRole("status")).toHaveText("Caption saved.");

  // A release: the jar fills the form in.
  await creator.goto(`${projectUrl}releases/new/`);
  await hydrated(creator);
  await creator.locator('input[type="file"]').setInputFiles({
    name: `${slug}-2.0.0.jar`,
    mimeType: "application/java-archive",
    buffer: fabricJar(slug),
  });
  await expect(creator.getByText("Fabric mod · Test Mod 2.0.0")).toBeVisible();
  await expect(creator.getByLabel("Version", { exact: true })).toHaveValue(
    "2.0.0",
  );
  await expect(creator.getByRole("checkbox", { name: "1.21.4" })).toBeChecked();
  await expect(creator.getByRole("checkbox", { name: "Fabric" })).toBeChecked();
  await expect(
    creator.getByRole("textbox", { name: "Dependency 1: project" }),
  ).toHaveValue("Fabric API");
  await noViolations(creator);
  await creator
    .getByRole("button", { name: "Create release and upload" })
    .click();
  await expect(creator).toHaveURL(/\/releases\/\d+\/\?done=created$/);
  await expect(creator.getByRole("status").first()).toContainText(
    "once its main file has been reviewed",
  );
  await expect(creator.getByTestId("release-files")).toContainText(
    "Waiting for review",
  );
  await noViolations(creator);

  // Still out of sight on the dashboard.
  await creator.goto("/account/minecraft/");
  await expect(creator.getByTestId("my-projects")).toContainText(
    "Waiting for a published release",
  );

  // The admin approves the jar (mods always wait): the project is out.
  const admin = await adminPage(browser, baseURL);
  await admin.goto("/admin/files/review?tab=waiting");
  const jarName = `${slug}-2.0.0.jar`;
  await expect(
    admin.locator("article", { hasText: jarName }).getByTestId("file-use"),
  ).toContainText("The main file of Test Mod 2.0.0");
  await admin
    .getByRole("button", { name: `Approve ${jarName}`, exact: true })
    .click();
  await expect(admin.getByRole("status")).toHaveText("Approved.");

  await creator.reload();
  await expect(creator.getByTestId("my-projects")).toContainText("Public");
  await expect(
    creator.getByTestId("my-projects").getByRole("link", { name: "View" }),
  ).toHaveAttribute("href", `/minecraft/mods/${slug}/`);
});

test("only the owner can open a project's editor", async ({
  browser,
  baseURL,
}) => {
  const owner = await newPage(browser, baseURL);
  await signIn(owner, freshLogin("owner"), "/account/minecraft/new/");
  await owner.getByLabel("Plugin").check();
  await owner.getByLabel("Name", { exact: true }).fill("Private Plugin");
  await owner.locator("#slug").fill(freshLogin("private-plugin"));
  await owner.getByLabel("Summary").fill("Mine.");
  await owner.getByRole("button", { name: "Create project" }).click();
  await expect(owner).toHaveURL(/\/gallery\/\?done=created$/);
  const editor = owner.url().replace(/gallery\/.*$/, "");

  const other = await newPage(browser, baseURL);
  await signIn(other, freshLogin("other"), "/account/minecraft/");
  expect((await other.goto(editor))?.status()).toBe(404);
  const attach = await other.request.post("/api/minecraft/attach", {
    data: {
      project: Number(/\/(\d+)\/$/.exec(editor)?.[1]),
      file: "abcdefghijkl",
    },
    headers: { origin: new URL(other.url()).origin },
  });
  expect(attach.status()).toBe(404);
});
