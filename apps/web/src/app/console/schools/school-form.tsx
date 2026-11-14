"use client";

import { removeSchool, saveSchool } from "@/app/console/schools/actions";
import { FormField, Input } from "@/components/ui/field";
import { RemoveForm } from "@/components/ui/remove-form";
import { ResourceForm } from "@/components/ui/resource-form";
import type { ConsoleSchool } from "@/lib/data/console";

const CLOSE = "/console/schools";

export function SchoolForm({ school }: { school: ConsoleSchool | null }) {
  return (
    <>
      <ResourceForm action={saveSchool} submitLabel={school ? "Save changes" : "Add school"} closeHref={CLOSE}>
        {school && <input type="hidden" name="id" value={school.id} />}
        <FormField label="Name" htmlFor="name" hint="The full name: “University of California, San Diego”.">
          <Input id="name" name="name" required defaultValue={school?.name ?? ""} />
        </FormField>
      </ResourceForm>

      {school && (
        <RemoveForm
          action={removeSchool}
          hidden={{ id: school.id }}
          label="Remove school"
          title={`Remove ${school.name}?`}
          message="Only a school with no teams can be removed."
          note={school.teams ? `${school.teams} ${school.teams === 1 ? "team" : "teams"} still belong here.` : undefined}
          closeHref={CLOSE}
        />
      )}
    </>
  );
}
