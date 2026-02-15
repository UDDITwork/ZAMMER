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
      className={`w-full py-3 select-none pointer-events-none ${className}`}
      style={{
        background:
          'linear-gradient(90deg, transparent, rgba(139,92,246,0.05) 20%, rgba(99,102,241,0.07) 50%, rgba(139,92,246,0.05) 80%, transparent)',
      }}
    >
      <p className="text-center text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-400/70">
        <span className="inline-block w-2.5 sm:w-3.5 text-purple-400/40 align-middle mr-2 sm:mr-3 text-[7px]">◆</span>
        <span className="inline-block w-6 sm:w-10 h-px bg-indigo-300/30 align-middle mr-3 sm:mr-4" />
        {quote}
        <span className="inline-block w-6 sm:w-10 h-px bg-indigo-300/30 align-middle ml-3 sm:ml-4" />
        <span className="inline-block w-2.5 sm:w-3.5 text-purple-400/40 align-middle ml-2 sm:ml-3 text-[7px]">◆</span>
      </p>
    </div>
  );
});

FashionQuoteStrip.displayName = 'FashionQuoteStrip';

export default FashionQuoteStrip;
