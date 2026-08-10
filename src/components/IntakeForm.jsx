import React, { useState } from 'react';
import { api } from '../api/client';

export default function IntakeForm() {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim() || !department.trim() || !rollNumber.trim() || !role) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      await api.submitIntake({ name, department, rollNumber, role });
      setSuccess('Registration successful! Stay tuned for updates.');
      setName('');
      setDepartment('');
      setRollNumber('');
      setRole('');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card glass-card">
        <span className="admin-tag">■ Intake Portal</span>
        <h1 className="section-heading" style={{ fontSize: '2.2rem', marginTop: '8px', marginBottom: '8px' }}>
          register.
        </h1>
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem', marginBottom: '28px', fontFamily: 'var(--font-body)' }}>
          Register for the intake of Calliphony by providing the details below. Stay tuned for updates!
        </p>

        {error && (
          <div className="admin-error-banner">
            <span>⚠</span> {error}
          </div>
        )}

        {success && (
          <div className="admin-success-banner">
            <span>✓</span> {success}
          </div>
        )}

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="intake-name">Name</label>
            <input
              id="intake-name"
              type="text"
              className="form-input"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="intake-department">Department</label>
            <select
              id="intake-department"
              type="text"
              className="form-input"
              placeholder="Your department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
              disabled={loading}
            >
              <option value="" disabled>Select your department</option>
              <option value="CSE">CSE</option>
              <option value="IT">IT</option>
              <option value="ECE">ECE</option>
              <option value="EE">EE</option>
              <option value="CE">CE</option>
              <option value="ME">ME</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="intake-roll">Roll Number</label>
            <input
              id="intake-roll"
              type="text"
              className="form-input"
              placeholder="Your college roll number"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="intake-role">Instrumentalist / Singer</label>
            <input
              id="intake-role"
              type="text"
              className="form-input"
              placeholder="Instruments you play or if you sing"
              value={role}
              onChange={(e) => setRole(e.target.value)}
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
                Registering...
              </>
            ) : (
              'Register →'
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
