import AxeBuilder from "@axe-core/playwright";
import { randomBytes } from "node:crypto";
import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  adminPage,
  continueAs,
  freshLogin,
  hydrated,
  openMail,
} from "./support";
import { githubEmail } from "./fake-github";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

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

test("the TownyMenu wiki shows the plugin's menus, and they click through", async ({
  browser,
  baseURL,
}) => {
  const page = await wikiPage(browser, baseURL);
  await page.goto("/townymenu/");
  await expect(page.locator("[data-wiki-band]")).toContainText("TMN");

  // The main menu: buttons with the game's tooltips.
  const menu = page.getByRole("group", { name: "Towny" });
  const town = menu.getByRole("link", { name: "Oakhaven" });
  await town.hover();
  await expect(
    page.getByRole("tooltip").filter({ hasText: "Mayor: Rowan" }),
  ).toBeVisible();

  // Arrow keys move along the buttons, links or not.
  await menu.getByRole("link", { name: "Rowan" }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("link", { name: "Northmark" })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(town).toBeFocused();
  await page.keyboard.press("End");
  await expect(menu.getByRole("link", { name: "Server Admin" })).toBeFocused();

  // A button opens the page about its menu.
  await town.click();
  await expect(page).toHaveURL("/townymenu/Town_menu");
  await expect(page.getByRole("group", { name: "Your Town" })).toBeVisible();
  await page
    .getByRole("group", { name: "Your Town" })
    .getByRole("link", { name: "Claims" })
    .click();
  await expect(page).toHaveURL("/townymenu/Claiming_land");

  // Switches glow while they're on.
  await page.goto("/townymenu/Settings_menus");
  const settings = page.getByRole("group", { name: "Town Settings" });
  await expect(settings.getByRole("img", { name: "Open" })).toHaveClass(
    /is-glowing/,
  );
  await expect(settings.getByRole("img", { name: "PvP" })).not.toHaveClass(
    /is-glowing/,
  );
});

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

test("people outside a wiki can read it, and propose edits once signed in", async ({
  browser,
  baseURL,
}) => {
  const page = await wikiPage(browser, baseURL);
  await page.goto("/skygrid/Main_Page");
  await page.getByRole("link", { name: "View source" }).click();
  await expect(
    page.getByText("Sign in to edit: only this wiki's members can."),
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

  await signIn(page, freshLogin("reader"), "/skygrid/Main_Page");
  await page.getByRole("link", { name: "Propose a change" }).click();
  await expect(
    page.getByText("your change goes to them as a proposal"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Propose" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
});

test("proposed edits are reviewed, and watchers hear about changes", async ({
  browser,
  baseURL,
}) => {
  // Three people, emails and a digest: longer than the default timeout.
  test.slow();
  const slug = `e2e-${randomBytes(3).toString("hex")}`;
  const admin = await wikiPage(browser, baseURL);
  await signIn(admin, "admin", "/");
  await admin.goto("/-/new");
  await admin.getByLabel("Address").fill(slug);
  await admin
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Proposals");
  await admin.getByRole("textbox", { name: "Code", exact: true }).fill("prp");
  await admin.getByRole("button", { name: "Create wiki" }).click();
  await expect(admin).toHaveURL(`/${slug}/`);
  await admin.goto(`/${slug}/-/edit/Rules`);
  await admin.getByLabel("Text").fill("Be kind.\n");
  await admin.getByRole("button", { name: "Save" }).click();

  const editorLogin = freshLogin("reviewer");
  const editor = await wikiPage(browser, baseURL);
  await signIn(editor, editorLogin, "/");
  await admin.goto(`/${slug}/-/settings`);
  await admin.getByLabel("Username").fill(editorLogin);
  await admin.getByRole("button", { name: "Add or change member" }).click();
  await expect(admin.locator("[data-members]")).toContainText(
    `@${editorLogin}`,
  );

  // Someone outside the wiki proposes a change.
  const proposerLogin = freshLogin("proposer");
  const proposer = await wikiPage(browser, baseURL);
  await signIn(proposer, proposerLogin, `/${slug}/Rules`);
  await proposer.getByRole("link", { name: "Propose a change" }).click();
  await proposer.getByLabel("Text").fill("Be kind.\nNo griefing.\n");
  await proposer.getByLabel("Summary of your change").fill("Add a rule");
  await proposer.getByRole("button", { name: "Propose" }).click();
  await expect(proposer).toHaveURL(new RegExp(`/${slug}/-/proposals/\\d+$`));
  await expect(proposer.locator("[data-proposal-status]")).toHaveAttribute(
    "data-proposal-status",
    "pending",
  );
  await expect(proposer.locator("[data-diff-stats]")).toContainText(
    "1 line added",
  );

  // The editor hears about it and approves it.
  const mainAdmin = await adminPage(browser, baseURL);
  const proposalMail = await openMail(
    mainAdmin,
    githubEmail(editorLogin) ?? "",
    "wiki-proposal",
  );
  expect(proposalMail).toContain(`@${proposerLogin} proposed an edit`);
  await editor.goto(`/${slug}/-/proposals`);
  await editor.locator("[data-proposals]").getByRole("link").nth(1).click();
  await editor.getByRole("button", { name: "Approve and save" }).click();
  await expect(editor.getByRole("status")).toContainText("Approved");
  await editor.goto(`/${slug}/Rules`);
  await expect(editor.locator(".prose")).toContainText("No griefing.");
  await editor.goto(`/${slug}/-/history/Rules`);
  await expect(editor.locator("[data-revision]").first()).toContainText(
    `@${proposerLogin}`,
  );
  const decision = await openMail(
    mainAdmin,
    githubEmail(proposerLogin) ?? "",
    "wiki-decision",
  );
  expect(decision).toContain("Your edit is live");

  // A second proposal is declined with a note.
  await proposer.goto(`/${slug}/-/edit/Rules`);
  await proposer.getByLabel("Text").fill("Anything goes.\n");
  await proposer.getByRole("button", { name: "Propose" }).click();
  const second = proposer.url();
  await editor.goto(second);
  await editor.getByLabel(/Why not/).fill("That undoes the rules.");
  await editor.getByRole("button", { name: "Decline" }).click();
  await proposer.goto(second);
  await expect(proposer.locator("[data-proposal-status]")).toContainText(
    "That undoes the rules.",
  );

  // The proposer watches the page now; the editor's edit shows on the watchlist
  // and goes out in the digest.
  await editor.goto(`/${slug}/-/edit/Rules`);
  await editor.getByLabel("Text").fill("Be kind.\nNo griefing.\nNo spam.\n");
  await editor.getByLabel("Summary of your change").fill("Spam rule");
  await editor.getByRole("button", { name: "Save" }).click();
  await proposer.goto("/-/watchlist");
  await expect(proposer.locator("[data-watchlist]")).toContainText(
    `@${editorLogin}`,
  );
  await expect(proposer.locator("[data-watches]")).toContainText("Rules");
  await mainAdmin.goto("/admin/mail/");
  await mainAdmin
    .getByRole("button", { name: "Send due wiki digests" })
    .click();
  const digest = await openMail(
    mainAdmin,
    githubEmail(proposerLogin) ?? "",
    "wiki-digest",
  );
  expect(digest).toContain(`Rules: an edit by @${editorLogin}`);

  // The new pages pass axe, signed in.
  for (const [who, path] of [
    [proposer, "/-/watchlist"],
    [proposer, second],
    [editor, `/${slug}/-/proposals?show=all`],
    [proposer, `/${slug}/-/edit/Rules`],
  ] as const) {
    await who.goto(path);
    const { violations } = await new AxeBuilder({ page: who })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(violations.map((v) => `${path} ${v.id}: ${v.help}`)).toEqual([]);
  }

  // Watching and unwatching by hand.
  await proposer.goto(`/${slug}/Rules`);
  await proposer.getByRole("button", { name: "Unwatch this page" }).click();
  await expect(
    proposer.getByRole("button", { name: "Watch this page" }),
  ).toBeVisible();
  await proposer.goto(`/${slug}/-/recent`);
  await proposer.getByRole("button", { name: "Watch this wiki" }).click();
  await proposer.goto(`/${slug}/Rules`);
  await expect(proposer.getByText("Watched with the whole wiki")).toBeVisible();
});

test("pages use components: infobox beside the text, tabs, notices and stubs", async ({
  browser,
  baseURL,
}) => {
  test.slow();
  const slug = `e2e-${randomBytes(3).toString("hex")}`;
  const admin = await wikiPage(browser, baseURL);
  await signIn(admin, "admin", "/");
  await admin.goto("/-/new");
  await admin.getByLabel("Address").fill(slug);
  await admin.getByRole("textbox", { name: "Name", exact: true }).fill("Parts");
  await admin.getByRole("textbox", { name: "Code", exact: true }).fill("prt");
  await admin.getByRole("button", { name: "Create wiki" }).click();
  await expect(admin).toHaveURL(`/${slug}/`);

  await admin.goto(`/${slug}/-/edit/Lamp`);
  await admin
    .getByLabel("Text")
    .fill(
      [
        "::: infobox",
        "Made of: [[Glass]]",
        "Light: 15",
        ":::",
        "",
        "A lamp. Press {{kbd E}} to switch it. {{badge accent New}}",
        "",
        "::: notice warning Careful",
        "It gets hot.",
        ":::",
        "",
        "::: tabs",
        "== Java ==",
        "Right-click it.",
        "== Bedrock ==",
        "Tap it.",
        ":::",
        "",
        "::: stub :::",
        "",
        "::: nothing :::",
      ].join("\n"),
    );
  await admin.getByRole("button", { name: "Save" }).click();
  await expect(admin).toHaveURL(`/${slug}/Lamp`);

  // On desktop the infobox sits beside the text, once.
  const infobox = admin.getByRole("region", { name: "Lamp" });
  await expect(infobox).toHaveCount(1);
  await expect(infobox).toContainText("Light");
  await expect(infobox.getByRole("link", { name: "Glass" })).toBeVisible();
  await expect(admin.locator("kbd")).toHaveText("E");
  await expect(
    admin.getByRole("note").filter({ hasText: "It gets hot." }),
  ).toBeVisible();

  // Tabs switch.
  await expect(admin.getByText("Right-click it.")).toBeVisible();
  await expect(admin.getByText("Tap it.")).toBeHidden();
  await admin.getByRole("tab", { name: "Bedrock" }).click();
  await expect(admin.getByText("Tap it.")).toBeVisible();

  // A stub joins its category; an unknown component shows an error, not nothing.
  await expect(admin.getByRole("link", { name: "Stubs" })).toBeVisible();
  await expect(admin.getByText("no component called “nothing”")).toBeVisible();
  await admin.goto(`/${slug}/Category:Stubs`);
  await expect(
    admin.getByRole("link", { name: "Lamp", exact: true }),
  ).toBeVisible();

  // The wiki's documentation lists every component.
  await admin.goto(`/${slug}/-/components`);
  await expect(admin.locator("[data-component]")).toHaveCount(12);
});

test("a Minecraft wiki: members upload icons, describe items and show them", async ({
  browser,
  baseURL,
}) => {
  test.slow();
  const slug = `e2e-${randomBytes(3).toString("hex")}`;
  const admin = await wikiPage(browser, baseURL);
  await signIn(admin, "admin", "/");
  await admin.goto("/-/new");
  await admin.getByLabel("Address").fill(slug);
  await admin
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Blocks");
  await admin.getByRole("textbox", { name: "Code", exact: true }).fill("blk");
  await admin.getByRole("checkbox", { name: "Minecraft" }).check();
  await admin.getByRole("button", { name: "Create wiki" }).click();
  await expect(admin).toHaveURL(`/${slug}/`);

  // A member's picture is published once scanned, without review.
  const login = freshLogin("builder");
  const member = await wikiPage(browser, baseURL);
  await signIn(member, login, "/");
  await admin.goto(`/${slug}/-/settings`);
  await admin.getByLabel("Username").fill(login);
  await admin.getByRole("button", { name: "Add or change member" }).click();
  await expect(admin.locator("[data-members]")).toContainText(`@${login}`);

  await member.goto(`/${slug}/-/files`);
  await hydrated(member);
  await member.locator('input[type="file"]').setInputFiles({
    name: "lamp.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  const uploads = member.getByRole("list", { name: "Uploads" });
  await expect(uploads).toContainText("Uploaded");
  await expect(uploads).not.toContainText("waiting for review");
  await member.reload();
  await expect(member.locator("[data-wiki-files]")).toContainText("Published");
  const address = await member
    .locator("[data-wiki-files] code")
    .first()
    .textContent();
  expect(address).toBeTruthy();

  // An Item: page describes the lamp; another page shows it.
  await member.goto(`/${slug}/-/edit/Item:Lamp`);
  await member
    .getByLabel("Text")
    .fill(
      [
        "::: item",
        "rarity: rare",
        "type: block",
        `icon: ${address ?? ""}`,
        "lore: §7Lights up the room.",
        ":::",
      ].join("\n"),
    );
  await member.getByRole("button", { name: "Save" }).click();
  await expect(member).toHaveURL(`/${slug}/Item:Lamp`);
  await expect(member.getByRole("region", { name: "Lamp" })).toContainText(
    "RARE BLOCK",
  );

  await member.goto(`/${slug}/-/edit/Lighting`);
  await member
    .getByLabel("Text")
    .fill(
      [
        "Place a {{item Lamp x3}} in each room.",
        "",
        "::: inventory 1x3 Hotbar",
        "1: Lamp x16",
        "3: Torch",
        ":::",
      ].join("\n"),
    );
  await member.getByRole("button", { name: "Save" }).click();
  await expect(member).toHaveURL(`/${slug}/Lighting`);
  const lamp = member.locator(".mc-item-link").first();
  await expect(lamp).toContainText("Lamp");
  await expect(lamp.locator("img.mc-icon")).toHaveAttribute(
    "src",
    address ?? "",
  );
  await lamp.hover();
  await expect(member.getByRole("tooltip").first()).toContainText(
    "Lights up the room.",
  );

  // The hotbar: two items, one unknown (dashed, linking to the page that would describe it).
  const hotbar = member.getByRole("group", { name: "Hotbar" });
  await expect(hotbar.getByRole("link")).toHaveCount(2);
  await expect(hotbar.getByRole("link", { name: "Lamp, 16" })).toBeVisible();
  await expect(hotbar.getByRole("link", { name: "Torch" })).toHaveAttribute(
    "href",
    `/${slug}/Item:Torch`,
  );
  await hotbar.getByRole("link", { name: "Lamp, 16" }).focus();
  await member.keyboard.press("ArrowRight");
  await expect(hotbar.getByRole("link", { name: "Torch" })).toBeFocused();
});

test("recipes show on their items' pages, and calculators answer as readers type", async ({
  browser,
  baseURL,
}) => {
  test.slow();
  const slug = `e2e-${randomBytes(3).toString("hex")}`;
  const admin = await wikiPage(browser, baseURL);
  await signIn(admin, "admin", "/");
  await admin.goto("/-/new");
  await admin.getByLabel("Address").fill(slug);
  await admin
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Crafts");
  await admin.getByRole("textbox", { name: "Code", exact: true }).fill("crf");
  await admin.getByRole("checkbox", { name: "Minecraft" }).check();
  await admin.getByRole("button", { name: "Create wiki" }).click();
  await expect(admin).toHaveURL(`/${slug}/`);

  const write = async (title: string, lines: string[]) => {
    await admin.goto(`/${slug}/-/edit/${title}`);
    await admin.getByLabel("Text").fill(lines.join("\n"));
    await admin.getByRole("button", { name: "Save" }).click();
    await expect(admin).toHaveURL(`/${slug}/${title}`);
  };
  await write("Recipes", [
    "::: recipe Crafting Table",
    "row 1: Plank, Plank",
    "row 2: Plank, Plank",
    "makes: Workbench",
    ":::",
    "",
    "::: recipe Sawmill, 2 s",
    "- Log",
    "makes: Plank x4",
    ":::",
  ]);
  await write("Item:Plank", ["::: item", "rarity: common", ":::"]);

  // The plank's page lists what makes it and what it's used in.
  await expect(
    admin.locator('[data-item-recipes="made-with"] figure'),
  ).toContainText("Sawmill");
  await expect(
    admin.locator('[data-item-recipes="used-in"] figure'),
  ).toContainText("Crafting Table");

  await write("Planning", [
    "::: materials Workbench x3 :::",
    "",
    "::: calculator Speed",
    "input logs: Logs per minute = 10",
    "result planks: Planks per minute = logs * 4",
    ":::",
    "",
    "::: costs Upgrades",
    "columns: Coins",
    "I: 10",
    "II: 20",
    "III: 40",
    ":::",
  ]);

  // Materials: 3 workbenches → 12 planks → 3 logs; less with planks on hand.
  const materials = admin.getByRole("region", {
    name: "Materials for Workbench",
  });
  const totals = materials.locator("[data-materials-totals]");
  await expect(totals).toContainText("3 × Log");
  await materials.getByLabel("How many").fill("5");
  await expect(totals).toContainText("5 × Log");
  await materials.getByText("What you already have").click();
  await materials.getByLabel("Plank", { exact: true }).fill("8");
  await expect(totals).toContainText("3 × Log");

  const calculator = admin.getByRole("region", { name: "Speed" });
  await expect(calculator.locator("output")).toHaveText("40");
  await calculator.getByLabel("Logs per minute").fill("25");
  await expect(calculator.locator("output")).toHaveText("100");

  const costs = admin.getByRole("region", { name: "Upgrades" });
  await expect(costs.locator("[data-costs-total]")).toHaveText("70");
  await costs.getByLabel("From").selectOption({ label: "I" });
  await expect(costs.locator("[data-costs-total]")).toHaveText("60");
});
