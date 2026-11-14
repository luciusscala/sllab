"use client";

import { removePlayer, savePlayer } from "@/app/admin/roster/actions";
import { FormField, Input, Select } from "@/components/ui/field";
import { RemoveForm } from "@/components/ui/remove-form";
import { ResourceForm } from "@/components/ui/resource-form";
import { CLASSES, POSITIONS } from "@/lib/data/roster";

export type PlayerValues = {
  entryId: string;
  name: string;
  hometown: string | null;
  number: number | null;
  position: string;
  year: string;
  phone: string | null;
};

export function PlayerForm({
  player,
  pictureUrl,
  seasonId,
  seasonYear,
  closeHref,
}: {
  player: PlayerValues | null;
  pictureUrl: string | null;
  seasonId: string;
  seasonYear: number;
  closeHref: string;
}) {
  return (
    <>
      <ResourceForm action={savePlayer} submitLabel={player ? "Save changes" : "Add player"} closeHref={closeHref}>
        {player ? (
          <input type="hidden" name="entry_id" value={player.entryId} />
        ) : (
          <input type="hidden" name="season_id" value={seasonId} />
        )}

        <FormField label="Name" htmlFor="name">
          <Input id="name" name="name" required defaultValue={player?.name ?? ""} />
        </FormField>

        <div className="grid grid-cols-[5rem_1fr] gap-3">
          <FormField label="Number" htmlFor="number">
            <Input id="number" name="number" type="number" min="0" defaultValue={player?.number ?? ""} />
          </FormField>
          <FormField label="Position" htmlFor="position">
            <Select id="position" name="position" required options={POSITIONS} defaultValue={player?.position} />
          </FormField>
        </div>

        <FormField label="Class" htmlFor="class">
          <Select id="class" name="class" required options={CLASSES} defaultValue={player?.year} />
        </FormField>

        <FormField label="Hometown" htmlFor="hometown">
          <Input id="hometown" name="hometown" placeholder="San Diego, CA" defaultValue={player?.hometown ?? ""} />
        </FormField>

        <FormField label="Phone" htmlFor="phone" hint="Links their sign-in to this roster spot. Never shown to teammates.">
          <Input id="phone" name="phone" type="tel" inputMode="numeric" placeholder="(555) 123-4567" defaultValue={player?.phone ?? ""} />
        </FormField>

        <FormField label="Photo" htmlFor="picture" hint={pictureUrl ? "Choosing a new file replaces the current photo." : undefined}>
          {pictureUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- storage URL, sizes vary
            <img src={pictureUrl} alt="" className="mb-2 size-20 rounded-md border border-border object-cover" />
          )}
          <Input id="picture" name="picture" type="file" accept="image/*" />
        </FormField>
      </ResourceForm>

      {player && (
        <RemoveForm
          action={removePlayer}
          hidden={{ entry_id: player.entryId }}
          label={`Remove from ${seasonYear} roster`}
          title={`Remove ${player.name} from the ${seasonYear} roster?`}
          message="Their availability this season goes with them. Other seasons keep them. To stop someone being counted without removing them, mark them inactive under Members in the team app."
          closeHref={closeHref}
        />
      )}
    </>
  );
}
