import type { Metadata } from "next";

import { type PolicySection, PolicyPage } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms for the UC San Diego Men's Club Soccer team app and its SMS reminders.",
};

/** Bumped whenever the terms' substance changes, so the page says when. */
const EFFECTIVE = "October 3, 2026";

/**
 * Mostly the SMS program's terms, which carriers require to be published and
 * linked from wherever a number is collected (the team app's phone step).
 */
const SECTIONS: PolicySection[] = [
  {
    heading: "The team app",
    paragraphs: [
      "The UC San Diego Men's Club Soccer team app (on iOS and at app.ucsdmcs.com) is a scheduling and availability tool for the club's players and captains. It is run by the club, not by UC San Diego.",
      "It is for members of the club's roster. Join only as yourself, and respond to events honestly so captains can plan around who is coming.",
    ],
  },
  {
    heading: "SMS reminders",
    paragraphs: [
      "UCSD Men's Club Soccer Reminders are text messages about upcoming practices, games, tournaments and team events, sent by team captains to roster members who have opted in.",
      "You opt in by entering your phone number in the team app and ticking the box to receive text reminders. It is optional, and everything else in the app works without it.",
      "Message frequency varies with the schedule, usually a few messages a week during the season.",
      "Message and data rates may apply. The club never charges for messages.",
    ],
  },
  {
    heading: "Opting out and getting help",
    paragraphs: [
      "Reply STOP to any message to stop receiving reminders. You will get one message confirming it, and no more after that. Reply START to opt back in.",
      "You can also remove your phone number in the web app's Settings at any time.",
      "Reply HELP to any message for help, or email the club at the address below.",
      "Carriers are not liable for delayed or undelivered messages.",
    ],
  },
  {
    heading: "Privacy",
    paragraphs: [
      "Your phone number is used only to send team reminders, and is never sold or shared for marketing. See the Privacy Policy at ucsdmcs.com/privacy for everything the app collects and who can see it.",
    ],
  },
  {
    heading: "Changes",
    paragraphs: [
      "If these terms change, the new version will be posted here with an updated date.",
    ],
  },
];

export default function TermsPage() {
  return (
    <PolicyPage
      title="Terms of Service"
      effective={EFFECTIVE}
      sections={SECTIONS}
      contactLabel="Questions, or help with reminders:"
    />
  );
}
