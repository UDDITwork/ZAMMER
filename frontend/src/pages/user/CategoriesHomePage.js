// File: /frontend/src/pages/user/CategoriesHomePage.js
// Premium Categories Overview Page — Editorial Entry Point

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getBanners } from '../../services/bannerService';
import { motion } from 'framer-motion';
import {
  Search, MapPin, Bell, ArrowRight, Home, ShoppingBag,
  ShoppingCart, TrendingUp, Star, Grid, List, Sparkles,
  ChevronRight
} from 'lucide-react';

const CategoriesHomePage = () => {
  const [level1Banners, setLevel1Banners] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  // Fallback category data with gradient backgrounds
  const fallbackCategories = [
    {
      _id: 'cat-men',
      categoryLevel1: 'Men Fashion',
      title: "Men's Fashion",
      subtitle: 'Explore curated collections',
      gradient: 'from-neutral-900 to-neutral-800',
      route: '/user/browse/Men%20Fashion'
    },
    {
      _id: 'cat-women',
      categoryLevel1: 'Women Fashion',
      title: "Women's Fashion",
      subtitle: 'Discover elegant styles',
      gradient: 'from-orange-700 via-orange-600 to-orange-500',
      route: '/user/browse/Women%20Fashion'
    },
    {
      _id: 'cat-kids',
      categoryLevel1: 'Kids Fashion',
      title: "Kids' Fashion",
      subtitle: 'Comfort meets style',
      gradient: 'from-neutral-800 to-neutral-700',
      route: '/user/browse/Kids%20Fashion'
    },
  ];

  // Quick link categories
  const quickLinks = [
    { name: 'Trending Now', icon: TrendingUp, route: '/user/trending' },
    { name: 'Limited Edition', icon: Sparkles, route: '/user/limited-edition' },
    { name: 'Top Rated', icon: Star, route: '/user/products?sort=rating' },
    { name: 'New Arrivals', icon: ShoppingBag, route: '/user/products?sort=newest' },
  ];

  const fetchBanners = useCallback(async () => {
    try {
      const response = await getBanners({ level: 1 });
      if (response.success && response.data.length > 0 && isMountedRef.current) {
        setLevel1Banners(response.data);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchBanners();
    return () => { isMountedRef.current = false; };
  }, [fetchBanners]);

  // Merge banner data with fallback
  const categories = fallbackCategories.map((fallback) => {
    const banner = level1Banners.find(b => b.categoryLevel1 === fallback.categoryLevel1);
    return {
      ...fallback,
      imageUrl: banner?.imageUrl,
      title: banner?.title || fallback.title,
      subtitle: banner?.subtitle || fallback.subtitle,
    };
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-black text-white sticky top-0 z-30">
        <div className="container mx-auto px-5 py-3.5">
          <div className="flex items-center justify-between">
            <Link to="/user/home" className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              <span className="text-[15px] font-medium tracking-[-0.01em]">ZAMMER</span>
            </Link>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <Search className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <Link to="/user/cart" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ShoppingCart className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-neutral-50 to-white py-12 md:py-16">
        <div className="container mx-auto px-5">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-[28px] md:text-[36px] font-light tracking-[-0.02em] text-black mb-3">
              Explore Our Collections
            </h1>
            <p className="text-[15px] text-gray-600 leading-relaxed max-w-xl mx-auto">
              Discover premium fashion across all categories. From timeless classics to trending styles,
              find everything you need in one place.
            </p>
          </div>
        </div>
      </section>

      {/* Main Category Cards */}
      <section className="container mx-auto px-5 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <motion.div
              key={category._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Link
                to={category.route}
                className="group block relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300"
                style={{ aspectRatio: '4/5' }}
              >
                {/* Image or Gradient Background */}
                {category.imageUrl ? (
                  <img
                    src={category.imageUrl}
                    alt={category.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient}`} />
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <h3 className="text-[22px] font-light tracking-[-0.02em] text-white mb-1.5">
                    {category.title}
                  </h3>
                  <p className="text-[13px] text-white/80 mb-4">
                    {category.subtitle}
                  </p>
                  <div className="flex items-center text-white group-hover:translate-x-1 transition-transform">
                    <span className="text-[13px] font-medium mr-1.5">Explore</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Orange Hover Border */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-orange-500 rounded-lg transition-colors pointer-events-none" />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Quick Links Grid */}
      <section className="bg-neutral-50 py-12 md:py-16">
        <div className="container mx-auto px-5">
          <h2 className="text-[22px] font-light tracking-[-0.02em] text-black mb-8 text-center">
            Quick Access
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickLinks.map((link, index) => (
              <motion.div
                key={link.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
              >
                <Link
                  to={link.route}
                  className="block bg-white rounded-lg p-5 text-center shadow-sm hover:shadow-md transition-all border border-black/[0.04] hover:border-orange-500/20 group"
                >
                  <link.icon className="w-7 h-7 mx-auto mb-3 text-orange-600 group-hover:scale-110 transition-transform" />
                  <span className="text-[13px] font-medium text-gray-800 group-hover:text-orange-600 transition-colors">
                    {link.name}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse Options */}
      <section className="container mx-auto px-5 py-12 md:py-16">
        <h2 className="text-[22px] font-light tracking-[-0.02em] text-black mb-8 text-center">
          Choose Your Shopping Experience
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Hierarchical Browse */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-8 hover:border-orange-500 transition-all group">
            <Grid className="w-10 h-10 text-orange-600 mb-4" />
            <h3 className="text-[18px] font-semibold text-black mb-2">
              Hierarchical Browse
            </h3>
            <p className="text-[13px] text-gray-600 mb-6 leading-relaxed">
              Deep dive into our 4-level category structure. Perfect for detailed shopping and discovering specific items.
            </p>
            <Link
              to="/user/browse"
              className="inline-flex items-center text-[13px] font-medium text-orange-600 hover:text-orange-700 group-hover:translate-x-1 transition-all"
            >
              Start Browsing
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {/* Quick Categories */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-8 hover:border-orange-500 transition-all group">
            <List className="w-10 h-10 text-orange-600 mb-4" />
            <h3 className="text-[18px] font-semibold text-black mb-2">
              Quick Categories
            </h3>
            <p className="text-[13px] text-gray-600 mb-6 leading-relaxed">
              Fast access to gender-specific categories. Simple 2-level structure for quick shopping.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/user/categories/Men"
                className="px-3 py-1.5 bg-orange-50 text-orange-600 text-xs font-medium rounded-md hover:bg-orange-100 transition-colors"
              >
                Men
              </Link>
              <Link
                to="/user/categories/Women"
                className="px-3 py-1.5 bg-orange-50 text-orange-600 text-xs font-medium rounded-md hover:bg-orange-100 transition-colors"
              >
                Women
              </Link>
              <Link
                to="/user/categories/Kids"
                className="px-3 py-1.5 bg-orange-50 text-orange-600 text-xs font-medium rounded-md hover:bg-orange-100 transition-colors"
              >
                Kids
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-black/[0.06] fixed bottom-0 left-0 right-0 z-30">
        <div className="container mx-auto px-5">
          <div className="grid grid-cols-4 gap-1">
            <Link
              to="/user/home"
              className="flex flex-col items-center py-2.5 text-gray-600 hover:text-orange-600 transition-colors"
            >
              <Home className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium tracking-wide">Home</span>
            </Link>
            <Link
              to="/user/categories"
              className="flex flex-col items-center py-2.5 text-orange-600"
            >
              <Grid className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium tracking-wide">Categories</span>
            </Link>
            <Link
              to="/user/cart"
              className="flex flex-col items-center py-2.5 text-gray-600 hover:text-orange-600 transition-colors"
            >
              <ShoppingCart className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium tracking-wide">Cart</span>
            </Link>
            <Link
              to="/user/profile"
              className="flex flex-col items-center py-2.5 text-gray-600 hover:text-orange-600 transition-colors"
            >
              <Star className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium tracking-wide">Profile</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Bottom padding to prevent content being hidden by fixed nav */}
      <div className="h-16" />
    </div>
  );
};

export default CategoriesHomePage;
