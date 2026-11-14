"use client";

import { createSeason, removeSeason, setCurrentSeason } from "@/app/console/seasons/actions";
import { Checkbox, FormField, Input } from "@/components/ui/field";
import { RemoveForm } from "@/components/ui/remove-form";
import { ResourceForm } from "@/components/ui/resource-form";
import type { ConsoleSeason } from "@/lib/data/console";

const CLOSE = "/console/seasons";

/** A new season is just its year. An existing one can be made current or, if empty, removed. */
export function SeasonForm({ season }: { season: ConsoleSeason | null }) {
  if (!season) {
    return (
      <ResourceForm action={createSeason} submitLabel="Add season" closeHref={CLOSE}>
        <FormField label="Starts in" htmlFor="year" hint="Seasons follow the academic year: 2027 is 2027–28.">
          <Input id="year" name="year" type="number" min="2000" max="2100" required placeholder={String(new Date().getFullYear() + 1)} />
        </FormField>
        <Checkbox name="is_current" label="Make it the current season" />
      </ResourceForm>
    );
  }

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="card p-3">
          <dt className="section-label">Events</dt>
          <dd className="mt-1 tabular-nums">{season.events}</dd>
        </div>
        <div className="card p-3">
          <dt className="section-label">Roster spots</dt>
          <dd className="mt-1 tabular-nums">{season.rosterRows}</dd>
        </div>
      </dl>

      {!season.isCurrent && (
        <ResourceForm
          action={setCurrentSeason}
          submitLabel="Make current"
          variant="secondary"
          closeHref={CLOSE}
          className="mt-6"
          confirm={{
            title: `Make ${season.year} the current season?`,
            message: "Every team's app and dashboard open on the current season, and players are asked whether they're playing.",
          }}
        >
          <input type="hidden" name="id" value={season.id} />
          <p className="text-sm text-muted">Switches every team to this season.</p>
        </ResourceForm>
      )}

      {season.events === 0 && season.rosterRows === 0 && (
        <RemoveForm
          action={removeSeason}
          hidden={{ id: season.id }}
          label="Remove season"
          title={`Remove the ${season.year} season?`}
          message="Nothing belongs to it yet, so nothing else is affected."
          closeHref={CLOSE}
        />
      )}
    </>
  );
}
