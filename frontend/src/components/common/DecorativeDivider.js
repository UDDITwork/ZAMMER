import React, { useId, memo } from 'react';

const VARIANTS = {
  herringbone: (pid) => (
    <svg width="100%" height="60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id={pid} x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M0 5 L5 0 L10 5" fill="none" stroke="#c0c0c0" strokeWidth="0.9" opacity="0.30" />
          <path d="M0 10 L5 5 L10 10" fill="none" stroke="#a8a8b0" strokeWidth="0.9" opacity="0.20" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  ),

  diamond: (pid) => (
    <svg width="100%" height="56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id={pid} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M8 0 L16 8 L8 16 L0 8 Z" fill="none" stroke="#f5e6d3" strokeWidth="0.7" opacity="0.25" />
          <circle cx="8" cy="8" r="1" fill="#f5e6d3" opacity="0.18" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  ),

  wave: (pid) => (
    <svg width="100%" height="60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id={pid} x="0" y="0" width="80" height="60" patternUnits="userSpaceOnUse">
          <path d="M0 30 Q20 10, 40 30 T80 30" fill="none" stroke="#e0e0e0" strokeWidth="1.2" opacity="0.35" />
          <path d="M0 38 Q20 18, 40 38 T80 38" fill="none" stroke="#b8d4c8" strokeWidth="0.8" opacity="0.25" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  ),

  dotgrid: (pid) => (
    <svg width="100%" height="56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id={pid} x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="1.2" fill="#e8b4b8" opacity="0.40" />
          <circle cx="0" cy="0" r="0.7" fill="#c9a0dc" opacity="0.22" />
          <circle cx="14" cy="0" r="0.7" fill="#c9a0dc" opacity="0.22" />
          <circle cx="0" cy="14" r="0.7" fill="#c9a0dc" opacity="0.22" />
          <circle cx="14" cy="14" r="0.7" fill="#c9a0dc" opacity="0.22" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  ),
};

const BACKGROUNDS = {
  herringbone: 'linear-gradient(135deg, #0f172a, #1e293b, #0f172a)',
  diamond: 'linear-gradient(90deg, #4a1028, #7f1d3e, #4a1028)',
  wave: 'linear-gradient(90deg, #064e3b, #065f46, #047857)',
  dotgrid: 'linear-gradient(135deg, #1c1c2e, #2d2b3d, #1c1c2e)',
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
        maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {renderSvg(pid)}
    </div>
  );
});

DecorativeDivider.displayName = 'DecorativeDivider';

export default DecorativeDivider;
