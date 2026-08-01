import React, { useState, useCallback } from 'react';


function playDrumSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'triangle'; 
    bodyOsc.frequency.setValueAtTime(320, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(120, now + 0.04);
    bodyOsc.frequency.exponentialRampToValueAtTime(60, now + 0.35);
    bodyGain.gain.setValueAtTime(1.4, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.6, now + 0.08);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    bodyOsc.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.35);

    const resOsc = ctx.createOscillator();
    const resGain = ctx.createGain();
    resOsc.type = 'sine';
    resOsc.frequency.setValueAtTime(220, now);
    resOsc.frequency.exponentialRampToValueAtTime(175, now + 0.25);
    resGain.gain.setValueAtTime(0.5, now);
    resGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    resOsc.connect(resGain);
    resGain.connect(ctx.destination);
    resOsc.start(now);
    resOsc.stop(now + 0.25);

    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.setValueAtTime(1.2, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(1.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.2, now + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.3);
  } catch {
    // silent fail
  }
}

export default function Hero() {
  const [ripples, setRipples] = useState([]);
  const [isShaking, setIsShaking] = useState(false);
  const [drumHit, setDrumHit] = useState(false);

  const handleDrumClick = useCallback(() => {
    playDrumSound();
    const id = Date.now();
    setRipples((prev) => [...prev, id]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r !== id)), 600);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 350);
    setDrumHit(true);
    setTimeout(() => setDrumHit(false), 250);
  }, []);

  return (
    <section className="hero-section container" style={{ width: '100%', overflow: 'hidden' }}>
      <div className="hero-content-full" style={{ padding: '60px 16px', textAlign: 'center', margin: '0 auto', maxWidth: '100%' }}>
        <div className="hero-tag" data-reveal data-reveal-delay="0" style={{ justifyContent: 'center', fontSize: '0.95rem' }}>
          <span>Official Music Club of JGEC</span>
        </div>

        <h1 className="hero-title-mega" data-reveal data-reveal-delay="0.1">
          {'CALLIPH'.split('').map((letter, i) => (
            <span key={i} className="hero-letter" style={{ animationDelay: `${0.3 + i * 0.04}s` }}>{letter}</span>
          ))}
          {/* the O-drum shape */}
          <span
            className={`drum-letter ${isShaking ? 'drum-shake' : ''} ${drumHit ? 'drum-hit-flash' : ''}`}
            onClick={handleDrumClick}
            title="Click to play drum!"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDrumClick(); }}
          >
            <span className="drum-visual" aria-hidden="true">
              <svg viewBox="0 0 120 120" className="drum-svg">
                <ellipse cx="60" cy="64" rx="56" ry="52" fill="none" stroke="currentColor" strokeWidth="6" />
                <ellipse cx="60" cy="30" rx="44" ry="14" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.5" />
                <line x1="18" y1="38" x2="22" y2="62" stroke="currentColor" strokeWidth="2.5" opacity="0.4" />
                <line x1="102" y1="38" x2="98" y2="62" stroke="currentColor" strokeWidth="2.5" opacity="0.4" />
                <line x1="30" y1="12" x2="72" y2="46" stroke="var(--riso-red)" strokeWidth="4" strokeLinecap="round" />
                <line x1="90" y1="12" x2="48" y2="46" stroke="var(--riso-red)" strokeWidth="4" strokeLinecap="round" />
                <circle cx="72" cy="46" r="4" fill="var(--riso-red)" />
                <circle cx="48" cy="46" r="4" fill="var(--riso-red)" />
              </svg>
            </span>
            {ripples.map((rId) => (
              <span key={rId} className="drum-ripple" />
            ))}
          </span>
          {'NY'.split('').map((letter, i) => (
            <span key={i + 8} className="hero-letter" style={{ animationDelay: `${0.3 + (i + 8) * 0.04}s` }}>{letter}</span>
          ))}
        </h1>

        <p className="hero-description-mega" data-reveal data-reveal-delay="0.25">
          The sound of campus. We are the architects of melodies—from electrifying 
          stadium rock fests to intimate acoustic nights under the stars.
        </p>

        <div className="hero-buttons" data-reveal data-reveal-delay="0.35" style={{ justifyContent: 'center', gap: '20px', marginTop: '40px' }}>
          <a href="#events" className="btn-primary btn-ink-stamp" style={{ padding: '16px 36px', fontSize: '1rem', borderRadius: 'var(--radius-sm)' }}>
            Explore Gallery →
          </a>
          <a href="#secretaries" className="btn-secondary btn-ink-stamp" style={{ padding: '16px 36px', fontSize: '1rem', borderRadius: 'var(--radius-sm)' }}>
            Meet Our Leaders
          </a>
        </div>
      </div>
    </section>
  );
}
