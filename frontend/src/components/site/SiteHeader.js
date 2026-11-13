"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/shell/Logo";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { buttonClass } from "@/components/ui/Button";
import { useSession, ROLE_HOME } from "@/lib/session";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/team", label: "Team" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/faq", label: "FAQ" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const session = useSession();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const cta = session
    ? <Link href={ROLE_HOME[session.role]} className={buttonClass({ size: "sm" })}>Your workspace <ArrowRight className="size-4" aria-hidden /></Link>
    : <Link href="/login" className={buttonClass({ size: "sm" })}>Sign in</Link>;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Site" className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}
                className={cn("h-9 px-3 inline-flex items-center rounded-lg text-sm transition", active ? "text-paper bg-ink-3" : "text-muted hover:text-paper")}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <span className="hidden sm:inline-flex">{cta}</span>
          <button className="md:hidden size-9 grid place-items-center rounded-lg text-muted hover:text-paper hover:bg-ink-3"
            onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="site-menu" aria-label={open ? "Close menu" : "Open menu"}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="site-menu" aria-label="Site" className="md:hidden border-t border-line px-4 py-3 flex flex-col gap-1">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="h-11 px-3 flex items-center rounded-lg text-paper hover:bg-ink-3">{l.label}</Link>
          ))}
          <div className="pt-2 sm:hidden">{cta}</div>
        </nav>
      )}
    </header>
  );
}
