import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';

export default function AdminIntake() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await api.getIntakeRegistrations();
        if (!cancelled) setRegistrations(data.registrations || []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load registrations.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this registration?')) return;
    try {
      await api.deleteIntakeRegistration(id);
      setRegistrations((prev) => prev.filter((reg) => reg.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete registration.');
    }
  };

  if (loading) {
    return (
      <div className="admin-page-container" style={{ padding: '2rem', textAlign: 'center' }}>
        <span
          className="admin-spinner"
          style={{ width: '32px', height: '32px', borderWidth: '3px', borderTopColor: 'var(--riso-red)' }}
        ></span>
      </div>
    );
  }

  return (
    <div className="admin-page-container" style={{ padding: '2rem' }}>
      <span className="admin-tag">■ Intake Registrations</span>
      <h1 className="section-heading" style={{ fontSize: '2rem', marginTop: '8px', marginBottom: '8px' }}>
        registrations.
      </h1>
      <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem', marginBottom: '28px', fontFamily: 'var(--font-body)' }}>
        {registrations.length} registration{registrations.length !== 1 ? 's' : ''} received so far.
      </p>

      {error && (
        <div className="admin-error-banner">
          <span>⚠</span> {error}
        </div>
      )}

      {registrations.length === 0 && !error ? (
        <p style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-body)' }}>
          No registrations yet.
        </p>
      ) : (
        <div className="glass-card" style={{ padding: '0', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--border-ink-strong)', textAlign: 'left' }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Department</th>
                <th style={thStyle}>Roll Number</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Registered</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg, i) => (
                <tr key={reg.id} style={{ borderBottom: '1px solid var(--border-ink)' }}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>{reg.name}</td>
                  <td style={tdStyle}>{reg.department}</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-label)', fontWeight: 600 }}>{reg.rollNumber}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontFamily: 'var(--font-label)',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: reg.role === 'Singer' ? 'var(--riso-red)' : 'var(--ink-black)',
                        background: reg.role === 'Singer' ? 'oklch(52% 0.23 27 / 0.08)' : 'var(--bg-paper-dark)',
                        border: `1.5px solid ${reg.role === 'Singer' ? 'var(--riso-red)' : 'var(--border-ink-strong)'}`,
                        padding: '3px 10px',
                        display: 'inline-block',
                      }}
                    >
                      {reg.role}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                    {new Date(reg.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleDelete(reg.id)}
                      className="btn-secondary btn-sm"
                      style={{ color: 'var(--riso-red)', borderColor: 'var(--border-ink-strong)' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '14px 18px',
  fontSize: '0.78rem',
  fontFamily: 'var(--font-label)',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--ink-muted)',
};

const tdStyle = {
  padding: '14px 18px',
  fontSize: '0.92rem',
};
