'use client';

import React, { useEffect, useState } from 'react';
import { 
  Shield, BookOpen, Users, Plus, CheckCircle2, 
  Search, BarChart3, Layers, UserPlus, Award, ArrowUpRight, Check
} from 'lucide-react';
import {
  createProgram,
  createMentor,
  addMentorToProgram,
  getAllPrograms,
  getAllMentors,
} from '../lib/api';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const [programName, setProgramName] = useState('');
  const [mentorData, setMentorData] = useState({ name: '', email: '', password: '' });
  const [programs, setPrograms] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [programRes, mentorRes] = await Promise.all([getAllPrograms(), getAllMentors()]);
      setPrograms(Array.isArray(programRes) ? programRes : []);
      setMentors(Array.isArray(mentorRes) ? mentorRes : []);
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg, isError = false) => {
    setStatusMessage({ text: msg, isError });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleProgramSubmit = async (e) => {
    e.preventDefault();
    if (!programName.trim()) return;
    try {
      await createProgram(programName.trim());
      setProgramName('');
      showNotification(`Cohort "${programName}" created successfully!`);
      fetchData();
    } catch (err) {
      showNotification(err.message || 'Failed to create program', true);
    }
  };

  const handleMentorSubmit = async (e) => {
    e.preventDefault();
    if (!mentorData.name || !mentorData.email || !mentorData.password) return;
    try {
      await createMentor(mentorData);
      setMentorData({ name: '', email: '', password: '' });
      showNotification(`Mentor ${mentorData.name} registered successfully!`);
      fetchData();
    } catch (err) {
      showNotification(err.message || 'Failed to create mentor', true);
    }
  };

  const handleAssignMentor = async (programId, mentorId) => {
    if (!mentorId) return;
    try {
      await addMentorToProgram(programId, mentorId);
      showNotification(`Senior mentor assigned to cohort!`);
      fetchData();
    } catch (err) {
      showNotification(err.message || 'Failed to assign mentor', true);
    }
  };

  const filteredPrograms = programs.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMentors = mentors.filter(m => 
    m.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ minHeight: 'calc(100vh - 72px)', background: '#070B14', display: 'flex' }}>
      {/* Sidebar */}
      <aside style={{ width: 260, background: '#0C1222', borderRight: '1px solid rgba(255,255,255,0.08)', padding: '1.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0 0.5rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '0.5rem' }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Shield size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#FFFFFF' }}>Admin Suite</div>
            <div style={{ fontSize: '0.6875rem', color: '#34D399', fontWeight: 600 }}>● Platform Lead</div>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`tn-nav-link ${activeTab === 'overview' ? 'active' : ''}`}
          style={{ width: '100%', justifyContent: 'flex-start' }}
        >
          <BarChart3 size={16} />
          <span>Overview & KPIs</span>
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab('programs')}
          className={`tn-nav-link ${activeTab === 'programs' ? 'active' : ''}`}
          style={{ width: '100%', justifyContent: 'flex-start' }}
        >
          <BookOpen size={16} />
          <span>Cohort Programs ({programs.length})</span>
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab('mentors')}
          className={`tn-nav-link ${activeTab === 'mentors' ? 'active' : ''}`}
          style={{ width: '100%', justifyContent: 'flex-start' }}
        >
          <Users size={16} />
          <span>Mentors Directory ({mentors.length})</span>
        </button>

        <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#22D3EE', textTransform: 'uppercase' }}>Database Engine</div>
          <div style={{ fontSize: '0.8125rem', color: '#CBD5E1', marginTop: 4 }}>MongoDB Atlas Cluster</div>
          <div style={{ fontSize: '0.6875rem', color: '#10B981', marginTop: 2 }}>🟢 Synchronized & Connected</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '2.5rem 3rem', overflowY: 'auto' }}>
        {/* Notification Toast */}
        {statusMessage && (
          <div style={{ 
            marginBottom: '1.5rem', 
            padding: '0.85rem 1.25rem', 
            borderRadius: 10, 
            background: statusMessage.isError ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
            border: `1px solid ${statusMessage.isError ? '#EF4444' : '#10B981'}`,
            color: '#FFFFFF',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <CheckCircle2 size={16} className={statusMessage.isError ? 'text-rose' : 'text-emerald'} />
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <div className="tn-badge-cyan tn-badge">ADMIN DASHBOARD</div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#FFFFFF', margin: '0.5rem 0' }}>
                Platform Command & Overview
              </h1>
              <p style={{ color: '#94A3B8' }}>
                Manage all cohorts, monitor mentor allocations, and configure curriculum tracks.
              </p>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2.5rem' }}>
              <div className="tn-card">
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Total Cohorts</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFFFFF', margin: '0.25rem 0' }}>{programs.length}</div>
                <div style={{ fontSize: '0.75rem', color: '#22D3EE' }}>Live in MongoDB</div>
              </div>
              <div className="tn-card">
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Active Mentors</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFFFFF', margin: '0.25rem 0' }}>{mentors.length}</div>
                <div style={{ fontSize: '0.75rem', color: '#818CF8' }}>Assigned to programs</div>
              </div>
              <div className="tn-card">
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Registered Mentees</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFFFFF', margin: '0.25rem 0' }}>30</div>
                <div style={{ fontSize: '0.75rem', color: '#34D399' }}>Active submissions</div>
              </div>
              <div className="tn-card">
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Platform Health</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34D399', margin: '0.25rem 0' }}>99.9%</div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Port 5001 Live</div>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem', marginBottom: '2.5rem' }}>
              {/* Quick Create Program */}
              <div className="tn-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Plus size={18} className="text-cyan" />
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#FFFFFF' }}>Fast Create Cohort Program</h3>
                </div>
                <form onSubmit={handleProgramSubmit}>
                  <input
                    type="text"
                    placeholder="e.g. Distributed Systems & Golang"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    className="tn-input"
                    style={{ marginBottom: '1rem' }}
                    required
                  />
                  <button type="submit" className="tn-btn-primary" style={{ width: '100%' }}>
                    <span>Launch New Cohort</span>
                  </button>
                </form>
              </div>

              {/* Quick Add Mentor */}
              <div className="tn-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <UserPlus size={18} className="text-violet" />
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#FFFFFF' }}>Register Senior Mentor</h3>
                </div>
                <form onSubmit={handleMentorSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <input
                      type="text"
                      placeholder="Mentor Name"
                      value={mentorData.name}
                      onChange={(e) => setMentorData({ ...mentorData, name: e.target.value })}
                      className="tn-input"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Mentor Email"
                      value={mentorData.email}
                      onChange={(e) => setMentorData({ ...mentorData, email: e.target.value })}
                      className="tn-input"
                      required
                    />
                  </div>
                  <input
                    type="password"
                    placeholder="Initial Access Password"
                    value={mentorData.password}
                    onChange={(e) => setMentorData({ ...mentorData, password: e.target.value })}
                    className="tn-input"
                    style={{ marginBottom: '1rem' }}
                    required
                  />
                  <button type="submit" className="tn-btn-secondary" style={{ width: '100%' }}>
                    <span>Register Mentor</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Recent Cohorts Preview Table */}
            <div className="tn-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#FFFFFF' }}>Active Cohorts Overview</h3>
                <button type="button" onClick={() => setActiveTab('programs')} className="tn-btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
                  View All ({programs.length})
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Cohort Name</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Curriculum Modules</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Assigned Mentors</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programs.slice(0, 6).map((p) => (
                      <tr key={p._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#FFFFFF' }}>{p.name}</td>
                        <td style={{ padding: '0.85rem 1rem', color: '#22D3EE' }}>{p.resources?.length || 0} Modules</td>
                        <td style={{ padding: '0.85rem 1rem', color: '#CBD5E1' }}>{p.mentors?.length || 0} Mentors</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span className="tn-badge-emerald tn-badge" style={{ fontSize: '0.6875rem' }}>Active</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. PROGRAMS TAB */}
        {activeTab === 'programs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#FFFFFF' }}>Cohort Programs Directory</h1>
                <p style={{ color: '#94A3B8' }}>Manage curricula, modules, and assign senior mentors.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: '#64748B' }} />
                  <input
                    type="text"
                    placeholder="Search cohorts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="tn-input"
                    style={{ paddingLeft: '2.25rem', width: 220 }}
                  />
                </div>
              </div>
            </div>

            {/* Create Program Banner */}
            <div className="tn-card" style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.75rem' }}>Create New Mentorship Program</h3>
              <form onSubmit={handleProgramSubmit} style={{ display: 'flex', gap: '1rem' }}>
                <input
                  type="text"
                  placeholder="Program Name (e.g. AI Agents & LLM Systems)"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  className="tn-input"
                  required
                />
                <button type="submit" className="tn-btn-primary" style={{ whiteSpace: 'nowrap' }}>
                  <Plus size={16} />
                  <span>Add Program</span>
                </button>
              </form>
            </div>

            {/* Programs Detailed Table */}
            <div className="tn-card">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>Program Name</th>
                      <th style={{ padding: '0.85rem 1rem' }}>ID</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Resources</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Assigned Mentors</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Assign New Mentor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPrograms.map((program) => (
                      <tr key={program._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '1rem', fontWeight: 700, color: '#FFFFFF' }}>{program.name}</td>
                        <td style={{ padding: '1rem', color: '#64748B', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {program._id.slice(-6)}
                        </td>
                        <td style={{ padding: '1rem', color: '#22D3EE' }}>
                          {program.resources?.length || 0} items
                        </td>
                        <td style={{ padding: '1rem', color: '#CBD5E1' }}>
                          {program.mentors?.length > 0 ? (
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {program.mentors.map((m, idx) => (
                                <span key={idx} className="tn-badge-violet tn-badge" style={{ fontSize: '0.6875rem' }}>
                                  {m.name || m}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#64748B', fontStyle: 'italic' }}>None assigned</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <select
                            onChange={(e) => handleAssignMentor(program._id, e.target.value)}
                            defaultValue=""
                            style={{ 
                              background: '#111A30', 
                              border: '1px solid rgba(255,255,255,0.1)', 
                              color: '#CBD5E1', 
                              padding: '0.4rem 0.6rem', 
                              borderRadius: 6,
                              fontSize: '0.8125rem'
                            }}
                          >
                            <option value="" disabled>+ Select Mentor</option>
                            {mentors.map((mentor) => (
                              <option key={mentor._id} value={mentor._id}>
                                {mentor.name} ({mentor.email})
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. MENTORS TAB */}
        {activeTab === 'mentors' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#FFFFFF' }}>Mentor Network</h1>
                <p style={{ color: '#94A3B8' }}>Manage senior engineers and assignment authorizations.</p>
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: '#64748B' }} />
                <input
                  type="text"
                  placeholder="Search mentors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="tn-input"
                  style={{ paddingLeft: '2.25rem', width: 220 }}
                />
              </div>
            </div>

            {/* Mentor Roster */}
            <div className="tn-card">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>Mentor Name</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Email Address</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Assigned Programs</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMentors.map((m) => (
                      <tr key={m._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '1rem', fontWeight: 700, color: '#FFFFFF' }}>{m.name}</td>
                        <td style={{ padding: '1rem', color: '#94A3B8' }}>{m.email}</td>
                        <td style={{ padding: '1rem' }}>
                          <span className="tn-badge-cyan tn-badge" style={{ fontSize: '0.6875rem' }}>
                            {m.programs?.length || 0} Programs
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span className="tn-badge-emerald tn-badge" style={{ fontSize: '0.6875rem' }}>Verified</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
