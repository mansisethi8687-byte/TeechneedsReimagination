"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDown,
  Braces,
  Check,
  CheckCircle2,
  Code2,
  Command,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { cohorts } from "@/content/site";
import techneedsLogo from "@/assets/logo.png";
import brand from "./brandSculpture.module.css";
import s from "./premium.module.css";

export function ExperienceFrame({ children }) {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return (
    <div
      className={s.experience}
      data-motion={paused || reduced ? "paused" : "on"}
    >
      {children}
      <button
        type="button"
        className={s.motionControl}
        onClick={() => setPaused((p) => !p)}
        disabled={reduced}
        aria-pressed={paused || reduced}
      >
        {paused || reduced ? (
          <Play size={13} aria-hidden="true" />
        ) : (
          <Pause size={13} aria-hidden="true" />
        )}
        {reduced ? "Reduced motion" : paused ? "Play motion" : "Pause motion"}
      </button>
    </div>
  );
}

export function HeroScene() {
  const scene = useRef(null);
  const frame = useRef(null);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function move(event) {
    if (
      event.pointerType !== "mouse" ||
      scene.current.closest('[data-motion="paused"]')
    )
      return;
    const box = scene.current.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      scene.current?.style.setProperty("--look-x", `${x * 12}px`);
      scene.current?.style.setProperty("--look-y", `${y * 12}px`);
    });
  }

  function reset() {
    cancelAnimationFrame(frame.current);
    scene.current?.style.setProperty("--look-x", "0px");
    scene.current?.style.setProperty("--look-y", "0px");
  }

  return (
    <section
      className={s.hero}
      ref={scene}
      onPointerMove={move}
      onPointerLeave={reset}
      aria-labelledby="hero-title"
    >
      <div className={s.heroInner}>
        <div className={s.heroCopy}>
          <p className={s.heroEyebrow}>
            <span />TechNeeds IGDTUW · A little curiosity goes a long way.
          </p>
          <h1 id="hero-title">
            Learn it.
            <br />
            Build it.
            <br />
            <span>Own it.</span>
          </h1>
          <p className={s.heroDescription}>
            Big ambitions. Real projects. People in your corner.
            <br className={s.desktopBreak} /> Your next chapter in tech starts
            here.
          </p>
          <div className={s.heroActions}>
            <Link href="/techboard" className={s.pillButton}>
              Find your people{" "}
              <span>
                <ArrowUpRight size={19} aria-hidden="true" />
              </span>
            </Link>
            <a href="#experience" className={s.heroSecondary}>
              <span className={s.playCircle}>
                <Play size={12} fill="currentColor" aria-hidden="true" />
              </span>
              Take a look around
            </a>
          </div>
        </div>
        <div className={brand.stage} aria-hidden="true">
          <div className={brand.light} />
          <div className={brand.scene}>
            <div className={brand.orbit} />
            <div className={brand.orbitInner} />
            <div className={brand.emblem}>
              <div className={brand.coin}>
                <div className={brand.face}>
                  <Image src={techneedsLogo} alt="" width={280} height={280} priority />
                </div>
              </div>
            </div>
            <div className={brand.signature}>
              <strong>TechNeeds</strong>
              <span>IGDTUW</span>
              <small>Curiosity. Code. Community.</small>
            </div>
          </div>
          <div className={brand.plinth} />
        </div>
        <div className={s.heroBottom}>
          <p>
            TechNeeds <span>×</span> IGDTUW
          </p>
          <a href="#experience">
            Scroll to explore <ArrowDown size={16} aria-hidden="true" />
          </a>
          <span>Made for the next generation of builders.</span>
        </div>
      </div>
    </section>
  );
}

