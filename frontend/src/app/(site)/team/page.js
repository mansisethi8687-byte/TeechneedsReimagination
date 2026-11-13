import { Github, Instagram, Linkedin, Twitter } from "lucide-react";
import team from "@/content/team.json";

export const metadata = { title: "Team" };

const ICONS = { linkedin: [Linkedin, "LinkedIn"], instagram: [Instagram, "Instagram"], x: [Twitter, "X"], github: [Github, "GitHub"] };

export default function TeamPage() {
  const total = team.reduce((n, g) => n + g.members.length, 0);
  return (
    <div className="mx-auto max-w-[1120px] px-4 sm:px-6 pt-14">
      <p className="text-[13px] text-muted">The people behind TechNeeds</p>
      <h1 className="tn-display text-[clamp(2rem,4vw,2.75rem)] mt-2">Meet our team</h1>
      <p className="text-muted mt-3 max-w-xl">{total} students across {team.length} teams run TechNeeds at IGDTUW: founders, leads, and the people who make events, content and the platform happen.</p>

      {team.map((g) => (
        <section key={g.group} aria-labelledby={`team-${g.group}`} className="mt-12">
          <h2 id={`team-${g.group}`} className="tn-heading text-[19px] pb-3 border-b border-line">{g.group}</h2>
          <ul className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {g.members.map((m) => (
              <li key={m.name} className="rounded-[16px] border border-line bg-ink-2 p-4 flex flex-col">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.photo} alt={`Portrait of ${m.name}`} width={480} height={480} loading="lazy" decoding="async"
                  className="aspect-square w-full rounded-xl object-cover bg-ink-3" />
                <h3 className="text-paper font-medium mt-3 leading-snug">{m.name}</h3>
                <p className="text-[13px] text-muted">{m.position}</p>
                {m.links.length > 0 && (
                  <div className="flex gap-1 mt-2 -ml-1.5">
                    {m.links.map((l) => {
                      const [Icon, label] = ICONS[l.kind] || [Linkedin, l.kind];
                      return (
                        <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" aria-label={`${m.name} on ${label}`}
                          className="size-9 grid place-items-center rounded-lg text-muted hover:text-paper hover:bg-ink-3">
                          <Icon className="size-4" aria-hidden />
                        </a>
                      );
                    })}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
