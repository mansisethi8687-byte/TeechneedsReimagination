'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Terminal, Sparkles, Trophy, Users, Shield, BookOpen, 
  Menu, X, ChevronDown, UserCheck, LogOut, ExternalLink, Zap, Calendar
} from 'lucide-react';
import { menteeLogin, mentorLogin } from '../../lib/api';
import './navbar.css';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);
  const [portalMenuOpen, setPortalMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Check local storage for active session
    const menteeToken = localStorage.getItem('menteeToken');
    const mentorToken = localStorage.getItem('token');
    const mentorData = localStorage.getItem('mentor');

    if (menteeToken) {
      const menteeData = localStorage.getItem('mentee');
      let menteeName = 'Mentee';
      if (menteeData) {
        try {
          menteeName = JSON.parse(menteeData).name || menteeName;
        } catch (_) {}
      }
      setCurrentUser({ role: 'mentee', name: `${menteeName} (Mentee)` });
    } else if (mentorToken && mentorData) {
      try {
        const parsed = JSON.parse(mentorData);
        setCurrentUser({ role: 'mentor', name: `${parsed.name} (Mentor)` });
      } catch (e) {
        setCurrentUser({ role: 'mentor', name: 'Mentor' });
      }
    } else {
      setCurrentUser(null);
    }
  }, [pathname]);

  const handleQuickLogin = async (role) => {
    setDemoMenuOpen(false);
    setMobileMenuOpen(false);
    if (role === 'mentee') {
      try {
        const data = await menteeLogin('1234567', '1234567');
        if (data.token) {
          localStorage.removeItem('token');
          localStorage.removeItem('mentor');
          localStorage.setItem('menteeToken', data.token);
          if (data.mentee) {
            localStorage.setItem('mentee', JSON.stringify(data.mentee));
          }
          const name = data.mentee?.name || 'Mentee';
          setCurrentUser({ role: 'mentee', name: `${name} (Mentee)` });
          router.push('/profile');
        }
      } catch (err) {
        console.error('Demo mentee login failed', err);
        router.push('/mentee');
      }
    } else if (role === 'mentor') {
      try {
        const data = await mentorLogin('smith@example.com', '123456');
        if (data.token) {
          localStorage.removeItem('menteeToken');
          localStorage.removeItem('mentee');
          localStorage.setItem('token', data.token);
          localStorage.setItem('mentor', JSON.stringify(data.mentor));
          const name = data.mentor?.name || 'Mentor';
          setCurrentUser({ role: 'mentor', name: `${name} (Mentor)` });
          router.push('/mentor');
        }
      } catch (err) {
        console.error('Demo mentor login failed', err);
        router.push('/mentor');
      }
    } else if (role === 'admin') {
      router.push('/admin');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('menteeToken');
    localStorage.removeItem('mentee');
    localStorage.removeItem('token');
    localStorage.removeItem('mentor');
    localStorage.removeItem('selectedProgram');
    setCurrentUser(null);
    router.push('/');
  };

  const navLinks = [
    { name: 'Home', href: '/', icon: Terminal },
    { name: 'Events', href: '/eventspage', icon: Calendar },
    { name: 'Cohorts', href: '/techboard', icon: BookOpen },
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    { name: 'AI Profile', href: '/profile', icon: Sparkles, highlight: true },
  ];

  return (
    <header className="tn-header">
      <div className="tn-nav-container">
        {/* Brand Logo */}
        <Link href="/" className="tn-brand">
          <div className="tn-brand-logo">
            <Terminal size={20} className="tn-brand-icon" />
          </div>
          <div className="tn-brand-text">
            <span className="tn-brand-title">TECHNEEDS</span>
            <span className="tn-version-badge">2.0</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="tn-nav-links">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`tn-nav-link ${isActive ? 'active' : ''} ${link.highlight ? 'highlight' : ''}`}
              >
                <Icon size={16} />
                <span>{link.name}</span>
                {link.highlight && <span className="tn-pulse-dot" />}
              </Link>
            );
          })}

          {/* Portals Dropdown */}
          <div className="tn-dropdown-container">
            <button
              type="button"
              className={`tn-nav-link tn-dropdown-trigger ${portalMenuOpen ? 'open' : ''}`}
              onClick={() => setPortalMenuOpen(!portalMenuOpen)}
              onBlur={() => setTimeout(() => setPortalMenuOpen(false), 200)}
            >
              <Users size={16} />
              <span>Portals</span>
              <ChevronDown size={14} className={`tn-chevron ${portalMenuOpen ? 'rotated' : ''}`} />
            </button>

            {portalMenuOpen && (
              <div className="tn-dropdown-menu">
                <Link href="/dashboard" className="tn-dropdown-item">
                  <div className="tn-item-title">Mentee Workspace</div>
                  <div className="tn-item-desc">Curriculum, quizzes & projects</div>
                </Link>
                <Link href="/mentor" className="tn-dropdown-item">
                  <div className="tn-item-title">Mentor Studio</div>
                  <div className="tn-item-desc">Review queue & cohort manager</div>
                </Link>
                <Link href="/admin" className="tn-dropdown-item">
                  <div className="tn-item-title">Admin Console</div>
                  <div className="tn-item-desc">Programs, mentors & platform metrics</div>
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* Action Controls / Demo Switcher */}
        <div className="tn-nav-actions">
          {currentUser ? (
            <div className="tn-user-badge">
              <span className="tn-user-role-dot" />
              <span className="tn-user-name">{currentUser.name}</span>
              <button 
                onClick={handleLogout} 
                className="tn-icon-btn" 
                title="Sign Out"
                type="button"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="tn-demo-container">
              <button
                type="button"
                className="tn-demo-btn"
                onClick={() => setDemoMenuOpen(!demoMenuOpen)}
                onBlur={() => setTimeout(() => setDemoMenuOpen(false), 250)}
              >
                <Zap size={14} className="tn-demo-icon" />
                <span>Quick Demo Login</span>
                <ChevronDown size={13} />
              </button>

              {demoMenuOpen && (
                <div className="tn-demo-menu">
                  <div className="tn-demo-header">Select Demo Role (for Judges)</div>
                  <button 
                    type="button" 
                    className="tn-demo-option mentee"
                    onMouseDown={() => handleQuickLogin('mentee')}
                  >
                    <div className="tn-demo-role">Mentee (Vidushi)</div>
                    <div className="tn-demo-detail">Rank #1 • 1058 XP • AI Profile</div>
                  </button>
                  <button 
                    type="button" 
                    className="tn-demo-option mentor"
                    onMouseDown={() => handleQuickLogin('mentor')}
                  >
                    <div className="tn-demo-role">Mentor (Dr. Smith)</div>
                    <div className="tn-demo-detail">Web Dev Cohort • Project Grading</div>
                  </button>
                  <button 
                    type="button" 
                    className="tn-demo-option admin"
                    onMouseDown={() => handleQuickLogin('admin')}
                  >
                    <div className="tn-demo-role">Platform Admin</div>
                    <div className="tn-demo-detail">Cohort Setup • Program Analytics</div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Launch Hub CTA */}
          <Link href="/profile" className="tn-launch-btn">
            <span>Explore AI Hub</span>
            <ExternalLink size={14} />
          </Link>

          {/* Mobile Hamburger */}
          <button
            type="button"
            className="tn-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="tn-mobile-drawer">
          <div className="tn-mobile-links">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`tn-mobile-link ${pathname === link.href ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon size={18} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
            <div className="tn-mobile-divider" />
            <Link href="/dashboard" className="tn-mobile-link" onClick={() => setMobileMenuOpen(false)}>
              <UserCheck size={18} />
              <span>Mentee Workspace</span>
            </Link>
            <Link href="/mentor" className="tn-mobile-link" onClick={() => setMobileMenuOpen(false)}>
              <Users size={18} />
              <span>Mentor Studio</span>
            </Link>
            <Link href="/admin" className="tn-mobile-link" onClick={() => setMobileMenuOpen(false)}>
              <Shield size={18} />
              <span>Admin Console</span>
            </Link>

            <div className="tn-mobile-divider" />
            <div className="tn-mobile-demo-section">
              <div className="tn-mobile-demo-label">⚡ 1-Click Demo Logins:</div>
              <button 
                type="button" 
                className="tn-btn-secondary tn-mobile-demo-btn"
                onClick={() => handleQuickLogin('mentee')}
              >
                Log in as Mentee (Vidushi)
              </button>
              <button 
                type="button" 
                className="tn-btn-secondary tn-mobile-demo-btn"
                onClick={() => handleQuickLogin('mentor')}
              >
                Log in as Mentor (Dr. Smith)
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