const trackDetails = [
  {
    short: "Web development",
    label: "From a blank tab to your own corner of the internet.",
    description:
      "Make interfaces people want to use. Explore the foundations of the web and bring your ideas to life in the browser.",
    skills: ["Interfaces", "JavaScript", "Web projects"],
    tone: "blue",
    title: "Hello, world.",
    note: "Your idea. On the internet.",
  },
  {
    short: "DSA in C/C++",
    label: "Big problems. Elegant little solutions.",
    description:
      "Learn to break problems down, recognize patterns and turn your reasoning into efficient code.",
    skills: ["Problem solving", "Algorithms", "C / C++"],
    tone: "peach",
    title: "Find your flow.",
    note: "One clear step at a time.",
  },
  {
    short: "Machine learning",
    label: "Find the patterns. Build the possibilities.",
    description:
      "Get curious about data, understand how models learn and explore the ideas behind intelligent applications.",
    skills: ["Data", "Models", "Experiments"],
    tone: "lilac",
    title: "Connect the dots.",
    note: "A new way to see the data.",
  },
  {
    short: "DSA in Java",
    label: "A stronger foundation for your next big idea.",
    description:
      "Build your confidence with Java, data structures and the problem-solving habits that make you a better developer.",
    skills: ["Java", "Data structures", "Logic"],
    tone: "yellow",
    title: "Think. Then build.",
    note: "Good foundations go a long way.",
  },
  {
    short: "AR / VR",
    label: "Some ideas don’t fit inside a screen.",
    description:
      "Explore immersive technology, spatial thinking and the possibilities of building for a different kind of reality.",
    skills: ["Spatial thinking", "Immersion", "Experiences"],
    tone: "mint",
    title: "A new dimension.",
    note: "Go beyond the ordinary.",
  },
  {
    short: "App development",
    label: "An everyday idea. An app of your own.",
    description:
      "Explore how mobile experiences work, from the first screen to the interactions that make an app feel right.",
    skills: ["Mobile interfaces", "Interactions", "App projects"],
    tone: "pink",
    title: "Make it happen.",
    note: "Big ideas, pocket-sized.",
  },
];

function TrackArt({ index }) {
  if (index === 0)
    return (
      <div className={s.codeWindow} aria-hidden="true">
        <div className={s.windowBar}>
          <i />
          <i />
          <i />
          <span>your-next-big-thing.js</span>
        </div>
        <div className={s.codeLines}>
          <span>
            const <b>you</b> = &#123;
          </span>
          <span>
            &nbsp; curiosity: <em>"limitless"</em>,
          </span>
          <span>
            &nbsp; idea: <em>"something great"</em>,
          </span>
          <span>
            &nbsp; ready: <strong>true</strong>
          </span>
          <span>&#125;;</span>
          <span className={s.codeLast}>
            build(you);
            <i />
          </span>
        </div>
        <div className={s.windowFoot}>
          <CheckCircle2 size={14} />
          Possibilities ready.
        </div>
      </div>
    );
  if (index === 1)
    return (
      <div className={s.flowArt} aria-hidden="true">
        <div>idea</div>
        <span>↓</span>
        <div className={s.flowBranch}>
          <span>think</span>
          <span>try</span>
        </div>
        <span>↓</span>
        <div className={s.flowResult}>
          <Check size={24} /> solve
        </div>
      </div>
    );
  if (index === 2)
    return (
      <div className={s.dataArt} aria-hidden="true">
        {Array.from({ length: 25 }, (_, i) => (
          <i
            key={i}
            style={{
              "--i": i,
              "--x": `${10 + ((i * 37) % 80)}%`,
              "--y": `${10 + ((i * 23) % 80)}%`,
            }}
          />
        ))}
        <span className={s.dataRing} />
        <span className={s.dataLabel}>
          <Sparkles size={16} />
          Pattern found.
        </span>
      </div>
    );
  if (index === 3)
    return (
      <div className={s.javaArt} aria-hidden="true">
        <span>&#123;</span>
        <div>
          <Code2 size={48} />
          <p>
            make
            <br />
            it work.
          </p>
        </div>
        <span>&#125;</span>
      </div>
    );
  if (index === 4)
    return (
      <div className={s.spatialArt} aria-hidden="true">
        <div />
        <div />
        <div />
        <span>Beyond the screen ↗</span>
      </div>
    );
  return (
    <div className={s.phoneArt} aria-hidden="true">
      <span className={s.phoneCamera} />
      <div className={s.phoneGreeting}>
        Today looks
        <br />
        <b>full of possibility.</b>
      </div>
      <div className={s.phoneOrb}>
        <Sparkles size={38} />
      </div>
      <div className={s.phoneLine} />
      <div className={s.phoneLine} />
      <span className={s.phoneCta}>
        Let’s build <ArrowUpRight size={16} />
      </span>
    </div>
  );
}

