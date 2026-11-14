"use client";

import { FormField, Input, Select } from "@/components/ui/field";
import { ResourceForm } from "@/components/ui/resource-form";
import type { FormState } from "@/lib/forms";

type Action = (state: FormState, data: FormData) => Promise<FormState>;
type Option = { value: string; label: string };

export type TeamValues = {
  id: string;
  name: string;
  data_alias: string | null;
  org_id: string | null;
  sport_id: string | null;
  division: string | null;
};

export const DIVISIONS: Option[] = [
  { value: "mens", label: "Men's" },
  { value: "womens", label: "Women's" },
  { value: "mixed", label: "Mixed" },
];

/**
 * A team's details. A team's dashboard adds opponents with the name, the
 * standings name and a crest; the console passes `schools` and `sports` to
 * place a team in the platform too.
 */
export function TeamForm({
  team,
  logoUrl,
  save,
  closeHref,
  schools,
  sports,
}: {
  team: TeamValues | null;
  logoUrl: string | null;
  save: Action;
  closeHref: string;
  schools?: Option[];
  sports?: Option[];
}) {
  return (
    <ResourceForm action={save} submitLabel={team ? "Save changes" : "Add team"} closeHref={closeHref}>
      {team && <input type="hidden" name="id" value={team.id} />}

      <FormField label="Name" htmlFor="name">
        <Input id="name" name="name" required defaultValue={team?.name ?? ""} placeholder="UC Santa Barbara" />
      </FormField>

      <FormField
        label="Standings name"
        htmlFor="data_alias"
        hint="Only when the league's standings spell the name differently."
      >
        <Input id="data_alias" name="data_alias" defaultValue={team?.data_alias ?? ""} placeholder="UCSB" />
      </FormField>

      {schools && sports && (
        <>
          <FormField label="School" htmlFor="org_id">
            <Select id="org_id" name="org_id" options={schools} emptyLabel="None" defaultValue={team?.org_id ?? ""} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Sport" htmlFor="sport_id">
              <Select id="sport_id" name="sport_id" options={sports} emptyLabel="None" defaultValue={team?.sport_id ?? ""} />
            </FormField>
            <FormField label="Division" htmlFor="division">
              <Select id="division" name="division" options={DIVISIONS} emptyLabel="None" defaultValue={team?.division ?? ""} />
            </FormField>
          </div>
        </>
      )}

      <FormField label="Crest" htmlFor="logo" hint={logoUrl ? "Choosing a new file replaces the current crest." : undefined}>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- storage URL, sizes vary
          <img src={logoUrl} alt="" className="mb-2 size-16 rounded-md border border-border bg-surface-raised object-contain p-1" />
        )}
        <Input id="logo" name="logo" type="file" accept="image/*" />
      </FormField>
    </ResourceForm>
  );
}
