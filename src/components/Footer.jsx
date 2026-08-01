import React from 'react';

export default function Footer() {
  return (
    <footer id="about" className="footer container">
      <div className="footer-content" data-reveal>
        <div>
          <h3 style={{ fontFamily: 'var(--font-header)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink-black)', marginBottom: '8px' }}>
            calliphony — music club.
          </h3>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.88rem', maxWidth: '420px', lineHeight: '1.6' }}>
            The premier harmonic society and sonic arts collective of JGEC. 
            Celebrating live acoustics, studio jams, and student musicianship.
          </p>
        </div>

        <ul className="footer-links">
          <li><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a></li>
          {/* <li><a href="https://spotify.com" target="_blank" rel="noreferrer">Spotify</a></li> */}
          <li><a href="https://youtube.com" target="_blank" rel="noreferrer">YouTube</a></li>
          <li><a href="#events">Gallery</a></li>
        </ul>
      </div>

      <div style={{ marginTop: '36px', paddingTop: '16px', borderTop: '1px solid var(--border-ink)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', fontSize: '0.8rem', color: 'var(--ink-light)' }}>
        {/* <span>© {new Date().getFullYear()} Calliphony Music Collective.</span> */}
      </div>
    </footer>
  );
}
