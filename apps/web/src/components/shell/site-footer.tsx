const LINK = "transition hover:text-foreground";

/** Where "by SLLAB" lives, with the links the App Store listing points at. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="container-page flex flex-wrap items-center gap-x-5 gap-y-2 py-5 text-xs text-muted">
        <span>
          Fixture by{" "}
          <a href="https://sllab.io" className={`font-semibold ${LINK}`}>
            SLLAB
          </a>
        </span>
        <nav aria-label="Legal" className="ml-auto flex gap-4">
          <a href="https://sllab.io/fixture/support" className={LINK}>
            Support
          </a>
          <a href="https://sllab.io/fixture/privacy" className={LINK}>
            Privacy
          </a>
          <a href="https://sllab.io/fixture/terms" className={LINK}>
            Terms
          </a>
        </nav>
      </div>
    </footer>
  );
}
