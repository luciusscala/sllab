import Link from "next/link";
import type { CSSProperties, ElementType, ReactNode } from "react";

/** Wraps children in a scroll-triggered entrance. Delay is in milliseconds. */
export function Reveal({
  children,
  delay = 0,
  y,
  as: Tag = "div",
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  as?: ElementType;
  className?: string;
}) {
  return (
    <Tag
      data-reveal=""
      className={className}
      style={
        {
          "--reveal-delay": `${delay}ms`,
          ...(y !== undefined ? { "--reveal-y": `${y}px` } : {}),
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  );
}

export function ArrowLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 text-[15px] tracking-tight ${className}`}
    >
      <span className="link-wipe">{children}</span>
      <span className="relative block h-3 w-3 overflow-hidden">
        <Arrow className="absolute inset-0 transition-transform duration-500 ease-smooth group-hover:translate-x-4 group-hover:-translate-y-4" />
        <Arrow className="absolute inset-0 -translate-x-4 translate-y-4 transition-transform duration-500 ease-smooth group-hover:translate-x-0 group-hover:translate-y-0" />
      </span>
    </Link>
  );
}

export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={`h-3 w-3 ${className}`} aria-hidden>
      <path
        d="M2.5 9.5 9.5 2.5M4 2.5h5.5V8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="square"
      />
    </svg>
  );
}
