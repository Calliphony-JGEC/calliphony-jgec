import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { playDrumSting } from '../utils/drumSting';

function emptyAnswers(fields = []) {
  const next = {};
  fields.forEach((field) => {
    next[field.id] = field.type === 'checkbox' ? [] : '';
  });
  return next;
}

function hydrateForm(payload) {
  if (!payload) return null;
  const format = payload.format && typeof payload.format === 'object' ? payload.format : payload;
  return {
    id: payload.id,
    title: format.title || payload.title,
    description: format.description ?? payload.description ?? '',
    buttonLabel: format.buttonLabel || payload.buttonLabel || format.title || payload.title,
    submitLabel: format.submitLabel || payload.submitLabel || 'Submit',
    fields: Array.isArray(format.fields) && format.fields.length ? format.fields : payload.fields || [],
  };
}

export default function PublicForm() {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const data = formId ? await api.getForm(formId) : await api.getPublicForm();
        if (cancelled) return;
        const live = hydrateForm(data.form);
        setForm(live);
        setAnswers(emptyAnswers(live?.fields || []));
      } catch (err) {
        if (!cancelled) {
          setForm(null);
          setError(err.message || 'Could not load the form.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [formId]);

  const setAnswer = (fieldId, value) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const toggleCheckbox = (fieldId, option) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[fieldId]) ? prev[fieldId] : [];
      const next = current.includes(option) ? current.filter((v) => v !== option) : [...current, option];
      return { ...prev, [fieldId]: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form) return;
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await api.submitFormResponse(form.id, answers);
      setSuccess('Submitted. Thank you — we’ll be in touch.');
      setAnswers(emptyAnswers(form.fields));
      playDrumSting().catch(() => {});
    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-login-page">
        <span className="admin-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px', borderTopColor: 'var(--riso-red)' }} />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-card glass-card">
          <span className="admin-tag">■ Forms</span>
          <h1 className="section-heading" style={{ fontSize: '2.2rem', marginTop: '8px' }}>closed.</h1>
          <p style={{ color: 'var(--ink-muted)', marginBottom: '24px' }}>
            There is no open form right now. Check back when Calliphony publishes one.
          </p>
          <a href="/" style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-label)' }}>
            ← Back to Calliphony
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card glass-card">
        <span className="admin-tag">■ {form.buttonLabel || form.title}</span>
        <h1 className="section-heading" style={{ fontSize: '2.2rem', marginTop: '8px', marginBottom: '8px' }}>
          {form.title.toLowerCase()}.
        </h1>
        {form.description && (
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem', marginBottom: '28px', fontFamily: 'var(--font-body)' }}>
            {form.description}
          </p>
        )}

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
          {form.fields.map((field) => (
            <div className="form-group" key={field.id}>
              <label htmlFor={`field-${field.id}`}>
                {field.label}
                {field.required ? '' : ' (optional)'}
              </label>

              {field.type === 'textarea' && (
                <textarea
                  id={`field-${field.id}`}
                  className="form-input"
                  rows={4}
                  placeholder={field.placeholder}
                  value={answers[field.id] || ''}
                  onChange={(e) => setAnswer(field.id, e.target.value)}
                  required={field.required}
                  disabled={submitting}
                />
              )}

              {(field.type === 'text' ||
                field.type === 'email' ||
                field.type === 'url' ||
                field.type === 'tel' ||
                field.type === 'number') && (
                <input
                  id={`field-${field.id}`}
                  type={field.type === 'url' ? 'url' : field.type}
                  className="form-input"
                  placeholder={field.placeholder || (field.type === 'url' ? 'https://' : '')}
                  value={answers[field.id] || ''}
                  onChange={(e) => setAnswer(field.id, e.target.value)}
                  required={field.required}
                  disabled={submitting}
                  inputMode={field.type === 'url' ? 'url' : undefined}
                />
              )}

              {field.type === 'select' && (
                <select
                  id={`field-${field.id}`}
                  className="form-input"
                  value={answers[field.id] || ''}
                  onChange={(e) => setAnswer(field.id, e.target.value)}
                  required={field.required}
                  disabled={submitting}
                >
                  <option value="" disabled>
                    Select an option
                  </option>
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}

              {field.type === 'radio' && (
                <div className="form-choice-list">
                  {(field.options || []).map((opt) => (
                    <label key={opt} className="form-check-row">
                      <input
                        type="radio"
                        name={field.id}
                        value={opt}
                        checked={answers[field.id] === opt}
                        onChange={() => setAnswer(field.id, opt)}
                        required={field.required}
                        disabled={submitting}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}

              {field.type === 'checkbox' && (
                <div className="form-choice-list">
                  {(field.options || []).map((opt) => (
                    <label key={opt} className="form-check-row">
                      <input
                        type="checkbox"
                        value={opt}
                        checked={(answers[field.id] || []).includes(opt)}
                        onChange={() => toggleCheckbox(field.id, opt)}
                        disabled={submitting}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button
            type="submit"
            className="btn-primary btn-ink-stamp"
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="admin-spinner"></span>
                Sending...
              </>
            ) : (
              `${form.submitLabel || 'Submit'} →`
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
