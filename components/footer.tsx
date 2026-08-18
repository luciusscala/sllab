import { LocalTime } from "@/components/local-time";

export function Footer() {
  return (
    <footer className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-6 py-8 font-mono text-[11px] tracking-[0.14em] text-muted md:px-10">
      <p>© {new Date().getFullYear()} SPORTS LOGIC LAB</p>
      <LocalTime />
    </footer>
  );
}
