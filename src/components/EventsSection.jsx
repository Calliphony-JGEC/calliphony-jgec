import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMediaPosterUrl, orderMediaWithThumbnail } from '../utils/mediaThumb';

export const CAROUSEL_INTERVAL_MS = 2000;
export const CAROUSEL_TRANSITION_DURATION = '0.55s';

function EventCard({ event }) {
  const navigate = useNavigate();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const previewMedia = orderMediaWithThumbnail(event);

  useEffect(() => {
    setCurrentIdx(0);
  }, [event.id, event.thumbnailUrl, event.docId]);

  useEffect(() => {
    if (!isHovered || previewMedia.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % previewMedia.length);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isHovered, previewMedia.length]);

  const activeIndex = currentIdx % (previewMedia.length || 1);

  return (
    <div
      className="event-card glass-card tilt-card"
      onClick={() => navigate(`/events/${encodeURIComponent(event.id)}`)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setCurrentIdx(0);
      }}
      style={{
        flex: '0 0 auto',
        width: 'clamp(260px, 82vw, 440px)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isHovered
          ? '0 18px 45px color-mix(in srgb, var(--text-primary) 22%, transparent)'
          : '0 10px 30px color-mix(in srgb, var(--text-primary) 12%, transparent)',
        border: isHovered ? '1px solid var(--riso-red)' : '1px solid var(--border-ink)',
        transform: isHovered ? 'translateY(-6px)' : undefined,
        scrollSnapAlign: 'start',
      }}
      title={`Click to view all photos, videos & stories for ${event.title}`}
    >
      <div
        className="event-media-container"
        style={{
          position: 'relative',
          height: 'clamp(240px, 36vh, 340px)',
          width: '100%',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-paper-dark)',
        }}
      >
        {previewMedia.length > 0 ? (
          previewMedia.map((media, idx) => {
            const isActive = idx === activeIndex;
            const poster = media.posterUrl || getMediaPosterUrl(media);
            return (
              <div
                key={media.id || media.url || idx}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: isActive ? 1 : 0,
                  visibility: isActive ? 'visible' : 'hidden',
                  transform: isActive ? 'scale(1) translateX(0px)' : 'scale(1.05) translateX(10px)',
                  filter: isActive ? 'blur(0px)' : 'blur(4px)',
                  transition: `all ${CAROUSEL_TRANSITION_DURATION} cubic-bezier(0.2, 0.8, 0.2, 1)`,
                  zIndex: isActive ? 2 : 1,
                  pointerEvents: isActive ? 'auto' : 'none',
                }}
              >
                <img
                  src={poster}
                  alt={`${event.title} (${idx + 1})`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transform: isActive ? 'scale(1.03)' : 'scale(1)',
                    transition: `transform ${CAROUSEL_INTERVAL_MS / 1000 + 0.5}s linear`,
                  }}
                />
                {media.type === 'video' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent 45%)',
                    }}
                  >
                    <span
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.55)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1rem',
                      }}
                    >
                      ▶
                    </span>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div
            className="placeholder-box"
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '2.5rem' }}>🎬</span>
            <span
              style={{
                color: 'var(--ink-muted)',
                fontStyle: 'italic',
                fontSize: '0.95rem',
                fontFamily: 'var(--font-subtext)',
              }}
            >
              No media attached
            </span>
          </div>
        )}

        {previewMedia.length > 1 && (
          <div className="mini-carousel-dots" style={{ zIndex: 10, bottom: '14px' }}>
            {previewMedia.map((_, idx) => (
              <span
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIdx(idx);
                }}
                className={`mini-carousel-dot ${idx === activeIndex ? 'active' : ''}`}
                style={{
                  width: idx === activeIndex ? '20px' : '7px',
                  height: '7px',
                  borderRadius: '3.5px',
                  backgroundColor: idx === activeIndex ? 'var(--riso-red)' : 'rgba(255, 255, 255, 0.7)',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          padding: '20px 24px',
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border-ink)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-header)',
            fontSize: '2.2rem',
            fontWeight: 400,
            color: 'var(--ink-black)',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {event.title || 'Untitled Event'}
        </h3>
        <span
          style={{
            fontSize: '1.4rem',
            opacity: isHovered ? 1 : 0.7,
            color: 'var(--riso-red)',
            transform: isHovered ? 'translate(3px, -3px)' : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          ↗
        </span>
      </div>
    </div>
  );
}

export default function EventsSection({ events }) {
  if (!events || events.length === 0) {
    return (
      <section id="events" className="events-section container" style={{ padding: '60px 40px' }}>
        <div className="section-header" style={{ marginBottom: '40px' }}>
          <span
            style={{
              display: 'block',
              color: 'var(--riso-red)',
              fontWeight: 700,
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '8px',
              fontFamily: 'var(--font-label)',
            }}
          >
            ■ Media Feed
          </span>
          <h2 className="section-heading">live showcases & memories.</h2>
        </div>
        <div
          className="glass-card"
          style={{
            padding: '60px 40px',
            textAlign: 'center',
            borderRadius: 'var(--radius-md)',
            margin: '20px 0',
            opacity: 1,
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.6 }}>🎬</div>
          <h3
            style={{
              fontFamily: 'var(--font-header)',
              fontSize: '1.4rem',
              color: 'var(--ink-black)',
              marginBottom: '8px',
            }}
          >
            No showcases published yet
          </h3>
          <p
            style={{
              color: 'var(--ink-muted)',
              fontSize: '0.95rem',
              maxWidth: '480px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Club administrators can log in via the Admin link in the site footer to upload photos and
            videos and publish live showcases.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      id="events"
      className="events-section container"
      style={{ position: 'relative', marginBottom: '60px', paddingTop: '96px', paddingBottom: '40px' }}
    >
      <div style={{ marginBottom: '24px' }} data-reveal>
        <span
          style={{
            display: 'block',
            color: 'var(--riso-red)',
            fontWeight: 700,
            fontSize: '0.85rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '6px',
            fontFamily: 'var(--font-label)',
          }}
        >
          ■ Media Feed & Interactive Gallery
        </span>
        <h2
          className="section-heading"
          style={{ fontSize: 'clamp(2rem, 8.5vw, 4rem)', lineHeight: 1, marginBottom: '6px' }}
        >
          live events & showcases.
        </h2>
        <p className="section-subtitle" style={{ marginBottom: 0, maxWidth: '680px', fontSize: '0.95rem' }}>
          Relive our most electrifying concerts and acoustic performances! Scroll horizontally across our
          showcase timeline. Hover over any card to preview pictures or click to open full archives.
        </p>
      </div>

      <div data-reveal data-reveal-delay="0.15" style={{ paddingTop: '4px', paddingBottom: '10px' }}>
        <div
          className="showcases-track mobile-horizontal-scroll"
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            gap: '28px',
            width: '100%',
            overflowX: 'auto',
            padding: '10px 0 16px',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {events.map((event, index) => (
            <EventCard key={event.id || index} event={event} />
          ))}
        </div>
      </div>
    </section>
  );
}
