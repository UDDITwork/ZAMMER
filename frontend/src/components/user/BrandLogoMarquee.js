// Brand logos with Cloudinary URLs — c_trim removes whitespace so logos fill their frame
const BRAND_LOGOS = [
  { id: 'adidas', name: 'adidas', imageUrl: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657449/zammer_banners/brand_logos/adidas.jpg' },
  { id: 'nike', name: 'Nike', imageUrl: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657448/zammer_banners/brand_logos/nike.jpg' },
  { id: 'zara', name: 'ZARA', imageUrl: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657447/zammer_banners/brand_logos/zara.jpg' },
  { id: 'hm', name: 'H&M', imageUrl: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657447/zammer_banners/brand_logos/hm.jpg' },
  { id: 'levis', name: "Levi's", imageUrl: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657447/zammer_banners/brand_logos/levis.jpg' },
  { id: 'puma', name: 'PUMA', imageUrl: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657448/zammer_banners/brand_logos/puma.jpg' },
  { id: 'calvinklein', name: 'Calvin Klein', imageUrl: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657449/zammer_banners/brand_logos/calvinklein.jpg' },
  { id: 'tommy', name: 'Tommy Hilfiger', imageUrl: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657449/zammer_banners/brand_logos/tommy.jpg' },
  { id: 'allensolly', name: 'Allen Solly', imageUrl: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657451/zammer_banners/brand_logos/allensolly.jpg' },
  { id: 'vanheusen', name: 'Van Heusen', imageUrl: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657450/zammer_banners/brand_logos/vanheusen.jpg' },
  { id: 'uspolo', name: 'U.S. Polo Assn.', imageUrl: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657450/zammer_banners/brand_logos/uspolo.jpg' },
  { id: 'jackjones', name: 'Jack & Jones', imageUrl: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657450/zammer_banners/brand_logos/jackjones.jpg' },
  { id: 'aeropostale', name: 'Aeropostale', imageUrl: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657451/zammer_banners/brand_logos/aeropostale.jpg' },
  { id: 'forever21', name: 'Forever 21', imageUrl: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657452/zammer_banners/brand_logos/forever21.jpg' },
  { id: 'mango', name: 'MANGO', imageUrl: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657452/zammer_banners/brand_logos/mango.jpg' },
  { id: 'ucb', name: 'United Colors of Benetton', imageUrl: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657453/zammer_banners/brand_logos/ucb.jpg' },
  { id: 'wrangler', name: 'Wrangler', imageUrl: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657453/zammer_banners/brand_logos/wrangler.jpg' },
  { id: 'pepejeans', name: 'Pepe Jeans', imageUrl: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657454/zammer_banners/brand_logos/pepejeans.jpg' },
  { id: 'superdry', name: 'Superdry', imageUrl: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657454/zammer_banners/brand_logos/superdry.jpg' },
  { id: 'gant', name: 'GANT', imageUrl: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657454/zammer_banners/brand_logos/gant.jpg' },
];

// Duplicate for seamless infinite loop
const DOUBLED_LOGOS = [...BRAND_LOGOS, ...BRAND_LOGOS];

const BrandLogoMarquee = () => {
  return (
    <div className="brand-marquee-wrap">
      <style>{`
        .brand-marquee-wrap {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 1;
          opacity: 0;
          animation: marquee-reveal 1s ease-out 0.3s forwards;
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 5%,
            black 95%,
            transparent 100%
          );
          mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 5%,
            black 95%,
            transparent 100%
          );
        }

        @keyframes marquee-reveal {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .brand-marquee-track {
          display: flex;
          align-items: center;
          height: 100%;
          width: max-content;
          will-change: transform;
          animation: marquee-drift 70s linear infinite;
        }

        @keyframes marquee-drift {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .brand-logo-cell {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 32px;
          height: 100%;
        }

        .brand-logo-cell img {
          height: 80px;
          width: auto;
          max-width: 160px;
          object-fit: contain;
          opacity: 0.85;
          filter: grayscale(30%) contrast(1.05);
          user-select: none;
          -webkit-user-drag: none;
        }

        /* SM breakpoint */
        @media (min-width: 640px) {
          .brand-logo-cell {
            padding: 0 40px;
          }
          .brand-logo-cell img {
            height: 90px;
            max-width: 180px;
          }
        }

        /* MD breakpoint */
        @media (min-width: 768px) {
          .brand-logo-cell {
            padding: 0 48px;
          }
          .brand-logo-cell img {
            height: 100px;
            max-width: 200px;
          }
        }

        /* LG/XL — full desktop */
        @media (min-width: 1200px) {
          .brand-logo-cell {
            padding: 0 56px;
          }
          .brand-logo-cell img {
            height: 110px;
            max-width: 220px;
          }
        }
      `}</style>

      <div className="brand-marquee-track">
        {DOUBLED_LOGOS.map((brand, i) => (
          <div key={`${brand.id}-${i}`} className="brand-logo-cell">
            <img
              src={brand.imageUrl}
              alt={brand.name}
              loading="lazy"
              draggable="false"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrandLogoMarquee;
