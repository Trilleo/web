import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary";

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-ui px-4 py-2 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary: "border border-brand-600 text-brand-700 hover:bg-brand-50",
};

export function Button({
  variant = "primary",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  const classes = [base, variants[variant], className]
    .filter(Boolean)
    .join(" ");
  return <button type={type} className={classes} {...props} />;
}
