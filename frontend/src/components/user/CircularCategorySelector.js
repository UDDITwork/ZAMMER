import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Background colors for the strip based on selected category
const stripBackgrounds = {
  'Women Fashion': 'rgba(255, 228, 225, 0.6)',   // light pink
  'Men Fashion': 'rgba(232, 245, 233, 0.6)',      // light peach-green
  'Kids Fashion': 'rgba(225, 245, 254, 0.6)',     // light sky blue
  default: 'rgba(255, 255, 255, 1)'
};

const CircularCategorySelector = ({ selectedCategory, onSelectCategory }) => {
  const [comingSoonPopup, setComingSoonPopup] = useState(null);

  const dismissPopup = useCallback(() => setComingSoonPopup(null), []);

  // Auto-dismiss popup after 3 seconds
  useEffect(() => {
    if (!comingSoonPopup) return;
    const timer = setTimeout(dismissPopup, 3000);
    return () => clearTimeout(timer);
  }, [comingSoonPopup, dismissPopup]);

  const categories = [
    {
      id: 'Women Fashion',
      label: 'Women',
      imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=400&fit=crop&crop=faces',
      ringColor: 'ring-pink-400',
      borderColor: 'border-pink-300',
      active: true
    },
    {
      id: 'Men Fashion',
      label: 'Men',
      imageUrl: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=400&h=400&fit=crop&crop=faces',
      ringColor: 'ring-emerald-400',
      borderColor: 'border-emerald-300',
      active: true
    },
    {
      id: 'Beauty',
      label: 'Beauty',
      imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop',
      ringColor: 'ring-rose-400',
      borderColor: 'border-rose-300',
      active: false
    },
    {
      id: 'Kids Fashion',
      label: 'Kids',
      imageUrl: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400&h=400&fit=crop&crop=faces',
      ringColor: 'ring-sky-400',
      borderColor: 'border-sky-300',
      active: true
    },
    {
      id: 'Accessories',
      label: 'Accessories',
      imageUrl: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=400&h=400&fit=crop',
      ringColor: 'ring-amber-400',
      borderColor: 'border-amber-300',
      active: false
    },
    {
      id: 'Footwear',
      label: 'Footwear',
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
      ringColor: 'ring-violet-400',
      borderColor: 'border-violet-300',
      active: false
    },
    {
      id: 'Home',
      label: 'Home',
      imageUrl: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=400&h=400&fit=crop',
      ringColor: 'ring-teal-400',
      borderColor: 'border-teal-300',
      active: false
    }
  ];

  const handleClick = (cat) => {
    if (cat.active) {
      onSelectCategory(cat.id);
      setComingSoonPopup(null);
    } else {
      setComingSoonPopup(cat.id);
    }
  };

  // Determine strip bg color
  const bgColor = stripBackgrounds[selectedCategory] || stripBackgrounds.default;

  return (
    <div
      className="relative transition-colors duration-500 ease-in-out"
      style={{ backgroundColor: bgColor }}
    >
      {/* Scrollable category row */}
      <div className="flex items-center justify-center gap-6 sm:gap-8 md:gap-10 py-5 px-4 overflow-x-auto scrollbar-hide">
        {categories.map(cat => {
          const isSelected = selectedCategory === cat.id;
          const isComingSoon = !cat.active;

          return (
            <div key={cat.id} className="relative flex flex-col items-center flex-shrink-0">
              <motion.button
                onClick={() => handleClick(cat)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative flex items-center justify-center
                  rounded-full w-16 h-16 sm:w-20 sm:h-20 md:w-[88px] md:h-[88px]
                  transition-all duration-300 overflow-hidden
                  ${isSelected
                    ? `ring-[3px] ${cat.ringColor} shadow-lg`
                    : `border-2 ${isComingSoon ? 'border-gray-200' : 'border-gray-200 hover:border-gray-300'} shadow-sm hover:shadow-md`
                  }
                `}
              >
                {/* Image */}
                <div className="absolute inset-0 w-full h-full">
                  <img
                    src={cat.imageUrl}
                    alt={cat.label}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className={`absolute inset-0 transition-colors duration-300 ${
                    isSelected ? 'bg-black/10' : isComingSoon ? 'bg-black/30' : 'bg-black/25'
                  }`} />
                </div>
              </motion.button>

              {/* Label below circle */}
              <span className={`mt-1.5 text-xs sm:text-sm font-semibold text-center leading-tight ${
                isSelected ? 'text-gray-900' : 'text-gray-600'
              }`}>
                {cat.label}
              </span>

              {/* Coming Soon Popup */}
              <AnimatePresence>
                {comingSoonPopup === cat.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    className="absolute top-full mt-3 z-50 w-56 sm:w-64"
                    style={{ left: '50%', transform: 'translateX(-50%)' }}
                  >
                    {/* Arrow */}
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-l border-t border-gray-200 rounded-tl-sm" />

                    <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 p-4 text-center">
                      <div className="text-2xl mb-2">🚀</div>
                      <p className="text-sm font-bold text-gray-800 mb-1">Coming Soon!</p>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        We're onboarding {cat.label} sellers right now. Expect amazing products here very soon — we're growing fast!
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setComingSoonPopup(null); }}
                        className="mt-3 text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                      >
                        Got it ✓
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Click-away overlay when popup is open */}
      {comingSoonPopup && (
        <div className="fixed inset-0 z-40" onClick={dismissPopup} />
      )}
    </div>
  );
};

export default CircularCategorySelector;
