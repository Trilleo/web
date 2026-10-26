/**
 * Pop-up notices ("toasts"): the line a page shows after an action ("Saved.",
 * "Couldn't do that."), in a stack in the bottom-right corner (the bottom on
 * phones). Styles are in styles/theme.css (.toast-region, .toast).
 *
 * Each toast is its own status (or, for errors, alert). Pages render theirs on the
 * server (apps/web's Toasts.astro, the same markup), so they show without
 * JavaScript; a live region already filled when the page loads isn't read out, so
 * bindToasts() reads them out through a hidden announcer, gives them a close button,
 * hides successes after toastHideMs (paused while hovered or focused) and keeps the
 * stack above the cookie card. showToast() adds one from a script, filling it a
 * moment after it's in the page so screen readers notice.
 */

import { prefersReducedMotion } from "./motion";

export type ToastTone = "done" | "error";

export interface ToastLink {
  href: string;
  label: string;
}

export interface ToastOptions {
  /** "done" hides by itself; "error" stays until closed. Default "done". */
  tone?: ToastTone;
  /** A link after the message ("See your profile"). */
  link?: ToastLink;
  doc?: Document;
}

/** How long a success stays on screen, at least. */
export const TOAST_HIDE_MS = 6000;
/** Longer messages stay a little longer: this much per character. */
const HIDE_MS_PER_CHAR = 60;

/** How long a success with this message stays on screen. */
export function toastHideMs(message: string): number {
  return Math.max(TOAST_HIDE_MS, message.length * HIDE_MS_PER_CHAR);
}

export const TOAST_REGION_ATTR = "data-toasts";
export const TOAST_ATTR = "data-toast";
/** The visually hidden live regions that read server toasts out, one per tone. */
export const TOAST_ANNOUNCER_ATTR = "data-toast-announcer";

/** The stack sits this far above a visible cookie card (px). */
const CARD_GAP = 8;
/** Long enough for screen readers to notice the live region changing. */
const ANNOUNCE_DELAY_MS = 100;

/** The close button's cross (icons.tsx's CloseIcon, as markup). */
export const TOAST_CLOSE_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" aria-hidden="true" focusable="false"><path d="M5 5l14 14"/><path d="M19 5L5 19"/></svg>';

const bound = new WeakSet<Element>();
const boundDocs = new WeakSet<Document>();

function region(doc: Document): HTMLElement {
  const existing = doc.querySelector<HTMLElement>(`[${TOAST_REGION_ATTR}]`);
  if (existing) return existing;
  const created = doc.createElement("section");
  created.setAttribute(TOAST_REGION_ATTR, "");
  created.setAttribute("aria-label", "Notifications");
  created.className = "toast-region";
  doc.body.append(created);
  return created;
}

function announcer(doc: Document, tone: ToastTone): HTMLElement {
  const selector = `[${TOAST_ANNOUNCER_ATTR}="${tone}"]`;
  const existing = doc.querySelector<HTMLElement>(selector);
  if (existing) return existing;
  const created = doc.createElement("div");
  created.setAttribute(TOAST_ANNOUNCER_ATTR, tone);
  created.setAttribute("aria-live", tone === "error" ? "assertive" : "polite");
  created.className = "sr-only";
  doc.body.append(created);
  return created;
}

function announce(doc: Document, tone: ToastTone, text: string): void {
  const live = announcer(doc, tone);
  const win = doc.defaultView;
  live.textContent = "";
  win?.setTimeout(() => {
    live.textContent = text;
  }, ANNOUNCE_DELAY_MS);
}

/** Removes a toast, letting it fade out first when motion is allowed. */
export function dismissToast(toast: HTMLElement): void {
  const win = toast.ownerDocument.defaultView;
  if (toast.hasAttribute("data-leaving")) return;
  // Focus inside would fall to <body>: hand it to the page instead.
  if (toast.contains(toast.ownerDocument.activeElement))
    toast.ownerDocument.getElementById("main")?.focus({ preventScroll: true });
  const remove = () => {
    const parent = toast.parentElement;
    toast.remove();
    if (parent?.hasAttribute(TOAST_REGION_ATTR) && !parent.children.length)
      parent.remove();
  };
  if (!win || prefersReducedMotion(win)) {
    remove();
    return;
  }
  toast.setAttribute("data-leaving", "");
  toast.addEventListener("transitionend", remove, { once: true });
  // In case no transition runs (styles missing, a background tab).
  win.setTimeout(remove, 400);
}

