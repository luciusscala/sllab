"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY } from "@/lib/theme";

type Theme = "light" | "dark";

/**
 * The theme lives on `<html data-theme>`, written before paint by the inline
 * script in the layout. React subscribes to it rather than owning it.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

const getSnapshot = (): Theme =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

const getServerSnapshot = (): Theme => "light";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={`group grid h-9 w-9 place-items-center rounded-full ${className}`}
    >
      <span className="relative block h-4 w-4 overflow-hidden rounded-full ring-1 ring-fg/45 transition-transform duration-700 ease-smooth group-hover:rotate-180">
        <span
          className="absolute inset-0 bg-fg transition-transform duration-700 ease-smooth"
          style={{
            transform: theme === "dark" ? "translateX(50%)" : "translateX(0%)",
          }}
        />
      </span>
    </button>
  );
}
