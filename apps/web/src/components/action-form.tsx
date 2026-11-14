"use client";

import { type ReactNode, useActionState } from "react";

import type { ActionState } from "@/app/auth/actions";
import { buttonClass } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/ui/confirm";

type Action = (state: ActionState, data: FormData) => Promise<ActionState>;

/**
 * A form around a team-app Server Action that either redirects or returns an
 * error: joining, signing in, responding, leaving. React resets an
 * uncontrolled form after a successful action, so entering several in a row
 * needs no reload. Dashboards use `ResourceForm`, whose actions also report
 * success.
 */
export function ActionForm({
  action,
  submitLabel,
  children,
  className = "",
  confirm,
  destructive = false,
}: {
  action: Action;
  submitLabel: string;
  children?: ReactNode;
  className?: string;
  /** When set, a dialog asks this before the action runs. */
  confirm?: string | { title: string; message: string };
  /** The red button, for removing and leaving. */
  destructive?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const variant = destructive ? "destructive" : "primary";
  const label = pending ? (destructive ? "Working…" : "Saving…") : submitLabel;
  // The primary button sits below fields; a destructive one usually stands alone.
  const spacing = destructive ? "" : "mt-4";
  const question = typeof confirm === "string" ? { title: confirm, message: "" } : confirm;

  return (
    <form action={formAction} className={className}>
      {children}

      {state?.error && (
        <p role="alert" className="mt-3 text-sm text-warning">
          {state.error}
        </p>
      )}

      {question ? (
        <ConfirmSubmit
          title={question.title}
          message={question.message}
          confirmLabel={submitLabel}
          variant={variant}
          disabled={pending}
          className={spacing}
        >
          {label}
        </ConfirmSubmit>
      ) : (
        <button type="submit" disabled={pending} className={buttonClass(variant, "md", spacing)}>
          {label}
        </button>
      )}
    </form>
  );
}
