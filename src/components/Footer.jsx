import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from './ThemeControls';
import { api } from '../api/client';

const FALLBACK_LINKS = [
  { label: 'Instagram', url: 'https://instagram.com/calliphony_music_club' },
  { label: 'Gallery', url: '/#events' },
];

export default function Footer() {
  const [links, setLinks] = useState(FALLBACK_LINKS);

  useEffect(() => {
    let cancelled = false;
    api
      .getSiteSettings()
      .then((data) => {
        const next = data.settings?.footerLinks || [];
        if (!cancelled && next.length) setLinks(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer id="about" className="footer container">
      <div className="footer-content" data-reveal>
        <div>
          <BrandLogo className="footer-logo-img" />
          <h3 style={{ fontFamily: 'var(--font-header)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink-black)', marginBottom: '8px' }}>
            calliphony — music club.
          </h3>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.88rem', maxWidth: '420px', lineHeight: '1.6' }}>
            The premier harmonic society and sonic arts collective of JGEC. 
            Celebrating live acoustics, studio jams, and student musicianship.
          </p>
        </div>

        <ul className="footer-links">
          {links.map((link) => {
            const external = /^https?:\/\//i.test(link.url);
            return (
              <li key={`${link.label}-${link.url}`}>
                {external ? (
                  <a href={link.url} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ) : (
                  <a href={link.url}>{link.label}</a>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="footer-meta">
        <Link to="/admin" className="footer-admin-link" title="Admin portal">
          Admin
        </Link>
      </div>
    </footer>
  );
}
