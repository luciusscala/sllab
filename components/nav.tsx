"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_LINKS } from "@/lib/content";
import { ThemeToggle } from "@/components/theme-toggle";

export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`absolute inset-0 -z-10 transition-all duration-700 ease-smooth ${
          scrolled ? "bg-bg/70 backdrop-blur-xl" : "bg-transparent"
        }`}
      />
      <nav className="mx-auto flex h-[72px] max-w-[1120px] items-center justify-between px-6 md:px-10">
        <Link
          href="/"
          className="text-[15px] font-medium tracking-[-0.05em]"
          aria-label="Sllab, home"
        >
          sllab
        </Link>

        <div className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-3 py-2 text-[15px] tracking-tight"
              >
                <span className={active ? "" : "text-muted transition-colors duration-500 hover:text-fg"}>
                  {link.label}
                </span>
                <span
                  className="absolute inset-x-3 bottom-1 h-px origin-left bg-fg transition-transform duration-500 ease-smooth"
                  style={{ transform: active ? "scaleX(1)" : "scaleX(0)" }}
                />
              </Link>
            );
          })}
          <ThemeToggle className="ml-2" />
        </div>
      </nav>
    </header>
  );
}
