'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, BookOpen, Plus, Search, CheckCircle2, 
  Clock, Shield, UserPlus, LogOut, Check, ChevronRight,
  ExternalLink, Zap, Terminal, HelpCircle, Layers, Award
} from 'lucide-react';
import { 
  mentorLogin, addMentee, addResource, getAllPrograms, 
  getProgramMentees, getProgramResources 
} from '../../lib/api';
import UnverifiedProjects from './projects';

export default function MentorPanel() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [mentorName, setMentorName] = useState('Senior Mentor');
  
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [activeTab, setActiveTab] = useState('grading'); // Default to grading queue for fast judge review!
  
  const [mentees, setMentees] = useState([]);
  const [resources, setResources] = useState([]);
  const [loadingProgramData, setLoadingProgramData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mentee Add State
  const [menteeName, setMenteeName] = useState('');
  const [menteeEmail, setMenteeEmail] = useState('');
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [newMenteeCredentials, setNewMenteeCredentials] = useState(null);

  // Resource Add State
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceURL, setResourceURL] = useState('');
  const [resourceType, setResourceType] = useState('video');
  const [skillCategory, setSkillCategory] = useState('Frontend');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [maxScore, setMaxScore] = useState(300);

  // Quiz Builder State
  const [quizTitle, setQuizTitle] = useState('');
  const [quizStart, setQuizStart] = useState('');
  const [quizEnd, setQuizEnd] = useState('');
  const [questions, setQuestions] = useState([
    {
      questionText: 'Which React hook memoizes a computed value between renders?',
      options: ['useMemo', 'useCallback', 'useEffect', 'useRef'],
      correctOptionIndex: 0,
      marks: 50
    }
  ]);

  const [notification, setNotification] = useState(null);

  const notify = (msg, isError = false) => {
    setNotification({ text: msg, isError });
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedMentor = localStorage.getItem('mentor');
    const savedProgram = localStorage.getItem('selectedProgram');

    if (savedToken && savedMentor) {
      setToken(savedToken);
      setLoggedIn(true);
      try {
        const parsed = JSON.parse(savedMentor);
        setMentorName(parsed.name || 'Dr. Smith');
      } catch (e) {}

      getAllPrograms().then((all) => {
        setPrograms(all);
        const initialProg = savedProgram || (all[0]?._id ? all[0]._id : '');
        if (initialProg) {
          setSelectedProgram(initialProg);
          loadProgramData(initialProg, savedToken);
        }
      }).catch(err => console.error(err));
    }
  }, []);

  const loadProgramData = async (progId, authTok = token) => {
    if (!progId || !authTok) return;
    setLoadingProgramData(true);
    try {
      const [menteeList, resourceList] = await Promise.all([
        getProgramMentees(progId, authTok).catch(() => []),
        getProgramResources(progId, authTok).catch(() => [])
      ]);
      setMentees(Array.isArray(menteeList) ? menteeList : []);
      setResources(Array.isArray(resourceList) ? resourceList : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProgramData(false);
    }
  };

  const handleProgramSelect = (progId) => {
    setSelectedProgram(progId);
    localStorage.setItem('selectedProgram', progId);
    loadProgramData(progId);
  };

  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    try {
      const { token: tok, mentor } = await mentorLogin(email, password);
      setToken(tok);
      setLoggedIn(true);
      setMentorName(mentor.name || 'Mentor');
      localStorage.setItem('token', tok);
      localStorage.setItem('mentor', JSON.stringify(mentor));

      const all = await getAllPrograms();
      setPrograms(all);
      if (all.length > 0) {
        setSelectedProgram(all[0]._id);
        loadProgramData(all[0]._id, tok);
      }
      notify(`Welcome back, ${mentor.name}!`);
    } catch (err) {
      notify(err.message || 'Login failed', true);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('smith@example.com');
    setPassword('123456');
    try {
      const { token: tok, mentor } = await mentorLogin('smith@example.com', '123456');
      setToken(tok);
      setLoggedIn(true);
      setMentorName(mentor.name || 'Dr. Smith');
      localStorage.setItem('token', tok);
      localStorage.setItem('mentor', JSON.stringify(mentor));

      const all = await getAllPrograms();
      setPrograms(all);
      if (all.length > 0) {
        setSelectedProgram(all[0]._id);
        loadProgramData(all[0]._id, tok);
      }
      notify('Logged in as Dr. Smith (Demo Mentor)');
    } catch (err) {
      notify(err.message || 'Demo login failed', true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('mentor');
    localStorage.removeItem('selectedProgram');
    setLoggedIn(false);
    setToken('');
  };

  // Add Mentee
  const handleAddMentee = async (e) => {
    e.preventDefault();
    if (!menteeName || !menteeEmail || !enrollmentNumber || !selectedProgram) {
      notify('Please fill all mentee fields and select a cohort', true);
      return;
    }
    try {
      const res = await addMentee(token, {
        name: menteeName,
        email: menteeEmail,
        enrollmentNumber,
        programId: selectedProgram
      });
      setNewMenteeCredentials(res);
      notify(`Mentee ${menteeName} enrolled in cohort!`);
      setMenteeName('');
      setMenteeEmail('');
      setEnrollmentNumber('');
      loadProgramData(selectedProgram);
    } catch (err) {
      notify(err.message || 'Failed to add mentee', true);
    }
  };

  // Add Resource
  const handleAddResource = async (e) => {
    e.preventDefault();
    if (!resourceTitle || !selectedProgram) return;
    try {
      await addResource(token, {
        title: resourceTitle,
        url: resourceURL,
        type: resourceType,
        program: selectedProgram,
        skillCategory,
        difficulty,
        maxScore: parseInt(maxScore, 10) || 300
      });
      notify(`Resource "${resourceTitle}" added to curriculum!`);
      setResourceTitle('');
      setResourceURL('');
      loadProgramData(selectedProgram);
    } catch (err) {
      notify(err.message || 'Failed to add resource', true);
    }
  };

  // Quiz Builder Helpers
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        marks: 50
      }
    ]);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const updateOption = (qIdx, optIdx, val) => {
    const updated = [...questions];
    updated[qIdx].options[optIdx] = val;
    setQuestions(updated);
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    if (!quizTitle || !selectedProgram) return;
    try {
      await addResource(token, {
        title: quizTitle,
        program: selectedProgram,
        questions,
        startTime: quizStart ? new Date(quizStart) : new Date(),
        endTime: quizEnd ? new Date(quizEnd) : new Date(Date.now() + 7 * 86400000),
        maxScore: questions.reduce((sum, q) => sum + (q.marks || 50), 0)
      }, true);
      notify(`Quiz "${quizTitle}" authored and activated!`);
      setQuizTitle('');
      loadProgramData(selectedProgram);
    } catch (err) {
      notify(err.message || 'Failed to create quiz', true);
    }
  };

  // Login View
  if (!loggedIn) {
    return (
      <div style={{ minHeight: 'calc(100vh - 72px)', background: '#070B14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="tn-card" style={{ maxWidth: 440, width: '100%', padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#FFFFFF' }}>
              <Shield size={24} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF' }}>Mentor Studio</h2>
            <p style={{ color: '#94A3B8', fontSize: '0.875rem', marginTop: 4 }}>
              Sign in to manage cohorts, author quizzes, and grade capstone projects.
            </p>
          </div>

          {notification && (
            <div style={{ padding: '0.75rem', borderRadius: 8, background: notification.isError ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', border: `1px solid ${notification.isError ? '#EF4444' : '#10B981'}`, color: '#FFFFFF', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
              {notification.text}
            </div>
          )}

          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#CBD5E1', fontWeight: 600, textTransform: 'uppercase' }}>Mentor Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="smith@example.com"
                className="tn-input"
                style={{ marginTop: 4 }}
                required
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#CBD5E1', fontWeight: 600, textTransform: 'uppercase' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="tn-input"
                style={{ marginTop: 4 }}
                required
              />
            </div>

            <button type="submit" className="tn-btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>
              <span>Sign In to Studio</span>
            </button>

            <button
              type="button"
              onClick={handleDemoLogin}
              className="tn-demo-btn"
              style={{ width: '100%', justifyContent: 'center', padding: '0.7rem' }}
            >
              <Zap size={15} />
              <span>1-Click Demo Login (Dr. Smith)</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Active Program Details
  const currentProgramObj = programs.find(p => p._id === selectedProgram);

  return (
    <div style={{ minHeight: 'calc(100vh - 72px)', background: '#070B14', display: 'flex' }}>
      {/* Mentor Sidebar */}
      <aside style={{ width: 280, background: '#0C1222', borderRight: '1px solid rgba(255,255,255,0.08)', padding: '1.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
        {/* Mentor Header Card */}
        <div style={{ padding: '0 0.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#FFFFFF' }}>{mentorName}</div>
            <button onClick={handleLogout} className="tn-icon-btn" title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#22D3EE', marginTop: 2 }}>Senior Cohort Mentor</div>
        </div>

        {/* Program Selector */}
        <div style={{ marginBottom: '1rem', padding: '0 0.5rem' }}>
          <label style={{ fontSize: '0.6875rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active Cohort Program
          </label>
          <select
            value={selectedProgram}
            onChange={(e) => handleProgramSelect(e.target.value)}
            style={{ 
              width: '100%', 
              marginTop: 4, 
              background: '#111A30', 
              border: '1px solid rgba(255,255,255,0.12)', 
              color: '#FFFFFF', 
              padding: '0.55rem 0.75rem', 
              borderRadius: 8,
              fontSize: '0.8125rem',
              fontWeight: 600
            }}
          >
            {programs.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Navigation Tabs */}
        <button
          type="button"
          onClick={() => setActiveTab('grading')}
          className={`tn-nav-link ${activeTab === 'grading' ? 'active highlight' : ''}`}
          style={{ width: '100%', justifyContent: 'flex-start' }}
        >
          <Award size={16} />
          <span>Project Grading Queue</span>
          <span className="tn-pulse-dot" style={{ marginLeft: 'auto' }} />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mentees')}
          className={`tn-nav-link ${activeTab === 'mentees' ? 'active' : ''}`}
          style={{ width: '100%', justifyContent: 'flex-start' }}
        >
          <Users size={16} />
          <span>Cohort Mentees ({mentees.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('resources')}
          className={`tn-nav-link ${activeTab === 'resources' ? 'active' : ''}`}
          style={{ width: '100%', justifyContent: 'flex-start' }}
        >
          <BookOpen size={16} />
          <span>Curriculum Resources ({resources.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quizBuilder')}
          className={`tn-nav-link ${activeTab === 'quizBuilder' ? 'active' : ''}`}
          style={{ width: '100%', justifyContent: 'flex-start' }}
        >
          <HelpCircle size={16} />
          <span>Quiz Assessment Builder</span>
        </button>
      </aside>

      {/* Main Studio View */}
      <main style={{ flex: 1, padding: '2.5rem 3rem', overflowY: 'auto' }}>
        {notification && (
          <div style={{ marginBottom: '1.5rem', padding: '0.85rem 1.25rem', borderRadius: 10, background: notification.isError ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', border: `1px solid ${notification.isError ? '#EF4444' : '#10B981'}`, color: '#FFFFFF', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} className={notification.isError ? 'text-rose' : 'text-emerald'} />
            <span>{notification.text}</span>
          </div>
        )}

        {/* TAB 1: GRADING QUEUE */}
        {activeTab === 'grading' && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <div className="tn-badge-cyan tn-badge">REVIEW STUDIO</div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#FFFFFF', margin: '0.5rem 0' }}>
                Capstone Code Review & Grading
              </h1>
              <p style={{ color: '#94A3B8' }}>
                Inspect mentee GitHub repositories and live deployments. Enter verified scores to immediately update the global leaderboard.
              </p>
            </div>

            <UnverifiedProjects onVerificationSuccess={() => loadProgramData(selectedProgram)} />
          </div>
        )}

        {/* TAB 2: COHORT MENTEES */}
        {activeTab === 'mentees' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#FFFFFF' }}>Enrolled Cohort Mentees</h1>
                <p style={{ color: '#94A3B8' }}>Current roster for <strong>{currentProgramObj?.name}</strong>.</p>
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: '#64748B' }} />
                <input
                  type="text"
                  placeholder="Search mentees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="tn-input"
                  style={{ paddingLeft: '2.25rem', width: 220 }}
                />
              </div>
            </div>

            {/* Quick Add Mentee Card */}
            <div className="tn-card" style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.75rem' }}>
                Enroll New Mentee in {currentProgramObj?.name}
              </h3>
              <form onSubmit={handleAddMentee} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={menteeName}
                  onChange={(e) => setMenteeName(e.target.value)}
                  className="tn-input"
                  required
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={menteeEmail}
                  onChange={(e) => setMenteeEmail(e.target.value)}
                  className="tn-input"
                  required
                />
                <input
                  type="text"
                  placeholder="Enrollment / Student ID"
                  value={enrollmentNumber}
                  onChange={(e) => setEnrollmentNumber(e.target.value)}
                  className="tn-input"
                  required
                />
                <button type="submit" className="tn-btn-primary" style={{ whiteSpace: 'nowrap' }}>
                  <UserPlus size={15} />
                  <span>Enroll Mentee</span>
                </button>
              </form>

              {newMenteeCredentials && (
                <div style={{ marginTop: '1rem', padding: '0.85rem', borderRadius: 8, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)', color: '#CBD5E1', fontSize: '0.8125rem' }}>
                  🎉 Mentee Enrolled! Auto-generated access password: <strong style={{ color: '#22D3EE' }}>{newMenteeCredentials.tempPassword}</strong>
                </div>
              )}
            </div>

            {/* Mentees Table */}
            <div className="tn-card">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>Mentee Name</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Enrollment ID</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Total XP</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Streak</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Completed Modules</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mentees
                      .filter(m => m.name?.toLowerCase().includes(searchQuery.toLowerCase()) || m.enrollmentNumber?.includes(searchQuery))
                      .map((m) => (
                        <tr key={m._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '1rem', fontWeight: 700, color: '#FFFFFF' }}>{m.name}</td>
                          <td style={{ padding: '1rem', color: '#64748B', fontFamily: 'monospace' }}>{m.enrollmentNumber}</td>
                          <td style={{ padding: '1rem', color: '#22D3EE', fontWeight: 700 }}>{m.totalScore || 0} XP</td>
                          <td style={{ padding: '1rem', color: '#FB7185' }}>🔥 {m.streak || 0}d</td>
                          <td style={{ padding: '1rem' }}>
                            <span className="tn-badge-violet tn-badge" style={{ fontSize: '0.6875rem' }}>
                              {m.completedResources?.length || 0} Modules
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CURRICULUM RESOURCES */}
        {activeTab === 'resources' && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#FFFFFF' }}>Curriculum & Module Manager</h1>
              <p style={{ color: '#94A3B8' }}>Add video lectures, technical reading, and capstone specifications.</p>
            </div>

            {/* Add Resource Form */}
            <div className="tn-card" style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '1rem' }}>
                Publish New Module to {currentProgramObj?.name}
              </h3>
              <form onSubmit={handleAddResource}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.6875rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Module Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Next.js 15 Server Components & Streaming"
                      value={resourceTitle}
                      onChange={(e) => setResourceTitle(e.target.value)}
                      className="tn-input"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.6875rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>URL or Documentation Link</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={resourceURL}
                      onChange={(e) => setResourceURL(e.target.value)}
                      className="tn-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ fontSize: '0.6875rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Resource Type</label>
                    <select
                      value={resourceType}
                      onChange={(e) => setResourceType(e.target.value)}
                      style={{ width: '100%', background: '#111A30', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', padding: '0.6rem', borderRadius: 8 }}
                    >
                      <option value="video">Video Lecture</option>
                      <option value="project">Capstone Project</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.6875rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Skill Galaxy Domain</label>
                    <select
                      value={skillCategory}
                      onChange={(e) => setSkillCategory(e.target.value)}
                      style={{ width: '100%', background: '#111A30', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', padding: '0.6rem', borderRadius: 8 }}
                    >
                      <option value="Frontend Architecture">Frontend Architecture</option>
                      <option value="Backend & APIs">Backend & APIs</option>
                      <option value="Database & Storage">Database & Storage</option>
                      <option value="Data Structures">Data Structures & Algo</option>
                      <option value="System Design">System Design</option>
                      <option value="Deployment & DevOps">Deployment & DevOps</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.6875rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Difficulty Level</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      style={{ width: '100%', background: '#111A30', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', padding: '0.6rem', borderRadius: 8 }}
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.6875rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Max XP Reward</label>
                    <input
                      type="number"
                      value={maxScore}
                      onChange={(e) => setMaxScore(e.target.value)}
                      className="tn-input"
                    />
                  </div>
                </div>

                <button type="submit" className="tn-btn-primary">
                  <Plus size={16} />
                  <span>Publish Module</span>
                </button>
              </form>
            </div>

            {/* Existing Resources List */}
            <div className="tn-card">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '1.25rem' }}>
                Published Curriculum Modules ({resources.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {resources.map((res) => (
                  <div key={res._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="tn-badge-cyan tn-badge" style={{ fontSize: '0.6875rem' }}>{res.type}</span>
                        <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#FFFFFF' }}>{res.title}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 4 }}>
                        Category: {res.skillCategory || 'Full-Stack'} • Max XP: {res.maxScore}
                      </div>
                    </div>
                    {res.url && (
                      <a href={res.url} target="_blank" rel="noreferrer" className="tn-project-link-btn">
                        <span>Open Link</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: QUIZ BUILDER */}
        {activeTab === 'quizBuilder' && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <div className="tn-badge-violet tn-badge">ASSESSMENT STUDIO</div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#FFFFFF', margin: '0.5rem 0' }}>
                Interactive Quiz Builder
              </h1>
              <p style={{ color: '#94A3B8' }}>Author multiple-choice technical evaluations with automated scoring.</p>
            </div>

            <form onSubmit={handleCreateQuiz} className="tn-card" style={{ padding: '2rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#CBD5E1', fontWeight: 700, textTransform: 'uppercase' }}>Quiz Assessment Title</label>
                <input
                  type="text"
                  placeholder="e.g. Asynchronous JavaScript & Promises Benchmark"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  className="tn-input"
                  style={{ marginTop: 4 }}
                  required
                />
              </div>

              {/* Questions List */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>Questions ({questions.length})</h4>
                  <button type="button" onClick={addQuestion} className="tn-btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
                    <Plus size={14} />
                    <span>Add Question</span>
                  </button>
                </div>

                {questions.map((q, qIdx) => (
                  <div key={qIdx} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#22D3EE' }}>Question {qIdx + 1}</span>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>50 XP</span>
                    </div>

                    <input
                      type="text"
                      placeholder="Enter question text..."
                      value={q.questionText}
                      onChange={(e) => updateQuestion(qIdx, 'questionText', e.target.value)}
                      className="tn-input"
                      style={{ marginBottom: '0.75rem' }}
                      required
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="radio"
                            name={`correct-${qIdx}`}
                            checked={q.correctOptionIndex === optIdx}
                            onChange={() => updateQuestion(qIdx, 'correctOptionIndex', optIdx)}
                          />
                          <input
                            type="text"
                            placeholder={`Option ${optIdx + 1}`}
                            value={opt}
                            onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                            className="tn-input"
                            style={{ padding: '0.4rem 0.65rem', fontSize: '0.8125rem' }}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button type="submit" className="tn-btn-primary">
                <Check size={16} />
                <span>Deploy Quiz Assessment</span>
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
