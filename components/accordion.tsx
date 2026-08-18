"use client";

import { useState } from "react";

/**
 * Height animates via a 0fr → 1fr grid row, which interpolates smoothly
 * without measuring anything.
 */
export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="border-t border-line">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="border-b border-line">
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="group flex w-full items-center justify-between gap-6 py-6 text-left"
              >
                <span
                  className="text-lg tracking-[-0.03em] transition-[transform,color] duration-700 ease-smooth md:text-xl"
                  style={{ transform: isOpen ? "translateX(4px)" : "translateX(0)" }}
                >
                  {item.q}
                </span>

                <span className="relative block h-3 w-3 shrink-0">
                  <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-fg" />
                  <span
                    className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-fg transition-transform duration-700 ease-smooth"
                    style={{ transform: `translateX(-50%) scaleY(${isOpen ? 0 : 1})` }}
                  />
                </span>
              </button>
            </h3>

            <div
              className="grid transition-[grid-template-rows] duration-700 ease-smooth"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p
                  className="lede max-w-xl pb-8 pr-8 text-muted transition-opacity duration-500 ease-smooth"
                  style={{ opacity: isOpen ? 1 : 0 }}
                >
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
