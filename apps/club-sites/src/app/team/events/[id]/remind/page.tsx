import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { FormCard } from "@/components/team/form-card";
import { type Recipient, MessageComposer } from "@/components/team/message-composer";
import { requireStaff } from "@/lib/auth";
import {
  getActiveRoster,
  getAvailability,
  getCurrentSeason,
  getEvent,
} from "@/lib/data/team";
import { formatReminderDate } from "@/lib/format";
import { textablePersonIds } from "@/lib/reminders";
import { teamBase } from "@/lib/team-path";

export const metadata: Metadata = { title: "Send Reminder" };

/**
 * The site's own origin, for the link in the message. Taken from the request
 * rather than configured, so a preview deploy links to itself. Unlike the
 * app's `ucsdmcs://` scheme this is a real link Messages will make tappable,
 * landing the player on the event with the Going button in front of them.
 */
async function siteOrigin() {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function RemindPage(props: PageProps<"/team/events/[id]/remind">) {
  const membership = await requireStaff();
  const { id } = await props.params;

  const [event, season, origin, base] = await Promise.all([
    getEvent(id, membership.teamId),
    getCurrentSeason(),
    siteOrigin(),
    teamBase(),
  ]);
  if (!event) notFound();

  const [roster, availability] = await Promise.all([
    season ? getActiveRoster(season.id, membership.teamId) : [],
    getAvailability([event.id]),
  ]);
  const [textable] = await Promise.all([
    textablePersonIds(membership.teamId, roster.map((member) => member.personId)),
  ]);
  const statusOf = new Map(
    (availability.get(event.id) ?? []).map((response) => [response.rosterId, response.status]),
  );

  const recipients: Recipient[] = roster.map((member) => ({
    rosterId: member.rosterId,
    name: member.name,
    number: member.number,
    hasPhone: textable.has(member.personId),
    status: statusOf.get(member.rosterId) ?? null,
  }));

  const back = `${base}/events/${event.id}`;
  const template = `Reminder: ${event.title} on ${formatReminderDate(event.date)}. Please respond!\n${origin}${back}`;

  return (
    <FormCard title="Send Reminder" cancelHref={back}>
      <MessageComposer eventId={event.id} recipients={recipients} template={template} backHref={back} />
    </FormCard>
  );
}
