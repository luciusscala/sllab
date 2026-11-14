"use client";

import { removeGame, saveGame } from "@/app/admin/schedule/actions";
import { Checkbox, FormField, Input, Select } from "@/components/ui/field";
import { RemoveForm } from "@/components/ui/remove-form";
import { ResourceForm } from "@/components/ui/resource-form";

type Option = { value: string; label: string };

export type GameValues = {
  id: string;
  eventId: string;
  /** datetime-local value */
  date: string;
  opponentId: string;
  opponent: string;
  isHome: boolean;
  fieldId: string | null;
  filmLink: string | null;
  ourScore: number | null;
  theirScore: number | null;
};

export function GameForm({
  game,
  seasonId,
  opponents,
  fields,
  closeHref,
}: {
  game: GameValues | null;
  seasonId: string;
  opponents: Option[];
  fields: Option[];
  closeHref: string;
}) {
  return (
    <>
      <ResourceForm action={saveGame} submitLabel={game ? "Save changes" : "Add game"} closeHref={closeHref}>
        {game ? (
          <input type="hidden" name="event_id" value={game.eventId} />
        ) : (
          <input type="hidden" name="season_id" value={seasonId} />
        )}

        <FormField label="Date and time" htmlFor="date">
          <Input id="date" name="date" type="datetime-local" required defaultValue={game?.date ?? ""} />
        </FormField>

        <FormField label="Opponent" htmlFor="opponent_id" hint="Missing? Add them under Teams.">
          <Select id="opponent_id" name="opponent_id" required options={opponents} defaultValue={game?.opponentId} />
        </FormField>

        <Checkbox name="is_home" label="Home game" defaultChecked={game?.isHome ?? true} />

        <FormField label="Field" htmlFor="field_id">
          <Select id="field_id" name="field_id" options={fields} emptyLabel="TBD" defaultValue={game?.fieldId ?? ""} />
        </FormField>

        <fieldset>
          <legend className="field-label">Final score</legend>
          <div className="grid grid-cols-2 gap-3">
            <Input name="our_score" type="number" min="0" aria-label="Our score" placeholder="Us" defaultValue={game?.ourScore ?? ""} />
            <Input name="their_score" type="number" min="0" aria-label="Their score" placeholder="Them" defaultValue={game?.theirScore ?? ""} />
          </div>
        </fieldset>

        <FormField label="Film link" htmlFor="film_link">
          <Input id="film_link" name="film_link" type="url" placeholder="https://" defaultValue={game?.filmLink ?? ""} />
        </FormField>
      </ResourceForm>

      {game && (
        <RemoveForm
          action={removeGame}
          hidden={{ event_id: game.eventId }}
          label="Remove game"
          title={`Remove ${game.isHome ? "vs" : "at"} ${game.opponent}?`}
          message="The game and everyone's availability for it are deleted. This can't be undone."
          closeHref={closeHref}
        />
      )}
    </>
  );
}
