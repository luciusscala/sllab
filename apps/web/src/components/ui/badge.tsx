import type { ReactNode } from "react";

const TONE = {
  neutral: "bg-surface-raised text-muted",
  accent: "bg-accent/15 text-accent",
  warning: "bg-warning/15 text-warning",
  danger: "bg-not-going/15 text-not-going",
};

/** A small status pill. */
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof TONE }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONE[tone]}`}>
      {children}
    </span>
  );
}
