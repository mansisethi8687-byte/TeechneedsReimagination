'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Cpu, Layers, Database, GitBranch, Server, Zap } from 'lucide-react';

export default function SkillGalaxy({ skills = [], levelTitle = 'Systems Architect' }) {
  const [selectedSkill, setSelectedSkill] = useState(null);

  // Default cluster positions in a cosmic hexagonal arrangement
  const defaultSkills = [
    { name: 'Frontend Architecture', score: 96, level: 'Advanced', color: '#6366F1', icon: Layers, x: 200, y: 100, tag: 'Next.js 15 • React • CSS' },
    { name: 'Backend & APIs', score: 92, level: 'Proficient', color: '#8B5CF6', icon: Server, x: 380, y: 130, tag: 'Express • Node.js • JWT' },
    { name: 'Database & MongoDB', score: 90, level: 'Intermediate', color: '#22D3EE', icon: Database, x: 420, y: 280, tag: 'Mongoose • Aggregation' },
    { name: 'Data Structures & Algo', score: 88, level: 'Intermediate', color: '#EC4899', icon: Cpu, x: 300, y: 390, tag: 'Trees • Graphs • Dynamic Prog' },
    { name: 'System Design', score: 85, level: 'Developing', color: '#F59E0B', icon: GitBranch, x: 140, y: 340, tag: 'Caching • Scalability • Auth' },
    { name: 'Deployment & CI/CD', score: 84, level: 'Practical', color: '#10B981', icon: Zap, x: 90, y: 200, tag: 'Vercel • Render • GitHub Actions' }
  ];

  const galaxySkills = skills.length > 0 
    ? skills.map((s, i) => ({
        ...defaultSkills[i % defaultSkills.length],
        name: s.name,
        score: s.score || 75,
        level: s.level || 'Intermediate'
      }))
    : defaultSkills;

  useEffect(() => {
    setSelectedSkill((prev) => prev || galaxySkills[0] || null);
    // Intentionally sync once when incoming skills change by name signature
  }, [skills.map((s) => s.name).join('|')]);

  const centerX = 260;
  const centerY = 240;

  return (
    <div className="tn-galaxy-container">
      <div className="tn-galaxy-header">
        <div className="tn-galaxy-title-wrap">
          <Sparkles size={16} className="text-cyan" />
          <h3 className="tn-galaxy-heading">Skill Galaxy Interactive Visualization</h3>
        </div>
        <span className="tn-badge-cyan tn-badge">Dynamic Constellation Engine</span>
      </div>

      <div className="tn-galaxy-content">
        {/* SVG Cosmic Constellation Canvas */}
        <div className="tn-galaxy-canvas-wrap">
          <svg viewBox="0 0 520 480" className="tn-galaxy-svg">
            {/* Background Cosmic Grid & Rings */}
            <circle cx={centerX} cy={centerY} r={80} className="tn-orbit-ring ring-1" />
            <circle cx={centerX} cy={centerY} r={140} className="tn-orbit-ring ring-2" />
            <circle cx={centerX} cy={centerY} r={190} className="tn-orbit-ring ring-3" />

            {/* Constellation Link Lines to Center */}
            {galaxySkills.map((s, i) => (
              <line
                key={`link-${i}`}
                x1={centerX}
                y1={centerY}
                x2={s.x}
                y2={s.y}
                className={`tn-constellation-line ${selectedSkill?.name === s.name ? 'active' : ''}`}
                style={{ stroke: s.color }}
              />
            ))}

            {/* Constellation Perimeter Link Lines */}
            {galaxySkills.map((s, i) => {
              const next = galaxySkills[(i + 1) % galaxySkills.length];
              return (
                <line
                  key={`perim-${i}`}
                  x1={s.x}
                  y1={s.y}
                  x2={next.x}
                  y2={next.y}
                  className="tn-perimeter-line"
                />
              );
            })}

            {/* Central Developer Nexus Node */}
            <g className="tn-nexus-node">
              <circle cx={centerX} cy={centerY} r={28} className="tn-nexus-pulse" />
              <circle cx={centerX} cy={centerY} r={22} className="tn-nexus-core" />
              <text x={centerX} y={centerY - 2} textAnchor="middle" className="tn-nexus-text">AI</text>
              <text x={centerX} y={centerY + 10} textAnchor="middle" className="tn-nexus-sub">NEXUS</text>
            </g>

            {/* Orbital Skill Nodes */}
            {galaxySkills.map((s, i) => {
              const isSelected = selectedSkill?.name === s.name;
              return (
                <g 
                  key={`node-${i}`} 
                  className={`tn-skill-node-group ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedSkill(s)}
                >
                  {/* Aura Glow */}
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={isSelected ? 30 : 22}
                    className="tn-node-glow"
                    style={{ fill: s.color, opacity: isSelected ? 0.35 : 0.15 }}
                  />
                  {/* Node Border & Fill */}
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={isSelected ? 18 : 14}
                    className="tn-node-body"
                    style={{ stroke: s.color }}
                  />
                  {/* Score Label inside Node */}
                  <text
                    x={s.x}
                    y={s.y + 4}
                    textAnchor="middle"
                    className="tn-node-score"
                  >
                    {s.score}%
                  </text>
                  {/* Outer Skill Name Label */}
                  <text
                    x={s.x}
                    y={s.y > centerY ? s.y + 26 : s.y - 20}
                    textAnchor="middle"
                    className="tn-node-label"
                  >
                    {s.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Skill Detail Inspector Card */}
        {selectedSkill && (
          <div className="tn-skill-inspector">
            <div className="tn-inspector-header">
              <span className="tn-badge-violet tn-badge">{selectedSkill.level}</span>
              <span className="tn-inspector-score" style={{ color: selectedSkill.color }}>
                {selectedSkill.score}% Mastery
              </span>
            </div>

            <h4 className="tn-inspector-name">{selectedSkill.name}</h4>
            <p className="tn-inspector-tag">{selectedSkill.tag}</p>

            <div className="tn-progress-bar-bg">
              <div 
                className="tn-progress-bar-fill" 
                style={{ width: `${selectedSkill.score}%`, backgroundColor: selectedSkill.color }} 
              />
            </div>

            <div className="tn-inspector-insights">
              <div className="tn-insight-row">
                <span className="tn-insight-lbl">Verified Milestone:</span>
                <span className="tn-insight-val">Demonstrated in Cohort Capstone</span>
              </div>
              <div className="tn-insight-row">
                <span className="tn-insight-lbl">Evolution Rate:</span>
                <span className="tn-insight-val text-cyan">+12% over last 3 submissions</span>
              </div>
              <div className="tn-insight-row">
                <span className="tn-insight-lbl">AI Evaluation:</span>
                <span className="tn-insight-val">Strong competency; recommended for advanced architecture tracks.</span>
              </div>
            </div>

            <button 
              type="button" 
              className="tn-btn-secondary tn-inspector-btn"
              onClick={() => alert(`Syllabus resources filtered for ${selectedSkill.name}`)}
            >
              Explore Topic Syllabus
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
