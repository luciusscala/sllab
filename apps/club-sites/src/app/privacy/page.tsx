import type { Metadata } from "next";

import { type PolicySection, PolicyPage } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What the UC San Diego Men's Club Soccer app collects, why, and who can see it.",
};

/** Bumped whenever the policy's substance changes, so the page says when. */
const EFFECTIVE = "November 12, 2026";

/**
 * The app is a team tool for a club of about 25 players, so the policy is
 * kept to what it actually does: nothing here is boilerplate about data the
 * app never touches. Written as prose so whoever holds the office can edit it.
 */
const SECTIONS: PolicySection[] = [
  {
    heading: "What this covers",
    paragraphs: [
      "This policy covers the UC San Diego Men's Club Soccer team app (Fixture, on iOS and at app.ucsdmcs.com), a scheduling and availability tool used by the club's players, captains and coaches. It is run by the club, not by UC San Diego.",
    ],
  },
  {
    heading: "What the app collects",
    paragraphs: [
      "Players, captains and coaches sign in with their phone number: the app texts a code to it, and that number becomes your account. Guests can follow the schedule with only the team code and no phone number; they can't respond to events.",
      "If you are new to the team the app asks for your name, position, class year and squad number, which is what the roster shows for every player. If you were already on the roster, your phone number links you to your existing spot.",
      "Beyond that, the app records what you do in it: your availability responses (\"Going\" or \"Not Going\") for each practice, game and event, and your hometown if you choose to add it in Settings. It also records when you join, leave or are marked away from a team, so attendance counts only the time you were on it.",
      "The app does not collect your location, contacts, photos, or anything else from your device, and it does not use analytics, advertising or tracking of any kind.",
    ],
  },
  {
    heading: "How it is used",
    paragraphs: [
      "To show you the team's schedule and let you mark whether you can make it.",
      "To show captains and teammates who is coming to each event.",
      "To text you a sign-in code when you sign in.",
      "To send you SMS reminders about upcoming practices and games, if you ticked the box to receive them. Message and data rates may apply. Reply STOP to any message to opt out.",
    ],
  },
  {
    heading: "Who can see it",
    paragraphs: [
      "Everyone on the team, guests included, can see your name, number, hometown and availability responses.",
      "Nobody in the app sees your phone number. It is stored separately from the roster, and the server uses it only to send a reminder a captain or coach writes; they choose who to text, never see the number, and a team can send at most ten reminders a day.",
      "Your name, number, position, class and hometown also appear on the public roster page of this website, as they do for every player.",
      "The club never sells your information or shares it with anyone for marketing.",
    ],
  },
  {
    heading: "Where it is stored",
    paragraphs: [
      "Team data is stored with Supabase, a hosted database provider. SMS reminders are delivered through Twilio, which receives your phone number and the message text in order to send it. Both are used only to run the app.",
      "The app keeps you signed in on your device. \"Sign out\" in Settings ends that.",
    ],
  },
  {
    heading: "Your choices",
    paragraphs: [
      "You can change your hometown at any time in Settings. \"Leave Team\" takes you off the team's lists; you can rejoin with the team code.",
      "\"Delete Account\" in Settings removes your sign-in and phone number from every team at once. Your name stays on the rosters of the seasons you played, as a matter of record, as it does for players from before the app. To have that removed too, email the club at the address below.",
      "The app is intended for club members, who are university students and adults. It is not directed at children under 13.",
    ],
  },
  {
    heading: "Changes",
    paragraphs: [
      "If this policy changes, the new version will be posted here with an updated date.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <PolicyPage
      title="Privacy Policy"
      effective={EFFECTIVE}
      sections={SECTIONS}
      contactLabel="Questions or requests about your data:"
    />
  );
}
