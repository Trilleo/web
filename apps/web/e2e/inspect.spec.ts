import { expect, test } from "@playwright/test";

const INSPECT = "/tools/inspect/";

test("File info hashes a file and reads its type from the bytes", async ({
  page,
}) => {
  await page.goto(INSPECT);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("File info");

  await page.getByTestId("file-input").setInputFiles({
    name: "abc.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("abc"),
  });
  await expect(page.getByText("Plain text (text/plain)")).toBeVisible();
  await expect(
    page.getByText(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    ),
  ).toBeVisible();

  await page
    .getByLabel("Check against a hash")
    .fill("900150983cd24fb0d6963f7d28e17f72");
  await expect(page.getByText("Matches the MD5 hash.")).toBeVisible();
});

test("File info flags a file whose name lies about its type", async ({
  page,
}) => {
  await page.goto(INSPECT);
  // A PNG signature and IHDR chunk, named .jpg.
  const png = Buffer.from(
    "89504e470d0a1a0a0000000d4948445200000001000000010806000000",
    "hex",
  );
  await page.getByTestId("file-input").setInputFiles({
    name: "photo.jpg",
    mimeType: "image/jpeg",
    buffer: png,
  });
  await expect(page.getByRole("note")).toContainText(
    "contents are a PNG image",
  );
  await expect(page.getByText("PNG image (image/png)")).toBeVisible();
});
