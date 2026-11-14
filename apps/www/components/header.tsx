import Link from "next/link";

/** The way from the project's site to the product, and back to the top. */
export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-6 py-5 md:px-10">
      <Link href="/" className="label link-wipe">
        sllab
      </Link>
      <nav className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        <Link href="/contact" className="link-wipe transition-colors hover:text-fg">
          Contact
        </Link>
        <a href="https://app.sllab.io" className="link-wipe text-fg">
          Open Fixture ↗
        </a>
      </nav>
    </header>
  );
}
