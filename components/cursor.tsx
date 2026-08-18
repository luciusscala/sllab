"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE = 'a, button, [role="button"], input, textarea, [data-cursor]';

/**
 * A single lagging ring in `mix-blend-mode: difference` — reads black on white,
 * white on black, and inverts anything it passes over. The native cursor stays
 * visible so affordances never break.
 */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ring.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let x = mouseX;
    let y = mouseY;
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      el.dataset.visible = "true";

      const target = event.target as HTMLElement | null;
      el.dataset.active = String(Boolean(target?.closest?.(INTERACTIVE)));
    };

    const onLeave = () => {
      el.dataset.visible = "false";
    };

    const tick = () => {
      x += (mouseX - x) * 0.16;
      y += (mouseY - y) * 0.16;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <div ref={ring} className="cursor-ring" aria-hidden />;
}
