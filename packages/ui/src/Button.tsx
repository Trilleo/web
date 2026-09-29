import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary";

// On hover/focus a color panel slides in from the left behind the label (the
// `before:` layer); `press` handles the click and the label's color change.
const base =
  "relative isolate inline-flex h-11 items-center justify-center gap-2.5 overflow-hidden px-4 type-nav whitespace-nowrap press before:absolute before:inset-0 before:-z-10 before:origin-left before:scale-x-0 before:transition-transform before:duration-(--tr-dur-base) before:ease-swiss hover:before:scale-x-100 focus-visible:before:scale-x-100 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-paper before:bg-accent hover:text-on-accent focus-visible:text-on-accent",
  secondary:
    "border border-ink text-ink before:bg-ink hover:text-paper focus-visible:text-paper",
};

/** Button styling for elements that can't use <Button>/<ButtonLink> (e.g. Astro markup). */
export function buttonClasses({
  variant = "primary",
  className,
}: { variant?: ButtonVariant; className?: string | undefined } = {}): string {
  return [base, variants[variant], className].filter(Boolean).join(" ");
}

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
}

export function Button({
  variant = "primary",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, className })}
      {...props}
    />
  );
}

export interface ButtonLinkProps extends ComponentProps<"a"> {
  href: string;
  variant?: ButtonVariant;
}

/** A link that looks like a button. Use it for navigation; use <Button> for actions. */
export function ButtonLink({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <a className={buttonClasses({ variant, className })} {...props}>
      {children}
    </a>
  );
}
