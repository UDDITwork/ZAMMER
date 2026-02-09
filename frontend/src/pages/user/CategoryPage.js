// frontend/src/pages/user/CategoryPage.js - Premium UI/UX Redesign
import React, { useEffect, useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Sparkles, ArrowRight } from 'lucide-react';
import categoryService from '../../services/categoryService';

// Shimmer loading skeleton
const ShimmerCard = ({ index }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05, duration: 0.4 }}
    className="relative rounded-2xl overflow-hidden bg-gray-200"
    style={{ aspectRatio: '3/4' }}
  >
    <div className="absolute inset-0 shimmer-animation" />
  </motion.div>
);

// Premium category card with 3D hover effect
const CategoryCard = ({ subcat, category, index }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);

  // 3D tilt effect on mouse move
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / centerY * -8;
    const rotateY = (x - centerX) / centerX * 8;
    cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    setIsHovered(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.06,
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      <Link
        to={`/user/products?category=${category}&subCategory=${encodeURIComponent(subcat.id)}`}
        className="block"
      >
        <div
          ref={cardRef}
          className="relative rounded-2xl overflow-hidden cursor-pointer group"
          style={{
            aspectRatio: '3/4',
            transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.3s ease',
            transformStyle: 'preserve-3d',
            willChange: 'transform',
            boxShadow: isHovered
              ? '0 25px 60px -12px rgba(0, 0, 0, 0.35), 0 0 40px -8px rgba(249, 115, 22, 0.3)'
              : '0 4px 20px -4px rgba(0, 0, 0, 0.15)',
          }}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
        >
          {/* Image */}
          <div className="absolute inset-0 overflow-hidden">
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 shimmer-animation" />
            )}
            <img
              src={subcat.image || '/placeholders/default-category.jpg'}
              alt={subcat.name}
              className="w-full h-full object-cover transition-transform duration-700 ease-out"
              style={{
                transform: isHovered ? 'scale(1.15)' : 'scale(1.0)',
              }}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
            />
          </div>

          {/* Gradient overlay — stronger at bottom for text */}
          <div
            className="absolute inset-0 transition-opacity duration-500"
            style={{
              background: isHovered
                ? 'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.75) 85%, rgba(0,0,0,0.9) 100%)'
                : 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.55) 85%, rgba(0,0,0,0.8) 100%)',
            }}
          />

          {/* Glow border on hover */}
          <div
            className="absolute inset-0 rounded-2xl transition-opacity duration-500 pointer-events-none"
            style={{
              opacity: isHovered ? 1 : 0,
              boxShadow: 'inset 0 0 0 2px rgba(249, 115, 22, 0.5)',
            }}
          />

          {/* Category name and CTA */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pb-5 z-10">
            <h3
              className="text-white font-bold text-lg tracking-wide leading-tight mb-1 drop-shadow-lg transition-transform duration-300"
              style={{
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              {subcat.name}
            </h3>

            {/* "Explore" CTA — slides in on hover */}
            <div
              className="flex items-center gap-1.5 transition-all duration-400"
              style={{
                opacity: isHovered ? 1 : 0,
                transform: isHovered ? 'translateY(0)' : 'translateY(8px)',
              }}
            >
              <span className="text-orange-300 text-xs font-semibold tracking-wider uppercase">
                Explore
              </span>
              <ArrowRight className="w-3 h-3 text-orange-300" />
            </div>
          </div>

          {/* Top-right sparkle badge on hover */}
          <div
            className="absolute top-3 right-3 z-10 transition-all duration-400"
            style={{
              opacity: isHovered ? 1 : 0,
              transform: isHovered ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(-45deg)',
            }}
          >
            <div className="bg-white/20 backdrop-blur-md rounded-full p-2">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const CategoryPage = () => {
  const { category } = useParams();
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryTitle, setCategoryTitle] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);

    const categoryInfo = categoryService.getCategoryInfo(category);
    setSubcategories(categoryInfo.subCategories);
    setCategoryTitle(categoryService.getCategoryDisplayName(category));
    setCategoryDesc(categoryService.getCategoryDescription(category));

    // Simulate brief loading for animation effect
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [category]);

  return (
    <div className="category-page min-h-screen bg-gray-50 pb-20">

      {/* Shimmer animation CSS */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .shimmer-animation {
          position: relative;
          overflow: hidden;
        }
        .shimmer-animation::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.4) 50%,
            transparent 100%
          );
          animation: shimmer 1.5s infinite;
        }
      `}</style>

      {/* ===== Premium Hero Header ===== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
        }}
      >
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute rounded-full opacity-20 blur-3xl"
            style={{
              width: '400px',
              height: '400px',
              background: 'radial-gradient(circle, #f97316, transparent 70%)',
              top: '-100px',
              right: '-100px',
              animation: 'float 8s ease-in-out infinite',
            }}
          />
          <div
            className="absolute rounded-full opacity-15 blur-3xl"
            style={{
              width: '300px',
              height: '300px',
              background: 'radial-gradient(circle, #ec4899, transparent 70%)',
              bottom: '-80px',
              left: '-60px',
              animation: 'float 10s ease-in-out infinite reverse',
            }}
          />
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -20px) scale(1.05); }
            66% { transform: translate(-20px, 15px) scale(0.95); }
          }
        `}</style>

        {/* Header content */}
        <div className="relative z-10 px-5 pt-12 pb-8">
          {/* Back button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6 group"
          >
            <div className="p-1.5 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors backdrop-blur-sm">
              <ChevronLeft className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">Back</span>
          </motion.button>

          {/* Category title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                {categoryTitle}
              </h1>
              <div className="h-px flex-1 bg-gradient-to-r from-orange-400/50 to-transparent" />
            </div>
            <p className="text-white/50 text-sm max-w-md">
              {categoryDesc}
            </p>
          </motion.div>

          {/* Category count pill */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-white/80 text-xs font-medium">
              {subcategories.length} {subcategories.length === 1 ? 'Category' : 'Categories'}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* ===== Category Grid ===== */}
      <div className="px-4 py-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <ShimmerCard key={i} index={i} />
              ))}
            </motion.div>
          ) : subcategories.length > 0 ? (
            <motion.div
              key="categories"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6"
            >
              {subcategories.map((subcat, index) => (
                <CategoryCard
                  key={subcat.id}
                  subcat={subcat}
                  category={category}
                  index={index}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No categories found.</p>
              <p className="text-gray-400 text-sm mt-1">Try exploring other sections.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== Bottom Navigation ===== */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 z-50">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <Link to="/user/dashboard" className="flex flex-col items-center justify-center py-2.5 flex-1 text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[10px] font-medium mt-0.5">Home</span>
          </Link>

          <Link to="/user/shop" className="flex flex-col items-center justify-center py-2.5 flex-1 text-orange-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-[10px] font-semibold mt-0.5">Shop</span>
          </Link>

          <Link to="/user/cart" className="flex flex-col items-center justify-center py-2.5 flex-1 text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-[10px] font-medium mt-0.5">Cart</span>
          </Link>

          <Link to="/user/trending" className="flex flex-col items-center justify-center py-2.5 flex-1 text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-[10px] font-medium mt-0.5">Trending</span>
          </Link>

          <Link to="/user/limited-edition" className="flex flex-col items-center justify-center py-2.5 flex-1 text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span className="text-[10px] font-medium mt-0.5">Limited Edition</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CategoryPage;
