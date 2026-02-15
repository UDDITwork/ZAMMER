import React, { useId, memo } from 'react';

const VARIANTS = {
  herringbone: (pid) => (
    <svg width="100%" height="32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id={pid} x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 6 L6 0 L12 6" fill="none" stroke="#c084fc" strokeWidth="0.8" opacity="0.18" />
          <path d="M0 12 L6 6 L12 12" fill="none" stroke="#818cf8" strokeWidth="0.8" opacity="0.12" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  ),

  diamond: (pid) => (
    <svg width="100%" height="32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id={pid} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M8 0 L16 8 L8 16 L0 8 Z" fill="none" stroke="#f472b6" strokeWidth="0.7" opacity="0.16" />
          <circle cx="8" cy="8" r="1" fill="#e879f9" opacity="0.12" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  ),

  wave: (pid) => (
    <svg width="100%" height="32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id={pid} x="0" y="0" width="80" height="32" patternUnits="userSpaceOnUse">
          <path d="M0 16 Q20 4, 40 16 T80 16" fill="none" stroke="#6366f1" strokeWidth="1" opacity="0.15" />
          <path d="M0 22 Q20 10, 40 22 T80 22" fill="none" stroke="#a78bfa" strokeWidth="0.7" opacity="0.10" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  ),

  dotgrid: (pid) => (
    <svg width="100%" height="32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id={pid} x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="1.1" fill="#8b5cf6" opacity="0.15" />
          <circle cx="0" cy="0" r="0.6" fill="#ec4899" opacity="0.10" />
          <circle cx="14" cy="0" r="0.6" fill="#ec4899" opacity="0.10" />
          <circle cx="0" cy="14" r="0.6" fill="#ec4899" opacity="0.10" />
          <circle cx="14" cy="14" r="0.6" fill="#ec4899" opacity="0.10" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  ),
};

const BACKGROUNDS = {
  herringbone: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.06) 20%, rgba(99,102,241,0.08) 50%, rgba(139,92,246,0.06) 80%, transparent)',
  diamond: 'linear-gradient(90deg, transparent, rgba(244,114,182,0.06) 20%, rgba(232,121,249,0.08) 50%, rgba(244,114,182,0.06) 80%, transparent)',
  wave: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.06) 20%, rgba(139,92,246,0.08) 50%, rgba(99,102,241,0.06) 80%, transparent)',
  dotgrid: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.06) 20%, rgba(236,72,153,0.07) 50%, rgba(139,92,246,0.06) 80%, transparent)',
};

const DecorativeDivider = memo(({ variant = 'herringbone', className = '' }) => {
  const uid = useId();
  const pid = `dd-${variant}-${uid.replace(/:/g, '')}`;
  const renderSvg = VARIANTS[variant] || VARIANTS.herringbone;
  const bg = BACKGROUNDS[variant] || BACKGROUNDS.herringbone;

  return (
    <div
      className={`w-full overflow-hidden select-none pointer-events-none ${className}`}
      style={{
        background: bg,
      }}
    >
      {renderSvg(pid)}
    </div>
  );
});

DecorativeDivider.displayName = 'DecorativeDivider';

export default DecorativeDivider;
