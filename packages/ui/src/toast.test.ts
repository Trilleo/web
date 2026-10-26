import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TOAST_ANNOUNCER_ATTR,
  TOAST_HIDE_MS,
  bindToasts,
  createToast,
  dismissToast,
  showToast,
  toastHideMs,
} from "./toast";

/** What the server renders (apps/web's Toasts.astro). */
function closeButton(toast: HTMLElement): HTMLButtonElement {
  const close = toast.querySelector<HTMLButtonElement>("[data-toast-close]");
  if (!close) throw new Error("No close button");
  return close;
}

function serverToast(message: string, tone: "done" | "error"): HTMLElement {
  const region = document.createElement("section");
  region.setAttribute("data-toasts", "");
  region.className = "toast-region";
  const toast = createToast(document, message, tone);
  const close = toast.querySelector<HTMLButtonElement>("[data-toast-close]");
  if (close) close.hidden = true;
  region.append(toast);
  document.body.append(region);
  return toast;
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("showToast", () => {
  it("adds a status to a new region, with a close button", () => {
    const toast = showToast("Saved.");
    const region = document.querySelector("[data-toasts]");
    expect(region?.getAttribute("aria-label")).toBe("Notifications");
    expect(region?.contains(toast)).toBe(true);
    expect(toast.getAttribute("role")).toBe("status");
    vi.advanceTimersByTime(200);
    expect(toast.querySelector(".toast-message")?.textContent).toBe("Saved.");
    const close = toast.querySelector<HTMLButtonElement>("[data-toast-close]");
    expect(close?.hidden).toBe(false);
    expect(close?.getAttribute("aria-label")).toBe("Dismiss");
  });

  it("keeps the message as text, never markup", () => {
    const toast = showToast("<img src=x onerror=alert(1)>");
    vi.advanceTimersByTime(200);
    expect(toast.querySelector("img")).toBeNull();
  });

  it("adds a link after the message", () => {
    const toast = showToast("Saved.", {
      link: { href: "/people/ada/", label: "See your profile" },
    });
    vi.advanceTimersByTime(200);
    const link = toast.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/people/ada/");
    expect(link?.textContent).toBe("See your profile");
  });

  it("fills an error alert once it's in the page", () => {
    const toast = showToast("Couldn’t save.", { tone: "error" });
    expect(toast.getAttribute("role")).toBe("alert");
    expect(toast.querySelector(".toast-message")?.textContent).toBe("");
    vi.advanceTimersByTime(200);
    expect(toast.querySelector(".toast-message")?.textContent).toBe(
      "Couldn’t save.",
    );
  });

  it("hides a success after a while, and the region with its last toast", () => {
    showToast("Saved.");
    vi.advanceTimersByTime(TOAST_HIDE_MS + 500);
    expect(document.querySelector("[data-toasts]")).toBeNull();
  });

  it("keeps an error until it's closed", () => {
    const toast = showToast("Couldn’t save.", { tone: "error" });
    vi.advanceTimersByTime(TOAST_HIDE_MS * 10);
    expect(toast.isConnected).toBe(true);
    closeButton(toast).click();
    vi.advanceTimersByTime(500);
    expect(toast.isConnected).toBe(false);
  });

  it("waits while the pointer is on it", () => {
    const toast = showToast("Saved.");
    toast.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(TOAST_HIDE_MS * 3);
    expect(toast.isConnected).toBe(true);
    toast.dispatchEvent(new Event("pointerleave"));
    vi.advanceTimersByTime(TOAST_HIDE_MS);
    vi.advanceTimersByTime(500);
    expect(toast.isConnected).toBe(false);
  });

  it("closes with Escape", () => {
    const toast = showToast("Couldn’t save.", { tone: "error" });
    toast.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    vi.advanceTimersByTime(500);
    expect(toast.isConnected).toBe(false);
  });
});

describe("bindToasts", () => {
  it("takes over the server's toasts: close button, announcement, hiding", () => {
    const toast = serverToast("Deleted.", "done");
    bindToasts(document);
    expect(closeButton(toast).hidden).toBe(false);
    vi.advanceTimersByTime(200);
    const live = document.querySelector(`[${TOAST_ANNOUNCER_ATTR}="done"]`);
    expect(live?.getAttribute("aria-live")).toBe("polite");
    expect(live?.textContent).toBe("Deleted.");
    vi.advanceTimersByTime(TOAST_HIDE_MS);
    vi.advanceTimersByTime(500);
    expect(toast.isConnected).toBe(false);
  });

  it("binds each toast once", () => {
    const toast = serverToast("Couldn’t save.", "error");
    bindToasts(document);
    bindToasts(document);
    closeButton(toast).click();
    vi.advanceTimersByTime(500);
    expect(toast.isConnected).toBe(false);
  });
});

describe("toastHideMs", () => {
  it("gives longer messages longer", () => {
    expect(toastHideMs("Saved.")).toBe(TOAST_HIDE_MS);
    expect(toastHideMs("x".repeat(200))).toBeGreaterThan(TOAST_HIDE_MS);
  });
});

describe("dismissToast", () => {
  it("removes at once under reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const toast = showToast("Saved.");
    dismissToast(toast);
    expect(toast.isConnected).toBe(false);
    vi.unstubAllGlobals();
  });
});
