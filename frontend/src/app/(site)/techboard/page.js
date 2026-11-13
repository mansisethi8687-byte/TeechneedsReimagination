"use client";
// Upstream's techboard was a role router: signed-in users go to their panel,
// everyone else picks how they're part of TechNeeds. Same behaviour, new session.
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, GraduationCap, Layers, UserPlus } from "lucide-react";
import { useSession, ROLE_HOME } from "@/lib/session";
import { contact } from "@/content/site";

export default function Techboard() {
  const session = useSession();
  const router = useRouter();
  useEffect(() => { if (session) router.replace(ROLE_HOME[session.role]); }, [session, router]);
  if (session === undefined || session) return <div className="min-h-[50vh]" aria-busy="true" />;

  const options = [
    { href: "/login?role=mentee", icon: GraduationCap, title: "I'm a mentee", body: "Sign in with the enrollment number and password your mentor gave you." },
    { href: "/login?role=mentor", icon: Layers, title: "I'm a mentor", body: "Sign in with the login the TechNeeds admin team sent you." },
    { href: `mailto:${contact.email}?subject=Joining%20a%20TechNeeds%20cohort`, icon: UserPlus, title: "I want to join", body: "Cohorts are run by mentors. Email the team and we'll tell you when the next one opens." },
  ];
  return (
    <div className="mx-auto max-w-[900px] px-4 sm:px-6 pt-14">
      <p className="text-[13px] text-muted">Techboard</p>
      <h1 className="tn-display text-[clamp(2rem,4vw,2.75rem)] mt-2">How are you part of TechNeeds?</h1>
      <ul className="grid md:grid-cols-3 gap-4 mt-8">
        {options.map((o) => (
          <li key={o.title}>
            <Link href={o.href} className="group h-full rounded-[16px] border border-line bg-ink-2 p-6 flex flex-col hover:border-line-strong transition">
              <o.icon className="size-6 text-accent" aria-hidden />
              <h2 className="tn-heading text-[17px] mt-4">{o.title}</h2>
              <p className="text-sm text-muted mt-2 flex-1">{o.body}</p>
              <span className="text-sm text-accent mt-4 inline-flex items-center gap-1">Continue <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden /></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
