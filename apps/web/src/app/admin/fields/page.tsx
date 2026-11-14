import type { Metadata } from "next";

import { addField } from "@/app/admin/fields/actions";
import { SetupNotice } from "@/components/admin/setup-notice";
import { FieldForm } from "@/components/fields/field-form";
import { FieldsTable } from "@/components/fields/fields-table";
import { PageHeader } from "@/components/shell/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { requireAdmin } from "@/lib/auth";
import { listFields } from "@/lib/data/admin";
import { toFieldRow } from "@/lib/data/rows";
import { isAdminConfigured } from "@/lib/supabase-admin";

export const metadata: Metadata = { title: "Fields" };

const PATH = "/admin/fields";

/**
 * Fields are shared by every team, so a team's dashboard lists them for
 * reference and can add one; corrections go through SLLAB's console.
 */
export default async function AdminFieldsPage(props: PageProps<"/admin/fields">) {
  await requireAdmin();
  if (!isAdminConfigured()) return <SetupNotice />;

  const params = await props.searchParams;
  const fields = await listFields();

  return (
    <>
      <PageHeader
        title="Fields"
        description="Where teams play and practise. Fields are shared, so one added here is available to every team. To correct one, contact SLLAB."
        actions={
          <ButtonLink href={`${PATH}?new=1`} variant="primary" size="sm">
            New field
          </ButtonLink>
        }
      />

      <div className="mt-6">
        <FieldsTable fields={fields.map(toFieldRow)} newHref={`${PATH}?new=1`} />
      </div>

      <Drawer open={params.new !== undefined} title="New field" description="A venue any team can pick." closeHref={PATH}>
        <FieldForm field={null} pictureUrl={null} save={addField} closeHref={PATH} />
      </Drawer>
    </>
  );
}
