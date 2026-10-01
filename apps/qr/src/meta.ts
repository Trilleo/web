import type { ToolMeta } from "@trilleo/tool-kit";

/** Kept separate from the app, so the server can read it without loading React. */
export const meta: ToolMeta = {
  slug: "qr",
  name: "QR code",
  description:
    "Make QR codes for links, text, Wi-Fi, email, phone or SMS, and save them as PNG or SVG.",
  status: "in-progress",
  icon: "qr",
};
