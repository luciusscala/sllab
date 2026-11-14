import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import { TopBar } from "@/components/shell/top-bar";
import { ToastProvider } from "@/components/ui/toast";

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Fixture",
    template: "%s · Fixture",
  },
  description: "Your team's schedule, availability and members.",
};

/**
 * app.sllab.io: Fixture on the web. Three surfaces share this frame: the
 * team app at the root, a team's dashboard under /admin, and the platform
 * console under /console. The top bar is the same on all of them; each
 * surface adds its own navigation and footer below.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ToastProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground"
          >
            Skip to content
          </a>

          <TopBar />

          <main id="main" className="flex flex-1 flex-col">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
