"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  ExternalLink,
  Layers,
  Users,
  ArrowRight,
  Sparkles,
  Briefcase,
} from "lucide-react";
import { getAllPrograms } from "@/lib/api";

const COMMUNITY_EVENTS = [
  {
    id: "tn-demo-day",
    title: "TechNeeds Capstone Demo Day",
    date: "Rolling — check your cohort deadline",
    location: "IGDTUW Campus / Hybrid",
    type: "Showcase",
    description:
      "Present verified capstone projects to mentors and peers. Bring your live deploy link and GitHub repository.",
  },
  {
    id: "tn-office-hours",
    title: "Mentor Office Hours",
    date: "Weekly during active cohorts",
    location: "Online",
    type: "Mentorship",
    description:
      "Drop-in sessions for code review questions, quiz prep, and project architecture feedback.",
  },
  {
    id: "tn-hack-prep",
    title: "Hackathon Prep Workshop",
    date: "Announced via cohort channel",
    location: "IGDTUW",
    type: "Workshop",
    description:
      "Team formation, problem framing, and shipping checklist for campus and open hackathons.",
  },
];

export default function EventsPage() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAllPrograms()
      .then((data) => {
        if (Array.isArray(data)) setPrograms(data);
        else setPrograms([]);
      })
      .catch((err) => {
        console.error(err);
        setError("Could not load live opportunities from the API.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="tn-home" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
      <div className="tn-container">
        <div className="tn-section-header" style={{ marginBottom: "2.5rem" }}>
          <div className="tn-badge-cyan tn-badge">EVENTS & OPPORTUNITIES</div>
          <h1 className="tn-section-title">Grow Beyond the Classroom</h1>
          <p className="tn-section-desc">
            Explore live mentorship tracks from the platform API, plus community events for IGDTUW builders.
          </p>
        </div>

        <section style={{ marginBottom: "3.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
            <Briefcase size={18} className="tn-cyan-text" />
            <h2 style={{ fontSize: "1.35rem" }}>Live Cohort Opportunities</h2>
          </div>

          {loading ? (
            <div className="tn-cohorts-loading">
              <div className="tn-spinner" />
              <p>Loading programs from the mentorship API...</p>
            </div>
          ) : error ? (
            <div className="tn-card">
              <p>{error}</p>
              <p style={{ marginTop: "0.5rem", color: "var(--text-muted)" }}>
                Confirm the backend is running on port 5001, then refresh.
              </p>
            </div>
          ) : programs.length === 0 ? (
            <div className="tn-card">
              <p>No active programs are available yet.</p>
            </div>
          ) : (
            <div className="tn-cohorts-grid">
              {programs.map((program) => {
                const mentorCount = program.mentors?.length || 0;
                const resourceCount = program.resources?.length || 0;
                return (
                  <div key={program._id} className="tn-card tn-card-interactive tn-cohort-card">
                    <div className="tn-cohort-top">
                      <span className="tn-cohort-type">Opportunity</span>
                      <span className="tn-cohort-status">● Open</span>
                    </div>
                    <h3 className="tn-cohort-name">{program.name}</h3>
                    <div className="tn-cohort-stats">
                      <div className="tn-stat-item">
                        <Layers size={14} />
                        <span>{resourceCount > 0 ? `${resourceCount} Modules` : "Curated Track"}</span>
                      </div>
                      <div className="tn-stat-item">
                        <Users size={14} />
                        <span>{mentorCount} Mentors</span>
                      </div>
                    </div>
                    <p className="tn-cohort-description">
                      Join this mentorship track for structured modules, quizzes, and mentor-reviewed projects.
                    </p>
                    <div className="tn-cohort-footer">
                      <Link href="/dashboard" className="tn-btn-secondary tn-cohort-btn">
                        <span>Open Mentee Hub</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
            <Calendar size={18} className="tn-cyan-text" />
            <h2 style={{ fontSize: "1.35rem" }}>Community Events</h2>
          </div>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.25rem", maxWidth: "40rem" }}>
            Editorial listings for campus builders. Dates are announced through active cohorts — not simulated user data.
          </p>

          <div className="tn-journey-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {COMMUNITY_EVENTS.map((event) => (
              <article key={event.id} className="tn-card tn-card-interactive">
                <div className="tn-badge-violet tn-badge" style={{ marginBottom: "0.85rem" }}>
                  {event.type}
                </div>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "0.65rem" }}>{event.title}</h3>
                <p style={{ marginBottom: "1rem", color: "var(--text-secondary)" }}>{event.description}</p>
                <div style={{ display: "grid", gap: "0.45rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                    <Calendar size={14} /> {event.date}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                    <MapPin size={14} /> {event.location}
                  </span>
                </div>
              </article>
            ))}
          </div>

          <div className="tn-cta-banner" style={{ marginTop: "2.5rem" }}>
            <div className="tn-cta-content">
              <div className="tn-badge-cyan tn-badge">
                <Sparkles size={12} style={{ marginRight: 6 }} />
                READY TO JOIN?
              </div>
              <h2 className="tn-cta-title">Start with a live cohort opportunity.</h2>
              <p className="tn-cta-desc">
                Log in as a mentee to access curriculum, quizzes, and project submissions tied to your enrolled programs.
              </p>
              <div className="tn-cta-buttons">
                <Link href="/mentee" className="tn-btn-primary">
                  <span>Mentee Login</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/profile" className="tn-btn-secondary">
                  <span>View AI Profile</span>
                  <ExternalLink size={14} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
