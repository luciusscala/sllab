"use client";

import { useEffect } from "react";

/**
 * One observer for the whole document. Any element — server-rendered or not —
 * that carries `data-reveal` animates in once it enters the viewport, so pages
 * stay Server Components and only declare intent via an attribute.
 */
export function RevealProvider() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document
        .querySelectorAll("[data-reveal]")
        .forEach((el) => el.setAttribute("data-reveal", "in"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-reveal", "in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 },
    );

    const scan = () => {
      document
        .querySelectorAll('[data-reveal]:not([data-reveal="in"])')
        .forEach((el) => observer.observe(el));
    };

    scan();

    // Route changes swap the subtree under the layout.
    const mutations = new MutationObserver(scan);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);

  return null;
}
