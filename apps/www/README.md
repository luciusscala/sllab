# sllab.io

The website for SLLAB itself: what the project is, what's built, and how a team can get in touch for early access. Its header and footer link to [Fixture on the web](../web) and Fixture's policy pages. It's part of [SLLAB](../../README.md), and is separate from the [club sites](../club-sites), which belong to each club.

Built with Next.js 16, React 19 and Tailwind CSS 4. It has no backend and no environment variables; every page is static.

## Pages

- **Home** (`/`): what SLLAB is: the problem, the four products (Fixture, club sites, Film, the hardware), how they fit together, the roadmap, and how to get a team on. Screenshots and photos are placeholders (`MediaPlaceholder`) until the real media is added.
- **Contact** (`/contact`): email, location, and how early access works.
- **Fixture's policies** (`/fixture/privacy`, `/fixture/terms`, `/fixture/support`): the privacy policy, terms and support page for [Fixture by SLLAB](../fixture-ios), linked from the App Store listing and from club sites.

The site has light and dark themes with a toggle, scroll-triggered reveal animations, and transitions between pages.

## Getting started

```sh
npm ci
npm run dev    # http://localhost:3000
```

## Project structure

```
app/          Pages, layout and global styles
components/   home/ the home page's sections; theme toggle, reveal animations, page transitions, header, footer, shared UI
lib/          Theme handling and the contact address
```

## AI Disclosure

Parts of this codebase and readme were written with the help of AI. All files were reviewed by a human, but it is provided as-is, with no guarantee that it is correct, secure, or fit for any particular purpose.
