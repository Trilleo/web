import { expect, test as setup } from "@playwright/test";
import { adminPage } from "./support";

/** The posts the database starts with (packages/db/migrations/0004_import-posts.sql). */
export const IMPORTED_POSTS = [
  "Why I moved off WordPress",
  "Rebuilding this site with Astro and a monorepo",
  "Self-hosting on a small server with Docker and Caddy",
  "A home for small tools, under /tools",
];

setup("publish the imported posts", async ({ browser, baseURL }) => {
  const admin = await adminPage(browser, baseURL);
  for (const title of IMPORTED_POSTS) {
    await admin.goto("/admin/posts/");
    await admin.getByRole("link", { name: title, exact: true }).click();
    // A reused local server may have published them already.
    const publish = admin.getByRole("button", { name: "Publish now" });
    if (await publish.isVisible()) {
      await publish.click();
      await expect(
        admin.getByText("Published.", { exact: true }),
      ).toBeVisible();
    }
  }
  await admin.context().close();
});
