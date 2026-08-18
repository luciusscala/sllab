"use client";

import { useEffect } from "react";

/**
 * Inertial scrolling. Wheel input feeds a target position, a rAF loop eases the
 * real scroll position toward it. Native `position: fixed` keeps working because
 * we drive `window.scrollTo` rather than transforming a wrapper.
 *
 * Disabled for touch (already has momentum) and reduced-motion.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    if (reduced.matches || coarse.matches) return;

    const root = document.documentElement;
    root.classList.add("has-smooth-scroll");

    let target = window.scrollY;
    let running = false;
    let frame = 0;
    let selfScroll = false;

    const limit = () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    const tick = () => {
      const current = window.scrollY;
      const delta = target - current;

      if (Math.abs(delta) < 0.4) {
        selfScroll = true;
        window.scrollTo(0, target);
        selfScroll = false;
        running = false;
        return;
      }

      selfScroll = true;
      window.scrollTo(0, current + delta * 0.115);
      selfScroll = false;
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return; // pinch zoom
      const el = event.target as HTMLElement | null;
      if (el?.closest?.("[data-native-scroll]")) return;

      event.preventDefault();

      const unit =
        event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? window.innerHeight : 1;

      target = Math.min(Math.max(target + event.deltaY * unit, 0), limit());
      start();
    };

    // Anything that isn't us (keyboard, anchors, scrollbar drag) resets the target.
    const onScroll = () => {
      if (selfScroll || running) return;
      target = window.scrollY;
    };

    const onResize = () => {
      target = Math.min(target, limit());
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      root.classList.remove("has-smooth-scroll");
    };
  }, []);

  return null;
}
