import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary";

const base =
  "inline-flex h-11 items-center justify-center gap-2.5 px-4 type-nav whitespace-nowrap transition-colors duration-150 ease-swiss disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-paper hover:bg-accent hover:text-on-accent",
  secondary: "border border-ink text-ink hover:bg-ink hover:text-paper",
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
