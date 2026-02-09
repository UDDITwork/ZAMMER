import React from 'react';

// Pure CSS text-based brand logos styled to approximate real brand typography
const BRAND_LOGOS = [
  { name: 'adidas', style: 'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-weight: 700; font-size: 18px; letter-spacing: 4px; text-transform: lowercase;' },
  { name: 'NIKE', style: 'font-family: "Futura", "Trebuchet MS", Arial, sans-serif; font-weight: 900; font-size: 20px; letter-spacing: 3px; text-transform: uppercase;' },
  { name: 'ZARA', style: 'font-family: "Didot", "Times New Roman", Georgia, serif; font-weight: 400; font-size: 22px; letter-spacing: 6px; text-transform: uppercase;' },
  { name: 'H&M', style: 'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-weight: 700; font-size: 22px; letter-spacing: 1px;' },
  { name: "Levi's", style: 'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-weight: 700; font-size: 18px; letter-spacing: 1px; font-style: italic;' },
  { name: 'PUMA', style: 'font-family: "Futura", "Trebuchet MS", Arial, sans-serif; font-weight: 900; font-size: 18px; letter-spacing: 3px; text-transform: uppercase;' },
  { name: 'Calvin Klein', style: 'font-family: "Didot", "Times New Roman", Georgia, serif; font-weight: 400; font-size: 16px; letter-spacing: 3px; text-transform: uppercase;' },
  { name: 'TOMMY HILFIGER', style: 'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-weight: 700; font-size: 13px; letter-spacing: 3px; text-transform: uppercase;' },
  { name: 'Allen Solly', style: 'font-family: "Georgia", "Times New Roman", serif; font-weight: 400; font-size: 17px; letter-spacing: 2px;' },
  { name: 'VAN HEUSEN', style: 'font-family: "Didot", "Times New Roman", Georgia, serif; font-weight: 400; font-size: 15px; letter-spacing: 4px; text-transform: uppercase;' },
  { name: 'U.S. POLO ASSN.', style: 'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-weight: 700; font-size: 13px; letter-spacing: 2px; text-transform: uppercase;' },
  { name: 'JACK & JONES', style: 'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-weight: 800; font-size: 14px; letter-spacing: 3px; text-transform: uppercase;' },
  { name: 'AEROPOSTALE', style: 'font-family: "Trebuchet MS", "Helvetica Neue", Arial, sans-serif; font-weight: 700; font-size: 14px; letter-spacing: 3px; text-transform: uppercase;' },
  { name: 'Forever 21', style: 'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-weight: 300; font-size: 17px; letter-spacing: 2px;' },
  { name: 'MANGO', style: 'font-family: "Didot", "Times New Roman", Georgia, serif; font-weight: 400; font-size: 18px; letter-spacing: 6px; text-transform: uppercase;' },
  { name: 'UCB', style: 'font-family: "Futura", "Trebuchet MS", Arial, sans-serif; font-weight: 900; font-size: 20px; letter-spacing: 4px; text-transform: uppercase;' },
  { name: 'Wrangler', style: 'font-family: "Georgia", "Times New Roman", serif; font-weight: 700; font-size: 18px; letter-spacing: 1px;' },
  { name: 'Pepe Jeans', style: 'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-weight: 700; font-size: 16px; letter-spacing: 1px;' },
  { name: 'SUPERDRY', style: 'font-family: "Futura", "Trebuchet MS", Arial, sans-serif; font-weight: 900; font-size: 15px; letter-spacing: 3px; text-transform: uppercase;' },
  { name: 'GANT', style: 'font-family: "Didot", "Times New Roman", Georgia, serif; font-weight: 400; font-size: 20px; letter-spacing: 6px; text-transform: uppercase;' },
];

// Duplicate the list for seamless infinite loop
const DOUBLED_LOGOS = [...BRAND_LOGOS, ...BRAND_LOGOS];

const BrandLogoMarquee = () => {
  return (
    <div className="brand-marquee-container">
      <style>{`
        .brand-marquee-container {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 1;
          opacity: 0;
          animation: marquee-fade-in 1s ease-out 0.3s forwards;
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 8%,
            black 92%,
            transparent 100%
          );
          mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 8%,
            black 92%,
            transparent 100%
          );
        }

        @keyframes marquee-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .brand-marquee-track {
          display: flex;
          align-items: center;
          height: 100%;
          width: max-content;
          will-change: transform;
          animation: marquee-scroll 60s linear infinite;
        }

        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .brand-logo-item {
          flex-shrink: 0;
          padding: 0 40px;
          color: #b0b0b0;
          white-space: nowrap;
          user-select: none;
          transition: none;
        }

        @media (min-width: 768px) {
          .brand-logo-item {
            padding: 0 50px;
          }
        }

        @media (min-width: 1200px) {
          .brand-logo-item {
            padding: 0 60px;
          }
        }
      `}</style>

      <div className="brand-marquee-track">
        {DOUBLED_LOGOS.map((brand, i) => (
          <span
            key={`${brand.name}-${i}`}
            className="brand-logo-item"
            style={{ cssText: brand.style }}
          >
            {brand.name}
          </span>
        ))}
      </div>
    </div>
  );
};

export default BrandLogoMarquee;
