# sllab.io

The website for SLLAB itself: what the project is, what's built, and how a team can get in touch for early access. Its header and footer link to [Fixture on the web](../web) and Fixture's policy pages. It's part of [SLLAB](../../README.md), and is separate from the [club sites](../club-sites), which belong to each club.

Built with Next.js 16, React 19 and Tailwind CSS 4. It has no backend and no environment variables; every page is static.

## Pages

- **Home** (`/`): the whole site. A hero, then an animated diagram of how SLLAB's pieces work together (`components/platform-graphic.tsx`): a six-step story of one game moving from a captain's Fixture through the platform to players, the club site, text reminders and Film. It is hand-written SVG driven by one `requestAnimationFrame` loop, with a taller layout for phones and a still, click-through version for reduced motion. `/contact` redirects here.
- **Fixture's policies** (`/fixture/privacy`, `/fixture/terms`, `/fixture/support`): the privacy policy, terms and support page for [Fixture by SLLAB](../fixture-ios), linked from the App Store listing and from club sites. They stay because Apple requires them.

The site has light and dark themes with a toggle, scroll-triggered reveal animations, and transitions between pages.

## Getting started

```sh
npm ci
npm run dev    # http://localhost:3000
```

## Project structure

```
app/          Pages, layout and global styles
components/   The platform graphic, theme toggle, reveal animations, page transitions, header, footer, shared UI
lib/          Theme handling and the contact address
```

## AI Disclosure

Parts of this codebase and readme were written with the help of AI. All files were reviewed by a human, but it is provided as-is, with no guarantee that it is correct, secure, or fit for any particular purpose.
