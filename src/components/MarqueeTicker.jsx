import React from 'react';

// auto scrolling strip showing various events, might try to add it later
export default function MarqueeTicker() {
  const items = [
    
  ];


  const tickerContent = [...items, ...items];

  return (
    <div className="marquee-strip">
      <div className="marquee-track">
        {tickerContent.map((item, i) => (
          <span key={i} className="marquee-item">
            <span className="marquee-dot">◆</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
