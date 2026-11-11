"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Sparkles, Terminal, Code2, Cpu, Rocket, Shield, Trophy, 
  CheckCircle2, ArrowRight, Play, Flame, Star, Users, ExternalLink,
  Layers, Compass, Laptop, Zap, Award
} from 'lucide-react';
import { getAllPrograms, getLeaderboard } from '../../lib/api';
import './homepage.css';

export default function Homepage() {
  const [activeCodeTab, setActiveCodeTab] = useState('ts');
  const [isSimulating, setIsSimulating] = useState(false);
  const [testOutput, setTestOutput] = useState(null);
  const [cohorts, setCohorts] = useState([]);
  const [topRankers, setTopRankers] = useState([]);
  const [loadingCohorts, setLoadingCohorts] = useState(true);

  useEffect(() => {
    // Fetch live cohorts from backend
    getAllPrograms()
      .then(data => {
        if (Array.isArray(data)) {
          setCohorts(data);
        }
      })
      .catch(err => console.error("Error loading cohorts:", err))
      .finally(() => setLoadingCohorts(false));

    // Fetch live leaderboard top 3
    getLeaderboard(3)
      .then(data => {
        if (Array.isArray(data)) {
          setTopRankers(data);
        }
      })
      .catch(err => console.error("Error loading top rankers:", err));
  }, []);

  const runCodeSimulation = () => {
    setIsSimulating(true);
    setTestOutput(null);
    setTimeout(() => {
      setIsSimulating(false);
      setTestOutput({
        passed: 16,
        failed: 0,
        coverage: '98.4%',
        xpEarned: 300,
        status: 'VERIFIED & MERGED'
      });
    }, 1200);
  };

  const codeSnippets = {
    ts: `// TechNeeds AI Growth Engine v2.0
import { evaluateMenteePR, SkillGalaxy } from '@techneeds/core';

export async function submitCapstone(submission: Project) {
  const codeAnalysis = await evaluateMenteePR(submission.repoUrl);
  const updatedGalaxy = await SkillGalaxy.evolve({
    userId: submission.menteeId,
    verifiedScore: codeAnalysis.score, // +300 XP
    category: "Full-Stack Web Systems"
  });

  return {
    verified: true,
    level: "Level 4: Systems Architect",
    aiRecommendation: "Ready for Distributed Systems Cohort"
  };
}`,
    py: `# AI Mentor Neural Evaluator
import techneeds_ai as tn

def assess_cohort_trajectory(mentee_id: str):
    activity = tn.fetch_mentee_stream(mentee_id)
    strengths, next_milestones = tn.GrowthCoach.synthesize(activity)
    
    return {
        "leaderboard_rank": 1,
        "active_streak": 14,
        "badges": ["Century Club", "Ship It", "Quiz Master"],
        "recommended_next": "System Design & Caching"
    }`,
    rust: `// High-Performance Assessment Runner
pub fn verify_student_work(run: &TestRun) -> Result<Evaluation, Error> {
    let telemetry = run.execute_isolated_sandbox()?;
    assert_eq!(telemetry.leaks, 0);
    
    Ok(Evaluation {
        xp_awarded: 300,
        tier: Tier::Grandmaster,
        mentor_approved: true,
    })
}`
  };

  return (
    <div className="tn-home">
      {/* 1. HERO SECTION */}
      <section className="tn-hero">
        <div className="tn-hero-glow-1" />
        <div className="tn-hero-glow-2" />
        
        <div className="tn-container">
          <div className="tn-hero-badge-wrap">
            <div className="tn-hero-badge">
              <Sparkles size={14} className="tn-cyan-text" />
              <span>THE AI-POWERED MENTORSHIP UNIVERSE</span>
            </div>
          </div>

          <h1 className="tn-hero-headline">
            Where Future Developers <br />
            <span className="gradient-text-cyan">Find Their Edge.</span>
          </h1>

          <p className="tn-hero-subheading">
            Your all-in-one mentorship universe to learn, build, collaborate, and grow with AI-powered guidance.
          </p>

          <div className="tn-hero-cta-group">
            <Link href="/dashboard" className="tn-btn-primary tn-hero-btn">
              <span>Launch Mentee Hub</span>
              <ArrowRight size={16} />
            </Link>
            <Link href="/profile" className="tn-btn-cyan tn-hero-btn">
              <Sparkles size={16} />
              <span>Experience AI Profile</span>
            </Link>
            <a href="#cohorts" className="tn-btn-secondary tn-hero-btn">
              <span>Explore Cohorts</span>
            </a>
          </div>

          {/* Metrics Strip */}
          <div className="tn-metrics-strip">
            <div className="tn-metric-item">
              <div className="tn-metric-val">500+</div>
              <div className="tn-metric-lbl">Active Mentees Enrolled</div>
            </div>
            <div className="tn-metric-divider" />
            <div className="tn-metric-item">
              <div className="tn-metric-val">94%</div>
              <div className="tn-metric-lbl">Capstone Completion Rate</div>
            </div>
            <div className="tn-metric-divider" />
            <div className="tn-metric-item">
              <div className="tn-metric-val">45+</div>
              <div className="tn-metric-lbl">Production Apps Shipped</div>
            </div>
            <div className="tn-metric-divider" />
            <div className="tn-metric-item">
              <div className="tn-metric-val">4.9 / 5.0</div>
              <div className="tn-metric-lbl">Senior Mentor Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE MENTORSHIP JOURNEY */}
      <section className="tn-section tn-journey-section">
        <div className="tn-container">
          <div className="tn-section-header">
            <div className="tn-badge-violet tn-badge">HOW IT WORKS</div>
            <h2 className="tn-section-title">The Engineered Mentorship Journey</h2>
            <p className="tn-section-desc">
              From day one baseline diagnostic to production capstone deployment, our 5-stage pipeline turns curious learners into verified engineers.
            </p>
          </div>

          <div className="tn-journey-grid">
            <div className="tn-card tn-card-interactive tn-journey-card">
              <div className="tn-step-num">01</div>
              <div className="tn-journey-icon">
                <Compass size={22} />
              </div>
              <h3 className="tn-journey-step-title">Diagnostic & Roadmap</h3>
              <p className="tn-journey-step-desc">
                AI assesses your baseline programming skills and maps an optimized, milestone-driven syllabus tailored to your chosen cohort.
              </p>
              <div className="tn-journey-tag">Step 1 • Personalized</div>
            </div>

            <div className="tn-card tn-card-interactive tn-journey-card">
              <div className="tn-step-num">02</div>
              <div className="tn-journey-icon">
                <Layers size={22} />
              </div>
              <h3 className="tn-journey-step-title">Curated Cohort Modules</h3>
              <p className="tn-journey-step-desc">
                Complete hands-on video tutorials, comprehensive documentation, and interactive quizzes designed by engineering mentors.
              </p>
              <div className="tn-journey-tag">Step 2 • Active Learning</div>
            </div>

            <div className="tn-card tn-card-interactive tn-journey-card">
              <div className="tn-step-num">03</div>
              <div className="tn-journey-icon">
                <Laptop size={22} />
              </div>
              <h3 className="tn-journey-step-title">1-on-1 Mentor Code Review</h3>
              <p className="tn-journey-step-desc">
                Submit pull requests. Senior engineers review your code structure, clean coding patterns, error handling, and performance.
              </p>
              <div className="tn-journey-tag">Step 3 • Expert Feedback</div>
            </div>

            <div className="tn-card tn-card-interactive tn-journey-card">
              <div className="tn-step-num">04</div>
              <div className="tn-journey-icon">
                <Rocket size={22} />
              </div>
              <h3 className="tn-journey-step-title">Production Capstone Shipping</h3>
              <p className="tn-journey-step-desc">
                Deploy full-stack applications with live URLs and public GitHub repositories, earning verified scores on the leaderboard.
              </p>
              <div className="tn-journey-tag">Step 4 • Production Ready</div>
            </div>

            <div className="tn-card tn-card-interactive tn-journey-card">
              <div className="tn-step-num">05</div>
              <div className="tn-journey-icon">
                <Award size={22} />
              </div>
              <h3 className="tn-journey-step-title">Verified AI Developer Profile</h3>
              <p className="tn-journey-step-desc">
                Share your tamper-proof, privacy-aware developer identity card with recruiters, showcasing your evolving Skill Galaxy and badges.
              </p>
              <div className="tn-journey-tag">Step 5 • Career Launch</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED COHORTS (REAL BACKEND DATA) */}
      <section id="cohorts" className="tn-section tn-cohorts-section">
        <div className="tn-container">
          <div className="tn-section-header">
            <div className="tn-badge-cyan tn-badge">LIVE COHORTS</div>
            <h2 className="tn-section-title">Explore Active Mentorship Tracks</h2>
            <p className="tn-section-desc">
              Join specialized developer cohorts led by experienced mentors with real-time syllabus tracking and assessments.
            </p>
          </div>

          {loadingCohorts ? (
            <div className="tn-cohorts-loading">
              <div className="tn-spinner" />
              <p>Connecting to MongoDB Atlas cohort registry...</p>
            </div>
          ) : (
            <div className="tn-cohorts-grid">
              {cohorts.slice(0, 6).map((cohort) => {
                const resourceCount = cohort.resources?.length || 0;
                const mentorCount = cohort.mentors?.length || 1;
                return (
                  <div key={cohort._id} className="tn-card tn-card-interactive tn-cohort-card">
                    <div className="tn-cohort-top">
                      <span className="tn-cohort-type">Cohort Program</span>
                      <span className="tn-cohort-status">● Live</span>
                    </div>

                    <h3 className="tn-cohort-name">{cohort.name}</h3>

                    <div className="tn-cohort-stats">
                      <div className="tn-stat-item">
                        <Layers size={14} />
                        <span>{resourceCount > 0 ? `${resourceCount} Modules` : 'Curated Track'}</span>
                      </div>
                      <div className="tn-stat-item">
                        <Users size={14} />
                        <span>{mentorCount} Senior Mentors</span>
                      </div>
                    </div>

                    <p className="tn-cohort-description">
                      Intensive syllabus covering architecture, hands-on milestones, quizzes, and a final capstone reviewed by mentors.
                    </p>

                    <div className="tn-cohort-footer">
                      <Link href="/dashboard" className="tn-btn-secondary tn-cohort-btn">
                        <span>View Roadmap</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 4. HALL OF FAME & COMMUNITY IMPACT */}
      <section className="tn-section tn-hall-section">
        <div className="tn-container">
          <div className="tn-section-header">
            <div className="tn-badge-amber tn-badge">HALL OF FAME</div>
            <h2 className="tn-section-title">Top Performing Developers</h2>
            <p className="tn-section-desc">
              Meet our active top leaderboard rankers. Real scores earned through verified quizzes, streaks, and shipped projects.
            </p>
          </div>

          <div className="tn-podium-grid">
            {topRankers.map((ranker) => (
              <div key={ranker.rank} className={`tn-card tn-podium-card rank-${ranker.rank}`}>
                <div className="tn-rank-crown">
                  {ranker.rank === 1 && '🥇 Rank #1'}
                  {ranker.rank === 2 && '🥈 Rank #2'}
                  {ranker.rank === 3 && '🥉 Rank #3'}
                </div>
                <div className="tn-ranker-avatar">
                  {ranker.name.charAt(0)}
                </div>
                <h3 className="tn-ranker-name">{ranker.name}</h3>
                <div className="tn-ranker-score">
                  <Trophy size={16} className="text-amber" />
                  <span>{ranker.totalScore} XP</span>
                </div>
                <div className="tn-ranker-streak">
                  <Flame size={14} className="text-rose" />
                  <span>{ranker.streak} Day Streak</span>
                </div>
                <Link href="/leaderboard" className="tn-ranker-link">
                  <span>View Full Table</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            ))}
          </div>

          {/* Testimonial Highlights */}
          <div className="tn-testimonials-grid">
            <div className="tn-card tn-quote-card">
              <div className="tn-quote-stars">★★★★★</div>
              <p className="tn-quote-text">
                "TechNeeds 2.0 gave me the structured feedback I needed. The AI Growth Coach diagnosed where my React code was lagging, and my mentor verified my project in hours."
              </p>
              <div className="tn-quote-author">
                <strong>Vidushi Agarwal</strong>
                <span>Level 4 Systems Architect • 1058 XP</span>
              </div>
            </div>

            <div className="tn-card tn-quote-card">
              <div className="tn-quote-stars">★★★★★</div>
              <p className="tn-quote-text">
                "The Skill Galaxy visualization is incredible. Seeing my technical skills evolve as I solved quizzes made learning addictive. Best hackathon mentorship platform."
              </p>
              <div className="tn-quote-author">
                <strong>Joy S.</strong>
                <span>Full-Stack Builder • 444 XP</span>
              </div>
            </div>

            <div className="tn-card tn-quote-card">
              <div className="tn-quote-stars">★★★★★</div>
              <p className="tn-quote-text">
                "As a mentor, grading unverified projects with direct GitHub inspection and instant scoring streamlines what used to take days into minutes."
              </p>
              <div className="tn-quote-author">
                <strong>Dr. Smith</strong>
                <span>Lead Mentor • Web Development Cohort</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION LAUNCH BANNER */}
      <section className="tn-section tn-cta-section">
        <div className="tn-container">
          <div className="tn-cta-banner">
            <div className="tn-cta-content">
              <div className="tn-badge-cyan tn-badge">READY TO ACCELERATE?</div>
              <h2 className="tn-cta-title">Start Your Developer Journey Today.</h2>
              <p className="tn-cta-desc">
                Join our cohorts, get your code evaluated by senior mentors, build your verifiable AI profile, and land your dream tech role.
              </p>
              <div className="tn-cta-buttons">
                <Link href="/dashboard" className="tn-btn-primary">
                  <span>Enter Mentee Hub</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/mentor" className="tn-btn-secondary">
                  <span>Mentor Portal</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
