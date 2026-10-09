import { expect, test, type Page } from "@playwright/test";
import { githubEmail } from "./fake-github";
import {
  adminPage,
  codeSentTo,
  continueAs,
  freshLogin,
  newPage,
  openMail,
} from "./support";

// Passkeys, the security log and undoing an address change. Passkeys need a real
// host name (WebAuthn refuses IP addresses), so those tests use localhost.

test.describe.configure({ timeout: 90_000 });

async function signInWithGitHub(page: Page, login: string, next: string) {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, login);
  await expect(page).toHaveURL(next);
}

test("a passkey is added, signs in, and is removed", async ({
  browser,
  baseURL,
}) => {
  const local = (baseURL ?? "").replace("127.0.0.1", "localhost");
  const context = await browser.newContext({ baseURL: local });
  const page = await context.newPage();
  // Chromium's virtual authenticator: a platform passkey that always says yes.
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });

  const me = freshLogin("keyholder");
  await signInWithGitHub(page, me, "/account/security/");
  await page.getByRole("button", { name: "Add a passkey" }).click();
  await expect(page).toHaveURL(
    "/account/security/?done=passkey-added#passkeys",
  );
  await expect(page.locator("[data-passkey-list] li")).toHaveCount(1);
  await expect(page.locator("[data-activity]")).toContainText("Passkey added");

  // Signed out, the passkey signs straight back in.
  await page.request.post("/auth/logout", {
    headers: { Origin: local },
    form: {},
  });
  await page.goto("/sign-in?next=/account/security/");
  // The virtual authenticator also answers the email field’s autofill request by
  // itself (a person would pick the passkey), so either one may sign in first.
  await Promise.race([
    page
      .getByRole("button", { name: "Sign in with a passkey" })
      .click()
      .catch(() => undefined),
    page.waitForURL("/account/security/"),
  ]);
  await expect(page).toHaveURL("/account/security/");
  await expect(page.locator("[data-activity] li").first()).toContainText(
    "Signed in with a passkey",
  );

  // Renamed, then removed.
  const item = page.locator("[data-passkey-list] li");
  await item.getByLabel("Name").fill("Test key");
  await item.getByRole("button", { name: "Rename" }).click();
  await expect(page.locator("[data-passkey-list]")).toContainText("Test key");
  await page.getByRole("button", { name: "Remove Test key" }).click();
  await expect(page.getByRole("status")).toContainText("Passkey removed");
  await expect(page.locator("[data-passkey-list]")).toHaveCount(0);
  await context.close();
});

test("the old address can undo a change, which signs everyone out", async ({
  page,
  browser,
  baseURL,
}) => {
  const me = freshLogin("mover");
  const old = githubEmail(me) ?? "";
  const address = `${me}@example.com`;
  await signInWithGitHub(page, me, "/account/email/");

  const admin = await adminPage(browser, baseURL);
  await page.getByLabel("Change to").fill(address);
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel(/^Code sent to/).fill(await codeSentTo(admin, address));
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.locator("[data-email]")).toHaveText(address);

  // The old address heard about it.
  const notice = await openMail(admin, old, "email-changed");
  const link = /https?:\/\/\S+\/account\/email\/undo\/[\w-]+\//.exec(
    notice,
  )?.[0];
  expect(link).toBeTruthy();
  await admin.context().close();

  // Opened elsewhere (the owner may be locked out): asks first, then undoes it.
  const owner = await newPage(browser, baseURL);
  await owner.goto(new URL(link ?? "").pathname);
  await expect(owner.getByRole("heading", { level: 1 })).toHaveText(
    "Undo the change?",
  );
  await owner.getByRole("button", { name: "Undo the change" }).click();
  await expect(owner.getByRole("heading", { level: 1 })).toHaveText(
    "Your address is back",
  );
  await owner.context().close();

  // Whoever changed it was signed out.
  await page.goto("/account/email/");
  await expect(page).toHaveURL(/\/sign-in\?next=/);
});
