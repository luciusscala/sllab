import type { Metadata } from "next";

import { createGame } from "@/app/(team)/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { GameFields } from "@/components/team/event-fields";
import { FormCard } from "@/components/team/form-card";
import { listFields, listOpponents } from "@/lib/data/admin";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Add Game" };

export default async function NewGamePage() {
  const membership = await requireStaff();
  const [fields, teams] = await Promise.all([
    listFields(),
    listOpponents(membership.teamId),
  ]);

  return (
    <FormCard title="Add Game" cancelHref={"/"}>
      <AdminForm action={createGame} submitLabel="Add">
        <GameFields fields={fields} teams={teams} />
      </AdminForm>
    </FormCard>
  );
}