function bindToast(toast: HTMLElement, fromServer: boolean): void {
  if (bound.has(toast)) return;
  bound.add(toast);
  const doc = toast.ownerDocument;
  const win = doc.defaultView;
  const tone: ToastTone =
    toast.getAttribute(TOAST_ATTR) === "error" ? "error" : "done";

  const close = toast.querySelector<HTMLButtonElement>("[data-toast-close]");
  if (close) {
    close.hidden = false;
    close.addEventListener("click", () => {
      dismissToast(toast);
    });
  }
  toast.addEventListener("keydown", (event) => {
    if (event.key === "Escape") dismissToast(toast);
  });

  const message = toast
    .querySelector(".toast-message")
    ?.textContent.trim()
    .replace(/\s+/g, " ");
  if (message && fromServer) announce(doc, tone, message);

  if (tone === "error" || !win) return;
  // Successes go by themselves, but not while someone is reading or on them.
  let left = toastHideMs(message ?? "");
  let started = Date.now();
  let timer: number | undefined = win.setTimeout(() => {
    dismissToast(toast);
  }, left);
  const pause = () => {
    if (timer === undefined) return;
    win.clearTimeout(timer);
    timer = undefined;
    left = Math.max(left - (Date.now() - started), 1500);
  };
  const resume = () => {
    if (timer !== undefined || toast.matches(":hover, :focus-within")) return;
    started = Date.now();
    timer = win.setTimeout(() => {
      dismissToast(toast);
    }, left);
  };
  toast.addEventListener("pointerenter", pause);
  toast.addEventListener("pointerleave", resume);
  toast.addEventListener("focusin", pause);
  toast.addEventListener("focusout", () => {
    // Focus moving between the message and the button stays inside.
    win.setTimeout(resume, 0);
  });
}

/** Lifts the stack above the cookie card while that is showing. */
function followCookieCard(doc: Document): void {
  const win = doc.defaultView;
  const card = doc.querySelector<HTMLElement>("[data-cookie-card]");
  if (!win || !card || !("ResizeObserver" in win)) return;
  const update = () => {
    const height = card.hidden ? 0 : card.offsetHeight;
    doc.documentElement.style.setProperty(
      "--toast-lift",
      height ? `${String(height + CARD_GAP)}px` : "0px",
    );
  };
  new win.ResizeObserver(update).observe(card);
  update();
}

/** Builds a toast's markup (shared by showToast and the server's component). */
export function createToast(
  doc: Document,
  message: string,
  tone: ToastTone,
  link?: ToastLink,
): HTMLElement {
  const toast = doc.createElement("div");
  toast.className = "toast";
  toast.setAttribute(TOAST_ATTR, tone);
  toast.setAttribute("role", tone === "error" ? "alert" : "status");
  const text = doc.createElement("p");
  text.className = "toast-message";
  text.textContent = message;
  if (link) {
    const anchor = doc.createElement("a");
    anchor.href = link.href;
    anchor.className = "toast-link";
    anchor.textContent = link.label;
    text.append(" ", anchor);
  }
  const close = doc.createElement("button");
  close.type = "button";
  close.className = "toast-close";
  close.setAttribute("data-toast-close", "");
  close.setAttribute("aria-label", "Dismiss");
  close.innerHTML = TOAST_CLOSE_ICON;
  toast.append(text, close);
  return toast;
}

/** Shows a toast from a script. Returns it (call dismissToast to take it away). */
export function showToast(
  message: string,
  { tone = "done", link, doc = document }: ToastOptions = {},
): HTMLElement {
  const toast = createToast(doc, message, tone, link);
  bindToast(toast, false);
  // In the page first, then filled, so it's read out like any live region.
  const text = toast.querySelector(".toast-message");
  const content = text ? [...text.childNodes] : [];
  text?.replaceChildren();
  region(doc).append(toast);
  doc.defaultView?.setTimeout(() => {
    text?.append(...content);
  }, ANNOUNCE_DELAY_MS);
  if (!boundDocs.has(doc)) {
    boundDocs.add(doc);
    followCookieCard(doc);
  }
  return toast;
}

/** Takes over the toasts the server rendered. Safe to call more than once. */
export function bindToasts(doc: Document = document): void {
  // Created up front so they're in the page before anything is read out.
  announcer(doc, "done");
  announcer(doc, "error");
  doc.querySelectorAll<HTMLElement>(`[${TOAST_ATTR}]`).forEach((toast) => {
    bindToast(toast, true);
  });
  if (!boundDocs.has(doc)) {
    boundDocs.add(doc);
    followCookieCard(doc);
  }
}
