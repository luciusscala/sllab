import Link from "next/link";

import { CONTACT_EMAIL } from "@/lib/contact";

export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-6 py-5 md:px-10">
      <Link href="/" className="label link-wipe text-fg">
        sllab
      </Link>
      <nav className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        <a href={`mailto:${CONTACT_EMAIL}`} className="link-wipe transition-colors hover:text-fg">
          Contact
        </a>
        <a href="https://app.sllab.io" className="link-wipe text-fg">
          Open Fixture ↗
        </a>
      </nav>
    </header>
  );
}
