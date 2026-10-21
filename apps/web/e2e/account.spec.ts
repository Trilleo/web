import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { deflateSync } from "node:zlib";
import { continueAs, freshLogin, newPage } from "./support";

// Each test signs in as its own fresh account, so they can run in parallel and be
// retried; only the admin is shared, and nothing here signs them out.

/** The header's account slot, once its server island is in. */
const header = (page: Page) => page.getByRole("banner");
const menuButton = (page: Page) =>
  header(page).locator("summary", { hasText: "Account menu for" });

/** Signs in from the header's "Sign in", ending back on the same page. */
async function signInFromHeader(page: Page, user: string, start = "/about/") {
  await page.goto(start);
  await header(page)
    .getByRole("link", { name: "Sign in", exact: true })
    .click();
  await expect(page).toHaveURL(`/sign-in?next=${encodeURIComponent(start)}`);
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, user);
  await expect(page).toHaveURL(start);
}

async function openMenu(page: Page) {
  await menuButton(page).click();
  return header(page).locator("[data-account-menu][open]");
}

test("signed out, the header offers to sign in and come back", async ({
  page,
}) => {
  await page.goto("/writing/");
  const signIn = header(page).getByRole("link", {
    name: "Sign in",
    exact: true,
  });
  await expect(signIn).toBeVisible();
  await expect(signIn).toHaveAttribute("href", "/sign-in?next=%2Fwriting%2F");
});

test("signed in, the header's menu has the account's links and signs out", async ({
  page,
}) => {
  const me = freshLogin("menu");
  // A pre-built page: the header still knows who's signed in.
  await signInFromHeader(page, me);

  await expect(
    header(page).getByRole("link", { name: "Sign in", exact: true }),
  ).toHaveCount(0);
  const menu = await openMenu(page);
  await expect(menu.getByText(`@${me}`)).toBeVisible();
  await expect(menu.getByRole("link")).toHaveText([
    "Your profile",
    "Edit profile",
    "Notifications",
    "Account",
    "Security",
  ]);
  await expect(menu.getByRole("link", { name: "Admin" })).toHaveCount(0);

  // Escape closes it and puts focus back on its button.
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(menuButton(page)).toBeFocused();

  // So does clicking elsewhere.
  await openMenu(page);
  await page.getByRole("heading", { level: 1 }).click();
  await expect(header(page).locator("[data-account-menu][open]")).toHaveCount(
    0,
  );

  await (
    await openMenu(page)
  )
    .getByRole("button", { name: "Sign out" })
    .click();
  await expect(page).toHaveURL("/sign-in?signed-out=1");
  await expect(
    header(page).getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
});

test("the admin's menu links to /admin", async ({ page }) => {
  await signInFromHeader(page, "admin", "/tools/");
  const menu = await openMenu(page);
  await menu.getByRole("link", { name: "Admin" }).click();
  await expect(page).toHaveURL("/admin/");
});

test("people edit their profile, and others see it", async ({
  page,
  browser,
  baseURL,
}) => {
  const me = freshLogin("profiler");
  await signInFromHeader(page, me);
  await (
    await openMenu(page)
  )
    .getByRole("link", { name: "Edit profile" })
    .click();
  await expect(page).toHaveURL("/account/profile/");

  await expect(page.getByLabel("Username")).toHaveValue(me);
  // The site's own username, so it can be changed here (e2e/sign-in.spec.ts).
  await expect(page.getByLabel("Username")).toBeEditable();

  await page.getByLabel("Display name", { exact: true }).fill("Ada Lovelace");
  // The preview follows along.
  await expect(page.locator("[data-preview-name]")).toHaveText("Ada Lovelace");
  await expect(page.locator("[data-preview] [data-monogram]")).toHaveText("AL");
  await page.getByLabel("Pronouns").fill("she/her");
  await page.getByLabel("Currently").fill("Writing notes on the engine");
  await page.getByLabel("Bio").fill("I like *engines*.");
  await page.getByLabel("Link 1 label").fill("Notes");
  await page.getByLabel("Link 1 address").fill("example.com/notes");
  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(page).toHaveURL("/account/profile/?saved=1");
  await expect(page.getByRole("status")).toContainText("Saved.");
  await expect(page.getByLabel("Link 1 address")).toHaveValue(
    "https://example.com/notes",
  );

  // Anyone can see it, signed out too.
  const visitor = await newPage(browser, baseURL);
  const response = await visitor.goto(`/people/${me}/`);
  expect(response?.headers()["x-robots-tag"]).toBe("noindex");
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(
    "Ada Lovelace",
  );
  await expect(visitor.getByText("she/her")).toBeVisible();
  await expect(visitor.getByText("Writing notes on the engine")).toBeVisible();
  await expect(visitor.locator(".comment-body em")).toHaveText("engines");
  const link = visitor.getByRole("link", { name: /Notes/ });
  await expect(link).toHaveAttribute("href", "https://example.com/notes");
  await expect(link).toHaveAttribute("rel", /nofollow/);
  await expect(visitor.getByRole("link", { name: "Edit profile" })).toHaveCount(
    0,
  );
  await visitor.context().close();
});

test("a refused profile keeps what was typed and says what's wrong", async ({
  page,
}) => {
  await signInFromHeader(page, freshLogin("typo"), "/account/profile/");
  await page.getByLabel("Display name", { exact: true }).fill("Kept");
  await page.getByLabel("Link 2 address").fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "Not saved: check the fields marked below.",
  );
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "Kept",
  );
  await expect(page.getByLabel("Link 2 address")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByText("doesn’t look like a web address")).toBeVisible();
});

