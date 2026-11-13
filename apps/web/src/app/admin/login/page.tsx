import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PhoneSignIn } from "@/components/phone-sign-in";
import { getViewer, isAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin login" };

/**
 * The same phone sign-in as the team app. The dashboard opens for captains
 * and coaches of the team they're viewing; anyone else who signs in is told so.
 */
export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  const { userId } = await getViewer();

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-sm rounded-lg bg-background p-6 text-foreground">
        <h1 className="headline text-2xl">Admin</h1>
        {userId ? (
          <p className="mt-3 text-sm text-muted">
            This sign-in isn&rsquo;t a captain or coach of your team. Ask a captain to add
            your number as staff, then sign in again. On more than one team? Switch
            team in Settings first.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">For your team&rsquo;s captains and coaches.</p>
            <div className="mt-4">
              <PhoneSignIn next="/admin" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
