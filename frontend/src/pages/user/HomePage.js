// File: /frontend/src/pages/user/HomePage.js
// Premium Fashion E-Commerce Homepage — Editorial Design Language

import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { getMarketplaceProducts } from '../../services/productService';
import { getNearbyShops } from '../../services/userService';
import { getBanners } from '../../services/bannerService';
import { getPromoBanners } from '../../services/promoBannerService';
import StarRating from '../../components/common/StarRating';
import WishlistButton from '../../components/common/WishlistButton';
import PromoBannerCarousel from '../../components/common/PromoBannerCarousel';
import UserHeader from '../../components/header/UserHeader';
import CircularCategorySelector from '../../components/user/CircularCategorySelector';
import BrandLogoMarquee from '../../components/user/BrandLogoMarquee';

import BrandDiscoverGrid from '../../components/user/BrandDiscoverGrid';
import Level2BannerGrid from '../../components/user/Level2BannerGrid';
import DecorativeDivider from '../../components/common/DecorativeDivider';
import FashionQuoteStrip from '../../components/common/FashionQuoteStrip';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ArrowRight, ArrowUpRight,
  Home, ShoppingBag, ShoppingCart, TrendingUp, Star,
  User, MapPin, Heart, Gem, Sparkles
} from 'lucide-react';

