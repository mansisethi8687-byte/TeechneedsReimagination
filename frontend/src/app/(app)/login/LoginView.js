"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { setSession, useSession, ROLE_HOME } from "@/lib/session";
import { DEMO_ENABLED, DEMO_ACCOUNTS } from "@/lib/demo";
import { Logo } from "@/components/shell/Logo";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Tabs } from "@/components/ui/Tabs";
import { LiveDot } from "@/components/ui/Badge";

const ROLES = [
  { id: "mentee", label: "Mentee" },
  { id: "mentor", label: "Mentor" },
  { id: "admin", label: "Admin" },
];

const COPY = {
  mentee: { idLabel: "Enrollment number", idPlaceholder: "TN-WD26-001", idType: "text", help: "Your mentor gave you these when they added you to a program." },
  mentor: { idLabel: "Email", idPlaceholder: "you@igdtuw.ac.in", idType: "email", help: "The TechNeeds admin team issued your login when they onboarded you." },
  admin: { idLabel: "Email", idPlaceholder: "admin@techneeds…", idType: "email", help: "For the TechNeeds core team." },
};

function safeNext(next, role) {
  // Only same-site paths inside the role's own area.
  if (next && next.startsWith("/") && !next.startsWith("//") && next.startsWith(ROLE_HOME[role])) return next;
  return ROLE_HOME[role];
}

function LiveStats() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.stats().then(setStats).catch(() => setStats(null));
  }, []);
  if (!stats) return null;
  const items = [
    [stats.programs, stats.programs === 1 ? "program" : "programs"],
    [stats.mentees, "mentees"],
    [stats.completions, "completed tasks"],
  ];
  return (
    <div>
      <p className="inline-flex items-center gap-2 text-[13px] text-signal">
        <LiveDot /> Live from the TechNeeds API
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-4 max-w-md">
        {items.map(([n, label]) => (
          <div key={label}>
            <dd className="tn-display tn-num text-[28px] text-paper">{n}</dd>
            <dt className="text-[13px] text-muted mt-1">{label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const session = useSession();
  const initialRole = ROLES.some((r) => r.id === params.get("role")) ? params.get("role") : "mentee";
  const [role, setRole] = useState(initialRole);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Already signed in: go straight to the workspace.
  useEffect(() => {
    if (session) router.replace(safeNext(params.get("next"), session.role));
  }, [session, router, params]);

  const switchRole = (r) => {
    setRole(r);
    setIdentifier("");
    setPassword("");
    setError(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth[role](identifier.trim(), password);
      const user = res.admin || res.mentor || res.mentee;
      setSession({ role, token: res.token, user: user && { id: user._id, name: user.name, email: user.email, enrollmentNumber: user.enrollmentNumber } });
      router.replace(safeNext(params.get("next"), role));
    } catch (err) {
      setError(err.status === 400 ? "That combination didn't match. Check for typos and try again." : err.message);
      setLoading(false);
    }
  };

  const fillDemo = () => {
    const d = DEMO_ACCOUNTS[role];
    setIdentifier(d.id);
    setPassword(d.password);
    setError(null);
  };

  const copy = COPY[role];

  return (
    <div className="min-h-dvh grid lg:grid-cols-[1.1fr_1fr]">
      {/* Brand side */}
      <section className="relative hidden lg:flex flex-col justify-between p-12 border-r border-line overflow-hidden">
        <Logo />
        <div className="relative max-w-lg">
          <p className="text-[13px] text-muted">TechNeeds IGDTUW · cohort mentorship</p>
          <h1 className="tn-display text-[clamp(2.25rem,3.6vw,3rem)] text-paper mt-4">
            Videos, quizzes and projects. Deadlines, reviews and a live ranking.
          </h1>
          <p className="text-muted text-[16px] mt-5 max-w-md">
            Mentors publish the work and score it. Mentees complete it before the deadline and see exactly where they stand.
          </p>
        </div>
        <LiveStats />
        {/* Quiet structural lines, no glow. */}
        <svg aria-hidden className="absolute -right-24 top-1/2 -translate-y-1/2 w-[520px] text-line-strong" viewBox="0 0 400 400" fill="none">
          {[60, 100, 140, 180].map((r) => <circle key={r} cx="200" cy="200" r={r} stroke="currentColor" />)}
        </svg>
      </section>

      {/* Form side */}
      <section className="flex flex-col px-4 sm:px-8 py-6 lg:py-12">
        <div className="flex items-center justify-between lg:justify-end">
          <span className="lg:hidden"><Logo /></span>
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <h2 className="tn-display text-[26px] text-paper">Sign in</h2>
            <p className="text-muted text-sm mt-1.5">Choose how you&apos;re part of TechNeeds.</p>

            <Tabs items={ROLES} value={role} onChange={switchRole} label="Sign in as" className="mt-6 w-full [&>button]:flex-1" />

            <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
              <Field label={copy.idLabel}>
                <Input
                  type={copy.idType}
                  autoComplete="username"
                  autoCapitalize={role === "mentee" ? "characters" : "none"}
                  spellCheck={false}
                  placeholder={copy.idPlaceholder}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </Field>
              <Field label="Password">
                {(props) => (
                  <div className="relative">
                    <Input
                      {...props}
                      type={show ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-11"
                      required
                    />
                    <button type="button" onClick={() => setShow((s) => !s)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 size-8 grid place-items-center rounded-md text-muted hover:text-paper"
                      aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
                      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                )}
              </Field>

              {error && <p role="alert" className="text-sm text-danger -mt-1">{error}</p>}

              <Button type="submit" size="lg" loading={loading} disabled={!identifier || !password}>
                Sign in <ArrowRight className="size-4" aria-hidden />
              </Button>
              <p className="text-[13px] text-muted">{copy.help}</p>
            </form>

            {DEMO_ENABLED && (
              <div className="mt-8 rounded-[14px] border border-line bg-ink-2 p-4">
                <p className="flex items-center gap-2 text-sm text-paper font-medium">
                  <Sparkles className="size-4 text-accent" aria-hidden /> Judging the demo?
                </p>
                <p className="text-[13px] text-muted mt-1">
                  Fill in the seeded {role} account: {DEMO_ACCOUNTS[role].who}.
                </p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={fillDemo}>Use demo account</Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
