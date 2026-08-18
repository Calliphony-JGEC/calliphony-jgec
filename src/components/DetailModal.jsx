import React from 'react';
import { getEventThumbnail, getMediaPosterUrl } from '../utils/mediaThumb';

export default function DetailModal({ isOpen, mode, onClose, events, secretaries }) {
  if (!isOpen) return null;

  const allYears = Object.keys(secretaries || {}).sort((a, b) => b.localeCompare(a));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ borderRadius: 'var(--radius-lg)' }}>
        <button className="modal-close-btn" onClick={onClose} title="Close">
          ×
        </button>

        {mode === 'events' ? (
          <div>
            <span style={{ color: 'var(--riso-red)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              ■ Complete Cloudinary Archive
            </span>
            <h2 className="section-heading" style={{ fontSize: '2.2rem', marginTop: '8px' }}>
              all events & performances.
            </h2>
            <p className="section-subtitle" style={{ marginBottom: '28px' }}>
              Every archived performance, acoustic rehearsal, and event published live by club administrators.
            </p>

            {events && events.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {events.map((ev) => {
                  const cover = getEventThumbnail(ev);
                  const poster = cover ? getMediaPosterUrl(cover) : '';
                  return (
                    <div key={ev.id} className="glass-card" style={{ padding: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ width: '180px', height: '120px', overflow: 'hidden', background: 'var(--bg-paper-dark)', flexShrink: 0, border: '1px solid var(--border-ink)', borderRadius: 'var(--radius-sm)', position: 'relative' }}>
                        {poster ? (
                          <img src={poster} alt={ev.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '10px' }}>
                            🎬 No media
                          </div>
                        )}
                        {ev.mediaList && ev.mediaList.length > 1 && (
                          <span style={{ position: 'absolute', bottom: 4, right: 4, background: 'var(--ink-black)', color: 'var(--bg-paper)', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            +{ev.mediaList.length - 1} more
                          </span>
                        )}
                      </div>

                      <div style={{ flex: '1', minWidth: '220px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--riso-teal)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ev.category}</span>
                          <span style={{ color: 'var(--ink-light)' }}>·</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--riso-red)', fontWeight: 600 }}>{ev.date}</span>
                        </div>
                        <h3 style={{ fontFamily: 'var(--font-header)', fontSize: '1.25rem', color: 'var(--ink-black)', marginBottom: '6px' }}>{ev.title}</h3>
                        <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>{ev.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--radius-md)' }}>
                <p style={{ color: 'var(--ink-muted)', fontSize: '1rem' }}>No archived performances published yet.</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <span style={{ color: 'var(--riso-teal)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              ■ Historical Chronicle
            </span>
            <h2 className="section-heading" style={{ fontSize: '2.2rem', marginTop: '8px' }}>
              complete secretaries roster.
            </h2>
            <p className="section-subtitle" style={{ marginBottom: '28px' }}>
              Our entire student leadership hierarchy across every academic year.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
              {allYears.map((year) => (
                <div key={year}>
                  <h3 style={{ fontFamily: 'var(--font-header)', fontSize: '1.4rem', color: 'var(--riso-red)', borderBottom: '1px solid var(--border-ink)', paddingBottom: '10px', marginBottom: '16px' }}>
                    {year}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {secretaries[year].map((sec) => (
                      <div key={sec.id} className="glass-card" style={{ padding: '18px', display: 'flex', gap: '16px', alignItems: 'center', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-paper-dark)', border: '1px solid var(--border-ink-strong)', flexShrink: 0 }}>
                          {sec.image ? (
                            <img
                              src={sec.image}
                              alt={sec.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                              {sec.icon || '🎵'}
                            </div>
                          )}
                        </div>
                        <div style={{ flex: '1' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--ink-black)', fontFamily: 'var(--font-header)' }}>{sec.name}</strong>
                            <span style={{ fontSize: '0.8rem', color: 'var(--riso-teal)', fontWeight: 600 }}>{sec.role}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
