import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Quote } from "lucide-react";
import { buttonClass } from "@/components/ui/buttonClass";
import { LiveCounts, LeaderboardPreview } from "@/components/site/LivePanels";
import { intro, history, mission, offers, cohorts, glimpseImage, faqs } from "@/content/site";
import testimonials from "@/content/testimonials.json";

function Section({ id, eyebrow, title, children, className }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`mx-auto max-w-[1120px] px-4 sm:px-6 pt-20 ${className || ""}`}>
      {eyebrow && <p className="text-[13px] text-muted">{eyebrow}</p>}
      <h2 id={`${id}-title`} className="tn-display text-[26px] sm:text-[32px] mt-2">{title}</h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-[1120px] px-4 sm:px-6 pt-14 sm:pt-20 grid lg:grid-cols-[1.25fr_1fr] gap-10 lg:gap-14 items-center">
        <div>
          <p className="text-[13px] text-muted">TechNeeds IGDTUW · all_you_need_to_know_about_tech</p>
          <h1 className="tn-display text-[clamp(2.25rem,5vw,3.5rem)] mt-4">
            Cohort mentorship, from first video to shipped project.
          </h1>
          <p className="text-muted text-[16px] mt-5 max-w-xl">{intro}</p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link href="/login" className={buttonClass({ size: "lg" })}>Sign in <ArrowRight className="size-4" aria-hidden /></Link>
            <Link href="/techboard" className={buttonClass({ size: "lg", variant: "secondary" })}>How to join</Link>
          </div>
          <div className="mt-12"><LiveCounts /></div>
        </div>
        <LeaderboardPreview />
      </section>

      {/* About */}
      <Section id="about" eyebrow="About us" title="IGDTUW students' first choice for tech">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
          <div className="rounded-[16px] border border-line bg-ink-2 p-6">
            <h3 className="tn-heading text-[17px]">Our mission</h3>
            <p className="text-muted mt-2">{mission}</p>
            <h3 className="tn-heading text-[17px] mt-6">What we offer</h3>
            <ul className="mt-3 grid sm:grid-cols-2 gap-2">
              {offers.map((o) => <li key={o} className="flex items-center gap-2 text-sm text-paper"><Check className="size-4 text-accent shrink-0" aria-hidden />{o}</li>)}
            </ul>
          </div>
          <div className="rounded-[16px] border border-line bg-ink-2 p-6">
            <p className="text-[13px] text-muted">Since 2023, across the community</p>
            <dl className="grid grid-cols-2 gap-6 mt-4">
              {history.map((h) => (
                <div key={h.label}>
                  <dd className="tn-display tn-num text-[32px] leading-none">{h.value}</dd>
                  <dt className="text-sm text-muted mt-2">{h.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>

      {/* Cohorts */}
      <Section id="cohorts" eyebrow="Mentorship" title="Our mentorship cohorts">
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cohorts.map((c) => (
            <li key={c.title} className="rounded-[16px] border border-line bg-ink-2 overflow-hidden">
              <div className="relative aspect-[16/9] bg-ink-3">
                <Image src={c.image} alt="" fill sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw" className="object-cover" />
              </div>
              <div className="p-5">
                <h3 className="tn-heading text-[17px]">{c.title}</h3>
                <p className="text-sm text-muted mt-1">Led by {c.lead}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* How it works */}
      <Section id="how" eyebrow="On the platform" title="How a cohort runs">
        <ol className="grid md:grid-cols-3 gap-4">
          {[
            ["Admins start the cohort", "Create a program and onboard mentors. Logins are generated and shown once."],
            ["Mentors publish and review", "Add mentees with generated enrollment numbers. Post videos, quizzes and projects with deadlines and scores, then review submissions."],
            ["Mentees learn and climb", "Work through what's due, get quizzes graded instantly and projects reviewed, and watch the leaderboard and your AI profile update."],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-[16px] border border-line bg-ink-2 p-6">
              <span className="tn-num text-[13px] text-accent font-medium">Step {i + 1}</span>
              <h3 className="tn-heading text-[17px] mt-2">{t}</h3>
              <p className="text-sm text-muted mt-2">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Glimpse */}
      <Section id="glimpse" eyebrow="Glimpse" title="Moments from TechNeeds">
        <div className="rounded-[16px] border border-line overflow-hidden bg-ink-2">
          <Image src={glimpseImage} alt="A collage of TechNeeds sessions and events at IGDTUW" className="w-full h-auto" sizes="(min-width: 1120px) 1120px, 100vw" />
        </div>
      </Section>

      {/* Testimonials */}
      <Section id="voices" eyebrow="Testimonials" title="What our students say">
        <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {testimonials.map((t) => (
            <li key={t.name} className="rounded-[16px] border border-line bg-ink-2 p-5 flex flex-col">
              <Quote className="size-5 text-muted" aria-hidden />
              <blockquote className="text-sm text-paper mt-3 flex-1">{t.text}</blockquote>
              <p className="text-[13px] text-muted mt-4">{t.name}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* FAQ teaser */}
      <Section id="questions" eyebrow="FAQ" title="Questions, answered">
        <div className="grid md:grid-cols-2 gap-4">
          {faqs.slice(0, 4).map((f) => (
            <div key={f.q} className="rounded-[16px] border border-line bg-ink-2 p-5">
              <h3 className="text-paper font-medium">{f.q}</h3>
              <p className="text-sm text-muted mt-2">{f.a}</p>
            </div>
          ))}
        </div>
        <Link href="/faq" className="inline-flex items-center gap-1.5 text-sm text-accent mt-6 hover:underline">All questions <ArrowRight className="size-4" aria-hidden /></Link>
      </Section>
    </>
  );
}
