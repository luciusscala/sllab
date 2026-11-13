import { Hono } from "hono";

import { type AuthEnv, type VerifyToken, requireUser } from "../auth.js";
import type { SendSms } from "../sms.js";
import { deliverReminder } from "./deliver.js";
import type { ReminderStore } from "./store.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Swift spells UUIDs in upper case; Postgres stores them in lower. */
const uuid = (value: unknown) => {
  const id = typeof value === "string" ? value.toLowerCase() : "";
  return UUID.test(id) ? id : null;
};

/** More than any roster; a cap so one request can't name thousands of rows. */
const MAX_RECIPIENTS = 200;

/**
 * `POST /v1/reminders` — Send Reminder, from the app and the web composer.
 *
 * Body: `{ teamId, eventId?, rosterIds, message }`. Only a captain or coach of
 * the team named may send; the response is `{ sent, failed }` or `{ error }`.
 */
export function reminderRoutes(deps: { verifyToken: VerifyToken; store: ReminderStore; sendSms: SendSms }) {
  const routes = new Hono<AuthEnv>();

  routes.post("/", requireUser(deps.verifyToken), async (c) => {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;

    const teamId = uuid(body?.teamId);
    if (!teamId) return c.json({ error: "Missing team." }, 400);

    const rosterIds = Array.isArray(body?.rosterIds) ? body.rosterIds.map(uuid) : [];
    if (rosterIds.some((id) => id === null)) return c.json({ error: "Invalid player." }, 400);
    if (rosterIds.length > MAX_RECIPIENTS) return c.json({ error: "Too many players selected." }, 400);

    const member = await deps.store.membership(c.var.userId, teamId);
    const isStaff = member?.status === "active" && (member.role === "captain" || member.role === "coach");
    if (!member || !isStaff) {
      return c.json({ error: "Only captains and coaches can send reminders." }, 403);
    }

    const outcome = await deliverReminder(deps, {
      teamId,
      eventId: uuid(body?.eventId),
      rosterIds: rosterIds as string[],
      message: typeof body?.message === "string" ? body.message : "",
      sentBy: member.personId,
    });

    return outcome.ok
      ? c.json({ sent: outcome.sent, failed: outcome.failed })
      : c.json({ error: outcome.error }, outcome.status);
  });

  return routes;
}
