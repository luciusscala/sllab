"use client";

import { FormField, Input } from "@/components/ui/field";
import { RemoveForm } from "@/components/ui/remove-form";
import { ResourceForm } from "@/components/ui/resource-form";
import type { FormState } from "@/lib/forms";

type Action = (state: FormState, data: FormData) => Promise<FormState>;

export type FieldValues = {
  id: string;
  name: string;
  area: string | null;
  maps_address: string | null;
  recommended_parking: string | null;
};

/**
 * The drawer's contents: empty for a new field, filled for an existing one.
 * `remove` is only passed where removal is allowed (the console).
 */
export function FieldForm({
  field,
  pictureUrl,
  save,
  remove,
  closeHref,
}: {
  field: FieldValues | null;
  pictureUrl: string | null;
  save: Action;
  remove?: Action;
  closeHref: string;
}) {
  return (
    <>
      <ResourceForm action={save} submitLabel={field ? "Save changes" : "Add field"} closeHref={closeHref}>
        {field && <input type="hidden" name="id" value={field.id} />}

        <FormField label="Name" htmlFor="name">
          <Input id="name" name="name" required defaultValue={field?.name ?? ""} placeholder="John Muir Field" />
        </FormField>

        <FormField label="Area" htmlFor="area" hint="Shown after the name: “John Muir Field, La Jolla”.">
          <Input id="area" name="area" defaultValue={field?.area ?? ""} placeholder="La Jolla" />
        </FormField>

        <FormField label="Address" htmlFor="maps_address" hint="Turns the venue into a directions link.">
          <Input
            id="maps_address"
            name="maps_address"
            defaultValue={field?.maps_address ?? ""}
            placeholder="9500 Gilman Dr, La Jolla, CA 92093"
          />
        </FormField>

        <FormField label="Recommended parking" htmlFor="recommended_parking">
          <Input
            id="recommended_parking"
            name="recommended_parking"
            defaultValue={field?.recommended_parking ?? ""}
            placeholder="Hopkins Parking Structure"
          />
        </FormField>

        <FormField
          label="Photo"
          htmlFor="picture"
          hint={pictureUrl ? "Choosing a new file replaces the current photo." : undefined}
        >
          {pictureUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- storage URL, sizes vary
            <img src={pictureUrl} alt="" className="mb-2 h-28 w-full rounded-md border border-border object-cover" />
          )}
          <Input id="picture" name="picture" type="file" accept="image/*" />
        </FormField>
      </ResourceForm>

      {field && remove && (
        <RemoveForm
          action={remove}
          hidden={{ id: field.id }}
          label="Remove field"
          title={`Remove ${field.name}?`}
          message="It disappears from every team's venue list. A field with games or practices on it can't be removed."
          note="Fields are shared by every team."
          closeHref={closeHref}
        />
      )}
    </>
  );
}
