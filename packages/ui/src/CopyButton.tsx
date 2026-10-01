import { useEffect, useRef, useState } from "react";

export interface CopyButtonProps {
  /** What goes on the clipboard. */
  value: string;
  /** Says what's copied to screen readers, e.g. "Copy SHA-256". */
  label: string;
  className?: string;
}

/** How long "Copied" stays before the button goes back to "Copy". */
export const COPIED_MS = 1600;

/** A small "Copy" button that says "Copied" for a moment after it works. */
export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setState("idle");
    }, COPIED_MS);
  };

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => void copy()}
      className={`press border border-ink px-2 py-1 type-label transition-colors duration-(--tr-dur-fast) ease-swiss hover:bg-ink hover:text-paper ${className ?? ""}`}
    >
      <span aria-live="polite">
        {state === "copied" ? "Copied" : state === "failed" ? "Failed" : "Copy"}
      </span>
    </button>
  );
}
