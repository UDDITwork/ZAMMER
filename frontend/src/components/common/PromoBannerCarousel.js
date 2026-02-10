import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const PromoBannerCarousel = ({ banners }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [banners]);

  if (!banners || banners.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl w-full" style={{ aspectRatio: '16/9' }}>
      <AnimatePresence mode="wait">
        {banners.map((banner, index) => (
          index === currentIndex && (
            <motion.div
              key={banner._id || index}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <Link
                to={banner.linkUrl || '/user/shop'}
                className="block w-full h-full relative group"
              >
                {/* Banner Image */}
                <img
                  src={banner.imageUrl}
                  alt={banner.title || 'Promotional Banner'}
                  className="w-full h-full object-cover"
                />

                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                {/* Discount Badge - top left */}
                {banner.discountText && (
                  <div className="absolute top-4 left-4 z-10">
                    <span className="inline-block bg-orange-500 text-white text-[11px] sm:text-xs font-bold uppercase tracking-[0.1em] px-3 py-1.5 rounded-md shadow-lg">
                      {banner.discountText}
                    </span>
                  </div>
                )}

                {/* Content - bottom left */}
                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 z-10">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <h3 className="text-white text-xl sm:text-3xl font-bold tracking-[-0.02em] leading-tight mb-1">
                      {banner.title}
                    </h3>
                    {banner.subtitle && (
                      <p className="text-white/60 text-xs sm:text-sm font-light mb-4 max-w-md">
                        {banner.subtitle}
                      </p>
                    )}
                    <span className="inline-flex items-center gap-2 bg-white text-black text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.1em] px-4 sm:px-5 py-2 sm:py-2.5 rounded-full group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
                      {banner.ctaText || 'SHOP NOW'}
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" strokeWidth={2} />
                    </span>
                  </motion.div>
                </div>
              </Link>
            </motion.div>
          )
        ))}
      </AnimatePresence>

      {/* Dot indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 right-5 sm:right-8 flex items-center gap-1.5 z-20">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); setCurrentIndex(i); }}
              className={`rounded-full transition-all duration-500 ${
                i === currentIndex ? 'w-6 h-[3px] bg-white' : 'w-[3px] h-[3px] bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PromoBannerCarousel;
