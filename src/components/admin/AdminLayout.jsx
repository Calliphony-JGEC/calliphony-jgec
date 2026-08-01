import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="admin-header-inner">
          <a href="/" className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <span>/ calliphony</span>
            <div className="equalizer" title="live">
              <div className="eq-bar"></div>
              <div className="eq-bar"></div>
              <div className="eq-bar"></div>
              <div className="eq-bar"></div>
              <div className="eq-bar"></div>
            </div>
            <span style={{ color: 'var(--riso-red)', fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'lowercase' }}>
              / admin
            </span>
          </a>

          {user && (
            <div className="admin-header-right">
              <span className="admin-user-email">{user.email}</span>
              <button onClick={handleLogout} className="btn-secondary btn-sm btn-ink-stamp">
                Logout ↗
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
