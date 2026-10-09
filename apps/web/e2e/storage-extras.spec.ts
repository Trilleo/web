import { expect, test, type Page } from "@playwright/test";
import { FAKE_MALWARE, FAKE_SIGNATURE } from "./fake-clamd";
import {
  adminPage,
  continueAs,
  freshLogin,
  hydrated,
  newPage,
} from "./support";

// Malware scanning goes to e2e/fake-clamd.ts, which "finds" FAKE_MALWARE.

/** A name for this attempt only (see freshLogin). */
const unique = freshLogin;

/** A 2×2 PNG, so the browser can make a thumbnail of it. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==",
  "base64",
);

async function signIn(page: Page, login: string) {
  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, login);
}

async function apiUpload(page: Page, name: string, body: Buffer) {
  const headers = { origin: new URL(page.url()).origin };
  const start = await page.request.post("/api/storage/uploads", {
    data: { purpose: "shared", name, size: body.length },
    headers,
  });
  const { file } = (await start.json()) as { file: { id: string } };
  const parts = await page.request.post(
    `/api/storage/uploads/${file.id}/parts`,
    { data: { parts: [1] }, headers },
  );
  const { urls } = (await parts.json()) as { urls: Record<string, string> };
  await page.request.put(urls["1"] ?? "", { data: body });
  const done = await page.request.post(
    `/api/storage/uploads/${file.id}/complete`,
    { headers },
  );
  return (await done.json()) as {
    file?: { id: string; status: string; statusReason: string | null };
    error?: string;
  };
}

async function uploadAsAdmin(page: Page, name: string, buffer: Buffer) {
  await page.goto("/admin/files/");
  await hydrated(page);
  await page.getByTestId("file-input").setInputFiles({
    name,
    mimeType: name.endsWith(".png") ? "image/png" : "text/plain",
    buffer,
  });
  const item = page
    .getByRole("list", { name: "Uploads" })
    .getByRole("listitem")
    .filter({ hasText: name });
  await expect(item).toContainText("Uploaded");
  return item;
}

test("malware from an uploader is refused, with a strike", async ({
  browser,
  baseURL,
}) => {
  const page = await newPage(browser, baseURL);
  await signIn(page, freshLogin("infected"));
  const result = await apiUpload(
    page,
    `${unique("mod")}.jar`,
    Buffer.from(`PK\x03\x04 ${FAKE_MALWARE}`),
  );
  expect(result.file).toMatchObject({
    status: "rejected",
    statusReason: `Malware was found in it (${FAKE_SIGNATURE}).`,
  });
  await page.goto("/account/files/");
  await expect(page.getByText("1 of 3 strikes")).toBeVisible();
});

test("the admin's own file is only flagged", async ({ browser, baseURL }) => {
  const page = await adminPage(browser, baseURL);
  const name = `${unique("tools")}.txt`;
  const item = await uploadAsAdmin(page, name, Buffer.from(FAKE_MALWARE));
  await item.getByRole("link", { name }).click();
  await expect(page.getByText(`Malware: ${FAKE_SIGNATURE}`)).toBeVisible();
});

test("uploads get thumbnails, and downloads are counted", async ({
  browser,
  baseURL,
}) => {
  const page = await adminPage(browser, baseURL);
  const name = `${unique("tiny")}.png`;
  const item = await uploadAsAdmin(page, name, PNG);
  const href = await item.getByRole("link", { name }).getAttribute("href");
  const id = /\/files\/([a-z0-9]+)\//.exec(href ?? "")?.[1] ?? "";

  // The list shows the browser-made thumbnail, served as WebP.
  await page.goto(`/admin/files/?q=${id}`);
  const thumbnail = page.locator(`li[data-file="${id}"] img`);
  await expect(thumbnail).toHaveCount(1);
  const src = (await thumbnail.getAttribute("src")) ?? "";
  const image = await page.request.get(src);
  expect(image.headers()["content-type"]).toBe("image/webp");

  // A visitor downloads it; its page charts the download.
  const visitor = await newPage(browser, baseURL);
  expect((await visitor.request.get(`/d/${id}`)).status()).toBe(200);
  await page.goto(`/files/${id}/`);
  await expect(page.getByText("1 in 30 days")).toBeVisible();
  await page.getByText("Show as a table").click();
  await expect(
    page.getByRole("table", { name: `Downloads of ${name}, per day` }),
  ).toContainText("1");
});
