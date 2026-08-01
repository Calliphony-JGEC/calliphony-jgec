import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';


export const CAROUSEL_INTERVAL_MS = 2000; 
export const CAROUSEL_TRANSITION_DURATION = '0.55s'; 

export const HORIZONTAL_SCROLL_SENSITIVITY = 0.26; 


export const START_BUFFER_PX = 280;
export const END_BUFFER_PX = 420;

function EventCard({ event, index }) {
  const navigate = useNavigate();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const allMedia = Array.isArray(event.mediaList) ? event.mediaList : [];


  const previewMedia = allMedia.filter(m => m.type !== 'video' && m.url);

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
      onMouseLeave={() => setIsHovered(false)}
      style={{
        flex: '0 0 auto',
        width: 'clamp(260px, 82vw, 440px)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isHovered ? '0 18px 45px oklch(18% 0.08 30 / 0.22)' : '0 10px 30px oklch(18% 0.06 30 / 0.12)',
        border: isHovered ? '1px solid var(--riso-red)' : '1px solid var(--border-ink)',
        transform: isHovered ? 'translateY(-6px)' : undefined,
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
          backgroundColor: 'var(--bg-paper-dark)' 
        }}
      >
        {previewMedia.length > 0 ? (
          previewMedia.map((media, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={media.id || idx}
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
                  src={media.url}
                  alt={`${event.title} (${idx + 1})`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transform: isActive ? 'scale(1.03)' : 'scale(1)',
                    transition: `transform ${CAROUSEL_INTERVAL_MS / 1000 + 0.5}s linear`
                  }}
                />
              </div>
            );
          })
        ) : (
          <div className="placeholder-box" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ fontSize: '2.5rem' }}>🎬</span>
            <span style={{ color: 'var(--ink-muted)', fontStyle: 'italic', fontSize: '0.95rem', fontFamily: 'var(--font-subtext)' }}>
              {allMedia.length > 0 ? 'Video Archive (Click to view)' : 'No media attached'}
            </span>
          </div>
        )}

        {/* mini carousel dots */}
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
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>
        )}
      </div>

      
      <div style={{ padding: '20px 24px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-ink)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
        <span style={{ fontSize: '1.4rem', opacity: isHovered ? 1 : 0.7, color: 'var(--riso-red)', transform: isHovered ? 'translate(3px, -3px)' : 'none', transition: 'all 0.3s ease' }}>
          ↗
        </span>
      </div>
    </div>
  );
}

