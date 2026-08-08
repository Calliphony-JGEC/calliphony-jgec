import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function HomeHomeNavbar() {
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
      // if user is on an events detail page or admin tab, navigate back to home with section hash
      navigate(targetId ? `/#${targetId}` : '/');
    } else {
      // if already on home page, then smooth scroll directly to target section or top
      if (!targetId) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  };

  return (
    <header className={`HomeNavbar ${scrolled ? 'HomeNavbar--scrolled' : ''}`}>
      <nav className="HomeNavbar-container">
        <a href="/" onClick={(e) => handleNavClick(e, '')} className="nav-logo">
          <span>/ calliphony</span>
          <div className="equalizer" title="live">
            <div className="eq-bar"></div>
            <div className="eq-bar"></div>
            <div className="eq-bar"></div>
            <div className="eq-bar"></div>
            <div className="eq-bar"></div>
          </div>
        </a>

        <ul className="nav-links">
          <li><a href="#events" onClick={(e) => handleNavClick(e, 'events')} className="nav-link-item"><span>Gallery</span></a></li>
          <li><a href="#secretaries" onClick={(e) => handleNavClick(e, 'secretaries')} className="nav-link-item"><span>Secretaries</span></a></li>
          <li><a href="#about" onClick={(e) => handleNavClick(e, 'about')} className="nav-link-item"><span>About</span></a></li>
        </ul>

        <div>
          <button 
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
