import Link from "next/link";

const SECTIONS = [
  { href: "/#products", label: "Products" },
  { href: "/#roadmap", label: "Roadmap" },
  { href: "/contact", label: "Contact" },
];

/** The way from the project's site to the product, and around the home page. */
export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-6 py-5 md:px-10">
      <Link href="/" className="label link-wipe text-fg">
        sllab
      </Link>
      <nav className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className={`link-wipe transition-colors hover:text-fg ${section.href === "/contact" ? "" : "hidden sm:inline-block"}`}
          >
            {section.label}
          </Link>
        ))}
        <a href="https://app.sllab.io" className="link-wipe text-fg">
          Open Fixture ↗
        </a>
      </nav>
    </header>
  );
}
