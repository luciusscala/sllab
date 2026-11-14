"use client";

import { type ReactNode, useRef } from "react";

import { type Variant, buttonClass } from "@/components/ui/button";

/**
 * A button that asks before submitting the form it sits in. The question is
 * a native `<dialog>` rather than `window.confirm`, so it reads like the rest
 * of the page and says exactly what will happen.
 */
export function ConfirmSubmit({
  title,
  message,
  confirmLabel,
  variant = "destructive",
  disabled,
  children,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  variant?: Variant;
  disabled?: boolean;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => dialogRef.current?.showModal()}
        className={buttonClass(variant)}
      >
        {children}
      </button>

      <dialog
        ref={dialogRef}
        className="dialog-card"
        aria-labelledby="confirm-title"
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <h2 id="confirm-title" className="headline text-lg">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={close} className={buttonClass("secondary")}>
            Cancel
          </button>
          <button
            type="button"
            className={buttonClass(variant)}
            onClick={() => {
              close();
              triggerRef.current?.form?.requestSubmit();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}
