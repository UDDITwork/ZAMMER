import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BRAND_SLIDES = [
  {
    id: 'hm-mango-zara',
    image: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127966/zammer_banners/brand_logos/hm_mango_zara_banner.jpg',
    label: 'H&M · MANGO · ZARA',
  },
  {
    id: 'gucci',
    image: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127953/zammer_banners/brand_logos/gucci.png',
    label: 'GUCCI',
  },
  {
    id: 'louis-vuitton',
    image: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127960/zammer_banners/brand_logos/louis_vuitton.svg',
    label: 'LOUIS VUITTON',
  },
  {
    id: 'nike',
    image: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127963/zammer_banners/brand_logos/nike_new.jpg',
    label: 'NIKE',
  },
  {
    id: 'adidas',
    image: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657449/zammer_banners/brand_logos/adidas.jpg',
    label: 'ADIDAS',
  },
  {
    id: 'supreme',
    image: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127954/zammer_banners/brand_logos/supreme.svg',
    label: 'SUPREME',
  },
  {
    id: 'off-white',
    image: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127956/zammer_banners/brand_logos/offwhite.png',
    label: 'OFF-WHITE',
  },
  {
    id: 'tommy-hilfiger',
    image: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127957/zammer_banners/brand_logos/tommy_hilfiger.png',
    label: 'TOMMY HILFIGER',
  },
  {
    id: 'uniqlo',
    image: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127962/zammer_banners/brand_logos/uniqlo_new.png',
    label: 'UNIQLO',
  },
  {
    id: 'van-heusen',
    image: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127959/zammer_banners/brand_logos/vanheusen_new.jpg',
    label: 'VAN HEUSEN',
  },
];

const BrandShowcaseBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BRAND_SLIDES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const currentSlide = BRAND_SLIDES[currentIndex];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Top Brands</h2>
          <p className="text-xs sm:text-sm text-gray-500">Shop from the brands you love</p>
        </div>
        <div className="flex items-center gap-1.5">
          {BRAND_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`rounded-full transition-all duration-500 ${
                i === currentIndex
                  ? 'w-5 h-1.5 bg-black'
                  : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl bg-white border border-gray-100"
        style={{ aspectRatio: '16/7' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute inset-0 flex items-center justify-center p-8 sm:p-12"
          >
            <img
              src={currentSlide.image}
              alt={currentSlide.label}
              className="max-h-full max-w-full object-contain"
              draggable="false"
            />
          </motion.div>
        </AnimatePresence>

        {/* Brand label */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`label-${currentSlide.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="absolute bottom-3 left-0 right-0 text-center"
          >
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-[0.15em]">
              {currentSlide.label}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BrandShowcaseBanner;