test("a private profile is only visible to its owner", async ({
  page,
  browser,
  baseURL,
}) => {
  const me = freshLogin("private");
  await signInFromHeader(page, me, "/account/profile/");
  await page.getByLabel("Public profile").uncheck();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toContainText("Saved.");

  await page.goto(`/people/${me}/`);
  await expect(page.getByRole("status")).toContainText(
    "Your profile is private",
  );

  const visitor = await newPage(browser, baseURL);
  const response = await visitor.goto(`/people/${me}/`);
  expect(response?.status()).toBe(404);
  await visitor.context().close();

  expect((await page.request.get("/people/nobody-here/")).status()).toBe(404);
});

test("comments are signed as chosen and link to the profile", async ({
  page,
}) => {
  const me = freshLogin("signer");
  await signInFromHeader(page, me, "/account/profile/");
  await page.getByLabel("Display name", { exact: true }).fill("Signed Name");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toContainText("Saved.");

  const slug = "why-i-moved-off-wordpress";
  const text = `Signed comment ${me}`;
  await page.goto(`/writing/${slug}/#comments`);
  await page.getByLabel("Your comment").fill(text);
  await page.getByRole("button", { name: "Post comment" }).click();

  const comment = page.getByRole("article").filter({ hasText: text });
  const author = comment.getByRole("link", { name: /Signed Name/ });
  await expect(author).toContainText(`@${me}`);
  await expect(author).toHaveAttribute("href", `/people/${me}/`);

  // Just @username, if they'd rather.
  await page.goto("/account/profile/");
  await page.getByLabel(`Just @${me}`).check();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  await page.goto(`/writing/${slug}/?again=1#comments`);
  await expect(
    comment.getByRole("link", { name: `@${me}`, exact: true }),
  ).toBeVisible();
  await expect(comment.getByText("Signed Name")).toHaveCount(0);
});

test("people see their sessions and sign other browsers out", async ({
  browser,
  baseURL,
}) => {
  const me = freshLogin("sessions");
  const laptop = await newPage(browser, baseURL);
  const phone = await newPage(browser, baseURL);
  await signInFromHeader(laptop, me);
  await signInFromHeader(phone, me);

  await laptop.goto("/account/sessions/");
  const others = laptop.getByRole("list", { name: /Other browsers/ });
  await expect(others.getByRole("listitem")).toHaveCount(1);
  await expect(others).toContainText("Active now");
  await others.getByRole("button", { name: /^Sign out/ }).click();

  await expect(laptop.getByRole("status")).toHaveText(
    "Signed out of that browser.",
  );
  await expect(
    laptop.getByText("You’re not signed in anywhere else."),
  ).toBeVisible();
  await phone.goto("/account/");
  await expect(phone).toHaveURL("/sign-in?next=%2Faccount%2F");
  // The laptop is still signed in.
  await laptop.goto("/account/");
  await expect(laptop).toHaveURL("/account/");

  // "Everywhere else" keeps this browser.
  await signInFromHeader(phone, me);
  await laptop.goto("/account/sessions/");
  await laptop
    .getByRole("button", { name: "Sign out everywhere else" })
    .click();
  await expect(laptop.getByRole("status")).toHaveText(
    "Signed out of every other browser.",
  );
  await phone.goto("/account/");
  await expect(phone).toHaveURL("/sign-in?next=%2Faccount%2F");

  await laptop.context().close();
  await phone.context().close();
});

