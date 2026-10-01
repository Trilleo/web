import { expect, test } from "@playwright/test";
import { hydrated } from "./support";

const CONVERT = "/tools/convert/";

/** A 1×1 PNG. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

/** One second of a mono 16-bit tone at 8 kHz, as WAV. */
function wav(seconds = 1, rate = 8000): Buffer {
  const samples = seconds * rate;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) {
    buffer.writeInt16LE(Math.round(Math.sin(i / 8) * 8000), 44 + i * 2);
  }
  return buffer;
}

test("Converter turns a PNG into a JPEG and a WAV into a shorter WAV", async ({
  page,
}) => {
  await page.goto(CONVERT);
  await hydrated(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Converter");

  await page.getByTestId("file-input").setInputFiles([
    { name: "dot.png", mimeType: "image/png", buffer: PNG },
    { name: "tone.wav", mimeType: "audio/wav", buffer: wav() },
  ]);
  await page.getByText("JPEG", { exact: true }).click();
  await page.getByText("WAV", { exact: true }).click();
  await page.getByLabel("End at (s)").fill("0.5");
  await page.getByRole("button", { name: "Convert 2 files" }).click();

  const results = page.getByRole("list", { name: "Converted files" });
  await expect(results.getByText("dot.jpg")).toBeVisible();
  await expect(results.getByText(/1 × 1 px/)).toBeVisible();
  // Half a second of 8 kHz 16-bit mono: 8,000 bytes of samples plus a header.
  await expect(results.getByText(/16\.0 kB → 8\.\d+ kB/)).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download dot.jpg" }).click();
  expect((await download).suggestedFilename()).toBe("dot.jpg");

  const zip = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download all (.zip)" }).click();
  expect((await zip).suggestedFilename()).toBe("converted.zip");
});
