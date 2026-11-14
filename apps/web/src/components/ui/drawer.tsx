"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";

import { buttonClass } from "@/components/ui/button";

/**
 * A panel from the right for creating or editing one record. Its open state
 * lives in the URL (`?new`, `?edit=<id>`), so the page renders the record's
 * form on the server and a reload lands back on the same record. Closing
 * drops the query. Native `<dialog>`: focus is trapped and Escape works.
 */
export function Drawer({
  open,
  title,
  description,
  closeHref,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  closeHref: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  const dismiss = () => router.push(closeHref, { scroll: false });

  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-labelledby="drawer-title"
      // Escape closes the dialog itself; this keeps the URL in step. When the
      // close came from `open` turning false, the URL already changed, and
      // this render's `open` is false, so there's nothing to do.
      onClose={() => {
        if (open) dismiss();
      }}
      onClick={(event) => {
        if (event.target === ref.current) dismiss();
      }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 id="drawer-title" className="headline truncate text-lg">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className={buttonClass("ghost", "sm", "px-2")}
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">{open ? children : null}</div>
    </dialog>
  );
}
