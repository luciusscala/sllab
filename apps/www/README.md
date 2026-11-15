# sllab.io

The website for SLLAB itself: what the project is, what's built, and how a team can get in touch for early access. Its header and footer link to [Fixture on the web](../web) and Fixture's policy pages. It's part of [SLLAB](../../README.md), and is separate from the [club sites](../club-sites), which belong to each club.

Built with Next.js 16, React 19 and Tailwind CSS 4. It has no backend and no environment variables; every page is static.

## Pages

- **Home** (`/`): the whole site, in one viewport with nothing to scroll. A hive (`components/hive-graphic.tsx`): three cells sharing walls for Fixture, Film and the league feed, the places a team's season is recorded, and from the seam between them one line that splits three ways and carries lit packets to the smaller cells at the end, standings, stats and the club's site. Under it, one line of text. The hive is plain SVG with SMIL motion, so it's a Server Component with no script; the same geometry is drawn left to right on wide screens and top to bottom on phones, and the packets stay still for reduced motion. `/contact` redirects here.
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
components/   The hive graphic, theme toggle, reveal animations, page transitions, header, footer, shared UI
lib/          Theme handling and the contact address
```

## AI Disclosure

Parts of this codebase and readme were written with the help of AI. All files were reviewed by a human, but it is provided as-is, with no guarantee that it is correct, secure, or fit for any particular purpose.
