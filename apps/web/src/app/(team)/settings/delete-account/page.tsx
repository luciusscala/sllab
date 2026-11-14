import type { Metadata } from "next";
import Link from "next/link";

import { deleteAccount } from "@/app/auth/actions";
import { ActionForm } from "@/components/action-form";
import { requireMember } from "@/lib/auth";

export const metadata: Metadata = { title: "Delete Account" };

/**
 * One page below Settings, so the irreversible action isn't a button among
 * ordinary ones. Says what goes and what stays, then asks once more.
 */
export default async function DeleteAccountPage() {
  await requireMember();

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="card mx-auto max-w-lg p-4 text-foreground sm:p-6">
        <Link href="/settings" className="text-sm text-accent underline underline-offset-4">
          &larr; Settings
        </Link>
        <h1 className="headline mt-3 text-xl sm:text-2xl">Delete Account</h1>

        <div className="mt-4 space-y-3 text-sm">
          <p>
            Your phone number and sign-in are removed from every team, and every device is
            signed out.
          </p>
          <p className="text-muted">
            Your name stays on the rosters of the seasons you played, and your past responses
            stay with them.
          </p>
          <p className="font-semibold">This can&rsquo;t be undone.</p>
        </div>

        <ActionForm
          action={deleteAccount}
          submitLabel="Delete Account"
          destructive
          confirm={{
            title: "Delete your account?",
            message: "Your sign-in and phone number are removed. This cannot be undone.",
          }}
          className="mt-6"
        />
      </div>
    </div>
  );
}
