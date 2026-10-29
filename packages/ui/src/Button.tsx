import type { ComponentProps } from "react";
import { buttonClasses, type ButtonVariant } from "./classes";

export { buttonClasses };
export type { ButtonHover, ButtonVariant } from "./classes";

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
