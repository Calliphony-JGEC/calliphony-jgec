import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BrandLogo, ThemeToggleButton } from './ThemeControls';
import { api } from '../api/client';

export default function HomeNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [navForms, setNavForms] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .getPublicForm()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data.forms)
          ? data.forms
          : data.form
            ? [data.form]
            : [];
        setNavForms(list);
      })
      .catch(() => {
        if (!cancelled) setNavForms([]);
      });
    return () => {
      cancelled = true;
    };
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
          {navForms.map((form) => {
            const label = (form.buttonLabel || form.title || '').trim();
            if (!label) return null;
            return (
              <button
                key={form.id}
                type="button"
                onClick={() => navigate(`/form/${form.id}`)}
                className="admin-badge-btn"
                title={label}
              >
                <span>{label} ↗</span>
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
