import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BrandLogo, ThemeToggleButton } from './ThemeControls';

export default function AdminNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogoClick = (e) => {
    e.preventDefault();
    navigate('/');
  };

  const handleAdminNavClick = (e, targetId) => {
    e.preventDefault();
    const targetPath = `/admin/${targetId}`;
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <header className={`admin-header ${scrolled ? 'admin-header--scrolled' : ''}`}>
      <div className="admin-header-inner">
        <a
          href="/"
          onClick={handleLogoClick}
          className="nav-logo"
          style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}
        >
          <BrandLogo />
          <span className="admin-logo-suffix">Admin</span>
        </a>

        <ul className="nav-links">
          <li>
            <a href="/admin/upload" onClick={(e) => handleAdminNavClick(e, 'upload')} className="nav-link-item">
              <span>Uploads</span>
            </a>
          </li>
          <li>
            <a
              href="/admin/secretaries"
              onClick={(e) => handleAdminNavClick(e, 'secretaries')}
              className="nav-link-item"
            >
              <span>Secretaries</span>
            </a>
          </li>
          <li>
            <a href="/admin/intake" onClick={(e) => handleAdminNavClick(e, 'intake')} className="nav-link-item">
              <span>Intake</span>
            </a>
          </li>
        </ul>

        <div className="admin-header-right">
          <ThemeToggleButton />
          {user && (
            <>
              <span className="admin-user-email">{user.email}</span>
              <button onClick={handleLogout} className="btn-secondary btn-sm btn-ink-stamp">
                Logout ↗
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
