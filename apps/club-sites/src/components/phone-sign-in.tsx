import Link from "next/link";

import { sendCode } from "@/app/auth/actions";
import { AdminForm } from "@/components/admin/admin-form";

/**
 * The phone step, shared by the team app's join flow and the admin login.
 * `next` is where to land after the code is checked; without it the flow
 * carries on to the team being joined.
 */
export function PhoneSignIn({ next }: { next?: string }) {
  return (
    <AdminForm action={sendCode} submitLabel="Text me a code">
      {next && <input type="hidden" name="next" value={next} />}

      <label className="field-label" htmlFor="phone">
        Phone number
      </label>
      <input
        id="phone"
        name="phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        required
        placeholder="(555) 123-4567"
        className="field text-center text-lg"
      />

      <p className="mt-3 text-xs text-muted">
        US numbers only for now. One text with a 6-digit code; message and data
        rates may apply. Your number stays private: teammates never see it. See
        our{" "}
        <Link href="/terms" className="underline underline-offset-4">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy Policy
        </Link>
        .
      </p>
    </AdminForm>
  );
}
