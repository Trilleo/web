import { expect, test } from "@playwright/test";
import { FAKE_DOCS } from "./fake-docs";
import { hydrated } from "./support";

const PREVIEW = "/tools/preview/";

test("Preview shows a file from this device", async ({ page }) => {
  await page.goto(PREVIEW);
  await hydrated(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Preview");
  await page.getByTestId("file-input").setInputFiles({
    name: "plan.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# The plan\n\nFirst, *preview* everything."),
  });
  await expect(page.getByText("This device (not uploaded)")).toBeVisible();
  await expect(page.getByRole("heading", { name: "The plan" })).toBeVisible();
  await page.getByText("Source", { exact: true }).click();
  await expect(page.getByRole("region", { name: "plan.md" })).toContainText(
    "# The plan",
  );
});

test("Preview reads a link the browser may fetch, and a shared address opens it", async ({
  page,
}) => {
  await page.goto(PREVIEW);
  await hydrated(page);
  await page
    .getByLabel("Link to a document")
    .fill(`${FAKE_DOCS}/cors/notes.md`);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(
    page.getByText("The link, fetched by this browser"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Meeting notes" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Docs" })).toHaveAttribute(
    "target",
    "_blank",
  );
  expect(new URL(page.url()).searchParams.get("url")).toBe(
    `${FAKE_DOCS}/cors/notes.md`,
  );

  // The address is the share link: opening it shows the same preview.
  await page.goto(page.url());
  await expect(
    page.getByRole("heading", { name: "Meeting notes" }),
  ).toBeVisible();
});

test("Preview falls back to the server for sites without CORS", async ({
  page,
}) => {
  await page.goto(PREVIEW);
  await hydrated(page);
  await page
    .getByLabel("Link to a document")
    .fill(`${FAKE_DOCS}/plain/table.csv`);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(
    page.getByText(/fetched through this site's server/),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "Chengdu" })).toBeVisible();
});

test("Preview's server won't fetch private addresses", async ({ page }) => {
  await page.goto(PREVIEW);
  await hydrated(page);
  await page.getByLabel("Link to a document").fill("http://localhost/secret");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("private network");
});

test("Preview draws PDFs with selectable text", async ({ page }) => {
  await page.goto(
    `${PREVIEW}?url=${encodeURIComponent(`${FAKE_DOCS}/cors/report.pdf`)}`,
  );
  await hydrated(page);
  await expect(page.getByText("PDF document")).toBeVisible();
  await expect(page.getByRole("region", { name: "Page 1" })).toContainText(
    "Hello from a PDF",
  );
  await page.getByPlaceholder("Search this PDF").fill("hello");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("1 match")).toBeVisible();
});
