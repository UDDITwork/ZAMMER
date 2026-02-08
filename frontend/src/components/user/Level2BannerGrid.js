import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Level2BannerGrid = ({ banners, level1Category }) => {
  if (!banners || banners.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No categories available for {level1Category}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {banners.map((banner, idx) => (
        <motion.div
          key={banner._id || `banner-${idx}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05, duration: 0.3 }}
          className="w-full"
        >
          <Link
            to={`/user/browse/${encodeURIComponent(banner.categoryLevel1)}/${encodeURIComponent(banner.categoryLevel2)}`}
            className="block group"
          >
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
              <img
                src={banner.imageUrl}
                alt={banner.categoryLevel2 || banner.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Content overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 text-white">
                <h3 className="font-bold text-base sm:text-lg mb-1 line-clamp-2">
                  {banner.categoryLevel2 || banner.title}
                </h3>
                {banner.subtitle && (
                  <p className="text-xs sm:text-sm opacity-90 line-clamp-1">
                    {banner.subtitle}
                  </p>
                )}
              </div>

              {/* Hover indicator */}
              <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>

            {/* Mobile-friendly category name below image */}
            <div className="mt-2 text-center sm:hidden">
              <p className="text-sm font-medium text-gray-900 line-clamp-1">
                {banner.categoryLevel2 || banner.title}
              </p>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
};

export default Level2BannerGrid;
