import { randomBytes } from "node:crypto";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { continueAs, freshLogin } from "./support";

/**
 * The wiki is the same server on another host: wiki.localhost here (browsers send
 * *.localhost to this machine), with the main site as localhost. Signing in starts
 * on the main site and comes back with a one-time ticket.
 */
function wikiOrigin(baseURL: string | undefined): string {
  const url = new URL(baseURL ?? "http://127.0.0.1:4329");
  url.hostname = "wiki.localhost";
  return url.origin;
}

async function wikiPage(browser: Browser, baseURL: string | undefined) {
  const context = await browser.newContext({ baseURL: wikiOrigin(baseURL) });
  return context.newPage();
}

/** Signs in on the wiki through the main site, as a FAKE_USERS key or a login. */
async function signIn(page: Page, user: string, next = "/skygrid/") {
  await page.goto(`/-/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, user);
  await expect(page).toHaveURL(/^http:\/\/wiki\.localhost:\d+\//);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

test("the Skygrid wiki has written and generated pages", async ({
  browser,
  baseURL,
}) => {
  const page = await wikiPage(browser, baseURL);
  await page.goto("/");
  await page.getByRole("link", { name: "Skygrid" }).first().click();
  await expect(page).toHaveURL("/skygrid/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Main Page" }),
  ).toBeVisible();
  await expect(page.locator("[data-wiki-band]")).toContainText("SKY");

  // A generated page: from the game's data, with no edit tab.
  await page.goto("/skygrid/wheat");
  await expect(page).toHaveURL("/skygrid/Wheat");
  await expect(page.locator("[data-generated]")).toContainText(
    "Skygrid's game data",
  );
  await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
  await expect(page.locator(".prose")).toContainText("Enchanted Wheat");

  // Categories list their pages.
  await page.goto("/skygrid/Category:Mobs");
  await expect(
    page.getByRole("link", { name: "Spider", exact: true }),
  ).toBeVisible();

  // Search inside the wiki: an exact title opens the page.
  await page
    .getByRole("searchbox", { name: "Search Skygrid" })
    .fill("broodmother");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL("/skygrid/Broodmother");

  // A page nobody wrote: a 404 that can't be created when signed out.
  const missing = await page.goto("/skygrid/No_such_page");
  expect(missing?.status()).toBe(404);
  await expect(page.getByText("Skygrid has no page called")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create this page" }),
  ).toHaveCount(0);
});

test("/wiki/ on the main site goes to the wiki, and the main site's paths go back", async ({
  page,
  baseURL,
}) => {
  const local = (baseURL ?? "").replace("127.0.0.1", "localhost");
  await page.goto(`${local}/wiki/skygrid/Wheat`);
  await expect(page).toHaveURL(`${wikiOrigin(baseURL)}/skygrid/Wheat`);
  // Server-rendered main-site paths redirect here; pre-built files are Caddy's job
  // in production (deploy/smoke-test.sh checks that).
  await page.goto(`${wikiOrigin(baseURL)}/people/nobody/`);
  await expect(page).toHaveURL(`${local}/people/nobody/`);
});

test("the admin starts a wiki, writes, moves and restores pages, and adds an editor", async ({
  browser,
  baseURL,
}) => {
  // Two people and a whole wiki's life: longer than the default timeout.
  test.slow();
  const slug = `e2e-${randomBytes(3).toString("hex")}`;
  const admin = await wikiPage(browser, baseURL);
  await signIn(admin, "admin", "/");

  await admin.getByRole("link", { name: "New wiki" }).click();
  await admin.getByLabel("Address").fill(slug);
  await admin
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Test Server");
  await admin.getByRole("textbox", { name: "Code", exact: true }).fill("tst");
  await admin.getByRole("combobox", { name: "Kind" }).selectOption("minecraft");
  await admin.getByLabel("Private", { exact: true }).check();
  await admin.getByRole("button", { name: "Create wiki" }).click();
  await expect(admin).toHaveURL(`/${slug}/`);
  await expect(admin.locator("[data-wiki-band]")).toContainText("TST");

  // A new page, previewed, then saved.
  await admin.goto(`/${slug}/-/create`);
  await admin.getByLabel("Title").fill("Spawn");
  await admin.getByRole("button", { name: "Continue" }).click();
  await admin
    .getByLabel("Text")
    .fill("# Getting there\n\nTake the [[Rail line]].\n\n[[Category:Places]]");
  await admin.getByRole("button", { name: "Preview" }).click();
  await expect(admin.getByText("Preview: not saved yet")).toBeVisible();
  await expect(admin.locator(".prose a.is-missing")).toHaveText("Rail line");
  await admin.getByLabel("Summary of your change").fill("First draft");
  await admin.getByRole("button", { name: "Save" }).click();
  await expect(admin).toHaveURL(`/${slug}/Spawn`);
  await expect(
    admin.getByRole("heading", { level: 2, name: "Getting there" }),
  ).toBeVisible();
  await expect(admin.getByRole("link", { name: "Places" })).toBeVisible();

  await admin.goto(`/${slug}/-/wanted`);
  await expect(admin.locator("[data-wanted]")).toContainText("Rail line");

  // An edit, its history and what it changed.
  await admin.goto(`/${slug}/-/edit/Spawn`);
  await admin
    .getByLabel("Text")
    .fill("# Getting there\n\nTake the [[Rail line]] north.\n");
  await admin.getByRole("button", { name: "Save" }).click();
  await admin.getByRole("link", { name: "History" }).click();
  await expect(admin.locator("[data-revision]")).toHaveCount(2);
  await admin.getByRole("link", { name: "Changes", exact: true }).click();
  await expect(admin.locator("[data-diff-stats]")).toContainText(
    "1 line added",
  );

  // Moved, with a redirect left behind.
  await admin.goto(`/${slug}/-/move/Spawn`);
  await admin.getByLabel("New title").fill("World spawn");
  await admin.getByRole("button", { name: "Move page" }).click();
  await expect(admin).toHaveURL(`/${slug}/World_spawn`);
  await admin.goto(`/${slug}/Spawn`);
  await expect(admin).toHaveURL(`/${slug}/World_spawn?from=Spawn`);
  await expect(admin.getByText("Redirected from")).toBeVisible();

  // Deleted, then restored.
  await admin.goto(`/${slug}/-/move/World_spawn`);
  await admin.getByRole("button", { name: "Delete page" }).click();
  await expect(admin.getByText("This page was deleted.")).toBeVisible();
  await admin.getByRole("button", { name: "Restore" }).click();
  await expect(
    admin.getByRole("heading", { level: 2, name: "Getting there" }),
  ).toBeVisible();

  // A newcomer can't see the private wiki until they're made an editor.
  const login = freshLogin("wikier");
  const writer = await wikiPage(browser, baseURL);
  await signIn(writer, login, "/");
  const hidden = await writer.goto(`/${slug}/`);
  expect(hidden?.status()).toBe(404);

  await admin.goto(`/${slug}/-/settings`);
  await admin.getByLabel("Username").fill(login);
  await admin.getByRole("button", { name: "Add or change member" }).click();
  await expect(admin.locator("[data-members]")).toContainText(`@${login}`);

  await writer.goto(`/${slug}/-/edit/Rail_line`);
  await writer.getByLabel("Text").fill("Runs from [[World spawn]].");
  await writer.getByRole("button", { name: "Save" }).click();
  await expect(writer).toHaveURL(`/${slug}/Rail_line`);
  // Editors don't run the wiki.
  await expect(
    writer.getByRole("link", { name: "Settings", exact: true }),
  ).toHaveCount(0);
  const settings = await writer.goto(`/${slug}/-/settings`);
  expect(settings?.status()).toBe(403);

  await admin.goto(`/${slug}/-/recent`);
  await expect(admin.locator("[data-recent]")).toContainText(`@${login}`);
});

test("people outside a wiki can read it but not edit it", async ({
  browser,
  baseURL,
}) => {
  const page = await wikiPage(browser, baseURL);
  await signIn(page, freshLogin("reader"), "/skygrid/Main_Page");
  await page.getByRole("link", { name: "View source" }).click();
  await expect(
    page.getByText("Only this wiki's members can edit it."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
  // Posted from the page itself: the wiki's host only resolves in the browser.
  const status = await page.evaluate(async () => {
    const response = await fetch("/skygrid/-/edit/Main_Page", {
      method: "POST",
      body: new URLSearchParams({ body: "Vandalism", intent: "save" }),
    });
    return response.status;
  });
  expect(status).toBe(403);
});
