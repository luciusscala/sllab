import "server-only";

const origin = (() => {
  try {
    return process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : null;
  } catch {
    return null;
  }
})();

/** The browser-loadable URL of an object in a public bucket, or null. */
export const publicUrl = (bucket: string, path: string | null | undefined) =>
  origin && path ? `${origin}/storage/v1/object/public/${bucket}/${path}` : null;
