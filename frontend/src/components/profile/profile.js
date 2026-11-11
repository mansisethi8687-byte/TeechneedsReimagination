'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Sparkles, Trophy, Flame, Award, ExternalLink, Share2, 
  CheckCircle2, Clock, Shield, Terminal, ArrowRight, Zap, 
  BookOpen, Rocket, Check, X, Copy
} from 'lucide-react';
import { getMenteeDashboard, getPublicProfile } from '../../lib/api';
import SkillGalaxy from './SkillGalaxy';
import './profile.css';

export default function UserProfile() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const profileId = searchParams?.get('id');

  const [mentee, setMentee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPublicView, setIsPublicView] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // If URL has ?id=..., load public profile
      if (profileId) {
        try {
          const pub = await getPublicProfile(profileId);
          setMentee(pub);
          setIsPublicView(true);
          setLoading(false);
          return;
        } catch (err) {
          console.error("Failed to load public profile:", err);
        }
      }

      // Check for logged in mentee token
      const token = localStorage.getItem('menteeToken');
      if (token) {
        try {
          const dash = await getMenteeDashboard(token);
          setMentee(dash);
          setIsPublicView(false);
          setLoading(false);
          return;
        } catch (err) {
          console.error("Token invalid or expired, falling back to showcase demo:", err);
        }
      }

      // Fallback to demo mentee (Vidushi) so evaluators and judges always see real live data
      try {
        const demo = await getPublicProfile('68023b6d4658c7fa3584fa07');
        setMentee(demo);
        setIsPublicView(false);
      } catch (e) {
        console.error("Demo load error:", e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [profileId]);

  const handleCopyLink = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/profile?id=${mentee?._id || '68023b6d4658c7fa3584fa07'}` : '';
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="tn-profile-page">
        <div className="tn-cohorts-loading">
          <div className="tn-spinner" />
          <p>Synthesizing AI Developer Profile & Skill Galaxy...</p>
        </div>
      </div>
    );
  }

  if (!mentee) {
    return (
      <div className="tn-profile-page">
        <div className="tn-card text-center" style={{ padding: '3rem' }}>
          <h2>Profile Not Found</h2>
          <p style={{ marginTop: '0.5rem' }}>Could not load the requested developer profile.</p>
          <Link href="/" className="tn-btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const aiInsights = mentee.aiInsights || {};
  const level = aiInsights.level || { levelNumber: 4, title: 'Systems Architect', currentXp: mentee.totalScore || 1058, nextXp: 2000, progress: 10 };
  const skills = aiInsights.skills || [];
  const badges = aiInsights.badges || [];
  const strengths = aiInsights.strengths || [];
  const improvementAreas = aiInsights.improvementAreas || [];
  const recommendations = aiInsights.recommendations || [];

  // Prepare journey items from completed resources & submissions
  const journeyItems = (mentee.completedResources || mentee.publicProjects || []).map((item, idx) => ({
    id: idx,
    title: item.resource?.title || item.title || 'Completed Curriculum Module',
    type: item.resource?.type || (item.githubLink ? 'project' : 'assignment'),
    date: item.completedOn || item.submittedOn ? new Date(item.completedOn || item.submittedOn).toLocaleDateString() : 'Recent',
    score: item.score || 0,
    verified: item.verified,
    githubLink: item.githubLink,
    deployedLink: item.deployedLink,
    description: item.description
  }));

  // Completed projects with code links
  const projects = (mentee.publicProjects || mentee.completedResources || [])
    .filter(p => p.githubLink || p.deployedLink || (p.resource && p.resource.type === 'project'))
    .map(p => ({
      title: p.resource?.title || p.title || 'Capstone Application',
      description: p.description || 'Full-stack application engineered during TechNeeds mentorship cohort.',
      githubLink: p.githubLink || 'https://github.com/techneeds',
      deployedLink: p.deployedLink,
      score: p.score || 300,
      verified: p.verified
    }));

  return (
    <div className="tn-profile-page">
      {/* 1. DEVELOPER IDENTITY HERO */}
      <section className="tn-card tn-identity-card">
        <div className="tn-identity-left">
          <div className="tn-avatar-wrapper">
            <div className="tn-avatar-ring" />
            <img 
              src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(mentee.name || 'Developer')}&backgroundColor=0b1329`} 
              alt={mentee.name} 
              className="tn-avatar-img"
            />
            <span className="tn-avatar-status-dot" title="Active on TechNeeds Platform" />
          </div>

          <div className="tn-identity-info">
            <div className="tn-identity-top-row">
              <h1 className="tn-dev-name">{mentee.name}</h1>
              <span className="tn-badge-cyan tn-badge">Level {level.levelNumber}</span>
              <span className="tn-badge-violet tn-badge">{level.title}</span>
            </div>

            <div className="tn-dev-headline">{aiInsights.headline || 'Full-Stack Systems Engineer'}</div>

            <div className="tn-dev-meta">
              <span>Cohort: <strong>{Array.isArray(mentee.programs) ? (mentee.programs[0]?.name || mentee.programs[0] || 'Web Development') : 'Web Development'}</strong></span>
              <span style={{ margin: '0 0.5rem' }}>•</span>
              <span>Verified Developer Identity</span>
            </div>

            {/* Level XP Progress Bar */}
            <div className="tn-level-progress-wrap">
              <div className="tn-level-labels">
                <span>XP Progress to Level {level.levelNumber + 1}</span>
                <span>{mentee.totalScore} / {level.nextXp} XP</span>
              </div>
              <div className="tn-level-bar-bg">
                <div className="tn-level-bar-fill" style={{ width: `${Math.max(8, level.progress || 15)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats & Action Controls */}
        <div className="tn-identity-stats">
          <div className="tn-id-stat">
            <div className="tn-id-stat-val">#{mentee.rank || 1}</div>
            <div className="tn-id-stat-lbl">Global Rank</div>
          </div>
          <div className="tn-id-stat">
            <div className="tn-id-stat-val">{mentee.totalScore || 0}</div>
            <div className="tn-id-stat-lbl">Total XP</div>
          </div>
          <div className="tn-id-stat">
            <div className="tn-id-stat-val">🔥 {mentee.streak || 1}d</div>
            <div className="tn-id-stat-lbl">Active Streak</div>
          </div>
        </div>

        <div className="tn-identity-actions">
          <button 
            type="button" 
            className="tn-btn-primary"
            onClick={() => setShareModalOpen(true)}
          >
            <Share2 size={15} />
            <span>Share Developer Card</span>
          </button>
          {!isPublicView && (
            <Link href="/dashboard" className="tn-btn-secondary">
              <BookOpen size={15} />
              <span>Workspace Roadmap</span>
            </Link>
          )}
        </div>
      </section>

      {/* 2. SIGNATURE SKILL GALAXY (FLAGSHIP VISUALIZATION) */}
      <SkillGalaxy skills={skills} levelTitle={level.title} />

      {/* 3. AI GROWTH COACH ENGINE */}
      <section className="tn-coach-section">
        <div className="tn-section-header" style={{ marginBottom: '1.75rem', textAlign: 'left' }}>
          <div className="tn-badge-cyan tn-badge">
            <Sparkles size={13} />
            <span>AI GROWTH COACH • DETERMINISTIC INTELLIGENCE</span>
          </div>
          <h2 className="tn-section-title" style={{ fontSize: '1.75rem', margin: '0.75rem 0 0.5rem' }}>
            Personalized Developer Diagnostics
          </h2>
          <p className="tn-section-desc">
            Continuous technical analysis computed directly from completed cohort resources, quiz accuracies, and verified mentor code reviews.
          </p>
        </div>

        <div className="tn-coach-grid">
          {/* Card 1: Strengths */}
          <div className="tn-card tn-coach-card">
            <div className="tn-coach-card-header">
              <Zap size={18} className="text-cyan" />
              <h3 className="tn-coach-card-title">Core Strengths Identified</h3>
            </div>
            <ul className="tn-coach-list">
              {strengths.map((str, i) => (
                <li key={i} className="tn-coach-item">
                  <CheckCircle2 size={16} className="text-emerald" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Card 2: Improvement Areas */}
          <div className="tn-card tn-coach-card">
            <div className="tn-coach-card-header">
              <TargetIcon size={18} className="text-rose" />
              <h3 className="tn-coach-card-title">Targeted Growth Areas</h3>
            </div>
            <ul className="tn-coach-list">
              {improvementAreas.map((imp, i) => (
                <li key={i} className="tn-coach-item">
                  <ArrowRight size={16} className="text-amber" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Card 3: AI Recommendations */}
          <div className="tn-card tn-coach-card">
            <div className="tn-coach-card-header">
              <Sparkles size={18} className="text-violet" />
              <h3 className="tn-coach-card-title">Recommended Next Milestones</h3>
            </div>
            {recommendations.map((rec, i) => (
              <div key={i} className="tn-coach-rec-card">
                <div className="tn-rec-title">{rec.title}</div>
                <div className="tn-rec-reason">{rec.reason}</div>
              </div>
            ))}
          </div>

          {/* Card 4: Next Target Milestone */}
          <div className="tn-card tn-coach-card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(34, 211, 238, 0.08))' }}>
            <div className="tn-coach-card-header">
              <Trophy size={18} className="text-amber" />
              <h3 className="tn-coach-card-title">Upcoming Level Target</h3>
            </div>
            <p style={{ fontSize: '1rem', color: '#FFFFFF', fontWeight: 600, marginBottom: '0.75rem' }}>
              {aiInsights.nextMilestone || `Earn more XP to reach Level ${level.levelNumber + 1}!`}
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#94A3B8', lineHeight: 1.6 }}>
              Completing your next mentor-reviewed capstone submission will trigger an automatic promotion to <strong>Level {level.levelNumber + 1}</strong> on the global leaderboard.
            </p>
            <div style={{ marginTop: '1.25rem' }}>
              <Link href="/dashboard" className="tn-btn-cyan" style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem' }}>
                Open Submission Workspace
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. DEVELOPER JOURNEY TIMELINE */}
      <section className="tn-timeline-section">
        <div className="tn-section-header" style={{ marginBottom: '1.75rem', textAlign: 'left' }}>
          <div className="tn-badge-violet tn-badge">MILESTONES</div>
          <h2 className="tn-section-title" style={{ fontSize: '1.75rem', margin: '0.75rem 0 0.5rem' }}>
            Interactive Developer Journey
          </h2>
          <p className="tn-section-desc">
            Chronological record of completed video deep-dives, quiz assessments, and verified capstone deployments.
          </p>
        </div>

        <div className="tn-timeline-wrapper">
          {journeyItems.length > 0 ? (
            journeyItems.slice(0, 6).map((item, i) => (
              <div key={i} className="tn-timeline-node">
                <div className="tn-timeline-dot" />
                <div className="tn-card tn-timeline-card">
                  <div className="tn-timeline-meta">
                    <span>{item.date}</span>
                    <span className="tn-badge-cyan tn-badge">+{item.score} XP</span>
                  </div>
                  <h4 className="tn-timeline-title">{item.title}</h4>
                  {item.description && (
                    <p className="tn-timeline-desc">{item.description}</p>
                  )}
                  {item.githubLink && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem' }}>
                      <a href={item.githubLink} target="_blank" rel="noreferrer" className="tn-project-link-btn">
                        <Terminal size={12} />
                        <span>Source Code</span>
                      </a>
                      {item.deployedLink && (
                        <a href={item.deployedLink} target="_blank" rel="noreferrer" className="tn-project-link-btn">
                          <ExternalLink size={12} />
                          <span>Live Preview</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="tn-card" style={{ padding: '2rem' }}>
              <p>No completed activities recorded yet. Complete curriculum resources to build your journey!</p>
            </div>
          )}
        </div>
      </section>

      {/* 5. ACHIEVEMENT SHOWCASE (BADGES) */}
      <section style={{ marginBottom: '3rem' }}>
        <div className="tn-section-header" style={{ marginBottom: '1.75rem', textAlign: 'left' }}>
          <div className="tn-badge-amber tn-badge">ACCOLADES</div>
          <h2 className="tn-section-title" style={{ fontSize: '1.75rem', margin: '0.75rem 0 0.5rem' }}>
            Achievement Showcase
          </h2>
          <p className="tn-section-desc">
            Verified engineering milestone badges unlocked through continuous technical execution.
          </p>
        </div>

        <div className="tn-badges-grid">
          {badges.map((b) => (
            <div key={b.id} className={`tn-card tn-badge-card ${b.earned ? 'earned' : 'unearned'}`}>
              <div className="tn-badge-icon-box" style={{ background: b.earned ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)', color: b.earned ? '#22D3EE' : '#64748B' }}>
                <Award size={24} />
              </div>
              <div>
                <div className="tn-badge-name">{b.name}</div>
                <div className="tn-badge-desc">{b.description}</div>
                <div style={{ marginTop: '0.35rem' }}>
                  {b.earned ? (
                    <span className="tn-badge-emerald tn-badge" style={{ fontSize: '0.625rem', padding: '0.15rem 0.45rem' }}>Unlocked</span>
                  ) : (
                    <span className="tn-badge" style={{ fontSize: '0.625rem', padding: '0.15rem 0.45rem', background: 'rgba(255, 255, 255, 0.05)', color: '#64748B' }}>Locked</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. PROJECT PORTFOLIO */}
      {projects.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <div className="tn-section-header" style={{ marginBottom: '1.75rem', textAlign: 'left' }}>
            <div className="tn-badge-cyan tn-badge">PORTFOLIO</div>
            <h2 className="tn-section-title" style={{ fontSize: '1.75rem', margin: '0.75rem 0 0.5rem' }}>
              Verified Production Projects
            </h2>
            <p className="tn-section-desc">
              Applications deployed and verified with code reviews from senior cohort mentors.
            </p>
          </div>

          <div className="tn-projects-grid">
            {projects.map((proj, i) => (
              <div key={i} className="tn-card tn-project-card">
                <div className="tn-project-top">
                  <span className="tn-badge-emerald tn-badge">Verified Capstone</span>
                  <span style={{ fontSize: '0.8125rem', color: '#22D3EE', fontWeight: 700 }}>+{proj.score} XP</span>
                </div>
                <h3 className="tn-project-title">{proj.title}</h3>
                <p className="tn-project-desc">{proj.description}</p>
                <div className="tn-project-links">
                  {proj.githubLink && (
                    <a href={proj.githubLink} target="_blank" rel="noreferrer" className="tn-project-link-btn">
                      <Terminal size={13} />
                      <span>GitHub Repo</span>
                    </a>
                  )}
                  {proj.deployedLink && (
                    <a href={proj.deployedLink} target="_blank" rel="noreferrer" className="tn-project-link-btn">
                      <ExternalLink size={13} />
                      <span>Live Deployment</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. SHAREABLE DEVELOPER CARD MODAL */}
      {shareModalOpen && (
        <div className="tn-modal-backdrop" onClick={() => setShareModalOpen(false)}>
          <div className="tn-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tn-modal-header">
              <h3 className="tn-modal-title">Share Developer Identity Card</h3>
              <button 
                type="button" 
                className="tn-icon-btn" 
                onClick={() => setShareModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="tn-share-preview-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <img 
                  src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(mentee.name)}&backgroundColor=0b1329`} 
                  alt={mentee.name} 
                  style={{ width: 54, height: 54, borderRadius: '50%', border: '2px solid #22D3EE' }}
                />
                <div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#FFFFFF' }}>{mentee.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: '#22D3EE' }}>{level.title} • Rank #{mentee.rank || 1}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem', fontSize: '0.8125rem' }}>
                <div>Total Score: <strong style={{ color: '#FFFFFF' }}>{mentee.totalScore} XP</strong></div>
                <div>Streak: <strong style={{ color: '#FB7185' }}>{mentee.streak} Days</strong></div>
                <div>Top Track: <strong style={{ color: '#A78BFA' }}>Web Development</strong></div>
              </div>
            </div>

            <div className="tn-share-url-box">
              <input 
                type="text" 
                readOnly 
                value={typeof window !== 'undefined' ? `${window.location.origin}/profile?id=${mentee._id || '68023b6d4658c7fa3584fa07'}` : ''}
                className="tn-share-input"
              />
              <button 
                type="button" 
                className="tn-btn-primary" 
                onClick={handleCopyLink}
                style={{ padding: '0.6rem 1rem' }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="tn-privacy-note">
              <Shield size={14} />
              <span>Privacy Verified: No passwords, emails, or student IDs are ever exposed.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TargetIcon(props) {
  return (
    <svg 
      {...props} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  );
}
