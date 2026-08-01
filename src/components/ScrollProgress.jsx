import React, { useEffect, useRef } from 'react';

// cool glowly orangey progress bar
export default function ScrollProgress() {
  const barRef = useRef(null);

  useEffect(() => {
    let rafId;
    const handleScroll = () => {
      if (!barRef.current) return;
      rafId = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight > 0) {
          const progress = Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));
          if (barRef.current) {
            barRef.current.style.width = `${progress}%`;
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial calculate
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="scroll-progress-track">
      <div
        ref={barRef}
        className="scroll-progress-bar"
        style={{ width: '0%' }}
      />
    </div>
  );
}