export default function EventsSection({ events }) {
  const sectionRef = useRef(null);
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const clipBoxRef = useRef(null);
  const [maxScroll, setMaxScroll] = useState(0);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  // measure track width relative to clipping box and update mobile status on resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        if (trackRef.current) trackRef.current.style.transform = '';
        return;
      }
      if (!trackRef.current || !clipBoxRef.current) return;
      const trackWidth = trackRef.current.scrollWidth;
      const boxWidth = clipBoxRef.current.clientWidth;
      const calculatedMax = Math.max(0, trackWidth - boxWidth);
      setMaxScroll(calculatedMax);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [events]);

  
  useEffect(() => {
    if (isMobile) {
      if (trackRef.current) trackRef.current.style.transform = '';
      return;
    }

    let rafId;
    const handleScroll = () => {
      if (isMobile || !sectionRef.current || !trackRef.current || maxScroll <= 0) return;
      
      rafId = requestAnimationFrame(() => {
        const rect = sectionRef.current.getBoundingClientRect();
        const scrolled = -rect.top;
        const activeScroll = Math.max(0, scrolled - START_BUFFER_PX);
        const targetX = activeScroll * HORIZONTAL_SCROLL_SENSITIVITY;
        const clampedScroll = Math.max(0, Math.min(targetX, maxScroll));
        
        if (trackRef.current) {
          trackRef.current.style.transform = `translate3d(-${clampedScroll}px, 0, 0)`;
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [maxScroll, isMobile]);

  
  if (!events || events.length === 0) {
    return (
      <section id="events" className="events-section container" style={{ padding: '60px 40px' }}>
        <div className="section-header" style={{ marginBottom: '40px' }}>
          <span style={{ display: 'block', color: 'var(--riso-red)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontFamily: 'var(--font-label)' }}>
            ■ Media Feed
          </span>
          <h2 className="section-heading">live showcases & memories.</h2>
        </div>
        <div className="glass-card" style={{ padding: '60px 40px', textAlign: 'center', borderRadius: 'var(--radius-md)', margin: '20px 0', opacity: 1 }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.6 }}>🎬</div>
          <h3 style={{ fontFamily: 'var(--font-header)', fontSize: '1.4rem', color: 'var(--ink-black)', marginBottom: '8px' }}>
            No showcases published yet
          </h3>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
            Club administrators can log in via the top-right Admin button to directly upload photos and videos and publish live showcases.
          </p>
        </div>
      </section>
    );
  }

  
  const verticalDistanceNeeded = (!isMobile && maxScroll > 0) ? (START_BUFFER_PX + (maxScroll / HORIZONTAL_SCROLL_SENSITIVITY) + END_BUFFER_PX) : 0;
  const dynamicHeight = (!isMobile && verticalDistanceNeeded > 0) ? `calc(100vh + ${verticalDistanceNeeded}px)` : 'auto';

  return (
    <section 
      id="events" 
      ref={sectionRef} 
      className="events-section-sticky-wrapper" 
      style={{ 
        position: 'relative', 
        height: dynamicHeight,
        marginBottom: isMobile ? '40px' : '60px'
      }}
    >
      <div
        ref={viewportRef}
        style={{
          position: isMobile ? 'relative' : 'sticky',
          top: 0,
          height: isMobile ? 'auto' : '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start', 
          paddingTop: isMobile ? '28px' : '96px', 
          paddingBottom: '20px',
          overflow: isMobile ? 'visible' : 'hidden',
        }}
      >
        
        <div className="container" style={{ marginBottom: isMobile ? '16px' : '24px', flexShrink: 0 }} data-reveal>
          <span style={{ display: 'block', color: 'var(--riso-red)', fontWeight: 700, fontSize: isMobile ? '0.75rem' : '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px', fontFamily: 'var(--font-label)' }}>
            ■ Media Feed & Interactive Gallery
          </span>
          <h2 className="section-heading" style={{ fontSize: 'clamp(2rem, 8.5vw, 4rem)', lineHeight: 1, marginBottom: '6px' }}>
            live events & showcases.
          </h2>
          <p className="section-subtitle" style={{ marginBottom: 0, maxWidth: '680px', fontSize: isMobile ? '0.85rem' : '0.95rem' }}>
            Relive our most electrifying concerts and acoustic performances!
            {isMobile 
              ? ' Swipe horizontally across our showcase timeline. Tap any card to open full photo & video archives.' 
              : ' Scroll down to seamlessly slide across our showcase timeline. Hover over any card to preview pictures or click to open full archives.'}
          </p>
        </div>

       
        <div 
          className="container" 
          data-reveal
          data-reveal-delay="0.15"
          style={{ 
            flex: 1, 
            minHeight: 0, 
            display: 'flex', 
            alignItems: 'center', 
            paddingTop: '4px',
            paddingBottom: '10px'
          }}
        >
          {/*clip box*/}
          <div 
            ref={clipBoxRef}
            style={{ 
              width: '100%', 
              overflow: isMobile ? 'visible' : 'hidden', 
              padding: '10px 0' 
            }}
          >
            <div
              ref={trackRef}
              className={`showcases-track ${isMobile ? 'mobile-horizontal-scroll' : ''}`}
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                gap: isMobile ? '16px' : '28px',
                width: isMobile ? '100%' : 'max-content',
                willChange: isMobile ? 'auto' : 'transform',
                transition: isMobile ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              {events.map((event, index) => (
                <EventCard key={event.id || index} event={event} index={index} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
