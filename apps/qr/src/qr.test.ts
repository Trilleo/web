import jsQR from "jsqr";
import { describe, expect, it } from "vitest";
import { cleanNumber, emptyContent, normalizeUrl, payload } from "./content";
import { makeQr, modulesPath, qrSvg, type QrMatrix } from "./render";

/** Rasterizes a code (4 px per module, 4-module margin) and reads it back. */
function scan(qr: QrMatrix): string | undefined {
  const scale = 4;
  const side = (qr.size + 8) * scale;
  const pixels = new Uint8ClampedArray(side * side * 4).fill(255);
  qr.modules.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (!dark) return;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const at = (((y + 4) * scale + dy) * side + (x + 4) * scale + dx) * 4;
          pixels.fill(0, at, at + 3);
        }
      }
    });
  });
  return jsQR(pixels, side, side)?.data;
}

describe("makeQr", () => {
  it.each([
    ["https://www.trilleo.net/", "L"],
    ["WIFI:T:WPA;S:Home;P:p\\;ss;;", "H"],
    ["Hello, 世界 ☕", "M"],
  ] as const)("makes a code that scans back to %s", (text, correction) => {
    expect(scan(makeQr(text, correction))).toBe(text);
  });

  it("throws when the text can't fit", () => {
    expect(() => makeQr("x".repeat(5000), "H")).toThrow();
  });
});

describe("modulesPath", () => {
  it("draws runs of dark modules as rectangles, offset by the margin", () => {
    expect(
      modulesPath(
        [
          [true, true, false],
          [false, true, false],
        ],
        2,
      ),
    ).toBe("M2 2h2v1h-2zM3 3h1v1h-1z");
  });
});

describe("qrSvg", () => {
  it("includes the background only when there is one", () => {
    const qr = makeQr("a", "L");
    const white = qrSvg(qr, {
      margin: 4,
      foreground: "#000000",
      background: "#ffffff",
    });
    expect(white).toContain(
      `viewBox="0 0 ${String(qr.size + 8)} ${String(qr.size + 8)}"`,
    );
    expect(white).toContain('<rect width="');
    const clear = qrSvg(qr, {
      margin: 0,
      foreground: "#e5470f",
      background: null,
    });
    expect(clear).not.toContain("<rect");
    expect(clear).toContain('fill="#e5470f"');
  });
});

describe("payload", () => {
  it("encodes links, adding https:// when missing", () => {
    expect(payload({ kind: "url", url: " trilleo.net " })).toBe(
      "https://trilleo.net",
    );
    expect(normalizeUrl("mailto:a@b.c")).toBe("mailto:a@b.c");
    expect(payload(emptyContent("url"))).toBe("");
  });

  it("encodes Wi-Fi, escaping special characters", () => {
    expect(
      payload({
        kind: "wifi",
        ssid: "My;Net",
        password: 'p:a"ss\\',
        security: "WPA",
        hidden: true,
      }),
    ).toBe('WIFI:T:WPA;S:My\\;Net;P:p\\:a\\"ss\\\\;H:true;;');
    expect(
      payload({
        kind: "wifi",
        ssid: "Cafe",
        password: "ignored",
        security: "nopass",
        hidden: false,
      }),
    ).toBe("WIFI:T:nopass;S:Cafe;;");
  });

  it("encodes email, phone and SMS", () => {
    expect(
      payload({
        kind: "email",
        to: "hi@trilleo.net",
        subject: "Hi there",
        body: "",
      }),
    ).toBe("mailto:hi@trilleo.net?subject=Hi%20there");
    expect(payload({ kind: "phone", number: "+86 (10) 1234-5678" })).toBe(
      "tel:+861012345678",
    );
    expect(
      payload({ kind: "sms", number: "555 0100", message: "On my way" }),
    ).toBe("SMSTO:5550100:On my way");
    expect(cleanNumber("*#06#")).toBe("*#06#");
  });
});
