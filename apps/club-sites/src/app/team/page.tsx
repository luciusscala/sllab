import type { Metadata } from "next";
import Link from "next/link";

import { continueSeason } from "@/app/team/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { type ScheduleGroup, EventList } from "@/components/team/event-list";
import { canRespond, isStaff, requireMember } from "@/lib/auth";
import {
  getAvailability,
  getCurrentSeason,
  getUpcomingEvents,
  groupByDay,
} from "@/lib/data/team";
import { formatTime } from "@/lib/format";
import { teamBase } from "@/lib/team-path";

export const metadata: Metadata = { title: "Team Schedule" };

/** The app's "+" menu: three ways to add to the schedule, staff only. */
const ADD_LINKS = [
  { path: "/new/practice", label: "Add Practice" },
  { path: "/new/practices", label: "Add Repeating Practices" },
  { path: "/new/game", label: "Add Game" },
];

export default async function TeamSchedulePage(props: PageProps<"/team">) {
  const membership = await requireMember();
  const base = await teamBase();
  const { welcome } = await props.searchParams;

  const season = await getCurrentSeason();
  const events = season ? await getUpcomingEvents(season.id, membership.teamId) : [];
  const availability = await getAvailability(events.map((event) => event.id));

  const groups: ScheduleGroup[] = groupByDay(events).map((group) => ({
    key: group.key,
    heading: group.heading,
    items: group.events.map((event) => ({
      id: event.id,
      type: event.type,
      title: event.title,
      time: formatTime(event.date),
      location: event.location,
      opponentLogo: event.opponentLogo,
      myStatus:
        availability
          .get(event.id)
          ?.find((response) => response.rosterId === membership.rosterId)?.status ??
        null,
    })),
  }));

  // A player from an earlier season, not yet on this one's roster.
  const askAboutSeason =
    season !== null &&
    membership.rosterId === null &&
    membership.status === "active" &&
    (membership.role === "player" || membership.role === "captain");

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="rounded-xl bg-background p-4 text-foreground sm:p-6">
        {welcome === "back" && (
          <p className="mb-4 rounded-lg bg-surface px-4 py-3 text-sm">
            Welcome back, {membership.personName.split(" ")[0]}. Your roster spot is linked to this sign-in.
          </p>
        )}

        {askAboutSeason && (
          <div className="mb-4 rounded-lg bg-surface px-4 py-3 text-sm">
            <p className="font-medium">Are you playing the {season.year} season?</p>
            <p className="mt-1 text-muted">
              Say yes and you&rsquo;re back on the roster with last season&rsquo;s details.
              Otherwise you can keep following the schedule.
            </p>
            <AdminForm action={continueSeason} submitLabel="Yes, I'm playing" className="mt-1" />
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <h1 className="headline text-xl sm:text-2xl">Schedule</h1>

          {isStaff(membership) && (
            // A native disclosure: no script, closes on navigation.
            <details className="relative">
              <summary
                aria-label="Add to schedule"
                className="flex size-9 cursor-pointer list-none items-center justify-center rounded-full bg-navy text-xl leading-none text-yellow transition hover:opacity-90 [&::-webkit-details-marker]:hidden"
              >
                +
              </summary>
              <ul className="absolute right-0 z-10 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
                {ADD_LINKS.map((link) => (
                  <li key={link.path}>
                    <Link
                      href={`${base}${link.path}`}
                      className="block px-4 py-2.5 text-sm transition hover:bg-surface"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        {groups.length === 0 ? (
          <div className="py-16 text-center">
            <p className="headline text-lg">No Upcoming Events</p>
            <p className="mt-1 text-sm text-muted">
              Check back later for new practices and games.
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <EventList
              groups={groups}
              canRespond={canRespond(membership)}
              staff={isStaff(membership)}
              base={base}
            />
          </div>
        )}
      </div>
    </div>
  );
}
