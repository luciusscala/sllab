import type { Metadata } from "next";

import { Email, PolicyLink, type PolicySection, PolicyPage, PolicySections } from "@/components/policy";

export const metadata: Metadata = {
  title: "Fixture Terms of Service | sllab",
  description: "Terms for Fixture by SLLAB and its SMS reminders.",
};

/** Bumped whenever the terms' substance changes, so the page says when. */
const EFFECTIVE = "November 13, 2026";

/**
 * Mostly the SMS program's terms, which carriers require to be published and
 * linked from wherever a number is collected (the app's phone step).
 */
const SECTIONS: PolicySection[] = [
  {
    heading: "The app",
    paragraphs: [
      "Fixture by SLLAB, on iOS and at app.sllab.io, is a scheduling and availability tool for club sports teams' players, captains and coaches. It is made and run by SLLAB.",
      "Players, captains and coaches sign in with their own phone number; guests may follow a team's schedule with the team code alone. Join only as yourself, and respond to events honestly so captains can plan around who is coming. Captains review everyone who joins with the code and may remove anyone who shouldn't be there.",
    ],
  },
  {
    heading: "SMS reminders",
    paragraphs: [
      "Fixture reminders are text messages about upcoming practices, games, tournaments and team events, sent by a team's captains and coaches to roster members who have opted in.",
      "Signing in sends you a one-time code by text. Reminders are separate: you opt in to those by ticking the box when you join, and everything else in the app works without them.",
      "Message frequency varies with the schedule, usually a few messages a week during the season.",
      "Message and data rates may apply. SLLAB never charges for messages.",
    ],
  },
  {
    heading: "Opting out and getting help",
    paragraphs: [
      "Reply STOP to any message to stop receiving reminders. You will get one message confirming it, and no more after that. Reply START to opt back in.",
      "Deleting your account in Settings removes your phone number entirely.",
      <>
        Reply HELP to any message for help, or email <Email />.
      </>,
      "Carriers are not liable for delayed or undelivered messages.",
    ],
  },
  {
    heading: "Privacy",
    paragraphs: [
      <>
        Your phone number is used only to sign you in and send team reminders, and is never sold or shared
        for marketing. The <PolicyLink href="/fixture/privacy">privacy policy</PolicyLink> covers
        everything the app collects and who can see it.
      </>,
    ],
  },
  {
    heading: "Changes",
    paragraphs: ["If these terms change, the new version will be posted here with an updated date."],
  },
];

export default function TermsPage() {
  return (
    <PolicyPage title="Terms of Service" effective={EFFECTIVE}>
      <PolicySections sections={SECTIONS} />
    </PolicyPage>
  );
}
