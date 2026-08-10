import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BrandLogo, ThemeToggleButton } from './ThemeControls';

export default function HomeNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    if (location.pathname !== '/') {
      navigate(targetId ? `/#${targetId}` : '/');
    } else if (!targetId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`HomeNavbar ${scrolled ? 'HomeNavbar--scrolled' : ''}`}>
      <nav className="HomeNavbar-container">
        <a href="/" onClick={(e) => handleNavClick(e, '')} className="nav-logo" aria-label="Calliphony home">
          <BrandLogo />
        </a>

        <ul className="nav-links">
          <li>
            <a href="#events" onClick={(e) => handleNavClick(e, 'events')} className="nav-link-item">
              <span>Gallery</span>
            </a>
          </li>
          <li>
            <a href="#secretaries" onClick={(e) => handleNavClick(e, 'secretaries')} className="nav-link-item">
              <span>Secretaries</span>
            </a>
          </li>
          <li>
            <a href="#about" onClick={(e) => handleNavClick(e, 'about')} className="nav-link-item">
              <span>About</span>
            </a>
          </li>
        </ul>

        <div className="nav-actions">
          <ThemeToggleButton />
          <button
            type="button"
            onClick={() => navigate('/intake')}
            className="admin-badge-btn"
            title="Intake registration"
          >
            <span>Intake ↗</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="admin-badge-btn"
            title="Admin upload portal"
          >
            <span>Admin ↗</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
