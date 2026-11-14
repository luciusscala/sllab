import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";

import "./globals.css";

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Fixture by SLLAB",
    template: "%s | Fixture by SLLAB",
  },
  description: "Your team's schedule, availability and members.",
};

/**
 * app.sllab.io: Fixture on the web. The team app is the whole site, served
 * from the root; the admin dashboard sits under /admin. Neither belongs to
 * any one club, so the frame is the platform's, not a club's.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground"
        >
          Skip to content
        </a>

        <header className="border-b border-border">
          <div className="container-page flex min-h-12 items-center">
            <Link href="/" className="text-sm font-semibold tracking-wide">
              Fixture <span className="font-normal text-muted">by SLLAB</span>
            </Link>
          </div>
        </header>

        <main id="main" className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
