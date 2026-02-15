import React, { useState, memo } from 'react';

const FASHION_QUOTES = [
  'Where Style Meets Soul',
  'Curated for the Discerning',
  'Elegance is an Attitude',
  'Dress the Life You Want',
  'Fashion Forward, Always',
  'The Art of Getting Dressed',
  'Your Wardrobe, Your Story',
  'Less is More, Style is Everything',
];

const FashionQuoteStrip = memo(({ className = '' }) => {
  const [quote] = useState(
    () => FASHION_QUOTES[Math.floor(Math.random() * FASHION_QUOTES.length)]
  );

  return (
    <div
      className={`w-full py-5 select-none pointer-events-none ${className}`}
      style={{
        background:
          'linear-gradient(90deg, #0f172a, #1e293b 30%, #0f172a 50%, #1e293b 70%, #0f172a)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <p className="text-center text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.35em] text-slate-300">
        <span className="inline-block w-3 sm:w-4 text-slate-400/60 align-middle mr-2 sm:mr-3 text-[8px]">◆</span>
        <span className="inline-block w-8 sm:w-14 h-px bg-slate-400/40 align-middle mr-3 sm:mr-4" />
        {quote}
        <span className="inline-block w-8 sm:w-14 h-px bg-slate-400/40 align-middle ml-3 sm:ml-4" />
        <span className="inline-block w-3 sm:w-4 text-slate-400/60 align-middle ml-2 sm:ml-3 text-[8px]">◆</span>
      </p>
    </div>
  );
});

FashionQuoteStrip.displayName = 'FashionQuoteStrip';

export default FashionQuoteStrip;
