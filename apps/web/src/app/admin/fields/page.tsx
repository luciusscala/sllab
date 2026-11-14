import type { Metadata } from "next";

import { FieldForm } from "@/app/admin/fields/field-form";
import { FieldsTable } from "@/app/admin/fields/fields-table";
import { SetupNotice } from "@/components/admin/setup-notice";
import { PageHeader } from "@/components/shell/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { requireAdmin } from "@/lib/auth";
import { listFields } from "@/lib/data/admin";
import { publicUrl } from "@/lib/storage";
import { isAdminConfigured } from "@/lib/supabase-admin";

export const metadata: Metadata = { title: "Fields" };

/**
 * The reference for every dashboard page: a header with the one primary
 * action, a table of the records, and a drawer for the record named in the
 * URL. `?new` opens it empty; `?edit=<id>` opens it on that record.
 */
export default async function AdminFieldsPage(props: PageProps<"/admin/fields">) {
  await requireAdmin();
  if (!isAdminConfigured()) return <SetupNotice />;

  const params = await props.searchParams;
  const fields = await listFields();

  const creating = params.new !== undefined;
  const editing =
    typeof params.edit === "string" ? (fields.find((field) => field.id === params.edit) ?? null) : null;

  return (
    <>
      <PageHeader
        title="Fields"
        description="Where teams play and practise. Fields are shared across the platform, so one added here is available to every team."
        actions={
          <ButtonLink href="/admin/fields?new" variant="primary" size="sm">
            New field
          </ButtonLink>
        }
      />

      <div className="mt-6">
        <FieldsTable
          fields={fields.map((field) => ({
            id: field.id,
            name: field.name,
            area: field.area,
            address: field.maps_address,
            parking: field.recommended_parking,
            hasPhoto: field.picture_path !== null,
          }))}
        />
      </div>

      <Drawer
        open={creating || editing !== null}
        title={editing ? editing.name : "New field"}
        description={editing ? editing.area ?? undefined : "A venue any team can pick."}
        closeHref="/admin/fields"
      >
        <FieldForm
          key={editing?.id ?? "new"}
          field={editing}
          pictureUrl={publicUrl("field_pictures", editing?.picture_path)}
        />
      </Drawer>
    </>
  );
}
