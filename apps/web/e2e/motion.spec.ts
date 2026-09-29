import { expect, test } from "@playwright/test";

// The rest of the suite runs with reduced motion (playwright.config.ts); these check
// the motion itself, and that content never depends on it.
test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("sections below the fold reveal as they scroll into view", async ({
    page,
  }) => {
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-motion", "ready");

    const colophon = page.getByRole("heading", { name: /Built by hand/ });
    await expect(colophon).not.toHaveAttribute("data-revealed");
    await expect(colophon).toHaveCSS("opacity", "0");

    await colophon.scrollIntoViewIfNeeded();
    await expect(colophon).toHaveAttribute("data-revealed", "");
    await expect(colophon).toHaveCSS("opacity", "1");
  });

  test("a tool's name morphs into its page title", async ({ page }) => {
    await page.goto("/tools/");
    const heading = page.getByRole("heading", { level: 2, name: "Notes" });
    const name = await heading.evaluate(
      (element) => getComputedStyle(element).viewTransitionName,
    );
    expect(name).toBe("tool-notes");

    // The same name is on the tool page's title, so it morphs across.
    await heading.getByRole("link").click();
    await expect(page.locator("#tool-title [data-morph]")).toHaveCSS(
      "view-transition-name",
      name,
    );
  });

  test("post titles don't morph", async ({ page }) => {
    await page.goto("/writing/");
    await expect(
      page.locator("[data-search-hides] ol .post-title").first(),
    ).toHaveCSS("view-transition-name", "none");
  });

  test("the theme toggle still switches with the wipe", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const before = await html.getAttribute("data-theme");
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Dark mode" })
      .click();
    await expect(html).not.toHaveAttribute("data-theme", before ?? "");
    await expect(html).not.toHaveAttribute("data-theme-switching");
  });

  test.describe("phone", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("the menu slides open and shut", async ({ page }) => {
      await page.goto("/");
      const button = page.getByRole("button", { name: "Menu" });
      const menu = page.locator("#site-menu");

      await button.click();
      await expect(menu.getByRole("link", { name: /Tools/ })).toBeVisible();
      await expect(menu).toHaveCSS("height", /^(?!0px)/);
      await button.click();
      await expect(menu).toBeHidden();
    });
  });
});

test.describe("without motion", () => {
  test("reduced motion shows everything at once", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute("data-motion");
    await expect(
      page.getByRole("heading", { name: /Built by hand/ }),
    ).toHaveCSS("opacity", "1");
  });

  test.describe("no JavaScript", () => {
    test.use({ javaScriptEnabled: false, reducedMotion: "no-preference" });

    test("content is never hidden waiting for a script", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("html")).not.toHaveAttribute("data-motion");
      await expect(
        page.getByRole("heading", { name: /Built by hand/ }),
      ).toHaveCSS("opacity", "1");
    });
  });
});
