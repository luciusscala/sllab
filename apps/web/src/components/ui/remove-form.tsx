"use client";

import { ResourceForm } from "@/components/ui/resource-form";
import type { FormState } from "@/lib/forms";

/**
 * The foot of an edit drawer: a destructive button that asks first, set
 * apart from the form above it. `hidden` carries the record's ids.
 */
export function RemoveForm({
  action,
  hidden,
  label,
  title,
  message,
  note,
  closeHref,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  hidden: Record<string, string>;
  label: string;
  title: string;
  message: string;
  /** A line beside the button, saying what removing means here. */
  note?: string;
  closeHref: string;
}) {
  return (
    <div className="mt-8 border-t border-border pt-5">
      <ResourceForm
        action={action}
        submitLabel={label}
        variant="destructive"
        closeHref={closeHref}
        confirm={{ title, message }}
      >
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        {note && <p className="text-sm text-muted">{note}</p>}
      </ResourceForm>
    </div>
  );
}
