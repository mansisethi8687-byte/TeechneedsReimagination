'use client';

import React, { useEffect, useState } from 'react';
import { 
  Rocket, Terminal, ExternalLink, CheckCircle2, Clock, 
  User, Award, AlertCircle, Check
} from 'lucide-react';
import { getUnverifiedProjects, verifyProject } from '../../lib/api';

export default function UnverifiedProjects({ onVerificationSuccess }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState({});
  const [submittingId, setSubmittingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  const fetchProjects = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await getUnverifiedProjects(token);
      setProjects(res.unverifiedProjects || []);
    } catch (err) {
      console.error("Failed to load unverified projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleScoreChange = (key, val) => {
    setScores(prev => ({ ...prev, [key]: val }));
  };

  const handleVerify = async (menteeId, resourceId, maxScore = 300) => {
    const key = `${menteeId}-${resourceId}`;
    const scoreVal = parseInt(scores[key] || maxScore, 10);
    const token = localStorage.getItem('token');
    
    setSubmittingId(key);
    try {
      await verifyProject(token, menteeId, resourceId, scoreVal);
      setStatusMsg(`Project verified and awarded ${scoreVal} XP!`);
      setProjects(prev => prev.filter(p => !(p.menteeId === menteeId && p.resourceId === resourceId)));
      if (onVerificationSuccess) onVerificationSuccess();
    } catch (err) {
      alert(err.message || 'Verification failed');
    } finally {
      setSubmittingId(null);
      setTimeout(() => setStatusMsg(null), 3500);
    }
  };

  if (loading) {
    return (
      <div className="tn-card text-center" style={{ padding: '2.5rem' }}>
        <div className="tn-spinner" />
        <p style={{ color: '#94A3B8' }}>Scanning submission queue for mentor reviews...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="tn-card text-center" style={{ padding: '3.5rem 2rem' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(52,211,153,0.1)', color: '#34D399', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <CheckCircle2 size={24} />
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF' }}>All Projects Graded</h3>
        <p style={{ color: '#94A3B8', marginTop: '0.35rem' }}>
          There are currently no pending capstone projects awaiting your review. Great job!
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {statusMsg && (
        <div style={{ padding: '0.85rem 1.25rem', borderRadius: 8, background: 'rgba(16,185,129,0.15)', border: '1px solid #10B981', color: '#FFFFFF', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={16} className="text-emerald" />
          <span>{statusMsg}</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF' }}>
          Pending Submissions ({projects.length})
        </h3>
        <button 
          type="button" 
          onClick={fetchProjects}
          className="tn-btn-secondary" 
          style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
        >
          Refresh Queue
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
        {projects.map((proj) => {
          const key = `${proj.menteeId}-${proj.resourceId}`;
          const currentScore = scores[key] !== undefined ? scores[key] : 300;
          const isSubmitting = submittingId === key;

          return (
            <div key={key} className="tn-card" style={{ padding: '1.75rem', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span className="tn-badge-amber tn-badge">Awaiting Mentor Review</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      Submitted: {proj.submittedOn ? new Date(proj.submittedOn).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>{proj.resourceTitle}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#22D3EE', fontSize: '0.875rem', marginTop: '0.2rem' }}>
                    <User size={14} />
                    <span>Mentee: <strong>{proj.menteeName}</strong></span>
                  </div>
                </div>

                {/* Score Input & Grade Action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.65rem 1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Award XP (max 300)</div>
                    <input
                      type="number"
                      min="0"
                      max="300"
                      value={currentScore}
                      onChange={(e) => handleScoreChange(key, e.target.value)}
                      style={{ 
                        width: 90, 
                        background: '#070B14', 
                        border: '1px solid rgba(255,255,255,0.2)', 
                        borderRadius: 6, 
                        color: '#FFFFFF', 
                        padding: '0.4rem 0.6rem',
                        fontWeight: 700,
                        fontSize: '0.9375rem',
                        marginTop: 4
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    className="tn-btn-primary"
                    onClick={() => handleVerify(proj.menteeId, proj.resourceId, 300)}
                    disabled={isSubmitting}
                    style={{ padding: '0.6rem 1.1rem', fontSize: '0.8125rem', marginTop: 16 }}
                  >
                    {isSubmitting ? <Clock size={14} className="spin" /> : <Check size={14} />}
                    <span>{isSubmitting ? 'Grading...' : 'Verify & Award Score'}</span>
                  </button>
                </div>
              </div>

              {/* Description */}
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: 10, marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Architecture & Overview:</div>
                <p style={{ fontSize: '0.875rem', color: '#CBD5E1', lineHeight: 1.6, margin: 0 }}>
                  {proj.description || 'No description provided.'}
                </p>
              </div>

              {/* Repositories and Demo Links */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {proj.githubLink && (
                  <a href={proj.githubLink} target="_blank" rel="noreferrer" className="tn-project-link-btn" style={{ padding: '0.5rem 0.85rem' }}>
                    <Terminal size={14} />
                    <span>Inspect GitHub Repository</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                {proj.deployedLink && (
                  <a href={proj.deployedLink} target="_blank" rel="noreferrer" className="tn-project-link-btn" style={{ padding: '0.5rem 0.85rem' }}>
                    <ExternalLink size={14} />
                    <span>View Live Deployment</span>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
