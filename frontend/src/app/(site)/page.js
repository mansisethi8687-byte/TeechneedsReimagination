import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  Check,
  CirclePlay,
  FileCode2,
  Plus,
  Quote,
  Sparkles,
  Users,
} from "lucide-react";
import { LiveCounts, LeaderboardPreview } from "@/components/site/LivePanels";
import { SocialLinks } from "@/components/site/SocialLinks";
import {
  ExperienceFrame,
  HeroScene,
  CohortExplorer,
  LearningPlayground,
} from "@/components/site/PremiumExperience";
import { history, glimpseImage, faqs } from "@/content/site";
import testimonials from "@/content/testimonials.json";
import s from "@/components/site/premium.module.css";

export default function Home() {
  return (
    <ExperienceFrame>
      <HeroScene />
      <section
        id="experience"
        className={s.manifesto}
        aria-labelledby="manifesto-title"
      >
        <div className={s.container}>
          <p className={s.eyebrow}>
            <Sparkles size={16} aria-hidden="true" />
            Good things start with “what if?”
          </p>
          <h2 id="manifesto-title" className={s.manifestoTitle}>
            You bring the curiosity.
            <br />
            <span>We bring the</span> people.
          </h2>
          <div className={s.manifestoBottom}>
            <p>
              A community of students turning “I want to learn” into “look what
              I made.” Find direction, get unstuck, and build alongside people
              who get it.
            </p>
            <Link href="/team" className={s.roundLink}>
              <span>Meet your community</span>
              <ArrowUpRight size={24} aria-hidden="true" />
            </Link>
          </div>
          <dl className={s.history}>
            {history.map((h) => (
              <div key={h.label}>
                <dd>{h.value}</dd>
                <dt>{h.label}</dt>
              </div>
            ))}
          </dl>
          <p className={s.historyNote}>
            TechNeeds community history · Since 2023
          </p>
        </div>
      </section>
      <section
        id="cohorts"
        className={s.cohortsSection}
        aria-labelledby="cohorts-title"
      >
        <div className={s.container}>
          <div className={s.sectionIntro}>
            <div>
              <p className={s.eyebrow}>One community. So many possibilities.</p>
              <h2 id="cohorts-title">
                Follow your
                <br />
                “what if?”
              </h2>
            </div>
            <p>
              Your first website? A smarter algorithm?
              <br />
              Something the world hasn’t seen yet?
              <br />
              Find the track that feels like you.
            </p>
          </div>
          <CohortExplorer />
        </div>
      </section>
      <div className={s.wordBand} aria-hidden="true">
        <div>
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i}>
              Learn. <Sparkles /> Build. <Sparkles /> Repeat. <Sparkles />
            </span>
          ))}
        </div>
      </div>
      <section className={s.productSection} aria-labelledby="product-title">
        <div className={s.container}>
          <div className={s.sectionIntro}>
            <div>
              <p className={s.eyebrow}>
                A little structure. A lot of possibility.
              </p>
              <h2 id="product-title">
                Less figuring it out.
                <br />
                More making it happen.
              </h2>
            </div>
            <Link href="/login" className={s.simpleLink}>
              Explore your workspace{" "}
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
          </div>
          <div className={s.productGrid}>
            <div className={s.workspacePreview}>
              <div className={s.previewBar}>
                <span>
                  <span className={s.miniLogo}>t.</span> Your learning space
                </span>
                <span>Product preview</span>
              </div>
              <div className={s.previewBody}>
                <p>Your next chapter</p>
                <h3>One step closer.</h3>
                <span>Everything you need to keep moving.</span>
                <ul className={s.previewTasks}>
                  {[
                    [
                      CirclePlay,
                      "Watch. Understand. Explore.",
                      "Resources from your mentor",
                    ],
                    [
                      Braces,
                      "Put your knowledge to work.",
                      "Quizzes with saved results",
                    ],
                    [
                      FileCode2,
                      "Make something of your own.",
                      "Projects with mentor feedback",
                    ],
                  ].map(([Icon, title, description]) => (
                    <li key={title}>
                      <span>
                        <Icon size={22} aria-hidden="true" />
                      </span>
                      <div>
                        <strong>{title}</strong>
                        <p>{description}</p>
                      </div>
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </li>
                  ))}
                </ul>
                <Link href="/login" className={s.previewLink}>
                  Open my workspace <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>
              <div className={s.feedbackFloat}>
                <span>
                  <Check size={18} aria-hidden="true" />
                </span>
                <div>
                  Built. Submitted. Reviewed.
                  <p>Your effort deserves real feedback.</p>
                </div>
              </div>
            </div>
            <div className={s.productStory}>
              {[
                [
                  "01",
                  "A path, not a pile of links.",
                  "Your mentor’s videos, quizzes and projects, organized in one place. Always know what comes next.",
                ],
                [
                  "02",
                  "People who help you get there.",
                  "Submit your work, get a real mentor’s feedback, and understand what you can improve.",
                ],
                [
                  "03",
                  "Progress that’s actually yours.",
                  "Earned scores, cohort rankings and a learning profile built from the work you do.",
                ],
              ].map(([number, title, text]) => (
                <div key={number}>
                  <span>{number}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className={s.challengeSection} aria-labelledby="challenge-title">
        <div className={`${s.container} ${s.challengeGrid}`}>
          <div className={s.challengeCopy}>
            <p className={s.eyebrow}>Go on. Surprise yourself.</p>
            <h2 id="challenge-title">
              Big confidence.
              <br />
              Tiny beginnings.
            </h2>
            <p>
              Sometimes all you need is a little win.
              <br />
              Here’s one you can try right now.
            </p>
            <div className={s.sparkMini} aria-hidden="true">
              <Sparkles />
            </div>
            <span>Curiosity looks good on you.</span>
          </div>
          <LearningPlayground />
        </div>
      </section>
      <section className={s.progressSection} aria-labelledby="progress-title">
        <div className={`${s.container} ${s.progressGrid}`}>
          <div>
            <p className={s.eyebrow}>Show up. Put in the work.</p>
            <h2 id="progress-title">
              Make your
              <br />
              progress count.
            </h2>
            <p>
              Every completed resource and reviewed project becomes part of your
              story. Follow the cohort’s progress, grounded in recorded work.
            </p>
            <div className={s.liveStats}>
              <LiveCounts />
            </div>
          </div>
          <div className={s.leaderboardFrame}>
            <LeaderboardPreview />
          </div>
        </div>
      </section>
      <section id="glimpses" className={s.communitySection} aria-labelledby="community-title">
        <div className={s.container}>
          <div className={s.sectionIntro}>
            <div>
              <p className={s.eyebrow}>
                <Users size={16} aria-hidden="true" />
                Our sessions. Our people. Our story.
              </p>
              <h2 id="community-title">
                TechNeeds
                <br />
                Glimpses.
              </h2>
            </div>
            <Link href="/team" className={s.simpleLink}>
              Meet the team <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
          </div>
          <div className={s.communityPhoto}>
            <Image
              src={glimpseImage}
              alt="TechNeeds students learning together at IGDTUW sessions and community events"
              sizes="(min-width: 1280px) 1200px, 100vw"
            />
            <div>
              <span>Made of moments like these.</span>
              <span>TechNeeds · IGDTUW</span>
            </div>
          </div>
          <div className={s.communitySocial}>
            <div><h3>Keep up with TechNeeds.</h3><p>More moments, community updates and what’s coming next.</p></div>
            <SocialLinks />
          </div>
          <div className={s.voices}>
            {testimonials.slice(0, 3).map((t) => (
              <figure key={t.name}>
                <Quote size={25} aria-hidden="true" />
                <blockquote>{t.text}</blockquote>
                <figcaption>
                  <span>
                    {t.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    {t.name}
                    <small>TechNeeds community</small>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
          <details className={s.moreStories}>
            <summary>
              More community stories <Plus size={18} aria-hidden="true" />
            </summary>
            <div className={s.voices}>
              {testimonials.slice(3).map((t) => (
                <figure key={t.name}>
                  <blockquote>{t.text}</blockquote>
                  <figcaption>{t.name}</figcaption>
                </figure>
              ))}
            </div>
          </details>
        </div>
      </section>
      <section className={s.faqSection} aria-labelledby="faq-title">
        <div className={`${s.container} ${s.faqGrid}`}>
          <div>
            <p className={s.eyebrow}>Glad you asked.</p>
            <h2 id="faq-title">
              A little clarity.
              <br />
              Then, let’s go.
            </h2>
            <Link href="/faq" className={s.simpleLink}>
              All your questions <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
          </div>
          <div>
            {faqs.slice(0, 4).map((f) => (
              <details key={f.q}>
                <summary>
                  {f.q}
                  <Plus size={20} aria-hidden="true" />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className={s.finale} aria-labelledby="finale-title">
        <div className={s.finaleRing} aria-hidden="true" />
        <div className={s.container}>
          <p>Your next big thing is waiting.</p>
          <h2 id="finale-title">
            Let’s build
            <br />
            what’s next.
          </h2>
          <Link href="/techboard" className={s.pillButton}>
            I’m in. Let’s go.{" "}
            <span>
              <ArrowUpRight size={20} aria-hidden="true" />
            </span>
          </Link>
          <span className={s.finaleNote}>
            A little courage. A whole community behind you.
          </span>
        </div>
      </section>
    </ExperienceFrame>
  );
}
