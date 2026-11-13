import type { Metadata } from "next";

import { Email, PolicyLink, PolicyPage } from "@/components/policy";

export const metadata: Metadata = {
  title: "Fixture Support | sllab",
  description: "Help with Fixture by SLLAB: joining a team, signing in, availability, reminders and members.",
};

/**
 * The App Store links here from the app's product page, so it opens with the
 * contact address and then answers the questions that would have been sent
 * to it.
 */
const STEPS = [
  "Ask a captain for your team's code.",
  "Enter it, then choose “I'm on the team”. (Just following along? “Just looking” shows the schedule without signing in.)",
  "Enter your phone number and the code we text you. If you were already on the roster, that's it. If you're new, add your name, position, class and number, and a captain confirms you.",
];

const QUESTIONS: { question: string; answer: React.ReactNode }[] = [
  {
    question: "I don't have a team code.",
    answer: "Captains hand them out, usually in the team group chat. Ask one of them.",
  },
  {
    question: "The sign-in code never arrived.",
    answer:
      "Check the number you typed, wait a minute, then tap “Send again”. Codes only go to US numbers. If you replied STOP to us before, reply START first.",
  },
  {
    question: "I have a new phone number.",
    answer: (
      <>
        Email <Email /> with your name, your team, and your old and new numbers, and we&rsquo;ll move your
        account to the new number so you keep your spot and history.
      </>
    ),
  },
  {
    question: "How do I say whether I can make a practice or game?",
    answer:
      "Tap the check or the cross on the schedule, or open the event and choose Going or Not Going. You can change it whenever you like. Select on the schedule answers several events at once.",
  },
  {
    question: "It's asking whether I'm playing this season.",
    answer:
      "Returning players confirm once a season. Yes puts you on this season's roster; Not this season marks you away, and you can come back from Settings.",
  },
  {
    question: "I'm not getting the text reminders.",
    answer:
      "Reminders only go to people who ticked “Text me reminders” when they joined and who aren't marked away. If you replied STOP to an earlier message, your carrier blocks the rest until you reply START.",
  },
  {
    question: "I'm injured or away for a while.",
    answer:
      "Settings → Take a break. You keep your spot, but you're left out of reminders and response lists until you tap I'm back.",
  },
  {
    question: "How do I become a captain or coach?",
    answer:
      "A current captain adds you: Members → Add by Phone with your number and the role, or Change Role on your name if you're already on the team.",
  },
  {
    question: "I'm a captain. Where are the captain tools?",
    answer:
      "The + on the schedule adds games and practices. On an event, the paper plane sends a reminder. The Members tab confirms new joins, marks people away, and adds captains and coaches. The chart on the schedule shows attendance.",
  },
  {
    question: "How do I remove my information?",
    answer: (
      <>
        Settings → Delete Account removes your sign-in and phone number from every team. To have your name taken
        off past rosters too, email us. The <PolicyLink href="/fixture/privacy">privacy policy</PolicyLink> covers
        what is stored and who can see it.
      </>
    ),
  },
  {
    question: "Something is broken.",
    answer: (
      <>
        Email <Email /> with your iPhone model, your iOS version and what you were doing when it happened.
      </>
    ),
  },
];

export default function SupportPage() {
  return (
    <PolicyPage
      title="Support"
      intro={
        <>
          Email <Email /> with any question about Fixture, and we&rsquo;ll get back to you within a few days.
        </>
      }
    >
      <section className="border-b border-line py-8">
        <h2 className="text-lg font-medium tracking-tight">Getting started</h2>
        <ol className="lede mt-4 list-decimal space-y-3 pl-5 text-[15px]">
          {STEPS.map((step) => (
            <li key={step.slice(0, 40)}>{step}</li>
          ))}
        </ol>
        <p className="lede mt-4 text-[15px] text-muted">
          No iPhone? The same schedule, availability and captain tools run in any browser at{" "}
          <PolicyLink href="https://app.sllab.io">app.sllab.io</PolicyLink>.
        </p>
      </section>

      <section className="py-8">
        <h2 className="text-lg font-medium tracking-tight">Common questions</h2>
        <dl className="mt-2 divide-y divide-line">
          {QUESTIONS.map((item) => (
            <div key={item.question} className="py-5">
              <dt className="text-[15px] font-medium">{item.question}</dt>
              <dd className="lede mt-1.5 text-[15px] text-muted">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </PolicyPage>
  );
}
