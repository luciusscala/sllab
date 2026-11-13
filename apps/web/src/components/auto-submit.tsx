"use client";

import { useEffect, useRef } from "react";

/** Submits the form it sits in as soon as it renders, once. */
export function AutoSubmit() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    marker.current?.closest("form")?.requestSubmit();
  }, []);

  return <span ref={marker} hidden />;
}
