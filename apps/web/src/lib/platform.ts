import { redirect } from "next/navigation";
import { cache } from "react";

import "server-only";

import { getViewer } from "@/lib/auth";
import { isAuthConfigured, supabaseUser } from "@/lib/supabase-server";

/**
 * Platform roles: who may use the console. Separate from team memberships,
 * which say what someone is on a team; this says what they are to SLLAB.
 * Rows come from `platform_roles`, which people can read for themselves.
 */
export type PlatformRole = "admin" | "league_director";

export const getPlatformRoles = cache(async (): Promise<PlatformRole[]> => {
  const { userId } = await getViewer();
  if (!userId || !isAuthConfigured()) return [];

  const supabase = await supabaseUser();
  const { data, error } = await supabase.from("platform_roles").select("role");
  if (error) {
    // Before the migration that adds the table has run, nobody has a role.
    if (error.code === "42P01" || error.code === "PGRST205") return [];
    throw new Error(`Failed to load platform roles: ${error.message}`);
  }
  return (data ?? []).map((row) => row.role as PlatformRole);
});

export const isPlatformAdmin = async () => (await getPlatformRoles()).includes("admin");

/** Anyone with a platform role: the console opens, and each page decides what they may do. */
export const canUseConsole = async () => (await getPlatformRoles()).length > 0;

/** For console pages and actions only SLLAB may use. The overview is open to every console user, so it's the safe place to send anyone else. */
export async function requirePlatformAdmin() {
  if (!(await isPlatformAdmin())) redirect("/console");
}
