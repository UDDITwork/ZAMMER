import React from 'react';
import { motion } from 'framer-motion';

const CircularCategorySelector = ({ selectedCategory, onSelectCategory }) => {
  const categories = [
    {
      id: 'Men Fashion',
      label: 'Men',
      icon: '👔',
      color: 'blue',
      bgColor: 'bg-blue-50',
      ringColor: 'ring-blue-500'
    },
    {
      id: 'Women Fashion',
      label: 'Women',
      icon: '👗',
      color: 'pink',
      bgColor: 'bg-pink-50',
      ringColor: 'ring-pink-500'
    },
    {
      id: 'Kids Fashion',
      label: 'Kids',
      icon: '🧸',
      color: 'green',
      bgColor: 'bg-green-50',
      ringColor: 'ring-green-500'
    }
  ];

  return (
    <div className="flex justify-center gap-8 py-6">
      {categories.map(cat => (
        <motion.button
          key={cat.id}
          onClick={() => onSelectCategory(cat.id)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            flex flex-col items-center justify-center gap-2 p-4
            border-4 rounded-full w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32
            transition-all duration-300 shadow-md hover:shadow-xl
            ${selectedCategory === cat.id
              ? `ring-4 ${cat.ringColor} ${cat.bgColor} border-${cat.color}-500`
              : 'bg-white hover:bg-gray-50 border-gray-200'}
          `}
        >
          <span className="text-3xl sm:text-4xl">{cat.icon}</span>
          <span className={`text-xs sm:text-sm font-semibold ${selectedCategory === cat.id ? `text-${cat.color}-700` : 'text-gray-700'}`}>
            {cat.label}
          </span>
        </motion.button>
      ))}
    </div>
  );
};

export default CircularCategorySelector;
