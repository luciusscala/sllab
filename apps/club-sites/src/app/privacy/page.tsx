import type { Metadata } from "next";

import { type PolicySection, PolicyPage } from "@/components/policy-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What the UC San Diego Men's Club Soccer app collects, why, and who can see it.",
};

/** Bumped whenever the policy's substance changes, so the page says when. */
const EFFECTIVE = "September 16, 2026";

/**
 * The app is a team tool for a club of about 25 players, so the policy is
 * kept to what it actually does: nothing here is boilerplate about data the
 * app never touches. Written as prose so whoever holds the office can edit it.
 */
const SECTIONS: PolicySection[] = [
  {
    heading: "What this covers",
    paragraphs: [
      "This policy covers the UC San Diego Men's Club Soccer iOS app, a scheduling and availability tool used by the club's players and captains. It is run by the club, not by UC San Diego.",
    ],
  },
  {
    heading: "What the app collects",
    paragraphs: [
      "The only thing the app asks you for is your phone number, when you first open it, and it is optional: skip it and everything but the SMS reminders works the same.",
      "Beyond that, the app records what you do in it: your availability responses (\"Going\" or \"Not Going\") for each practice, game and event, and your hometown if you choose to add it in Settings.",
      "Your name, squad number, position and class year are not collected by the app. They are already in the club's roster, which captains manage through this website, and the app simply shows them.",
      "The app does not collect your location, contacts, photos, or anything else from your device, and it does not use analytics, advertising or tracking of any kind.",
    ],
  },
  {
    heading: "How it is used",
    paragraphs: [
      "To show you the team's schedule and let you mark whether you can make it.",
      "To show captains and teammates who is coming to each event.",
      "To send you SMS reminders about upcoming practices and games. Message and data rates may apply. Reply STOP to any message to opt out.",
    ],
  },
  {
    heading: "Who can see it",
    paragraphs: [
      "Everyone on the team can see your name, number, hometown and availability responses.",
      "Only captains can see your phone number, and only for sending team reminders.",
      "Your name, number, position, class and hometown also appear on the public roster page of this website, as they do for every player.",
      "The club never sells your information or shares it with anyone for marketing.",
    ],
  },
  {
    heading: "Where it is stored",
    paragraphs: [
      "Team data is stored with Supabase, a hosted database provider. SMS reminders are delivered through Twilio, which receives your phone number and the message text in order to send it. Both are used only to run the app.",
      "The app keeps your team and roster selection on your device so you do not have to choose them again. \"Leave Team\" in Settings clears it.",
    ],
  },
  {
    heading: "Your choices",
    paragraphs: [
      "You can change your hometown at any time in Settings, and on the web version you can add, change or remove your phone number there too. Removing it stops the SMS reminders.",
      "To update or remove your phone number in the iOS app, or to have your information deleted entirely, email the club at the address below and it will be handled within a few days.",
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
