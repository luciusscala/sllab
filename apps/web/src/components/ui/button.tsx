import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Four kinds of button, one shape. Primary is the accent and there should be
 * one per view; secondary is the default; ghost sits in toolbars; destructive
 * is for removing things and always goes behind a confirmation.
 */
export type Variant = "primary" | "secondary" | "ghost" | "destructive";
export type Size = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-9 px-3.5 text-sm",
};

const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground hover:opacity-90",
  secondary: "border border-border-strong bg-surface text-foreground hover:bg-surface-raised",
  ghost: "text-muted hover:bg-surface hover:text-foreground",
  destructive: "border border-not-going/40 text-not-going hover:bg-not-going/10",
};

export const buttonClass = (variant: Variant = "secondary", size: Size = "md", extra = "") =>
  `${BASE} ${SIZE[size]} ${VARIANT[variant]} ${extra}`.trim();

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button {...props} className={buttonClass(variant, size, className)} />;
}

export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <Link href={href} {...props} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}
