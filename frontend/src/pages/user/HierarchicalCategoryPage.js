// frontend/src/pages/user/HierarchicalCategoryPage.js
// Hierarchical Category Browser — Premium Editorial Design

import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import categoryService from '../../services/categoryService';
import { getBanners } from '../../services/bannerService';
import { motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, ArrowRight, Check,
  Home, ShoppingBag, ShoppingCart, User, LayoutGrid,
  Crown, Shirt, Snowflake, Dumbbell, Moon, Heart,
  Baby, GraduationCap, Layers, Sparkles, Gem, Stars
} from 'lucide-react';

const HierarchicalCategoryPage = () => {
  const { level1, level2, level3 } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [pageTitle, setPageTitle] = useState('');
  const [pageDescription, setPageDescription] = useState('');
  const [bannerImages, setBannerImages] = useState([]);

  const decodedLevel1 = level1 ? decodeURIComponent(level1) : null;
  const decodedLevel2 = level2 ? decodeURIComponent(level2) : null;
  const decodedLevel3 = level3 ? decodeURIComponent(level3) : null;

  const getCurrentLevel = () => {
    if (!decodedLevel1) return 1;
    if (!decodedLevel2) return 2;
    if (!decodedLevel3) return 3;
    return 4;
  };

  const fetchBannerImages = useCallback(async () => {
    try {
      const currentLevel = getCurrentLevel();
      let params = {};
      if (currentLevel === 4 && decodedLevel1 && decodedLevel2 && decodedLevel3) {
        params = { level: 4, categoryLevel1: decodedLevel1, categoryLevel2: decodedLevel2, categoryLevel3: decodedLevel3 };
      } else if (currentLevel === 2 && decodedLevel1) {
        params = { level: 2, categoryLevel1: decodedLevel1 };
      } else if (currentLevel === 3 && decodedLevel1 && decodedLevel2) {
        params = { level: 3, categoryLevel1: decodedLevel1, categoryLevel2: decodedLevel2 };
      } else {
        params = { level: 1 };
      }
      const response = await getBanners(params);
      if (response.success) setBannerImages(response.data);
    } catch (error) {
      console.error('Error fetching banner images:', error);
    }
  }, [decodedLevel1, decodedLevel2, decodedLevel3]);

  useEffect(() => {
    setLoading(true);
    try {
      let categoryData = [];
      let title = '';
      let description = '';

      if (!decodedLevel1) {
        categoryData = categoryService.getLevel1Categories();
        title = 'Collections';
        description = 'Explore our curated categories';
      } else if (!decodedLevel2) {
        categoryData = categoryService.getLevel2Categories(decodedLevel1);
        title = decodedLevel1;
        description = `Explore ${decodedLevel1}`;
      } else if (!decodedLevel3) {
        categoryData = categoryService.getLevel3Categories(decodedLevel1, decodedLevel2);
        title = decodedLevel2;
        description = `${decodedLevel2} in ${decodedLevel1}`;
      } else {
        const level4Data = categoryService.getLevel4Categories(decodedLevel1, decodedLevel2, decodedLevel3);
        if (level4Data.length > 0) {
          categoryData = level4Data;
          title = decodedLevel3;
          description = `${decodedLevel3} in ${decodedLevel2}`;
        } else {
          const filterParams = categoryService.buildFilterParams(decodedLevel1, decodedLevel2, decodedLevel3);
          const queryString = new URLSearchParams(filterParams).toString();
          navigate(`/user/products?${queryString}`);
          return;
        }
      }

      setCategories(categoryData);
      setPageTitle(title);
      setPageDescription(description);
      const crumbs = categoryService.getBreadcrumbs(decodedLevel1, decodedLevel2, decodedLevel3);
      setBreadcrumbs(crumbs);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
    fetchBannerImages();
  }, [decodedLevel1, decodedLevel2, decodedLevel3, navigate, fetchBannerImages]);

  const getCategoryLink = (category) => {
    if (!decodedLevel1) {
      return `/user/browse/${encodeURIComponent(category.id)}`;
    } else if (!decodedLevel2) {
      return `/user/browse/${encodeURIComponent(decodedLevel1)}/${encodeURIComponent(category.id)}`;
    } else if (!decodedLevel3) {
      const level4Data = categoryService.getLevel4Categories(decodedLevel1, decodedLevel2, category.id);
      if (level4Data.length > 0) {
        return `/user/browse/${encodeURIComponent(decodedLevel1)}/${encodeURIComponent(decodedLevel2)}/${encodeURIComponent(category.id)}`;
      } else {
        const filterParams = categoryService.buildFilterParams(decodedLevel1, decodedLevel2, category.id);
        return `/user/products?${new URLSearchParams(filterParams).toString()}`;
      }
    } else {
      const filterParams = categoryService.buildFilterParams(decodedLevel1, decodedLevel2, decodedLevel3, category.id);
      return `/user/products?${new URLSearchParams(filterParams).toString()}`;
    }
  };

  const getViewAllLink = () => {
    const filterParams = categoryService.buildFilterParams(decodedLevel1, decodedLevel2, decodedLevel3);
    return `/user/products?${new URLSearchParams(filterParams).toString()}`;
  };

  const getBannerForCategory = (categoryName) => {
    const currentLevel = getCurrentLevel();
    if (currentLevel === 4) return bannerImages.find(b => b.categoryLevel4 === categoryName);
    if (currentLevel === 2) return bannerImages.find(b => b.categoryLevel2 === categoryName);
    if (currentLevel === 3) return bannerImages.find(b => b.categoryLevel3 === categoryName);
    if (currentLevel === 1) return bannerImages.find(b => b.categoryLevel1 === categoryName);
    return null;
  };

  const getCategoryIcon = (categoryName) => {
    const iconMap = {
      'Ethnic Wear': <Crown className="w-5 h-5" strokeWidth={1.5} />,
      'Western Wear': <Shirt className="w-5 h-5" strokeWidth={1.5} />,
      'Winter Wear': <Snowflake className="w-5 h-5" strokeWidth={1.5} />,
      'Sportswear': <Dumbbell className="w-5 h-5" strokeWidth={1.5} />,
      'Sleepwear & Loungewear': <Moon className="w-5 h-5" strokeWidth={1.5} />,
      'Boys Wear': <User className="w-5 h-5" strokeWidth={1.5} />,
      'Girls Wear': <Heart className="w-5 h-5" strokeWidth={1.5} />,
      'Infant Wear': <Baby className="w-5 h-5" strokeWidth={1.5} />,
      'School Uniforms': <GraduationCap className="w-5 h-5" strokeWidth={1.5} />,
      'Bottom Wear': <Layers className="w-5 h-5" strokeWidth={1.5} />,
      'Lingerie & Innerwear': <Sparkles className="w-5 h-5" strokeWidth={1.5} />,
      'Men Fashion': <User className="w-5 h-5" strokeWidth={1.5} />,
      'Women Fashion': <Gem className="w-5 h-5" strokeWidth={1.5} />,
      'Kids Fashion': <Stars className="w-5 h-5" strokeWidth={1.5} />,
    };
    return iconMap[categoryName] || <Layers className="w-5 h-5" strokeWidth={1.5} />;
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };
  const staggerItem = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <div className="min-h-screen bg-white pb-20">

      {/* HEADER */}
      <header className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-5 py-5">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] transition-colors"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <div>
              <h1 className="text-xl font-light tracking-[-0.02em]">{pageTitle}</h1>
              <p className="text-white/40 text-[12px] mt-0.5">{pageDescription}</p>
            </div>
          </div>

          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1.5 text-[12px] overflow-x-auto pb-2 scrollbar-hide">
              <Link to="/user/browse" className="text-white/40 hover:text-white transition-colors whitespace-nowrap">
                All
              </Link>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  <ChevronRight className="w-3 h-3 text-white/20 flex-shrink-0" strokeWidth={1.5} />
                  <Link
                    to={crumb.path}
                    className={`whitespace-nowrap ${
                      index === breadcrumbs.length - 1
                        ? 'text-orange-400 font-medium'
                        : 'text-white/40 hover:text-white transition-colors'
                    }`}
                  >
                    {crumb.name}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Level progress — minimal line style */}
          <div className="flex items-center gap-0 mt-4">
            {[1, 2, 3, 4].map((level) => (
              <React.Fragment key={level}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${
                  level < getCurrentLevel()
                    ? 'bg-orange-500 text-white'
                    : level === getCurrentLevel()
                      ? 'bg-white text-black'
                      : 'bg-white/[0.08] text-white/30'
                }`}>
                  {level < getCurrentLevel() ? <Check className="w-3 h-3" strokeWidth={2} /> : level}
                </div>
                {level < 4 && (
                  <div className={`flex-1 h-px mx-1 ${level < getCurrentLevel() ? 'bg-orange-500' : 'bg-white/[0.08]'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </header>

      {/* View All Products */}
      {decodedLevel1 && (
        <div className="max-w-7xl mx-auto px-5 pt-5">
          <Link
            to={getViewAllLink()}
            className="flex items-center justify-center gap-2 w-full bg-black text-white text-[13px] font-medium uppercase tracking-[0.1em] py-3.5 rounded-xl hover:bg-neutral-900 transition-colors"
          >
            View all in {decodedLevel3 || decodedLevel2 || decodedLevel1}
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </div>
      )}

      {/* CATEGORIES */}
      <div className="max-w-7xl mx-auto px-5 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border border-neutral-200 border-t-black rounded-full animate-spin mx-auto mb-4" />
              <span className="text-neutral-400 text-[12px] uppercase tracking-[0.1em]">Loading...</span>
            </div>
          </div>
        ) : categories.length > 0 ? (
          <>
            {/* LEVEL 1: Large editorial cards */}
            {getCurrentLevel() === 1 && (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                {categories.map((category, index) => {
                  const banner = getBannerForCategory(category.name || category.id);
                  return (
                    <motion.div key={category.id || index} variants={staggerItem}>
                      <Link to={getCategoryLink(category)} className="group block">
                        <div
                          className="relative rounded-2xl overflow-hidden bg-neutral-100"
                          style={{ aspectRatio: '4/5' }}
                        >
                          {banner?.imageUrl ? (
                            <img src={banner.imageUrl} alt={category.name || category.id} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-b from-neutral-800 to-black flex items-center justify-center">
                              <div className="text-center text-white/60">
                                <div className="w-14 h-14 bg-white/[0.06] rounded-full flex items-center justify-center mx-auto mb-3">
                                  {getCategoryIcon(category.name || category.id)}
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-6">
                            <span className="text-[9px] font-medium uppercase tracking-[0.25em] text-orange-400 mb-2 block">Collection</span>
                            <h3 className="text-white text-xl font-light tracking-[-0.01em] mb-1.5">{category.name || category.id}</h3>
                            <span className="inline-flex items-center gap-2 text-white/60 text-[12px] font-medium uppercase tracking-[0.1em] group-hover:text-white group-hover:gap-3 transition-all duration-500">
                              Explore <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* LEVEL 2: Two-column poster grid */}
            {getCurrentLevel() === 2 && (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 gap-3"
              >
                {categories.map((category, index) => {
                  const banner = getBannerForCategory(category.name || category.id);
                  return (
                    <motion.div key={category.id || index} variants={staggerItem}>
                      <Link to={getCategoryLink(category)} className="group block">
                        <div
                          className="relative rounded-2xl overflow-hidden bg-neutral-100"
                          style={{ aspectRatio: '3/4' }}
                        >
                          {banner?.imageUrl ? (
                            <img src={banner.imageUrl} alt={category.name || category.id} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-b from-neutral-50 to-neutral-100 flex flex-col items-center justify-center p-4">
                              <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center mb-2.5 shadow-sm text-orange-500">
                                {getCategoryIcon(category.name || category.id)}
                              </div>
                              <span className="text-neutral-700 text-[13px] font-medium text-center">{category.name || category.id}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <h3 className="text-white font-medium text-[14px] tracking-[-0.01em]">{category.name || category.id}</h3>
                            <span className="text-white/50 text-[11px] flex items-center gap-1 mt-0.5">
                              Explore <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* LEVEL 3: Horizontal poster cards */}
            {getCurrentLevel() === 3 && (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                {categories.map((category, index) => {
                  const banner = getBannerForCategory(category.name || category.id);
                  return (
                    <motion.div key={category.id || index} variants={staggerItem}>
                      <Link to={getCategoryLink(category)} className="block group">
                        <div className="relative rounded-2xl overflow-hidden h-40 bg-neutral-100">
                          {banner?.imageUrl ? (
                            <img src={banner.imageUrl} alt={category.name || category.id} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-700 flex items-center px-8">
                              <div className="flex items-center gap-4">
                                <div className="w-11 h-11 bg-white/[0.08] rounded-full flex items-center justify-center text-white/60">
                                  {getCategoryIcon(category.name || category.id)}
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                          <div className="absolute inset-0 flex items-end p-5">
                            <div>
                              <h3 className="text-white font-medium text-[16px] tracking-[-0.01em]">{category.name || category.id}</h3>
                              <span className="text-white/50 text-[12px] flex items-center gap-1.5 mt-1 group-hover:text-white/70 group-hover:gap-2.5 transition-all duration-500">
                                Explore collection <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* LEVEL 4: Cards with banner images */}
            {getCurrentLevel() === 4 && (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
              >
                {categories.map((category, index) => {
                  const banner = getBannerForCategory(category.name || category.id);
                  return (
                    <motion.div key={category.id || index} variants={staggerItem}>
                      <Link to={getCategoryLink(category)} className="group block">
                        <div className="bg-white rounded-xl border border-black/[0.04] hover:border-orange-300 overflow-hidden transition-all duration-200 group-hover:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.1)]">
                          {banner?.imageUrl ? (
                            <div className="aspect-square overflow-hidden">
                              <img
                                src={banner.imageUrl}
                                alt={category.name || category.id}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                              />
                              <div className="w-full h-full bg-neutral-50 items-center justify-center hidden text-neutral-400 group-hover:text-orange-500">
                                {getCategoryIcon(category.name || category.id)}
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-square bg-neutral-50 group-hover:bg-orange-50 flex items-center justify-center transition-colors text-neutral-400 group-hover:text-orange-500">
                              {getCategoryIcon(category.name || category.id)}
                            </div>
                          )}
                          <div className="p-3 text-center">
                            <h3 className="font-medium text-[13px] text-black group-hover:text-orange-600 transition-colors tracking-[-0.01em]">
                              {category.name || category.id}
                            </h3>
                            <p className="text-neutral-400 text-[10px] mt-0.5 uppercase tracking-[0.05em]">View products</p>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </>
        ) : (
          <div className="text-center py-20 rounded-2xl border border-dashed border-neutral-200">
            <LayoutGrid className="h-10 w-10 text-neutral-200 mx-auto mb-3" strokeWidth={1} />
            <p className="text-[15px] font-medium text-black mb-1">No categories found</p>
            <Link to="/user/browse" className="inline-block mt-2 text-orange-500 hover:text-orange-600 text-[12px] font-medium uppercase tracking-[0.1em]">
              Back to all categories
            </Link>
          </div>
        )}
      </div>

      {/* Quick Navigation Chips */}
      {getCurrentLevel() >= 2 && decodedLevel1 && (
        <div className="max-w-7xl mx-auto px-5 pb-6">
          <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.15em] mb-3">Quick Navigation</p>
          <div className="flex flex-wrap gap-2">
            {categoryService.getLevel2Categories(decodedLevel1).map((cat) => (
              <Link
                key={cat.id}
                to={`/user/browse/${encodeURIComponent(decodedLevel1)}/${encodeURIComponent(cat.id)}`}
                className={`px-4 py-2 rounded-full text-[12px] font-medium transition-all ${
                  cat.id === decodedLevel2
                    ? 'bg-black text-white'
                    : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-black/[0.04]'
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/[0.06] z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-around items-center h-14">
            <Link to="/user/dashboard" className="flex flex-col items-center gap-0.5 text-neutral-400 hover:text-black transition-colors">
              <Home className="h-[20px] w-[20px]" strokeWidth={1.5} />
              <span className="text-[10px] font-medium tracking-wide">Home</span>
            </Link>
            <Link to="/user/browse" className="flex flex-col items-center gap-0.5 text-orange-600">
              <LayoutGrid className="h-[20px] w-[20px]" strokeWidth={1.5} />
              <span className="text-[10px] font-semibold tracking-wide">Categories</span>
            </Link>
            <Link to="/user/cart" className="flex flex-col items-center gap-0.5 text-neutral-400 hover:text-black transition-colors">
              <ShoppingCart className="h-[20px] w-[20px]" strokeWidth={1.5} />
              <span className="text-[10px] font-medium tracking-wide">Cart</span>
            </Link>
            <Link to="/user/products" className="flex flex-col items-center gap-0.5 text-neutral-400 hover:text-black transition-colors">
              <ShoppingBag className="h-[20px] w-[20px]" strokeWidth={1.5} />
              <span className="text-[10px] font-medium tracking-wide">Shop</span>
            </Link>
            <Link to="/user/profile" className="flex flex-col items-center gap-0.5 text-neutral-400 hover:text-black transition-colors">
              <User className="h-[20px] w-[20px]" strokeWidth={1.5} />
              <span className="text-[10px] font-medium tracking-wide">Profile</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default HierarchicalCategoryPage;
