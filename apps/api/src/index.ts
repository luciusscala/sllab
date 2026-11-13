import { serve } from "@hono/node-server";

import { createApp } from "./app.js";
import { readEnv } from "./env.js";
import { supabaseReminderStore } from "./reminders/store.js";
import { twilioSender } from "./sms.js";
import { adminClient, supabaseTokenVerifier } from "./supabase.js";

const env = readEnv();
const admin = adminClient(env);

const app = createApp({
  verifyToken: supabaseTokenVerifier(admin),
  store: supabaseReminderStore(admin),
  sendSms: twilioSender(env.twilio),
});

const server = serve({ fetch: app.fetch, port: env.port }, ({ port }) => {
  console.log(`SLLAB API listening on :${port}`);
});

// Railway sends SIGTERM on redeploy; finish in-flight requests first.
process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
