import type { Metadata } from "next";

import { removeField, saveField } from "@/app/console/fields/actions";
import { FieldForm } from "@/components/fields/field-form";
import { FieldsTable } from "@/components/fields/fields-table";
import { PageHeader } from "@/components/shell/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { listFields } from "@/lib/data/admin";
import { toFieldRow } from "@/lib/data/rows";
import { requirePlatformAdmin } from "@/lib/platform";
import { publicUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Fields" };

const PATH = "/console/fields";

/** Every field on the platform. Teams add them from their dashboards; this is where they're corrected. */
export default async function ConsoleFieldsPage(props: PageProps<"/console/fields">) {
  await requirePlatformAdmin();

  const params = await props.searchParams;
  const fields = await listFields();
  const editing = typeof params.edit === "string" ? (fields.find((field) => field.id === params.edit) ?? null) : null;

  return (
    <>
      <PageHeader
        title="Fields"
        description="Every venue on the platform. Teams add fields from their dashboards; correct or remove them here."
        actions={
          <ButtonLink href={`${PATH}?new=1`} variant="primary" size="sm">
            New field
          </ButtonLink>
        }
      />
      <div className="mt-6">
        <FieldsTable fields={fields.map(toFieldRow)} newHref={`${PATH}?new=1`} editPrefix={`${PATH}?edit=`} />
      </div>
      <Drawer
        open={params.new !== undefined || editing !== null}
        title={editing?.name ?? "New field"}
        description={editing?.area ?? undefined}
        closeHref={PATH}
      >
        <FieldForm
          key={editing?.id ?? "new"}
          field={editing}
          pictureUrl={publicUrl("field_pictures", editing?.picture_path)}
          save={saveField}
          remove={removeField}
          closeHref={PATH}
        />
      </Drawer>
    </>
  );
}
