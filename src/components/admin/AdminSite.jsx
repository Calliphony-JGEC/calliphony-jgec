import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';

function emptyLink() {
  return { label: '', url: '' };
}

export default function AdminSite() {
  const [links, setLinks] = useState([emptyLink()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api.getSiteSettings();
        const next = data.settings?.footerLinks || [];
        if (!cancelled) setLinks(next.length ? next : [emptyLink()]);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load footer links.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateLink = (index, patch) => {
    setLinks((prev) => prev.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const cleaned = links
      .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
      .filter((link) => link.label && link.url);

    setSaving(true);
    try {
      const data = await api.updateSiteSettings({ footerLinks: cleaned });
      const saved = data.settings?.footerLinks || [];
      setLinks(saved.length ? saved : [emptyLink()]);
      setSuccess('Footer links saved. They now appear on the public site.');
    } catch (err) {
      setError(err.message || 'Could not save footer links.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-container" style={{ padding: '2rem', textAlign: 'center' }}>
        <span className="admin-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px', borderTopColor: 'var(--riso-red)' }} />
      </div>
    );
  }

  return (
    <div className="admin-upload-container">
      <div className="admin-upload-header" style={{ marginBottom: '28px' }}>
        <span className="admin-tag">■ Site</span>
        <h1 className="section-heading" style={{ fontSize: '2rem', marginTop: '8px' }}>
          footer links.
        </h1>
        <p style={{ color: 'var(--ink-muted)', maxWidth: '640px' }}>
          These labels and URLs show in the site footer. Use full links for Instagram, YouTube, etc., or paths like <code>/#events</code> for in-site pages.
        </p>
      </div>

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

      <div className="admin-upload-card glass-card">
        <form className="admin-form" onSubmit={handleSave}>
          {links.map((link, index) => (
            <div key={`footer-link-${index}`} className="footer-link-row">
              <input
                type="text"
                className="form-input"
                placeholder="Label (e.g. Instagram)"
                value={link.label}
                onChange={(e) => updateLink(index, { label: e.target.value })}
                disabled={saving}
              />
              <input
                type="text"
                className="form-input"
                placeholder="https://… or /#events"
                value={link.url}
                onChange={(e) => updateLink(index, { url: e.target.value })}
                disabled={saving}
              />
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setLinks((prev) => (prev.length === 1 ? [emptyLink()] : prev.filter((_, i) => i !== index)))}
                disabled={saving}
                style={{ color: 'var(--riso-red)' }}
              >
                Remove
              </button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setLinks((prev) => [...prev, emptyLink()])}
              disabled={saving}
            >
              + Add link
            </button>
            <button type="submit" className="btn-primary btn-ink-stamp" disabled={saving}>
              {saving ? 'Saving…' : 'Save footer links'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
