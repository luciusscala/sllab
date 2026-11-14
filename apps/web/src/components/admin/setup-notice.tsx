/** Shown when the server has no secret key, instead of a bare 500. */
export function SetupNotice() {
  return (
    <div className="card max-w-xl p-5">
      <h1 className="headline text-xl">The dashboard isn&rsquo;t configured</h1>
      <p className="mt-2 text-sm text-muted">
        Set <code>SUPABASE_SECRET_KEY</code> in <code>.env.local</code> and restart the server. The key is under
        Project Settings &rarr; API Keys and must stay server-side: it bypasses row-level security.
      </p>
    </div>
  );
}
