import { cookies } from "next/headers";

import "server-only";

/**
 * What the sign-in flow carries from one step to the next: the team code
 * from the first screen, the number a code was texted to, and where to land
 * afterwards. Short-lived httpOnly cookies, cleared when the flow completes.
 */
export const PENDING = {
  code: "join_code",
  phone: "join_phone",
  next: "join_next",
} as const;

type Pending = (typeof PENDING)[keyof typeof PENDING];

export async function setPending(name: Pending, value: string) {
  (await cookies()).set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60,
  });
}

export async function readPending(name: Pending) {
  return (await cookies()).get(name)?.value ?? null;
}

export async function clearPending() {
  const store = await cookies();
  for (const name of Object.values(PENDING)) {
    store.delete({ name, path: "/" });
  }
}

/** Only a path on this site, so a link can't send someone elsewhere after sign-in. */
export const sitePath = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : null;
