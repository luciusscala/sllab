"use client";

import { removeField, saveField } from "@/app/admin/fields/actions";
import { FormField, Input } from "@/components/ui/field";
import { ResourceForm } from "@/components/ui/resource-form";

export type FieldValues = {
  id: string;
  name: string;
  area: string | null;
  maps_address: string | null;
  recommended_parking: string | null;
};

const CLOSE = "/admin/fields";

/** The drawer's contents: the same form for a new field and an existing one, plus removal for the latter. */
export function FieldForm({ field, pictureUrl }: { field: FieldValues | null; pictureUrl: string | null }) {
  return (
    <>
      <ResourceForm action={saveField} submitLabel={field ? "Save changes" : "Add field"} closeHref={CLOSE}>
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
            <img
              src={pictureUrl}
              alt=""
              className="mb-2 h-28 w-full rounded-md border border-border object-cover"
            />
          )}
          <Input id="picture" name="picture" type="file" accept="image/*" />
        </FormField>
      </ResourceForm>

      {field && (
        <div className="mt-8 border-t border-border pt-5">
          <ResourceForm
            action={removeField}
            submitLabel="Remove field"
            variant="destructive"
            closeHref={CLOSE}
            confirm={{
              title: `Remove ${field.name}?`,
              message:
                "It disappears from every team's venue list. A field with games or practices on it can't be removed.",
            }}
          >
            <input type="hidden" name="id" value={field.id} />
            <p className="text-sm text-muted">Fields are shared across the platform.</p>
          </ResourceForm>
        </div>
      )}
    </>
  );
}
