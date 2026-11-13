/**
 * Every setting the server needs, read once at start. A missing one stops the
 * deploy with its name, rather than failing the first request that needs it.
 */
export type Env = {
  port: number;
  supabaseUrl: string;
  supabaseSecretKey: string;
  twilio: {
    accountSid: string;
    authToken: string;
    messagingServiceSid: string;
  };
};

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const missing: string[] = [];
  const required = (name: string) => {
    const value = source[name]?.trim();
    if (!value) missing.push(name);
    return value ?? "";
  };

  const env: Env = {
    port: Number(source.PORT) || 8787,
    supabaseUrl: required("SUPABASE_URL"),
    supabaseSecretKey: required("SUPABASE_SECRET_KEY"),
    twilio: {
      accountSid: required("TWILIO_ACCOUNT_SID"),
      authToken: required("TWILIO_AUTH_TOKEN"),
      messagingServiceSid: required("TWILIO_MESSAGING_SERVICE_SID"),
    },
  };

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
  return env;
}