const HomePage = () => {
  const { userAuth } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [offerProducts, setOfferProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [recommendedShops, setRecommendedShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingShops, setLoadingShops] = useState(true);
  const [level1Banners, setLevel1Banners] = useState([]);
  const [promoBanners, setPromoBanners] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [selectedLevel1, setSelectedLevel1] = useState(() => {
    const gender = userAuth?.user?.gender;
    if (gender === 'Female') return 'Women Fashion';
    if (gender === 'Male') return 'Men Fashion';
    return 'Men Fashion'; // default
  });
  const [level2Banners, setLevel2Banners] = useState([]);

  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const fallbackBanners = [
    { _id: 'fb-men', categoryLevel1: 'Men Fashion', title: "Men's Edit", subtitle: 'The new season essentials', gradient: 'from-neutral-900 to-neutral-800' },
    { _id: 'fb-women', categoryLevel1: 'Women Fashion', title: "Women's Edit", subtitle: 'Curated elegance', gradient: 'from-orange-700 via-orange-600 to-orange-500' },
    { _id: 'fb-kids', categoryLevel1: 'Kids Fashion', title: "Kids' Edit", subtitle: 'Where comfort meets style', gradient: 'from-neutral-800 to-neutral-700' },
  ];

  const activeBanners = level1Banners.length > 0 ? level1Banners : fallbackBanners;

  const getShopImage = (shop) => {
    if (shop?.shop?.mainImage) return shop.shop.mainImage;
    if (shop?.shop?.images && shop.shop.images.length > 0) return shop.shop.images[0];
    return null;
  };

  const fetchProducts = useCallback(async () => {
    if (fetchingRef.current || !isMountedRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const response = await getMarketplaceProducts({ page: 1, limit: 8, status: 'active' });
      if (response.success && isMountedRef.current) setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      if (isMountedRef.current) setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  const fetchOfferProducts = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const response = await getMarketplaceProducts({ page: 1, limit: 4, discount: true, status: 'active' });
      if (response.success && isMountedRef.current) setOfferProducts(response.data);
    } catch (error) {
      console.error('Error fetching offer products:', error);
    }
  }, []);

  const fetchNearbyShops = useCallback(async () => {
    if (!isMountedRef.current) return;
    setLoadingShops(true);
    try {
      const response = await getNearbyShops();
      if (response.success && isMountedRef.current) {
        setShops(response.data);
        setRecommendedShops(
          response.data.slice()
            .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
            .slice(0, 4)
        );
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
    } finally {
      if (isMountedRef.current) setLoadingShops(false);
    }
  }, []);

  const fetchBanners = useCallback(async () => {
    try {
      const response = await getBanners({ level: 1 });
      if (response.success && response.data.length > 0 && isMountedRef.current) setLevel1Banners(response.data);
    } catch (error) {
      console.error('Error fetching banners:', error);
    }
  }, []);

  const fetchPromoBannersData = useCallback(async () => {
    try {
      const response = await getPromoBanners({ page: 'homepage' });
      if (response.success && response.data.length > 0 && isMountedRef.current) setPromoBanners(response.data);
    } catch (error) {
      console.error('Error fetching promo banners:', error);
    }
  }, []);

  const fetchLevel2Banners = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      console.log('🎯 [HomePage] Fetching Level 2 banners for:', selectedLevel1);
      const response = await getBanners({ level: 2, categoryLevel1: selectedLevel1 });
      if (response.success && response.data && response.data.length > 0 && isMountedRef.current) {
        setLevel2Banners(response.data);
        console.log('✅ Level 2 banners fetched:', response.data.length);
      } else {
        setLevel2Banners([]);
      }
    } catch (error) {
      console.error('❌ Error fetching Level 2 banners:', error);
      setLevel2Banners([]);
    }
  }, [selectedLevel1]);

  useEffect(() => {
    isMountedRef.current = true;
    Promise.all([fetchProducts(), fetchOfferProducts(), fetchNearbyShops(), fetchBanners(), fetchPromoBannersData()]).catch(console.error);
    return () => { isMountedRef.current = false; fetchingRef.current = false; };
  }, [fetchProducts, fetchOfferProducts, fetchNearbyShops, fetchBanners, fetchPromoBannersData]);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeBanners.length]);

  useEffect(() => {
    fetchLevel2Banners();
  }, [fetchLevel2Banners]);

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 20%, #f1f5f9 40%, #ffffff 60%, #eff6ff 80%, #f5f3ff 100%)',
        backgroundSize: '300% 300%',
        animation: 'bgShift 20s ease infinite',
      }}
    >
      <style>{`
        @keyframes bgShift {
          0%, 100% { background-position: 0% 50%; }
          33% { background-position: 100% 0%; }
          66% { background-position: 50% 100%; }
        }
      `}</style>
      <UserHeader />

      {/* Circular Category Selector with Brand Logo Marquee */}
      <div className="relative bg-white border-b border-black/[0.04] overflow-hidden" style={{ borderTop: '1px solid #F0F0F0', borderBottom: '1px solid #F0F0F0' }}>
        {/* Brand logo marquee — scrolls behind the circles */}
        <BrandLogoMarquee />
        {/* Category circles — sit on top */}
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <div className="relative" style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.9)) drop-shadow(0 0 40px rgba(255,255,255,0.7))' }}>
              <CircularCategorySelector
                selectedCategory={selectedLevel1}
                onSelectCategory={setSelectedLevel1}
              />
            </div>
          </div>
        </div>
      </div>

      {/* HERO BANNER CAROUSEL */}
      <section className="relative bg-white">
        <div className="w-full">
          <div className="relative overflow-hidden" style={{ height: 'clamp(320px, 45vw, 520px)' }}>
            <AnimatePresence mode="wait">
              {activeBanners.map((banner, index) => (
                index === currentBannerIndex && (
                  <motion.div
                    key={banner._id}
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0"
                  >
                    <Link
                      to={`/user/browse/${encodeURIComponent(banner.categoryLevel1)}`}
                      className="block w-full h-full relative group"
                    >
                      {banner.imageUrl ? (
                        <img src={banner.imageUrl} alt={banner.title || banner.categoryLevel1} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${banner.gradient}`} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80" />
                      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3, duration: 0.5 }}
                        >
                          <span className="inline-block text-[10px] font-medium uppercase tracking-[0.25em] text-orange-400 mb-3">
                            New Collection
                          </span>
                          <h2 className="text-white text-3xl sm:text-5xl font-light tracking-[-0.02em] leading-[1.1] mb-2">
                            {banner.title || banner.categoryLevel1}
                          </h2>
                          <p className="text-white/50 text-sm font-light mb-6 max-w-md">
                            {banner.subtitle || 'Explore the collection'}
                          </p>
                          <span className="inline-flex items-center gap-2.5 text-white text-[13px] font-medium tracking-wide uppercase group-hover:gap-3.5 transition-all duration-500">
                            Discover
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-500" strokeWidth={1.5} />
                          </span>
                        </motion.div>
                      </div>
                    </Link>
                  </motion.div>
                )
              ))}
            </AnimatePresence>

            {/* Dot indicators */}
            <div className="absolute bottom-5 right-6 sm:right-10 flex items-center gap-1.5 z-10">
              {activeBanners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentBannerIndex(i)}
                  className={`rounded-full transition-all duration-500 ${
                    i === currentBannerIndex ? 'w-6 h-[3px] bg-white' : 'w-[3px] h-[3px] bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>

            {/* Counter */}
            <div className="absolute top-5 right-6 sm:right-10 z-10">
              <span className="text-white/40 text-[11px] font-mono tracking-wider">
                {String(currentBannerIndex + 1).padStart(2, '0')} / {String(activeBanners.length).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BADGES */}
      <section className="bg-gradient-to-r from-slate-50/60 via-blue-50/30 to-indigo-50/30 border-t border-slate-100/30">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-center gap-6 sm:gap-10 overflow-x-auto scrollbar-hide">
            {[
              { icon: '🚚', label: 'Free Shipping 500+' },
              { icon: '✓', label: '100% Genuine' },
              { icon: '↩', label: 'Easy Returns' },
              { icon: '🔒', label: 'Secure Payment' },
            ].map((badge) => (
              <div key={badge.label} className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-sm">{badge.icon}</span>
                <span className="text-[11px] font-medium text-neutral-600 uppercase tracking-wider">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROMOTIONAL BANNERS */}
      {promoBanners.length > 0 && (
        <section className="bg-gradient-to-r from-slate-50/50 via-blue-50/20 to-indigo-50/30 py-4">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <PromoBannerCarousel banners={promoBanners} />
          </div>
        </section>
      )}

      {/* LEVEL 2 BANNERS */}
      <section className="bg-gradient-to-b from-slate-50/20 via-white/80 to-blue-50/15 border-t border-slate-100/20 py-7">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-orange-500 mb-1">Explore</p>
              <h2 className="text-[22px] font-light text-black tracking-[-0.02em]">
                {selectedLevel1.replace(' Fashion', '')} Collections
              </h2>
            </div>
            <Link
              to={`/user/browse/${encodeURIComponent(selectedLevel1)}`}
              className="text-black text-[12px] font-medium uppercase tracking-[0.1em] flex items-center gap-1 hover:text-orange-600 transition-colors"
            >
              View All <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </Link>
          </div>
          <Level2BannerGrid banners={level2Banners} level1Category={selectedLevel1} />
        </div>
      </section>


      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">

        {/* SPECIAL OFFERS */}
        <section className="pt-7 pb-6">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-orange-500 mb-1">Limited Time</p>
              <h2 className="text-[22px] font-light text-black tracking-[-0.02em]">Special Offers</h2>
            </div>
            <Link to="/user/offers" className="text-black text-[12px] font-medium uppercase tracking-[0.1em] flex items-center gap-1 hover:text-orange-600 transition-colors">
              All Offers <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 snap-x snap-mandatory scrollbar-hide">
            {offerProducts.length > 0 ? (
              offerProducts.map((product) => (
                <Link key={product._id} to={`/user/product/${product._id}`} className="flex-shrink-0 w-[280px] snap-start group">
                  <div className="relative bg-neutral-50 rounded-2xl overflow-hidden h-[200px] border border-black/[0.04] group-hover:border-orange-200 transition-all duration-300">
                    <div className="absolute top-3.5 right-3.5 z-20">
                      <WishlistButton productId={product._id} size="sm" />
                    </div>
                    {product.images && product.images[0] && (
                      <div className="absolute right-0 bottom-0 w-[45%] h-full">
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-r from-neutral-50 via-neutral-50/50 to-transparent" />
                      </div>
                    )}
                    <div className="relative z-10 flex flex-col justify-between h-full p-5">
                      <div>
                        <span className="inline-block bg-black text-[10px] text-white font-medium uppercase tracking-[0.15em] px-2.5 py-1 rounded-md">
                          {Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)}% Off
                        </span>
                        <h3 className="font-medium mt-3 text-black text-[15px] leading-snug line-clamp-2 tracking-[-0.01em]">{product.name}</h3>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] text-neutral-400 line-through">Rs. {product.mrp}</p>
                          <p className="text-[15px] font-semibold text-black">Rs. {product.zammerPrice}</p>
                        </div>
                        <span className="w-9 h-9 rounded-full bg-black flex items-center justify-center group-hover:bg-orange-500 transition-colors duration-300">
                          <ArrowUpRight className="w-4 h-4 text-white" strokeWidth={1.5} />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex-shrink-0 w-[280px]">
                <div className="bg-neutral-50 rounded-2xl p-6 h-[200px] flex flex-col justify-between border border-black/[0.04]">
                  <div>
                    <span className="inline-block bg-neutral-200 text-[10px] text-neutral-500 font-medium uppercase tracking-[0.15em] px-2.5 py-1 rounded-md">Coming Soon</span>
                    <h3 className="font-medium mt-3 text-neutral-600 text-[15px]">New offers arriving</h3>
                  </div>
                  <Link to="/user/shop" className="inline-flex items-center text-black text-[12px] font-medium uppercase tracking-[0.1em] hover:text-orange-600 transition-colors">
                    Browse <ArrowRight className="w-3.5 h-3.5 ml-1.5" strokeWidth={1.5} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        <DecorativeDivider variant="wave" className="my-1" />

        {/* SHOP BY CATEGORY */}
        <section className="py-7 bg-gradient-to-br from-slate-50/30 via-transparent to-blue-50/20 -mx-5 px-5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 rounded-3xl">
          <div className="flex items-end justify-between mb-7">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-orange-500 mb-1">Browse</p>
              <h2 className="text-[22px] font-light text-black tracking-[-0.02em]">Shop by Category</h2>
            </div>
            <Link to="/user/browse" className="text-black text-[12px] font-medium uppercase tracking-[0.1em] flex items-center gap-1 hover:text-orange-600 transition-colors">
              All Categories <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-5">
            {[
              { categoryLevel1: 'Women Fashion', label: 'Women', tagline: 'New season', route: '/user/browse/Women%20Fashion', fallbackGradient: 'from-orange-50 via-orange-100/60 to-orange-200/40', FallbackIcon: Gem, fallbackIconColor: 'text-orange-600', accent: 'bg-orange-500' },
              { categoryLevel1: 'Men Fashion', label: 'Men', tagline: 'Essential edits', route: '/user/browse/Men%20Fashion', fallbackGradient: 'from-neutral-100 via-neutral-200/60 to-neutral-300/40', FallbackIcon: User, fallbackIconColor: 'text-neutral-700', accent: 'bg-black' },
              { categoryLevel1: 'Kids Fashion', label: 'Kids', tagline: 'Playful styles', route: '/user/browse/Kids%20Fashion', fallbackGradient: 'from-orange-50/80 via-amber-50/60 to-orange-100/40', FallbackIcon: Sparkles, fallbackIconColor: 'text-orange-500', accent: 'bg-orange-500' },
            ].map((cat) => {
              const banner = level1Banners.find(b => b.categoryLevel1 === cat.categoryLevel1);
              return (
                <Link key={cat.categoryLevel1} to={cat.route} className="group">
                  <div className="aspect-[3/4] relative rounded-2xl overflow-hidden bg-neutral-100">
                    {banner?.imageUrl ? (
                      <>
                        <img
                          src={banner.imageUrl}
                          alt={cat.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        <div className="absolute inset-0 flex flex-col items-center justify-end p-4 pb-6">
                          <p className="text-[13px] sm:text-sm font-semibold text-white text-center tracking-[-0.01em]">{cat.label}</p>
                          <p className="text-[10px] text-white/60 mt-0.5 hidden sm:block">{cat.tagline}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={`w-full h-full bg-gradient-to-b ${cat.fallbackGradient} group-hover:scale-105 transition-transform duration-700`} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center mb-3 shadow-sm group-hover:shadow-md transition-shadow">
                            <cat.FallbackIcon className={`h-5 w-5 sm:h-6 sm:w-6 ${cat.fallbackIconColor}`} strokeWidth={1.5} />
                          </div>
                          <p className="text-[13px] sm:text-sm font-semibold text-black text-center tracking-[-0.01em]">{cat.label}</p>
                          <p className="text-[10px] text-neutral-500 mt-0.5 hidden sm:block">{cat.tagline}</p>
                        </div>
                      </>
                    )}
                    <div className={`absolute bottom-0 left-0 right-0 h-1 ${cat.accent} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <FashionQuoteStrip className="my-1" />

        {/* DISCOVER BRANDS */}
        <section className="py-7 bg-gradient-to-br from-gray-50/60 via-white to-indigo-50/15 -mx-5 px-5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 rounded-3xl">
          <BrandDiscoverGrid />
        </section>

        <DecorativeDivider variant="diamond" className="my-1" />

        {/* NEARBY SHOPS */}
        <section className="py-7 bg-gradient-to-bl from-blue-50/20 via-transparent to-slate-50/25 -mx-5 px-5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 rounded-3xl">
          <div className="flex items-end justify-between mb-7">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-orange-500 mb-1">Near You</p>
              <h2 className="text-[22px] font-light text-black tracking-[-0.02em]">Local Boutiques</h2>
            </div>
            <Link to="/user/nearby-shops" className="text-black text-[12px] font-medium uppercase tracking-[0.1em] flex items-center gap-1 hover:text-orange-600 transition-colors">
              View All <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </Link>
          </div>

          {loadingShops ? (
            <div className="flex justify-center py-16">
              <div className="text-center">
                <div className="w-8 h-8 border border-neutral-200 border-t-black rounded-full animate-spin mx-auto mb-4" />
                <span className="text-neutral-400 text-[12px] uppercase tracking-[0.1em]">Finding shops...</span>
              </div>
            </div>
          ) : shops.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {shops.slice(0, 6).map((shop, index) => (
                <Link key={shop._id || index} to={`/user/shop/${shop._id}`} className="group">
                  <article className="bg-white rounded-2xl overflow-hidden border border-black/[0.04] group-hover:border-black/[0.08] transition-all duration-300 group-hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]">
                    <div className="h-48 bg-neutral-50 relative overflow-hidden">
                      {getShopImage(shop) ? (
                        <img
                          src={getShopImage(shop)}
                          alt={shop.shop?.name || 'Shop'}
                          className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                          onError={(e) => { e.target.style.display = 'none'; if(e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                        />
                      ) : null}
                      <div className={`h-full w-full flex items-center justify-center bg-neutral-50 ${getShopImage(shop) ? 'hidden' : 'flex'}`}>
                        <ShoppingBag className="h-8 w-8 text-neutral-200" strokeWidth={1} />
                      </div>
                      {shop.shop?.images?.length > 1 && (
                        <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-[10px] font-medium">
                          +{shop.shop.images.length - 1}
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2.5">
                        <StarRating rating={shop.averageRating || 4.9} className="text-xs" />
                        {shop.numReviews > 0 ? (
                          <span className="text-[11px] text-neutral-400">({shop.numReviews})</span>
                        ) : (
                          <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full font-medium">New</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-[15px] text-black tracking-[-0.01em] mb-1">{shop.shop?.name || 'Shop Name'}</h3>
                      {shop.shop?.description && (
                        <p className="text-neutral-400 text-[12px] leading-relaxed mb-3.5 line-clamp-2">
                          {shop.shop.description.length > 80 ? shop.shop.description.substring(0, 80) + '...' : shop.shop.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-3 border-t border-black/[0.04]">
                        <p className="text-[14px] font-semibold text-black">
                          From <span className="text-orange-600">Rs. {shop.zammerPrice?.toFixed(0) || '299'}</span>
                        </p>
                        {shop.distanceText && (
                          <p className="text-[11px] text-neutral-400 flex items-center gap-1">
                            <MapPin className="h-3 w-3" strokeWidth={1.5} />
                            {shop.distanceText}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 rounded-2xl border border-dashed border-neutral-200">
              <ShoppingBag className="h-10 w-10 text-neutral-200 mx-auto mb-3" strokeWidth={1} />
              <p className="text-[15px] font-medium text-black mb-1">No shops nearby</p>
              <p className="text-neutral-400 text-[13px]">We are expanding to your area soon.</p>
            </div>
          )}
        </section>

        <DecorativeDivider variant="herringbone" className="my-1" />

        {/* CURATED PICKS */}
        <section className="py-7 mb-20 bg-gradient-to-tr from-violet-50/20 via-transparent to-slate-50/20 -mx-5 px-5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 rounded-3xl">
          <div className="flex items-end justify-between mb-7">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-orange-500 mb-1">Curated</p>
              <h2 className="text-[22px] font-light text-black tracking-[-0.02em]">Recommended for You</h2>
            </div>
            <Link to="/user/recommended-shops" className="text-black text-[12px] font-medium uppercase tracking-[0.1em] flex items-center gap-1 hover:text-orange-600 transition-colors">
              View All <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </Link>
          </div>

          {loadingShops ? (
            <div className="flex justify-center py-16">
              <div className="text-center">
                <div className="w-8 h-8 border border-neutral-200 border-t-black rounded-full animate-spin mx-auto mb-4" />
                <span className="text-neutral-400 text-[12px] uppercase tracking-[0.1em]">Curating...</span>
              </div>
            </div>
          ) : recommendedShops.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recommendedShops.slice(0, 4).map((shop, index) => (
                <Link key={shop._id || `rec-${index}`} to={`/user/shop/${shop._id}`} className="group">
                  <article className="bg-white rounded-2xl overflow-hidden border border-black/[0.04] group-hover:border-black/[0.08] transition-all duration-300 group-hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.1)]">
                    <div className="aspect-[4/3] bg-neutral-50 relative overflow-hidden">
                      {getShopImage(shop) ? (
                        <img
                          src={getShopImage(shop)}
                          alt={shop.shop?.name || 'Shop'}
                          className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                          onError={(e) => { e.target.style.display = 'none'; if(e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                        />
                      ) : null}
                      <div className={`h-full w-full flex items-center justify-center bg-neutral-50 ${getShopImage(shop) ? 'hidden' : 'flex'}`}>
                        <ShoppingBag className="h-6 w-6 text-neutral-200" strokeWidth={1} />
                      </div>
                      <div className="absolute top-3 left-3">
                        <span className="bg-black/60 backdrop-blur-sm text-white text-[9px] font-medium uppercase tracking-[0.15em] px-2.5 py-1 rounded-lg">
                          Editor's Pick
                        </span>
                      </div>
                    </div>
                    <div className="p-3.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <StarRating rating={shop.averageRating || 4.9} className="text-xs" />
                        {shop.numReviews > 0 ? (
                          <span className="text-[10px] text-neutral-400">({shop.numReviews})</span>
                        ) : (
                          <span className="text-[9px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full font-medium">New</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-[13px] text-black mb-1.5 line-clamp-1 tracking-[-0.01em]">{shop.shop?.name || 'Shop Name'}</h3>
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-orange-600">Rs. {shop.zammerPrice?.toFixed(0) || '299'}</p>
                        {shop.distanceText && (
                          <p className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" strokeWidth={1.5} />
                            {shop.distanceText}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 rounded-2xl border border-dashed border-neutral-200">
              <Star className="h-10 w-10 text-neutral-200 mx-auto mb-3" strokeWidth={1} />
              <p className="text-[15px] font-medium text-black mb-1">No recommendations yet</p>
              <p className="text-neutral-400 text-[13px]">Browse to get personalized picks.</p>
            </div>
          )}
        </section>
      </main>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/[0.06] z-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-around items-center h-14">
            <Link to="/user/dashboard" className="flex flex-col items-center gap-0.5 text-orange-600">
              <Home className="h-[20px] w-[20px]" strokeWidth={1.5} />
              <span className="text-[10px] font-semibold tracking-wide">Home</span>
            </Link>
            <Link to="/user/shop" className="flex flex-col items-center gap-0.5 text-neutral-400 hover:text-black transition-colors">
              <ShoppingBag className="h-[20px] w-[20px]" strokeWidth={1.5} />
              <span className="text-[10px] font-medium tracking-wide">Shop</span>
            </Link>
            <Link to="/user/cart" className="flex flex-col items-center gap-0.5 text-neutral-400 hover:text-black transition-colors">
              <ShoppingCart className="h-[20px] w-[20px]" strokeWidth={1.5} />
              <span className="text-[10px] font-medium tracking-wide">Cart</span>
            </Link>
            <Link to="/user/trending" className="flex flex-col items-center gap-0.5 text-neutral-400 hover:text-black transition-colors">
              <TrendingUp className="h-[20px] w-[20px]" strokeWidth={1.5} />
              <span className="text-[10px] font-medium tracking-wide">Trending</span>
            </Link>
            <Link to="/user/limited-edition" className="flex flex-col items-center gap-0.5 text-neutral-400 hover:text-black transition-colors">
              <Star className="h-[20px] w-[20px]" strokeWidth={1.5} />
              <span className="text-[10px] font-medium tracking-wide">Exclusive</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default HomePage;
