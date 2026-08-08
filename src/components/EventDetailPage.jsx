import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import HomeNavbar from './HomeNavbar';
import Footer from './Footer';
import useScrollReveal from '../hooks/useScrollReveal';

export default function EventDetailPage({ events, loading }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [selectedMedia, setSelectedMedia] = useState(null);

  
  useScrollReveal([events, eventId]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [eventId]);

  const decodedId = decodeURIComponent(eventId || '');
  const event = events.find((e) => e.id === decodedId || e.title === decodedId);

  return (
    <div className="app-wrapper">
      <HomeNavbar />

      <main className="container event-detail-main" style={{ padding: '60px 40px', minHeight: '75vh' }}>
        
        <div style={{ marginBottom: '32px' }}>
          <Link
            to="/#events"
            className="btn-secondary btn-sm btn-ink-stamp event-back-btn"
            style={{ borderRadius: 'var(--radius-sm)', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            ← Back to Gallery
          </Link>
        </div>

        {!event ? (
          <div className="glass-card" style={{ padding: '60px 40px', textAlign: 'center', borderRadius: 'var(--radius-md)', margin: '40px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>📭</div>
            <h2 style={{ fontFamily: 'var(--font-header)', fontSize: '1.8rem', color: 'var(--ink-black)', marginBottom: '12px' }}>
              {loading ? 'Loading event details...' : 'Event Archive Not Found'}
            </h2>
            <p style={{ color: 'var(--ink-muted)', fontSize: '1rem', maxWidth: '450px', margin: '0 auto 20px', lineHeight: 1.6 }}>
              {loading
                ? 'Please wait while we fetch the media archive from Cloudinary...'
                : `We couldn't find an event titled "${decodedId}". It may have been renamed or removed.`}
            </p>
            {!loading && (
              <button
                onClick={() => navigate('/')}
                className="btn-primary btn-ink-stamp"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                Return Home
              </button>
            )}
          </div>
        ) : (
          <div className="event-detail-content">
            
            <div data-reveal style={{ borderBottom: '2px solid var(--border-ink)', paddingBottom: '40px', marginBottom: '48px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ color: 'var(--riso-red)', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-label)' }}>
                  ■ Live Event Archive
                </span>
                <span style={{ color: 'var(--ink-light)' }}>·</span>
                <span style={{ color: 'var(--riso-teal)', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-label)' }}>
                  {event.date}
                </span>
              </div>

              {/* heading for landing page */}
              <h1
                className="event-detail-title"
                style={{
                  fontFamily: 'var(--font-header)',
                  fontSize: 'clamp(1.8rem, 7.5vw, 8rem)',
                  fontWeight: 400,
                  color: 'var(--ink-black)',
                  letterSpacing: '0.02em',
                  lineHeight: 0.95,
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                  textShadow: 'var(--misreg-shadow)',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}
              >
                {event.title}
              </h1>

              {/* desc text */}
              {event.description && (
                <p
                  style={{
                    color: 'var(--ink-body)',
                    fontSize: 'clamp(1.05rem, 1.5vw, 1.22rem)',
                    fontWeight: 400,
                    textTransform: 'none',
                    lineHeight: 1.65,
                    marginTop: 0,
                    maxWidth: '820px',
                    fontFamily: 'var(--font-subtext)',
                  }}
                >
                  {event.description}
                </p>
              )}
            </div>

            {/* gallery section */}
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="event-media-archive-title" style={{ fontFamily: 'var(--font-header)', fontSize: '2.4rem', color: 'var(--ink-black)', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0 }}>
                Media Archive ({event.mediaList?.length || 0})
              </h2>
              <span className="event-media-hint" style={{ fontSize: '0.92rem', fontWeight: 400, textTransform: 'none', color: 'var(--ink-muted)', fontFamily: 'var(--font-subtext)', fontStyle: 'italic' }}>
                Click any photo to enlarge
              </span>
            </div>

            {/* media in a grid */}
            <div
              className="event-media-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '28px',
                alignItems: 'start',
              }}
            >
              {event.mediaList && event.mediaList.length > 0 ? (
                event.mediaList.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="glass-card"
                    data-reveal
                    data-reveal-delay={`${Math.min(0.1 + idx * 0.05, 0.5)}`}
                    style={{
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      position: 'relative',
                      cursor: item.type === 'video' ? 'default' : 'pointer',
                      aspectRatio: '4/3',
                      backgroundColor: 'var(--bg-paper-dark)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                    }}
                    onClick={() => item.type !== 'video' && setSelectedMedia(item)}
                  >
                    {item.type === 'video' ? (
                      <video
                        src={item.url}
                        controls
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <img
                        src={item.url}
                        alt={`${event.title} - ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s ease' }}
                        className="gallery-zoom-img"
                      />
                    )}
                    <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, backdropFilter: 'blur(4px)', pointerEvents: 'none' }}>
                      {item.type === 'video' ? '🎬 Video' : `📷 #${idx + 1}`}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--ink-muted)' }}>
                  No photos or videos uploaded to this event yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* enlarged photo view */}
        {selectedMedia && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.85)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              backdropFilter: 'blur(6px)'
            }}
            onClick={() => setSelectedMedia(null)}
          >
            <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setSelectedMedia(null)}
                style={{
                  position: 'absolute',
                  top: '-44px',
                  right: 0,
                  background: 'var(--ink-black)',
                  color: 'var(--bg-paper)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
              <img
                src={selectedMedia.url}
                alt="Enlarged view"
                style={{ maxHeight: '85vh', maxWidth: '90vw', objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border-ink)' }}
              />
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
