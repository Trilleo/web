import { expect, test } from "@playwright/test";
import { FAKE_GITHUB_PORT } from "./fake-github";
import { adminPage } from "./support";

/**
 * The API is the same server on another host: api.localhost here (browsers send
 * *.localhost to this machine; Node may not, so calls from the test itself use the
 * site's own /api/v1/ addresses, which reach the same dispatcher).
 */
function apiOrigin(baseURL: string | undefined): string {
  const url = new URL(baseURL ?? "http://127.0.0.1:4329");
  url.hostname = "api.localhost";
  return url.origin;
}

test("the admin makes an app and a key, the key works, and revoking it stops it", async ({
  browser,
  baseURL,
  request,
}) => {
  const name = `Bot ${String(Date.now())}`;
  const admin = await adminPage(browser, baseURL);
  await admin.goto("/admin/api/");
  await admin.getByLabel("Name").fill(name);
  await admin
    .getByLabel("What it is (optional)")
    .fill("Posts the daily puzzle.");
  await admin.getByRole("checkbox", { name: /usage:read/ }).check();
  await admin.getByRole("button", { name: "Make the app" }).click();
  await expect(admin.getByText("App made. Now give it a key.")).toBeVisible();

  await admin.getByLabel("Label (where it runs)").fill("Production");
  await admin.getByRole("button", { name: "Make a key" }).click();
  const shown = admin.getByTestId("new-key");
  await expect(shown).toContainText("won't be shown again");
  const key = (await shown.locator("[data-key]").textContent())?.trim() ?? "";
  expect(key).toMatch(/^trl_[A-Za-z0-9]{32}$/);

  const me = await request.get("/api/v1/me", {
    headers: { Authorization: `Bearer ${key}` },
  });
  expect(me.status()).toBe(200);
  expect(me.headers()["request-id"]).toMatch(/^req_/);
  const body = (await me.json()) as { app: { name: string }; scopes: string[] };
  expect(body.app.name).toBe(name);
  expect(body.scopes).toEqual(["usage:read"]);

  // Reloading doesn't make another key, and the key isn't shown again.
  await admin.reload();
  await expect(admin.getByTestId("new-key")).toHaveCount(0);
  await expect(admin.getByTestId("api-keys").getByRole("listitem")).toHaveCount(
    1,
  );

  // A bad request shows up among the app's failures.
  const bad = await request.get("/api/v1/me/usage?days=0", {
    headers: { Authorization: `Bearer ${key}` },
  });
  expect(bad.status()).toBe(400);
  await admin.reload();
  await expect(admin.getByTestId("api-errors")).toContainText("invalid_input");
  await expect(
    admin.getByRole("table", { name: "By route, last 30 days" }),
  ).toContainText("GET /v1/me");

  await admin
    .getByRole("button", { name: "Revoke the key Production" })
    .click();
  await expect(
    admin.getByText("Key revoked. It stops working at once."),
  ).toBeVisible();
  const after = await request.get("/api/v1/me", {
    headers: { Authorization: `Bearer ${key}` },
  });
  expect(after.status()).toBe(401);
  expect(((await after.json()) as { error: { code: string } }).error.code).toBe(
    "key_revoked",
  );

  // Deleting needs the name typed.
  await admin.getByLabel(`Type “${name}” to confirm`).fill(name);
  await admin.getByRole("button", { name: "Delete the app" }).click();
  await expect(admin).toHaveURL("/admin/api/");
  await expect(admin.getByRole("link", { name })).toHaveCount(0);
});

test("the API answers without a key where it may, and says what's wrong where it can't", async ({
  request,
}) => {
  const status = await request.get("/api/v1/status");
  expect(status.status()).toBe(200);
  expect(await status.json()).toMatchObject({ ok: true, version: "v1" });
  expect(status.headers()["access-control-allow-origin"]).toBe("*");

  const me = await request.get("/api/v1/me");
  expect(me.status()).toBe(401);
  expect(await me.json()).toMatchObject({
    error: { code: "missing_key" },
  });
  // Public reads: the blog's posts.
  const listed = await request.get("/api/v1/posts?limit=1");
  expect(listed.status()).toBe(200);
  const page = (await listed.json()) as { items: { slug: string }[] };
  expect(page.items).toHaveLength(1);
  const one = await request.get(`/api/v1/posts/${page.items[0]?.slug ?? ""}`);
  expect(await one.json()).toMatchObject({
    html: expect.any(String),
  });

  // Programs post JSON without an Origin header; the same-origin check lets them through.
  const post = await request.post("/api/v1/status", { data: {} });
  expect(post.status()).toBe(405);
});

test("the docs live on the API's host, and the site's /developers/ goes there", async ({
  page,
  baseURL,
}) => {
  const api = apiOrigin(baseURL);
  await page.goto(`${api}/`);
  await expect(
    page.getByRole("heading", { level: 1, name: "API" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Docs" })
    .getByRole("link", { name: "Errors" })
    .click();
  await expect(page).toHaveURL(`${api}/docs/errors/`);
  await expect(page.getByRole("cell", { name: "key_revoked" })).toBeVisible();

  await page.goto(`${api}/reference/system/`);
  await expect(
    page.getByRole("heading", { name: "Get the calling app and key" }),
  ).toBeVisible();

  // The whole thing as Markdown, written for the host it's read from.
  const markdown = await page.request.get(`${api}/docs.md`);
  expect(markdown.headers()["content-type"]).toContain("text/markdown");
  expect(await markdown.text()).toContain(`${api}/v1/me`);
  const openapi = (await (
    await page.request.get(`${api}/openapi.json`)
  ).json()) as {
    openapi: string;
    servers: { url: string }[];
  };
  expect(openapi.openapi).toBe("3.1.0");
  expect(openapi.servers[0]?.url).toBe(api);

  // The API itself answers on its host too.
  await page.goto(`${api}/v1/status`);
  await expect(page.locator("body")).toContainText('"ok":true');

  await page.goto("/developers/docs/errors/");
  await expect(page).toHaveURL(`${api}/docs/errors/`);
});

test("the admin adds a webhook, sees its secret, and sends a test", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  await admin.goto("/admin/api/");
  await admin.getByLabel("Name").fill(`Hooked ${String(Date.now())}`);
  await admin.getByRole("checkbox", { name: /cryptic:read/ }).check();
  await admin.getByRole("button", { name: "Make the app" }).click();

  // Somewhere that answers 404 (the fake GitHub), so the test fails for good.
  const url = `http://127.0.0.1:${String(FAKE_GITHUB_PORT)}/trilleo-webhook`;
  await admin.getByLabel("Address (https://)").fill(url);
  await admin.getByRole("checkbox", { name: /cryptic\.day/ }).check();
  await admin.getByRole("button", { name: "Add the webhook" }).click();
  await expect(admin.getByText("Webhook added.")).toBeVisible();
  const webhooks = admin.getByTestId("api-webhooks");
  await expect(webhooks).toContainText(url);
  await webhooks.getByText("Signing secret").click();
  await expect(webhooks.locator("[data-webhook-secret]")).toHaveText(
    /^whsec_[A-Za-z0-9]{32}$/,
  );

  await webhooks.getByRole("button", { name: "Send a test" }).click();
  await expect(admin.getByText("Test sent")).toBeVisible();
  await expect(async () => {
    await admin.reload();
    await expect(admin.getByTestId("api-deliveries")).toContainText(
      "Answered 404",
    );
  }).toPass({ timeout: 15_000 });
  await expect(admin.getByTestId("api-deliveries")).toContainText("ping:");
});
