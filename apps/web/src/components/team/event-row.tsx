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

/** The app's per-type accent: game orange, practice blue, and so on. */
export const TYPE_COLOR: Record<EventType, string> = {
  game: "text-game",
  practice: "text-muted",
  social: "text-muted",
  tournament: "text-muted",
};

const TYPE_LABEL: Record<EventType, string> = {
  game: "Game",
  practice: "Practice",
  social: "Social",
  tournament: "Tournament",
};

export function EventRow({ item }: { item: ScheduleItem }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {item.type === "game" && item.opponentLogo && (
        <Image
          src={item.opponentLogo}
          alt=""
          width={32}
          height={32}
          className="size-8 shrink-0 rounded-md object-contain"
        />
      )}

      <div className="min-w-0 flex-1">
        <p className={`text-xs font-bold uppercase tracking-wide ${TYPE_COLOR[item.type]}`}>
          {item.type === "game" ? TYPE_LABEL.game : item.title}
        </p>
        {item.type === "game" && (
          <p className="headline truncate text-base">{item.title}</p>
        )}
        <p className="truncate text-sm text-muted">
          {item.time}
          {item.location && ` at ${item.location}`}
        </p>
      </div>

      <StatusIcon status={item.myStatus} />
    </div>
  );
}
