import React, { memo } from 'react';

/**
 * Premium thin-line separator between sections.
 * 4 variants — each is just 8-12px tall with an elegant gradient line.
 * Inspired by Myntra, ASOS, Net-a-Porter section separators.
 */
const STYLES = {
  herringbone: {
    background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.15) 15%, rgba(139,92,246,0.25) 50%, rgba(99,102,241,0.15) 85%, transparent 100%)',
    height: 1,
  },
  diamond: {
    background: 'linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.15) 15%, rgba(236,72,153,0.22) 50%, rgba(168,85,247,0.15) 85%, transparent 100%)',
    height: 1,
  },
  wave: {
    background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.12) 15%, rgba(79,70,229,0.20) 50%, rgba(99,102,241,0.12) 85%, transparent 100%)',
    height: 1,
  },
  dotgrid: {
    background: 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.12) 15%, rgba(124,58,237,0.20) 50%, rgba(139,92,246,0.12) 85%, transparent 100%)',
    height: 1,
  },
};

const DecorativeDivider = memo(({ variant = 'herringbone', className = '' }) => {
  const style = STYLES[variant] || STYLES.herringbone;

  return (
    <div className={`w-full px-8 sm:px-16 lg:px-24 ${className}`}>
      <div
        className="w-full rounded-full"
        style={{
          height: style.height,
          background: style.background,
        }}
      />
    </div>
  );
});

DecorativeDivider.displayName = 'DecorativeDivider';

export default DecorativeDivider;
