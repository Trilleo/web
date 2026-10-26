/**
 * Toasts from the server: a page's frontmatter calls `toast(Astro, "Saved.")` for
 * the line it shows after an action, and Toasts.astro (in BaseLayout and
 * WikiLayout) renders them as pop-ups (@trilleo/ui's toast.ts). Called from the
 * page's own frontmatter, which runs before the layout renders; a component inside
 * the page may render after it, so components return their message instead.
 */
import type { ToastLink, ToastTone } from "@trilleo/ui/toast";

export interface PageToast {
  message: string;
  tone: ToastTone;
  link?: ToastLink;
}

interface HasLocals {
  locals: App.Locals;
}

/** Queues a toast for this page; empty messages are ignored. */
export function toast(
  astro: HasLocals,
  message: string | null | undefined,
  tone: ToastTone = "done",
  link?: ToastLink,
): void {
  const text = message?.trim();
  if (!text) return;
  (astro.locals.toasts ??= []).push({
    message: text,
    tone,
    ...(link ? { link } : {}),
  });
}

/** Queues an error toast. */
export function toastError(
  astro: HasLocals,
  message: string | null | undefined,
): void {
  toast(astro, message, "error");
}
