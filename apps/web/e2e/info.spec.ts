import { expect, test } from "@playwright/test";
import { adminPage, continueAs, freshLogin } from "./support";

// Signed-out contact messages share one limit per address (all tests come from
// 127.0.0.1), so only one test here sends one; the others sign in or are refused
// before the limit is checked.

const INFO_PAGES = [
  ["/legal/terms/", "Terms of use"],
  ["/legal/privacy/", "Privacy policy"],
  ["/legal/cookies/", "Cookies and local storage"],
  ["/legal/guidelines/", "Community guidelines"],
  ["/legal/copyright/", "Copyright and takedowns"],
  ["/contact/", "Contact"],
  ["/faq/", "Questions and answers"],
  ["/accessibility/", "Accessibility"],
  ["/security/", "Security"],
  ["/colophon/", "Colophon"],
  ["/sitemap/", "Sitemap"],
] as const;

test("every information page has its title, date and breadcrumb", async ({
  page,
}) => {
  for (const [path, title] of INFO_PAGES) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.locator("article header time")).toHaveAttribute(
      "datetime",
      /^\d{4}-\d{2}-\d{2}$/,
    );
    await expect(
      page
        .getByRole("navigation", { name: "Breadcrumb" })
        .locator("[aria-current=page]"),
    ).toBeVisible();
  }
});

test("the footer leads to the legal pages and shows the ICP filing", async ({
  page,
}) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await footer
    .getByRole("navigation", { name: "Legal" })
    .getByRole("link", { name: "Privacy" })
    .click();
  await expect(page).toHaveURL("/legal/privacy/");

  const filing = page
    .getByRole("contentinfo")
    .getByRole("link", { name: /ICP备/ });
  await expect(filing).toHaveAttribute("href", "https://beian.miit.gov.cn/");

  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Legal", exact: true })
    .click();
  await expect(page).toHaveURL("/legal/");
  await page.getByRole("link", { name: /Community guidelines/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Community guidelines",
  );
});

test("a signed-out message arrives in the admin's inbox", async ({
  page,
  browser,
  baseURL,
}) => {
  const text = `Hello from e2e ${freshLogin("note")}`;
  await page.goto("/contact/");
  await page.getByRole("radio", { name: "Feedback or a bug" }).check();
  await page.getByLabel("Your name").fill("Visitor");
  await page.getByLabel("Email (optional)").fill("visitor@example.com");
  await page.getByLabel("Message").fill(text);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toContainText("I’ll reply by email");

  const admin = await adminPage(browser, baseURL);
  await admin.goto("/admin/messages/");
  const message = admin.getByRole("listitem").filter({ hasText: text });
  await expect(message).toContainText("Feedback or a bug");
  await expect(message).toContainText("visitor@example.com");
  await message.getByRole("button", { name: "Archive" }).click();
  await expect(admin.getByRole("status")).toHaveText("Archived.");
  await admin.goto("/admin/messages/?view=archived");
  await expect(
    admin.getByRole("listitem").filter({ hasText: text }),
  ).toBeVisible();
  await admin.context().close();
});

test("a message with mistakes comes back with what to fix, keeping the text", async ({
  page,
}) => {
  await page.goto("/contact/");
  await page.getByLabel("Your name").fill("Visitor");
  await page.getByLabel("Email (optional)").fill("not-an-address@x");
  await page.getByLabel("Message").fill("A message long enough to send.");
  // The browser would stop an invalid address itself; send it anyway.
  await page.locator("form[action='/contact/send']").evaluate((form) => {
    (form as HTMLFormElement).noValidate = true;
  });
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page).toHaveURL("/contact/send");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Email (optional)")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByLabel("Message")).toHaveValue(
    "A message long enough to send.",
  );
});

test("a signed-in sender's message is in their data export", async ({
  page,
}) => {
  await page.goto("/sign-in?next=/contact/");
  await expect(page.getByText("By signing in you agree to the")).toBeVisible();
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, freshLogin("writer"));
  await expect(page).toHaveURL("/contact/");

  const text = `Signed-in note ${freshLogin("msg")}`;
  await page.getByLabel("Your name").fill("Writer");
  await page.getByLabel("Message").fill(text);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toContainText("can’t write back");

  const exported = await page.request.get("/account/export.json");
  const data = (await exported.json()) as {
    contactMessages: { body: string }[];
  };
  expect(data.contactMessages.map((message) => message.body)).toContain(text);
});

test("security.txt and humans.txt are served", async ({ request }) => {
  const security = await request.get("/.well-known/security.txt");
  expect(security.ok()).toBe(true);
  const text = await security.text();
  expect(text).toMatch(/^Contact: mailto:/m);
  expect(text).toMatch(/^Expires: /m);

  const humans = await request.get("/humans.txt");
  expect(humans.ok()).toBe(true);
  expect(await humans.text()).toContain("Maker: Trilleo");
});
