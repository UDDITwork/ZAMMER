import React, { useId, memo } from 'react';

const VARIANTS = {
  herringbone: (pid) => (
    <svg width="100%" height="48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id={pid} x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M0 5 L5 0 L10 5" fill="none" stroke="#f97316" strokeWidth="0.8" opacity="0.07" />
          <path d="M0 10 L5 5 L10 10" fill="none" stroke="#f97316" strokeWidth="0.8" opacity="0.05" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  ),

  diamond: (pid) => (
    <svg width="100%" height="40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id={pid} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M8 0 L16 8 L8 16 L0 8 Z" fill="none" stroke="#d97706" strokeWidth="0.6" opacity="0.06" />
          <circle cx="8" cy="8" r="1" fill="#f43f5e" opacity="0.04" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  ),

  wave: (pid) => (
    <svg width="100%" height="48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id={pid} x="0" y="0" width="80" height="48" patternUnits="userSpaceOnUse">
          <path d="M0 24 Q20 8, 40 24 T80 24" fill="none" stroke="#f97316" strokeWidth="0.8" opacity="0.06" />
          <path d="M0 30 Q20 14, 40 30 T80 30" fill="none" stroke="#fb923c" strokeWidth="0.6" opacity="0.04" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  ),

  dotgrid: (pid) => (
    <svg width="100%" height="40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id={pid} x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="6" r="0.8" fill="#f97316" opacity="0.08" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  ),
};

const DecorativeDivider = memo(({ variant = 'herringbone', className = '' }) => {
  const uid = useId();
  const pid = `dd-${variant}-${uid.replace(/:/g, '')}`;
  const renderSvg = VARIANTS[variant] || VARIANTS.herringbone;

  return (
    <div
      className={`w-full overflow-hidden select-none pointer-events-none ${className}`}
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      }}
    >
      {renderSvg(pid)}
    </div>
  );
});

DecorativeDivider.displayName = 'DecorativeDivider';

export default DecorativeDivider;
