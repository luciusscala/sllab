"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useActionState, useEffect } from "react";

import { Button, type Variant } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import type { FormState } from "@/lib/forms";

type Action = (state: FormState, data: FormData) => Promise<FormState>;

/**
 * The form inside a drawer. Wraps a Server Action: while it runs the button
 * says so; an error shows under the fields; success shows a toast and, when
 * `closeHref` is given, closes the drawer by dropping the query from the URL.
 * With `confirm`, the submit asks first, which is how every removal works.
 */
export function ResourceForm({
  action,
  submitLabel,
  children,
  closeHref,
  variant = "primary",
  confirm,
  className = "",
}: {
  action: Action;
  submitLabel: string;
  children: ReactNode;
  closeHref?: string;
  variant?: Variant;
  confirm?: { title: string; message: string; confirmLabel?: string };
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (state && "ok" in state) {
      toast(state.message ?? "Saved");
      if (closeHref) router.push(closeHref, { scroll: false });
    }
  }, [state, closeHref, router, toast]);

  const error = state && "error" in state ? state.error : null;

  return (
    <form action={formAction} className={`space-y-4 ${className}`}>
      {children}

      {error && (
        <p role="alert" className="text-sm text-not-going">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        {confirm ? (
          <ConfirmSubmit
            title={confirm.title}
            message={confirm.message}
            confirmLabel={confirm.confirmLabel ?? submitLabel}
            variant={variant}
            disabled={pending}
          >
            {pending ? "Working…" : submitLabel}
          </ConfirmSubmit>
        ) : (
          <Button type="submit" variant={variant} disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
