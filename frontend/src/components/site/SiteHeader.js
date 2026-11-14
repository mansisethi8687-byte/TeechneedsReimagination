"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/shell/Logo";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { useSession, ROLE_HOME } from "@/lib/session";
import { cn } from "@/lib/cn";
import s from "./siteChrome.module.css";

const LINKS = [
  { href: "/#cohorts", label: "Cohorts" },
  { href: "/#experience", label: "The experience" },
  { href: "/#glimpses", label: "Glimpses" },
  { href: "/team", label: "Team" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/faq", label: "FAQ" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const session = useSession();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const cta = session ? (
    <Link href={ROLE_HOME[session.role]} className={s.enterButton}>
      Your workspace <ArrowRight className="size-4" aria-hidden />
    </Link>
  ) : (
    <Link href="/login" className={s.enterButton}>
      Sign in <ArrowRight className="size-4" aria-hidden />
    </Link>
  );

  return (
    <header className={s.header}>
      <div className={s.headerInner}>
        <Logo />
        <nav aria-label="Site" className="hidden lg:flex items-center gap-1">
          {LINKS.map((l) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(s.navLink, active && s.active)}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <span className="hidden sm:inline-flex">{cta}</span>
          <button
            className="lg:hidden size-11 grid place-items-center rounded-lg text-muted hover:text-paper hover:bg-ink-3"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="site-menu"
          aria-label="Site"
          className="lg:hidden border-t border-line px-4 py-3 flex flex-col gap-1"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="h-11 px-3 flex items-center rounded-lg text-paper hover:bg-ink-3"
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2 sm:hidden">{cta}</div>
        </nav>
      )}
    </header>
  );
}