export function CohortExplorer() {
  const [active, setActive] = useState(0);
  const tabs = useRef([]);
  const track = trackDetails[active];
  function navigate(event, index) {
    let next;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = (index + 1) % cohorts.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = (index + cohorts.length - 1) % cohorts.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = cohorts.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }
  return (
    <div className={s.explorer}>
      <div
        className={s.trackTabs}
        role="tablist"
        aria-label="Explore mentorship tracks"
      >
        {trackDetails.map((t, i) => (
          <button
            type="button"
            key={t.short}
            role="tab"
            id={`track-${i}`}
            aria-controls="track-panel"
            aria-selected={active === i}
            tabIndex={active === i ? 0 : -1}
            ref={(node) => {
              tabs.current[i] = node;
            }}
            onClick={() => setActive(i)}
            onKeyDown={(e) => navigate(e, i)}
          >
            {t.short}
            <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="track-panel"
        aria-labelledby={`track-${active}`}
        tabIndex={0}
        className={s.trackPanel}
      >
        <div key={active} className={s.trackVisual} data-tone={track.tone}>
          <div className={s.trackVisualTop}>
            <span>Explore what you could build</span>
            <Command size={20} aria-hidden="true" />
          </div>
          <TrackArt index={active} />
          <div className={s.trackVisualBottom}>
            <h3>{track.title}</h3>
            <p>{track.note}</p>
          </div>
        </div>
        <div className={s.trackCopy}>
          <p className={s.eyebrow}>Find your starting point</p>
          <h3>{track.label}</h3>
          <p>{track.description}</p>
          <ul className={s.skillTags}>
            {track.skills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
          <div className={s.mentorLine}>
            <span>
              {cohorts[active].lead
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <p>
              Your cohort lead<strong>{cohorts[active].lead}</strong>
            </p>
          </div>
          <Link href="/techboard" className={s.darkButton}>
            How to join this track <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function LearningPlayground() {
  const [answer, setAnswer] = useState(null);
  const [checked, setChecked] = useState(false);
  const options = ["[1, 2, 3]", "[2, 4, 6]", "[3, 6, 9]"];
  const correct = answer === 1;
  function retry() {
    setChecked(false);
    setAnswer(null);
  }
  return (
    <div className={s.playground}>
      <div className={s.challengeTop}>
        <span>
          <Braces size={18} aria-hidden="true" />A tiny JavaScript challenge
        </span>
        <span>Interactive preview</span>
      </div>
      <div className={s.challengeBody}>
        <p className={s.challengeQuestion}>What comes out of this?</p>
        <pre>
          <code>
            <span>const</span> numbers = [1, 2, 3];{"\n"}numbers.<b>map</b>(n
            =&gt; n * 2);
          </code>
        </pre>
        <fieldset disabled={checked && correct}>
          <legend className="sr-only">Choose the resulting array</legend>
          <div className={s.answerOptions}>
            {options.map((option, i) => (
              <label
                key={option}
                className={s.answerOption}
                data-selected={answer === i}
                data-result={
                  checked && answer === i
                    ? correct
                      ? "correct"
                      : "incorrect"
                    : undefined
                }
              >
                <input
                  type="radio"
                  name="sample-answer"
                  value={i}
                  checked={answer === i}
                  onChange={() => {
                    setAnswer(i);
                    setChecked(false);
                  }}
                />
                <span>{option}</span>
                {checked &&
                  answer === i &&
                  (correct ? (
                    <Check size={18} aria-hidden="true" />
                  ) : (
                    <X size={18} aria-hidden="true" />
                  ))}
              </label>
            ))}
          </div>
        </fieldset>
        <div className={s.answerFeedback} aria-live="polite" aria-atomic="true">
          {checked ? (
            correct ? (
              <p>
                <CheckCircle2 size={18} aria-hidden="true" />
                <span>
                  <strong>That’s a little win.</strong> map creates a new array,
                  doubling each number.
                </span>
              </p>
            ) : (
              <p>
                <span>
                  <strong>One more try?</strong> Multiply each number by two,
                  then keep the results in order.
                </span>
              </p>
            )
          ) : (
            <p>No pressure. Every great developer starts somewhere.</p>
          )}
        </div>
        <div className={s.challengeActions}>
          {checked && correct ? (
            <button type="button" onClick={retry}>
              <RotateCcw size={16} aria-hidden="true" />
              Try again
            </button>
          ) : (
            <button
              type="button"
              disabled={answer === null}
              onClick={() => setChecked(true)}
            >
              Check my answer <ArrowRight size={17} aria-hidden="true" />
            </button>
          )}
          <span>Just a preview. No score is saved.</span>
        </div>
      </div>
      {checked && correct && (
        <div className={s.confetti} aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <i key={i} style={{ "--i": i, "--angle": `${i * 30}deg` }} />
          ))}
        </div>
      )}
    </div>
  );
}
