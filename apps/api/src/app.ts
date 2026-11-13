import { Hono } from "hono";

import type { VerifyToken } from "./auth.js";
import { reminderRoutes } from "./reminders/route.js";
import type { ReminderStore } from "./reminders/store.js";
import type { SendSms } from "./sms.js";

/** Everything the routes reach outside the process, passed in so tests can fake it. */
export type Deps = {
  verifyToken: VerifyToken;
  store: ReminderStore;
  sendSms: SendSms;
};

/**
 * The API. Routes are versioned from the first one, because phones run old
 * builds for months: a breaking change is a new `/v2` route, never an edit.
 */
export function createApp(deps: Deps) {
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));
  app.route("/v1/reminders", reminderRoutes(deps));

  app.notFound((c) => c.json({ error: "Not found." }, 404));
  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: "Something went wrong. Please try again." }, 500);
  });

  return app;
}
