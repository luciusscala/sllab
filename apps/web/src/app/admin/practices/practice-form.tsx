"use client";

import { removePractice, savePractice } from "@/app/admin/practices/actions";
import { FormField, Input, Select, Textarea } from "@/components/ui/field";
import { RemoveForm } from "@/components/ui/remove-form";
import { ResourceForm } from "@/components/ui/resource-form";

type Option = { value: string; label: string };

export type PracticeValues = {
  id: string;
  eventId: string;
  date: string;
  /** "Tue, Oct 7", for the removal question. */
  day: string;
  fieldId: string;
  notes: string | null;
  filmLink: string | null;
};

export function PracticeForm({
  practice,
  seasonId,
  fields,
  closeHref,
}: {
  practice: PracticeValues | null;
  seasonId: string;
  fields: Option[];
  closeHref: string;
}) {
  return (
    <>
      <ResourceForm action={savePractice} submitLabel={practice ? "Save changes" : "Add practice"} closeHref={closeHref}>
        {practice ? (
          <input type="hidden" name="event_id" value={practice.eventId} />
        ) : (
          <input type="hidden" name="season_id" value={seasonId} />
        )}

        <FormField label="Date and time" htmlFor="date">
          <Input id="date" name="date" type="datetime-local" required defaultValue={practice?.date ?? ""} />
        </FormField>

        <FormField label="Field" htmlFor="field_id" hint={fields.length === 0 ? "Add a field under Fields first." : undefined}>
          <Select id="field_id" name="field_id" required options={fields} defaultValue={practice?.fieldId} />
        </FormField>

        <FormField label="Notes" htmlFor="notes">
          <Textarea id="notes" name="notes" placeholder="Bring both kits" defaultValue={practice?.notes ?? ""} />
        </FormField>

        <FormField label="Film link" htmlFor="film_link">
          <Input id="film_link" name="film_link" type="url" placeholder="https://" defaultValue={practice?.filmLink ?? ""} />
        </FormField>
      </ResourceForm>

      {practice && (
        <RemoveForm
          action={removePractice}
          hidden={{ event_id: practice.eventId }}
          label="Remove practice"
          title={`Remove the ${practice.day} practice?`}
          message="The practice and everyone's availability for it are deleted. This can't be undone."
          closeHref={closeHref}
        />
      )}
    </>
  );
}
