import React, { useState, useEffect, useRef } from 'react';

const DEFAULT_YEARS = ['2026-2027', '2025-2026', '2024-2025', '2023-2024'];

export default function SecretariesSection({ secretaries, onOpenDetailedView }) {
  const firestoreYears = Object.keys(secretaries);
  const allYears = [...new Set([...DEFAULT_YEARS, ...firestoreYears])].sort((a, b) => b.localeCompare(a));
  const [activeYear, setActiveYear] = useState(allYears[0]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!allYears.includes(activeYear)) {
      setActiveYear(allYears[0]);
    }
  }, [allYears.join(',')]);

  const handleYearChange = (year) => {
    setActiveYear(year);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -360, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 360, behavior: 'smooth' });
    }
  };

  const currentSecretaries = secretaries[activeYear] || [];
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    const checkScrollable = () => {
      if (scrollRef.current) {
        setIsScrollable(scrollRef.current.scrollWidth > scrollRef.current.clientWidth);
      }
    };
    
    checkScrollable();
    
    window.addEventListener('resize', checkScrollable);
    return () => window.removeEventListener('resize', checkScrollable);
  }, [currentSecretaries, activeYear]);

  const showControls = currentSecretaries.length > 0 && isScrollable;

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
          All Years {'\u2192'}
        </button>
      </div>

      <div className="timeline-tabs" data-reveal data-reveal-delay="0.1">
        {allYears.map((year) => (
          <button
            key={year}
            onClick={() => handleYearChange(year)}
            className={`tab-btn ${activeYear === year ? 'active' : ''}`}
          >
            {year}
          </button>
        ))}
      </div>

      <div data-reveal data-reveal-delay="0.2" style={{ position: 'relative' }}>
        {showControls && (
          <button 
            onClick={scrollLeft}
            style={{
              position: 'absolute',
              left: '-24px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--bg-paper)',
              border: '2px solid var(--border-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              fontSize: '1.2rem',
              color: 'var(--riso-red)'
            }}
            title="Scroll Left"
          >
            {'\u2190'}
          </button>
        )}

        {currentSecretaries.length > 0 ? (
          <div
            ref={scrollRef}
            key={activeYear}
            className="secretaries-track"
            style={{ 
              display: 'flex',
              flexWrap: 'nowrap',
              gap: '28px', 
              padding: '8px 4px 32px 4px',
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none'
            }}
          >
            <style>{`.secretaries-track::-webkit-scrollbar { display: none; }`}</style>
            
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
                  flexShrink: 0,
                  width: '340px',
                  maxWidth: '85vw'
                }}
              >
                <div style={{ position: 'relative', width: '100%', height: '280px', backgroundColor: 'var(--bg-paper-dark)', overflow: 'hidden' }}>
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
                      width: '48px',
                      height: '48px',
                      fontSize: '1.4rem',
                      margin: 0,
                      boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
                      border: '1px solid var(--border-ink)',
                      zIndex: 2,
                      background: 'var(--bg-paper)'
                    }}
                  >
                    {sec.icon || '\ud83c\udfb5'}
                  </div>
                </div>

                <div style={{ padding: '20px 24px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-ink)', width: '100%' }}>
                  <h3 style={{ fontFamily: 'var(--font-header)', fontSize: '1.8rem', margin: '0 0 4px 0', color: 'var(--ink-black)', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sec.name}
                  </h3>
                  <span className="secretary-role" style={{ display: 'inline-block', fontSize: '0.8rem', color: 'var(--riso-red)', fontWeight: 700, fontFamily: 'var(--font-label)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {'\u25a0'} {sec.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            key={activeYear}
            className="glass-card"
            style={{ padding: '48px 32px', textAlign: 'center', borderRadius: 'var(--radius-md)', marginTop: '16px' }}
          >
            <p style={{ color: 'var(--ink-muted)', fontSize: '1rem', margin: 0 }}>
              No secretaries added for {activeYear} yet.
            </p>
          </div>
        )}

        {showControls && (
          <button 
            onClick={scrollRight}
            style={{
              position: 'absolute',
              right: '-24px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--bg-paper)',
              border: '2px solid var(--border-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              fontSize: '1.2rem',
              color: 'var(--riso-red)'
            }}
            title="Scroll Right"
          >
            {'\u2192'}
          </button>
        )}
      </div>
    </section>
  );
}
