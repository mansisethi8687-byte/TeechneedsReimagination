'use client';

import React from 'react';
import Link from 'next/link';
import { Terminal, Shield, Sparkles, Globe, MessageSquare, ExternalLink } from 'lucide-react';
import './footer.css';

const Footer = () => {
  return (
    <footer className="tn-footer">
      <div className="tn-footer-inner">
        <div className="tn-footer-grid">
          {/* Brand Col */}
          <div className="tn-footer-col brand">
            <div className="tn-footer-brand">
              <div className="tn-footer-logo">
                <Terminal size={18} />
              </div>
              <span className="tn-footer-title">TECHNEEDS <span className="tn-footer-ver">2.0</span></span>
            </div>
            <p className="tn-footer-desc">
              Where Future Developers Find Their Edge. The next-generation mentorship ecosystem powered by AI guidance, interactive skill galaxies, and verified production cohorts.
            </p>
            <div className="tn-status-pill">
              <span className="tn-status-dot" />
              <span>All Systems Operational • v2.0 Production</span>
            </div>
          </div>

          {/* Platform Col */}
          <div className="tn-footer-col">
            <h4 className="tn-footer-heading">Platform</h4>
            <ul className="tn-footer-links">
              <li><Link href="/">Home</Link></li>
              <li><Link href="/eventspage">Events & Opportunities</Link></li>
              <li><Link href="/techboard">Cohorts & Techboard</Link></li>
              <li><Link href="/leaderboard">Global Leaderboard</Link></li>
              <li><Link href="/profile">AI Developer Profile</Link></li>
              <li><Link href="/faq">FAQs</Link></li>
            </ul>
          </div>

          {/* Portals Col */}
          <div className="tn-footer-col">
            <h4 className="tn-footer-heading">Workspaces</h4>
            <ul className="tn-footer-links">
              <li><Link href="/dashboard">Mentee Learning Hub</Link></li>
              <li><Link href="/mentor">Mentor Studio & Grading</Link></li>
              <li><Link href="/admin">Platform Administration</Link></li>
              <li><Link href="/team">Core Engineering Team</Link></li>
            </ul>
          </div>

          {/* Hackathon Quality Col */}
          <div className="tn-footer-col">
            <h4 className="tn-footer-heading">Innovation</h4>
            <div className="tn-footer-badges">
              <div className="tn-footer-badge">
                <Sparkles size={13} className="text-cyan" />
                <span>AI Growth Coach Engine</span>
              </div>
              <div className="tn-footer-badge">
                <Shield size={13} className="text-violet" />
                <span>Verified Mentorship Credentials</span>
              </div>
            </div>
            <div className="tn-social-row">
              <a href="https://github.com" target="_blank" rel="noreferrer" className="tn-social-link" title="GitHub">
                <Globe size={16} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="tn-social-link" title="LinkedIn">
                <MessageSquare size={16} />
              </a>
              <a href="https://techneeds.org" target="_blank" rel="noreferrer" className="tn-social-link" title="Community">
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>

        <div className="tn-footer-bottom">
          <p>© {new Date().getFullYear()} TechNeeds 2.0. Built for hackathon excellence.</p>
          <p className="tn-footer-credit">Crafted with precision for next-gen developers</p>
        </div>
      </div>
    </footer>
  );
};


export default Footer;
