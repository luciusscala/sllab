"use client";

import { removeTournament, saveTournament } from "@/app/admin/tournaments/actions";
import { FormField, Input, Select } from "@/components/ui/field";
import { RemoveForm } from "@/components/ui/remove-form";
import { ResourceForm } from "@/components/ui/resource-form";

type Option = { value: string; label: string };

export type TournamentValues = {
  id: string;
  eventId: string;
  date: string;
  name: string;
  websiteLink: string | null;
  location: string | null;
  fieldId: string | null;
};

export function TournamentForm({
  tournament,
  seasonId,
  fields,
  closeHref,
}: {
  tournament: TournamentValues | null;
  seasonId: string;
  fields: Option[];
  closeHref: string;
}) {
  return (
    <>
      <ResourceForm action={saveTournament} submitLabel={tournament ? "Save changes" : "Add tournament"} closeHref={closeHref}>
        {tournament ? (
          <input type="hidden" name="event_id" value={tournament.eventId} />
        ) : (
          <input type="hidden" name="season_id" value={seasonId} />
        )}

        <FormField label="Name" htmlFor="name">
          <Input id="name" name="name" required placeholder="SoCal Invitational" defaultValue={tournament?.name ?? ""} />
        </FormField>

        <FormField label="Starts" htmlFor="date">
          <Input id="date" name="date" type="datetime-local" required defaultValue={tournament?.date ?? ""} />
        </FormField>

        <FormField label="Field" htmlFor="field_id" hint="Away tournaments are usually somewhere without a field; use Location.">
          <Select id="field_id" name="field_id" options={fields} emptyLabel="None" defaultValue={tournament?.fieldId ?? ""} />
        </FormField>

        <FormField label="Location" htmlFor="location">
          <Input id="location" name="location" placeholder="Santa Barbara, CA" defaultValue={tournament?.location ?? ""} />
        </FormField>

        <FormField label="Website" htmlFor="website_link">
          <Input id="website_link" name="website_link" type="url" placeholder="https://" defaultValue={tournament?.websiteLink ?? ""} />
        </FormField>
      </ResourceForm>

      {tournament && (
        <RemoveForm
          action={removeTournament}
          hidden={{ event_id: tournament.eventId }}
          label="Remove tournament"
          title={`Remove ${tournament.name}?`}
          message="The tournament and everyone's availability for it are deleted. This can't be undone."
          closeHref={closeHref}
        />
      )}
    </>
  );
}
