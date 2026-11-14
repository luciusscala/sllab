"use client";

import { removeSocial, saveSocial } from "@/app/admin/socials/actions";
import { FormField, Input, Textarea } from "@/components/ui/field";
import { RemoveForm } from "@/components/ui/remove-form";
import { ResourceForm } from "@/components/ui/resource-form";

export type SocialValues = { id: string; eventId: string; date: string; name: string; description: string | null };

export function SocialForm({
  social,
  seasonId,
  closeHref,
}: {
  social: SocialValues | null;
  seasonId: string;
  closeHref: string;
}) {
  return (
    <>
      <ResourceForm action={saveSocial} submitLabel={social ? "Save changes" : "Add social"} closeHref={closeHref}>
        {social ? (
          <input type="hidden" name="event_id" value={social.eventId} />
        ) : (
          <input type="hidden" name="season_id" value={seasonId} />
        )}

        <FormField label="Name" htmlFor="name">
          <Input id="name" name="name" required placeholder="End of season banquet" defaultValue={social?.name ?? ""} />
        </FormField>

        <FormField label="Date and time" htmlFor="date">
          <Input id="date" name="date" type="datetime-local" required defaultValue={social?.date ?? ""} />
        </FormField>

        <FormField label="Details" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            placeholder="Where, what to bring, who's invited"
            defaultValue={social?.description ?? ""}
          />
        </FormField>
      </ResourceForm>

      {social && (
        <RemoveForm
          action={removeSocial}
          hidden={{ event_id: social.eventId }}
          label="Remove social"
          title={`Remove ${social.name}?`}
          message="The social and everyone's responses to it are deleted. This can't be undone."
          closeHref={closeHref}
        />
      )}
    </>
  );
}
