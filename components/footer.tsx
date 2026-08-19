import { LocalTime } from "@/components/local-time";
import { ThemeToggle } from "@/components/theme-toggle";

export function Footer() {
  return (
    <footer className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-6 px-6 py-6 font-mono text-[11px] tracking-[0.14em] text-muted md:px-10">
      <p>© {new Date().getFullYear()} SPORTS LOGIC LAB</p>
      <div className="flex items-center gap-5">
        <LocalTime />
        <ThemeToggle />
      </div>
    </footer>
  );
}
