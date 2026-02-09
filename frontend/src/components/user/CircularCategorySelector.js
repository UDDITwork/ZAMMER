import React from 'react';
import { motion } from 'framer-motion';

const CircularCategorySelector = ({ selectedCategory, onSelectCategory }) => {
  const categories = [
    {
      id: 'Men Fashion',
      label: 'Men',
      imageUrl: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=400&h=400&fit=crop&crop=faces',
      colorClasses: 'border-blue-500 bg-blue-50 ring-blue-500'
    },
    {
      id: 'Women Fashion',
      label: 'Women',
      imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=400&fit=crop&crop=faces',
      colorClasses: 'border-pink-500 bg-pink-50 ring-pink-500'
    },
    {
      id: 'Kids Fashion',
      label: 'Kids',
      imageUrl: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400&h=400&fit=crop&crop=faces',
      colorClasses: 'border-green-500 bg-green-50 ring-green-500'
    }
  ];

  return (
    <div className="flex justify-center gap-4 sm:gap-6 py-4">
      {categories.map(cat => (
        <motion.button
          key={cat.id}
          onClick={() => onSelectCategory(cat.id)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            relative flex flex-col items-center justify-center
            rounded-full w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32
            transition-all duration-300 overflow-hidden
            ${selectedCategory === cat.id
              ? `ring-4 ${cat.colorClasses} shadow-xl`
              : 'border-2 border-gray-200 hover:border-gray-300 shadow-md hover:shadow-lg'}
          `}
        >
          {/* Image background */}
          <div className="absolute inset-0 w-full h-full">
            <img
              src={cat.imageUrl}
              alt={cat.label}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Overlay for readability */}
            <div className={`absolute inset-0 transition-colors duration-300 ${
              selectedCategory === cat.id ? 'bg-black/20' : 'bg-black/40'
            }`} />
          </div>

          {/* Label */}
          <span className="relative z-10 text-sm font-semibold text-white drop-shadow-md">
            {cat.label}
          </span>
        </motion.button>
      ))}
    </div>
  );
};

export default CircularCategorySelector;
