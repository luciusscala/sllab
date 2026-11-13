import type { Metadata } from "next";

import { createPractice } from "@/app/(team)/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { PracticeFields } from "@/components/team/event-fields";
import { FormCard } from "@/components/team/form-card";
import { listFields } from "@/lib/data/admin";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Add Practice" };

export default async function NewPracticePage() {
  await requireStaff();
  const fields = await listFields();

  return (
    <FormCard title="Add Practice" cancelHref={"/"}>
      <AdminForm action={createPractice} submitLabel="Add">
        <PracticeFields fields={fields} />
      </AdminForm>
    </FormCard>
  );
}
