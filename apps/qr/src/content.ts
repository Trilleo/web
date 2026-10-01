/** What a QR code can hold, and the text each kind is encoded as. */

export type Security = "WPA" | "WEP" | "nopass";

export type Content =
  | { kind: "text"; text: string }
  | { kind: "url"; url: string }
  | {
      kind: "wifi";
      ssid: string;
      password: string;
      security: Security;
      hidden: boolean;
    }
  | { kind: "email"; to: string; subject: string; body: string }
  | { kind: "phone"; number: string }
  | { kind: "sms"; number: string; message: string };

export type ContentKind = Content["kind"];

export const KINDS: readonly { kind: ContentKind; label: string }[] = [
  { kind: "url", label: "Link" },
  { kind: "text", label: "Text" },
  { kind: "wifi", label: "Wi-Fi" },
  { kind: "email", label: "Email" },
  { kind: "phone", label: "Phone" },
  { kind: "sms", label: "SMS" },
];

export function emptyContent(kind: ContentKind): Content {
  switch (kind) {
    case "text":
      return { kind, text: "" };
    case "url":
      return { kind, url: "" };
    case "wifi":
      return { kind, ssid: "", password: "", security: "WPA", hidden: false };
    case "email":
      return { kind, to: "", subject: "", body: "" };
    case "phone":
      return { kind, number: "" };
    case "sms":
      return { kind, number: "", message: "" };
  }
}

/** Wi-Fi fields escape \ ; , : and " with a backslash. */
function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

/** Phone numbers keep digits, a leading +, and the * and # of service codes. */
export function cleanNumber(number: string): string {
  const trimmed = number.trim();
  const digits = trimmed.replace(/[^\d*#]/g, "");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

/** Links without a scheme get https://, so phones open them as links. */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** The text a scanner reads; empty when there's nothing to encode yet. */
export function payload(content: Content): string {
  switch (content.kind) {
    case "text":
      return content.text;
    case "url":
      return normalizeUrl(content.url);
    case "wifi": {
      if (!content.ssid) return "";
      const parts = [`T:${content.security}`, `S:${escapeWifi(content.ssid)}`];
      if (content.security !== "nopass")
        parts.push(`P:${escapeWifi(content.password)}`);
      if (content.hidden) parts.push("H:true");
      return `WIFI:${parts.join(";")};;`;
    }
    case "email": {
      if (!content.to.trim()) return "";
      const query = [
        content.subject && `subject=${encodeURIComponent(content.subject)}`,
        content.body && `body=${encodeURIComponent(content.body)}`,
      ].filter(Boolean);
      return `mailto:${content.to.trim()}${query.length ? `?${query.join("&")}` : ""}`;
    }
    case "phone": {
      const number = cleanNumber(content.number);
      return number ? `tel:${number}` : "";
    }
    case "sms": {
      const number = cleanNumber(content.number);
      return number ? `SMSTO:${number}:${content.message}` : "";
    }
  }
}
