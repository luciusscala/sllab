"use server";

import { redirect } from "next/navigation";

import { forgetTeam } from "@/lib/auth";
import { PENDING, clearPending, readPending, setPending, sitePath } from "@/lib/pending";
import { supabaseUser } from "@/lib/supabase-server";
import { teamRedirect } from "@/lib/team-path";

/**
 * The account: signing in with a phone number, as a guest, and out again.
 * Supabase Auth texts the code and checks it. Which team the person is on
 * comes afterwards, in `@/app/(team)/actions`.
 */

export type ActionState = { error?: string } | null;

const text = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

/** US numbers at launch: ten digits, or eleven with the leading 1. */
function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/** Text a code. `next` is an optional path to land on afterwards. */
export async function sendCode(_state: ActionState, data: FormData): Promise<ActionState> {
  const phone = toE164(text(data, "phone") ?? "");
  if (!phone) return { error: "Enter a 10-digit US phone number." };

  const { error } = await (await supabaseUser()).auth.signInWithOtp({ phone });
  if (error) return { error: error.message };

  await setPending(PENDING.phone, phone);
  const next = sitePath(text(data, "next"));
  if (next) await setPending(PENDING.next, next);
  return teamRedirect("/join/code");
}

/** Check the code. On success the account exists and is signed in. */
export async function verifyCode(_state: ActionState, data: FormData): Promise<ActionState> {
  const phone = await readPending(PENDING.phone);
  if (!phone) return teamRedirect("/join/phone");

  const token = (text(data, "code") ?? "").replace(/\D/g, "");
  if (token.length < 6) return { error: "Enter the 6-digit code from the text." };

  const { error } = await (await supabaseUser()).auth.verifyOtp({ phone, token, type: "sms" });
  if (error) return { error: "That code didn't match. Check the text and try again." };

  return afterSignIn();
}

/** The guest path: a session with nothing attached to it. */
export async function continueAsGuest(): Promise<ActionState> {
  const { error } = await (await supabaseUser()).auth.signInAnonymously();
  if (error) return { error: error.message };

  return afterSignIn();
}

/**
 * A fresh session goes where the flow was asked to send it (the admin
 * login), or on to join the team whose code was typed, or to the teams the
 * account is already on.
 */
async function afterSignIn(): Promise<never> {
  const next = sitePath(await readPending(PENDING.next));
  if (next) {
    await clearPending();
    redirect(next);
  }
  if (await readPending(PENDING.code)) return teamRedirect("/join/finish");
  return teamRedirect("/join");
}

export async function signOut() {
  await (await supabaseUser()).auth.signOut();
  await clearPending();
  await forgetTeam();
  return teamRedirect("/join");
}

/**
 * The roster keeps the person's name on the seasons they played; their
 * number, sign-in and memberships go. Done in the database so the app and
 * the site delete the same way.
 */
export async function deleteAccount(): Promise<ActionState> {
  const supabase = await supabaseUser();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  await forgetTeam();
  return teamRedirect("/join");
}
