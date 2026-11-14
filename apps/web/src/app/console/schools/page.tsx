import type { Metadata } from "next";

import { SchoolForm } from "@/app/console/schools/school-form";
import { SchoolsTable } from "@/app/console/schools/schools-table";
import { PageHeader } from "@/components/shell/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { listSchools } from "@/lib/data/console";
import { requirePlatformAdmin } from "@/lib/platform";

export const metadata: Metadata = { title: "Schools" };

export default async function ConsoleSchoolsPage(props: PageProps<"/console/schools">) {
  await requirePlatformAdmin();

  const params = await props.searchParams;
  const schools = await listSchools();
  const editing = typeof params.edit === "string" ? (schools.find((row) => row.id === params.edit) ?? null) : null;

  return (
    <>
      <PageHeader
        title="Schools"
        description="The universities whose club teams are on the platform."
        actions={
          <ButtonLink href="/console/schools?new=1" variant="primary" size="sm">
            New school
          </ButtonLink>
        }
      />
      <div className="mt-6">
        <SchoolsTable schools={schools} />
      </div>
      <Drawer open={params.new !== undefined || editing !== null} title={editing?.name ?? "New school"} closeHref="/console/schools">
        <SchoolForm key={editing?.id ?? "new"} school={editing} />
      </Drawer>
    </>
  );
}