test("people can download their data", async ({ page, browser, baseURL }) => {
  const me = freshLogin("exporter");
  await signInFromHeader(page, me, "/account/");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: /Download your data/ }).click();
  expect((await download).suggestedFilename()).toMatch(
    new RegExp(`^trilleo-${me}-\\d{4}-\\d{2}-\\d{2}\\.json$`),
  );

  const response = await page.request.get("/account/export.json");
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  const data = (await response.json()) as {
    account: { username: string };
    sessions: unknown[];
  };
  expect(data.account.username).toBe(me);
  expect(data.sessions).toHaveLength(1);

  // Signed out: off to sign in.
  const signedOut = await browser.newContext({ baseURL });
  const anonymous = await signedOut.request.get("/account/export.json", {
    maxRedirects: 0,
  });
  expect(anonymous.status()).toBe(302);
  await signedOut.close();
});

test("account pages have no accessibility violations", async ({ page }) => {
  const me = freshLogin("axe");
  await signInFromHeader(page, me, "/account/profile/");
  for (const path of [
    "/account/",
    "/account/profile/",
    "/account/sessions/",
    `/people/${me}/`,
  ]) {
    await page.goto(path);
    await expect(menuButton(page)).toBeVisible();
    await openMenu(page);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(violations.map((v) => `${path} ${v.id}: ${v.help}`)).toEqual([]);
  }
});

/** A real (decodable) PNG: `width` × `height`, one colour. */
function solidPng(width: number, height: number): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (bytes: Buffer) => {
    let c = 0xffffffff;
    for (const byte of bytes)
      c = (crcTable[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0xc8)]);
  const pixels = deflateSync(
    Buffer.concat(Array.from({ length: height }, () => row)),
  );
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", pixels),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test("people add, crop and remove a profile picture", async ({
  page,
  browser,
  baseURL,
}) => {
  const me = freshLogin("pictured");
  await signInFromHeader(page, me, "/account/profile/");
  // The cropper's script runs once the page has loaded.
  await page.waitForLoadState("load");

  await page.getByLabel("Choose a picture").setInputFiles({
    name: "me.png",
    mimeType: "image/png",
    buffer: solidPng(300, 200),
  });
  // The browser shows the square it will keep, then sends a small WebP.
  await expect(page.getByRole("img", { name: /^Crop preview/ })).toBeVisible();
  await page.getByLabel("Zoom").fill("1.5");
  await page.getByRole("button", { name: "Save picture" }).click();
  await expect(page).toHaveURL("/account/profile/?avatar=saved#avatar");
  await expect(page.getByText("Picture saved.")).toBeVisible();

  const picture = header(page).locator("img[data-avatar]");
  const src = await picture.getAttribute("src");
  expect(src).toMatch(/^\/avatars\/[0-9a-f]{64}$/);
  const served = await page.request.get(src ?? "");
  expect(served.headers()["content-type"]).toBe("image/webp");

  // Others see it on the profile.
  const visitor = await newPage(browser, baseURL);
  await visitor.goto(`/people/${me}/`);
  await expect(visitor.locator(`main img[src="${src ?? ""}"]`)).toBeVisible();

  await page.getByRole("button", { name: "Remove picture" }).click();
  await expect(page.getByText("Picture removed.")).toBeVisible();
  await expect(header(page).locator("img[data-avatar]")).toHaveCount(0);
  expect((await page.request.get(src ?? "")).status()).toBe(404);
});

test("pictures that are too big are refused without the browser's help", async ({
  page,
}) => {
  await signInFromHeader(page, freshLogin("bigpicture"), "/account/profile/");
  // As a form without JavaScript sends it: the file as it is.
  const response = await page.request.post("/account/avatar", {
    multipart: {
      avatar: {
        name: "huge.png",
        mimeType: "image/png",
        buffer: solidPng(2100, 10),
      },
    },
    headers: { Accept: "application/json", Origin: new URL(page.url()).origin },
  });
  expect(response.status()).toBe(422);
  expect((await response.json()) as unknown).toEqual({
    error: "Pictures can be up to 2048 × 2048 pixels.",
  });
});
