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
