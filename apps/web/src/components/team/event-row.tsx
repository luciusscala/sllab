import Image from "next/image";

import { StatusIcon } from "@/components/team/status-icon";
import type { EventType } from "@/lib/data/events";
import type { AvailabilityStatus } from "@/lib/data/availability";

/** What one schedule row needs, already formatted — serialisable so the
 *  selectable list can be a client component. */
export type ScheduleItem = {
  id: string;
  type: EventType;
  title: string;
  /** "7 PM", already in the team's zone. */
  time: string;
  location: string | null;
  opponentLogo: string | null;
  myStatus: AvailabilityStatus | null;
};

/**
 * The colour that marks an event type, or none. Practices are most of the
 * schedule, so they get no colour; the exceptions do. Same values as the
 * iOS app's `AppTheme.eventColor`.
 */
export const TYPE_COLOR: Partial<Record<EventType, string>> = {
  game: "text-game",
  social: "text-social",
  tournament: "text-tournament",
};

export const TYPE_LABEL: Record<EventType, string> = {
  game: "Game",
  practice: "Practice",
  social: "Social",
  tournament: "Tournament",
};

/**
 * One event in the schedule. Two lines: what it is, in white, and when and
 * where, in grey. Games, socials and tournaments carry a small coloured
 * label above the title; practices don't.
 */
export function EventRow({ item }: { item: ScheduleItem }) {
  const typeColor = TYPE_COLOR[item.type];

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {item.type === "game" && item.opponentLogo && (
        <Image
          src={item.opponentLogo}
          alt=""
          width={36}
          height={36}
          className="size-9 shrink-0 rounded-md object-contain"
        />
      )}

      <div className="min-w-0 flex-1">
        {typeColor && (
          <p className={`section-label ${typeColor}`}>{TYPE_LABEL[item.type]}</p>
        )}
        <p className="row-title truncate">{item.title}</p>
        <p className="meta truncate">
          {item.time}
          {item.location && ` · ${item.location}`}
        </p>
      </div>

      <StatusIcon status={item.myStatus} />
    </div>
  );
}
