"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, ClipboardCheck, LayoutDashboard, LogIn, LogOut, Layers, GraduationCap, Sparkles, Trophy, UserRound, Users } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { RequireRole } from "./RequireRole";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useSession, clearSession, ROLE_HOME, ROLE_LABEL } from "@/lib/session";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

// Only routes that exist are listed; later phases add theirs here
// (the leaderboard joins in Phase 4, once it lives inside the shell).
export const NAV = {
  admin: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true, match: ["/admin/programs"] },
    { href: "/admin/mentors", label: "Mentors", icon: Users },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ],
  mentor: [
    { href: "/mentor", label: "Studio", icon: Layers, exact: true, match: ["/mentor/programs", "/mentor/mentees"] },
    { href: "/mentor/review", label: "Review", icon: ClipboardCheck },
    { href: "/mentor/profile", label: "Profile", icon: Sparkles },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ],
  mentee: [
    { href: "/dashboard", label: "Today", icon: GraduationCap, exact: true, match: ["/dashboard/programs", "/dashboard/resources"] },
    { href: "/dashboard/profile", label: "Profile", icon: Sparkles },
    { href: "/dashboard/activity", label: "Activity", icon: Activity },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ],
};

const isActive = (pathname, item) =>
  (item.exact ? pathname === item.href : pathname.startsWith(item.href)) ||
  (item.match || []).some((m) => pathname.startsWith(m));
const ROLE_ICON = { admin: Users, mentor: Layers, mentee: UserRound };

function UserChip({ session, compact }) {
  const name = session.user?.name || ROLE_LABEL[session.role];
  const sub = session.role === "mentee" ? session.user?.enrollmentNumber : session.user?.email;
  const Icon = ROLE_ICON[session.role];
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="size-9 rounded-full bg-accent-soft text-accent grid place-items-center text-[13px] font-semibold shrink-0" aria-hidden>
        {initials(name) || <Icon className="size-4" />}
      </span>
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="block text-sm text-paper truncate">{name}</span>
          <span className="block text-[12px] text-muted truncate">{ROLE_LABEL[session.role]}{sub ? <> · <span className={session.role === "mentee" ? "tn-code" : undefined}>{sub}</span></> : ""}</span>
        </span>
      )}
    </div>
  );
}

export function AppShell({ role, allowAnonymous = false, children }) {
  const roles = Array.isArray(role) ? role : [role];
  const session = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const anonymous = allowAnonymous && session === null;
  const nav = session ? NAV[session.role] : anonymous ? [] : NAV[roles[0]];

  const signOut = () => {
    clearSession();
    router.replace("/login");
  };

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col sticky top-0 h-dvh border-r border-line bg-ink px-4 py-5">
        <Logo href={session ? ROLE_HOME[session.role] : "/"} className="px-1" />
        <nav className="mt-8 flex flex-col gap-0.5" aria-label="Main">
          {nav.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                className={cn("flex items-center gap-3 h-10 px-3 rounded-[10px] text-sm transition",
                  active ? "bg-ink-3 text-paper font-medium" : "text-muted hover:text-paper hover:bg-ink-3/60")}>
                <item.icon className={cn("size-[18px]", active && "text-accent")} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-4 border-t border-line">
          {session && <UserChip session={session} />}
          <div className="flex items-center justify-between mt-3">
            <ThemeToggle />
            {session ? (
              <button onClick={signOut} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm text-muted hover:text-paper hover:bg-ink-3">
                <LogOut className="size-4" aria-hidden /> Sign out
              </button>
            ) : anonymous && (
              <Link href="/login" className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm text-accent hover:bg-ink-3">
                <LogIn className="size-4" aria-hidden /> Sign in
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile / tablet top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 h-14 px-4 border-b border-line bg-ink/90 backdrop-blur">
        <Logo href={session ? ROLE_HOME[session.role] : "/"} />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {session ? (
            <button onClick={signOut} className="size-9 grid place-items-center rounded-lg text-muted hover:text-paper hover:bg-ink-3" aria-label="Sign out">
              <LogOut className="size-[18px]" />
            </button>
          ) : anonymous && (
            <Link href="/login" className="h-9 px-3 inline-flex items-center rounded-lg text-sm text-accent hover:bg-ink-3">Sign in</Link>
          )}
        </div>
      </header>

      <main className="min-w-0 px-4 sm:px-6 lg:px-10 py-6 lg:py-10 pb-28 lg:pb-12">
        <div className="mx-auto max-w-[1120px]">
          {anonymous ? children : <RequireRole roles={roles} fallback={<PageSkeleton />}>{children}</RequireRole>}
        </div>
      </main>

      {/* Mobile bottom tabs (only when there is more than one place to go) */}
      {nav.length > 1 && <nav aria-label="Main" className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-ink/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <ul className="flex">
          {nav.map((item) => {
            const active = isActive(pathname, item);
            return (
              <li key={item.href} className="flex-1">
                <Link href={item.href} aria-current={active ? "page" : undefined}
                  className={cn("flex flex-col items-center justify-center gap-1 h-16 text-[12px]", active ? "text-paper" : "text-muted")}>
                  <item.icon className={cn("size-5", active && "text-accent")} aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-6 border-b border-line">
      <div className="min-w-0">
        {eyebrow && <div className="text-[13px] text-muted mb-2 flex flex-wrap items-center gap-2">{eyebrow}</div>}
        <h1 className="tn-display text-[26px] sm:text-[30px] text-paper">{title}</h1>
        {description && <p className="text-muted mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {action && <div className="shrink-0 flex gap-2">{action}</div>}
    </div>
  );
}
