import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { continueAs, freshLogin, toasts } from "./support";

// Personal tokens and device links (lib/api/user-tokens.ts, device.ts). Each test
// signs in as its own fresh account. Calls from the test itself use the site's own
// /api/v1/ addresses, which reach the same dispatcher as api.localhost.

async function signIn(page: Page, user: string, start: string) {
  await page.goto(start);
  await expect(page).toHaveURL(/\/sign-in\?next=/);
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, user);
}

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(violations.map((v) => `${page.url()} ${v.id}: ${v.help}`)).toEqual([]);
}

test("a program links itself to an account with a code, acts for it, and is revoked", async ({
  page,
  request,
}) => {
  const me = freshLogin("linker");
  const started = await request.post("/api/v1/auth/device", {
    data: { clientName: "SkyBlock mod", scopes: ["skyblock:sync"] },
  });
  expect(started.status()).toBe(201);
  const link = (await started.json()) as {
    deviceCode: string;
    userCode: string;
    verificationUriComplete: string;
  };
  expect(link.userCode).toMatch(/^[A-Z]{4}-[A-Z]{4}$/);

  const poll = () =>
    request.post("/api/v1/auth/device/token", {
      data: { deviceCode: link.deviceCode },
    });
  const pending = (await (await poll()).json()) as { error: { code: string } };
  expect(pending.error.code).toBe("authorization_pending");

  // The person opens the link with the code filled in, signing in on the way.
  const address = new URL(link.verificationUriComplete);
  await signIn(page, me, address.pathname + address.search);
  await expect(
    page.getByRole("heading", { name: "Link SkyBlock mod?" }),
  ).toBeVisible();
  await expect(page.locator("[data-link-scopes]")).toContainText(
    "Hypixel SkyBlock",
  );
  await axe(page);
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("heading", { name: "Linked" })).toBeVisible();

  // Once approved, the next poll answers the token (once).
  const finished = await poll();
  expect(finished.status()).toBe(200);
  const linked = (await finished.json()) as { token: string; name: string };
  expect(linked.name).toBe("SkyBlock mod");
  const whose = await request.get("/api/v1/account", {
    headers: { Authorization: `Bearer ${linked.token}` },
  });
  expect(((await whose.json()) as { username: string }).username).toBe(me);
  const again = (await (await poll()).json()) as { error: { code: string } };
  expect(again.error.code).toBe("expired_token");

  await page.goto("/account/apps/");
  await expect(page.locator("[data-token-list]")).toContainText("SkyBlock mod");
  await axe(page);

  await page.getByLabel("Name").fill("My script");
  await page.getByRole("button", { name: "Make token" }).click();
  const shown = page.getByTestId("new-token");
  await expect(shown).toContainText("won’t be shown again");
  const token =
    (await shown.locator("[data-token]").textContent())?.trim() ?? "";
  expect(token).toMatch(/^trlu_[A-Za-z0-9]{32}$/);

  const account = await request.get("/api/v1/account", {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(account.status()).toBe(200);
  expect(((await account.json()) as { username: string }).username).toBe(me);

  // Reloading doesn't show it again.
  await page.reload();
  await expect(page.getByTestId("new-token")).toHaveCount(0);

  await page.getByRole("button", { name: "Revoke My script" }).click();
  await expect(toasts(page)).toContainText("Revoked");
  const revoked = await request.get("/api/v1/account", {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(
    ((await revoked.json()) as { error: { code: string } }).error.code,
  ).toBe("key_revoked");

  await page.goto("/account/security/");
  await expect(page.locator("[data-activity]")).toContainText(
    "Device linked: SkyBlock mod",
  );
  await expect(page.locator("[data-activity]")).toContainText(
    "Personal token revoked: My script",
  );
});

test("a wrong or declined code links nothing", async ({ page, request }) => {
  await signIn(page, freshLogin("decliner"), "/link/");
  await page.getByLabel("Code").fill("BCDF-GHJK");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert")).toContainText("isn’t waiting");
  await axe(page);

  const started = await request.post("/api/v1/auth/device", {
    data: { clientName: "Some program", scopes: ["skyblock:sync"] },
  });
  const link = (await started.json()) as {
    deviceCode: string;
    userCode: string;
  };
  await page.getByLabel("Code").fill(link.userCode.toLowerCase());
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Decline" }).click();
  await expect(page.getByRole("heading", { name: "Declined" })).toBeVisible();
  const answer = await request.post("/api/v1/auth/device/token", {
    data: { deviceCode: link.deviceCode },
  });
  expect(
    ((await answer.json()) as { error: { code: string } }).error.code,
  ).toBe("access_denied");
});
