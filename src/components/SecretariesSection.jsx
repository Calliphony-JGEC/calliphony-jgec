import React, { useState } from 'react';

export default function SecretariesSection({ secretaries, onOpenDetailedView }) {
  const years = Object.keys(secretaries);
  const [activeYear, setActiveYear] = useState(years[0]);

  const handleYearChange = (year) => {
    setActiveYear(year);
  };

  const currentSecretaries = secretaries[activeYear] || [];

  return (
    <section id="secretaries" className="secretaries-section container">
      <div className="section-header-flex" data-reveal>
        <div>
          <h2 className="section-heading">club secretaries.</h2>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Our leadership across the years. The executive visionaries and musical leads who shape the heritage of Calliphony.
          </p>
        </div>

        <button 
          onClick={() => onOpenDetailedView('secretaries')} 
          className="btn-secondary btn-sm btn-ink-stamp"
        >
          All Years →
        </button>
      </div>

      {/* select a year */}
      <div className="timeline-tabs" data-reveal data-reveal-delay="0.1">
        {years.map((year) => (
          <button
            key={year}
            onClick={() => handleYearChange(year)}
            className={`tab-btn ${activeYear === year ? 'active' : ''}`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* secretary profiless */}
      <div data-reveal data-reveal-delay="0.2">
        <div
          key={activeYear}
          className="secretaries-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 440px))', justifyContent: 'flex-start', gap: '40px', padding: '16px 0' }}
        >
          {currentSecretaries.map((sec, index) => (
            <div
              key={`${activeYear}-${sec.id || index}`}
              className="secretary-card glass-card tilt-card"
              style={{ 
                animation: 'secCardEnter 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
                animationDelay: `${index * 0.08}s`,
                padding: 0,
                flexDirection: 'column',
                gap: 0,
                overflow: 'hidden',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-ink)',
                boxShadow: '0 12px 36px oklch(18% 0.06 30 / 0.12)',
                width: '100%',
                maxWidth: '440px'
              }}
            >
              {/*photo container, currently with a random ass img*/}
              <div style={{ position: 'relative', width: '100%', height: '320px', backgroundColor: 'var(--bg-paper-dark)', overflow: 'hidden' }}>
                <img 
                  src={sec.image || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&q=80&w=600'} 
                  alt={sec.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }} 
                />
                <div 
                  className="secretary-avatar-container" 
                  title={sec.role}
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    right: '16px',
                    width: '56px',
                    height: '56px',
                    fontSize: '1.6rem',
                    margin: 0,
                    boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
                    border: '1px solid var(--border-ink)',
                    zIndex: 2,
                    background: 'var(--bg-paper)'
                  }}
                >
                  {sec.icon || '🎵'}
                </div>
              </div>

              {/* name+role(currently hardcoded) */}
              <div style={{ padding: '24px 28px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-ink)', width: '100%' }}>
                <h3 style={{ fontFamily: 'var(--font-header)', fontSize: '2.2rem', margin: '0 0 6px 0', color: 'var(--ink-black)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  {sec.name}
                </h3>
                <span className="secretary-role" style={{ display: 'inline-block', fontSize: '0.85rem', color: 'var(--riso-red)', fontWeight: 700, fontFamily: 'var(--font-label)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  ■ {sec.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
