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
    <div className={`w-full py-2 select-none pointer-events-none ${className}`}>
      <p className="text-center text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.25em] text-slate-400">
        <span className="inline-block w-5 sm:w-8 h-px bg-gradient-to-r from-transparent to-slate-300/50 align-middle mr-2.5 sm:mr-3.5" />
        {quote}
        <span className="inline-block w-5 sm:w-8 h-px bg-gradient-to-l from-transparent to-slate-300/50 align-middle ml-2.5 sm:ml-3.5" />
      </p>
    </div>
  );
});

FashionQuoteStrip.displayName = 'FashionQuoteStrip';

export default FashionQuoteStrip;
