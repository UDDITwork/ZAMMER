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
          'linear-gradient(90deg, transparent, rgba(249,115,22,0.04) 20%, rgba(249,115,22,0.06) 50%, rgba(249,115,22,0.04) 80%, transparent)',
      }}
    >
      <p className="text-center text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.3em] text-orange-400/60">
        <span className="inline-block w-6 sm:w-10 h-px bg-orange-300/30 align-middle mr-3 sm:mr-4" />
        {quote}
        <span className="inline-block w-6 sm:w-10 h-px bg-orange-300/30 align-middle ml-3 sm:ml-4" />
      </p>
    </div>
  );
});

FashionQuoteStrip.displayName = 'FashionQuoteStrip';

export default FashionQuoteStrip;
