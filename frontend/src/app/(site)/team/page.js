import { Github, Instagram, Linkedin, Twitter } from "lucide-react";
import team from "@/content/team.json";
import s from "@/components/site/siteChrome.module.css";

export const metadata = { title: "Team" };

const ICONS = {
  linkedin: [Linkedin, "LinkedIn"],
  instagram: [Instagram, "Instagram"],
  x: [Twitter, "X"],
  github: [Github, "GitHub"],
};

export default function TeamPage() {
  const total = team.reduce((n, g) => n + g.members.length, 0);
  return (
    <div className={s.publicPage}>
      <div className={s.pageIntro}>
        <p className="text-[13px] text-muted">The people behind TechNeeds</p>
        <h1>
          The people.
          <br />
          The possibilities.
        </h1>
        <p className="text-muted mt-3 max-w-xl">
          {total} students across {team.length} teams run TechNeeds at IGDTUW:
          founders, leads, and the people who make events, content and the
          platform happen.
        </p>
      </div>

      {team.map((g) => (
        <section
          key={g.group}
          aria-labelledby={`team-${g.group}`}
          className={s.teamSection}
        >
          <h2
            id={`team-${g.group}`}
            className="tn-heading text-[19px] pb-3 border-b border-line"
          >
            {g.group}
          </h2>
          <ul className={s.teamGrid}>
            {g.members.map((m) => (
              <li key={m.name} className={s.member}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.photo}
                  alt={`Portrait of ${m.name}`}
                  width={480}
                  height={480}
                  loading="lazy"
                  decoding="async"
                />
                <h3 className="text-paper font-medium mt-3 leading-snug">
                  {m.name}
                </h3>
                <p className="text-[13px] text-muted">{m.position}</p>
                {m.links.length > 0 && (
                  <div className="flex gap-1 mt-2 -ml-1.5">
                    {m.links.map((l) => {
                      const [Icon, label] = ICONS[l.kind] || [Linkedin, l.kind];
                      return (
                        <a
                          key={l.url}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${m.name} on ${label}`}
                          className="size-11 grid place-items-center rounded-lg text-muted hover:text-paper hover:bg-ink-3"
                        >
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
