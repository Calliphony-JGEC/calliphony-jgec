import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/admin/upload', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="admin-login-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <span className="admin-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px', borderTopColor: 'var(--riso-red)' }}></span>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in both fields.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin/upload');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card glass-card">
        <span className="admin-tag">■ Admin Portal</span>
        <h1 className="section-heading" style={{ fontSize: '2.2rem', marginTop: '8px', marginBottom: '8px' }}>
          sign in.
        </h1>
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem', marginBottom: '28px', fontFamily: 'var(--font-body)' }}>
          Authenticate with your admin credentials to access the upload dashboard.
        </p>

        {error && (
          <div className="admin-error-banner">
            <span>⚠</span> {error}
          </div>
        )}

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="admin-email">Email Address</label>
            <input
              id="admin-email"
              type="text"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="form-input"
              placeholder="admin@calliphony.club"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn-primary btn-ink-stamp"
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="admin-spinner"></span>
                Authenticating...
              </>
            ) : (
              'Sign In →'
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a href="/" style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-label)' }}>
            ← Back to Calliphony
          </a>
        </div>
      </div>
    </div>
  );
}
