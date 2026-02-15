// frontend/src/pages/user/HierarchicalCategoryPage.js
// Hierarchical Category Browser — Premium Editorial Design with Category Themes

import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import categoryService from '../../services/categoryService';
import { getBanners } from '../../services/bannerService';
import { motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, ArrowRight, Check,
  Home, ShoppingBag, ShoppingCart, User, LayoutGrid,
  Crown, Shirt, Snowflake, Dumbbell, Moon, Heart,
  Baby, GraduationCap, Layers, Sparkles, Gem, Stars,
  Zap, Flame
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   SPORT VECTOR ILLUSTRATIONS — Large decorative SVG silhouettes
   ═══════════════════════════════════════════════════════════════ */

const RunnerVector = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 200 200" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    {/* Athletic sprinter in mid-stride */}
    <circle cx="130" cy="28" r="14" />
    <path d="M120 45 c-3 0-6 2-7 5 l-18 42 c-1 3 0 7 3 9 l0 0 c3 2 7 0 8-3 l12-28 l15 20 c2 3 2 6 0 9 l-22 35 c-2 3-1 7 2 9 l0 0 c3 2 7 0 9-3 l24-38 c3-5 3-11 0-16 l-12-17 l8-12 l20 15 c3 2 7 1 9-2 l0 0 c2-3 1-7-2-9 l-26-19 c-3-2-6-2-9 0 l-8 10 l-3-4 c-2-3-6-4-9-4 z" />
    <path d="M95 100 l-30 55 c-2 3-1 7 2 9 l0 0 c3 2 7 0 9-3 l28-50 z" />
    <path d="M68 152 l-25 12 c-3 1-5 5-3 8 l0 0 c1 3 5 5 8 3 l30-14 c3-1 4-4 3-7 l-5-10 z" />
    <path d="M128 140 l10 30 c1 3 5 5 8 3 l0 0 c3-1 5-5 3-8 l-12-32 z" />
    <path d="M136 170 l20 8 c3 1 7 0 8-3 l0 0 c1-3 0-7-3-8 l-22-9 z" />
  </svg>
);

const FootballVector = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
    {/* Football/soccer ball with pentagon pattern */}
    <circle cx="100" cy="100" r="80" strokeWidth="3" />
    <polygon points="100,40 120,58 112,82 88,82 80,58" strokeWidth="2.5" fill="currentColor" fillOpacity="0.15" />
    <polygon points="140,95 132,118 108,118 100,95 120,78" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
    <polygon points="60,95 68,78 88,78 100,95 92,118" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
    <polygon points="78,140 88,118 112,118 122,140 100,158" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
    <line x1="100" y1="40" x2="100" y2="20" strokeWidth="2" />
    <line x1="80" y1="58" x2="58" y2="40" strokeWidth="2" />
    <line x1="120" y1="58" x2="142" y2="40" strokeWidth="2" />
    <line x1="140" y1="95" x2="165" y2="88" strokeWidth="2" />
    <line x1="60" y1="95" x2="35" y2="88" strokeWidth="2" />
    <line x1="132" y1="118" x2="155" y2="135" strokeWidth="2" />
    <line x1="68" y1="118" x2="45" y2="135" strokeWidth="2" />
    <line x1="122" y1="140" x2="138" y2="165" strokeWidth="2" />
    <line x1="78" y1="140" x2="62" y2="165" strokeWidth="2" />
    <line x1="100" y1="158" x2="100" y2="180" strokeWidth="2" />
  </svg>
);

const BasketballVector = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
    {/* Basketball with seam curves */}
    <circle cx="100" cy="100" r="80" strokeWidth="3" />
    {/* Vertical seam */}
    <path d="M100 20 Q85 60 85 100 Q85 140 100 180" strokeWidth="2.5" />
    <path d="M100 20 Q115 60 115 100 Q115 140 100 180" strokeWidth="2.5" />
    {/* Horizontal seam */}
    <path d="M20 100 Q60 85 100 85 Q140 85 180 100" strokeWidth="2.5" />
    <path d="M20 100 Q60 115 100 115 Q140 115 180 100" strokeWidth="2.5" />
    {/* Diagonal curves */}
    <path d="M35 50 Q70 70 100 100 Q130 130 165 150" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.5" />
    <path d="M165 50 Q130 70 100 100 Q70 130 35 150" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.5" />
  </svg>
);

const SneakerVector = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 240 120" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    {/* Running shoe side profile */}
    <path d="M30 85 C30 65 45 45 70 40 L90 38 C95 38 98 35 100 30 L105 20 C107 15 112 12 118 14 L135 20 C140 22 143 28 142 33 L140 45 L170 42 C185 41 200 48 210 60 L225 78 C228 82 226 88 222 90 L30 90 C28 90 28 87 30 85 Z" opacity="0.9" />
    {/* Sole */}
    <path d="M18 90 L225 90 C230 90 232 95 230 98 L228 102 C226 106 222 108 218 108 L25 108 C20 108 16 104 16 99 L16 95 C16 92 17 90 18 90 Z" opacity="0.7" />
    {/* Sole treads */}
    <rect x="30" y="98" width="8" height="10" rx="1" opacity="0.4" />
    <rect x="45" y="98" width="8" height="10" rx="1" opacity="0.4" />
    <rect x="60" y="98" width="8" height="10" rx="1" opacity="0.4" />
    <rect x="75" y="98" width="8" height="10" rx="1" opacity="0.4" />
    <rect x="90" y="98" width="8" height="10" rx="1" opacity="0.4" />
    <rect x="105" y="98" width="8" height="10" rx="1" opacity="0.4" />
    <rect x="120" y="98" width="8" height="10" rx="1" opacity="0.4" />
    <rect x="135" y="98" width="8" height="10" rx="1" opacity="0.4" />
    <rect x="150" y="98" width="8" height="10" rx="1" opacity="0.4" />
    <rect x="165" y="98" width="8" height="10" rx="1" opacity="0.4" />
    <rect x="180" y="98" width="8" height="10" rx="1" opacity="0.4" />
    <rect x="195" y="98" width="8" height="10" rx="1" opacity="0.4" />
    {/* Shoe laces */}
    <line x1="88" y1="38" x2="105" y2="45" stroke="currentColor" strokeWidth="2" opacity="0.3" />
    <line x1="95" y1="35" x2="112" y2="42" stroke="currentColor" strokeWidth="2" opacity="0.3" />
    <line x1="102" y1="30" x2="118" y2="38" stroke="currentColor" strokeWidth="2" opacity="0.3" />
    {/* Nike-style swoosh accent */}
    <path d="M60 72 Q100 55 155 50 Q130 65 75 78 Z" opacity="0.2" />
  </svg>
);

const DumbbellVector = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 200 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    {/* Barbell/dumbbell */}
    {/* Left weight plates */}
    <rect x="15" y="10" width="12" height="80" rx="4" opacity="0.8" />
    <rect x="30" y="18" width="10" height="64" rx="3" opacity="0.6" />
    <rect x="43" y="25" width="8" height="50" rx="3" opacity="0.5" />
    {/* Bar */}
    <rect x="51" y="44" width="98" height="12" rx="6" opacity="0.4" />
    {/* Right weight plates */}
    <rect x="149" y="25" width="8" height="50" rx="3" opacity="0.5" />
    <rect x="160" y="18" width="10" height="64" rx="3" opacity="0.6" />
    <rect x="173" y="10" width="12" height="80" rx="4" opacity="0.8" />
    {/* Grip texture */}
    <line x1="85" y1="44" x2="85" y2="56" stroke="white" strokeWidth="1" opacity="0.2" />
    <line x1="90" y1="44" x2="90" y2="56" stroke="white" strokeWidth="1" opacity="0.2" />
    <line x1="95" y1="44" x2="95" y2="56" stroke="white" strokeWidth="1" opacity="0.2" />
    <line x1="100" y1="44" x2="100" y2="56" stroke="white" strokeWidth="1" opacity="0.2" />
    <line x1="105" y1="44" x2="105" y2="56" stroke="white" strokeWidth="1" opacity="0.2" />
    <line x1="110" y1="44" x2="110" y2="56" stroke="white" strokeWidth="1" opacity="0.2" />
    <line x1="115" y1="44" x2="115" y2="56" stroke="white" strokeWidth="1" opacity="0.2" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════ */

const SPORT_QUOTES = [
  'TRAIN HARDER. LOOK BETTER.',
  'NO LIMITS. NO EXCUSES.',
  'PUSH YOUR LIMITS.',
  'GAME ON. GEAR UP.',
];

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

  // Sport theme detection
  const isSportswear = decodedLevel2 === 'Sportswear';
  const [sportQuote] = useState(() => SPORT_QUOTES[Math.floor(Math.random() * SPORT_QUOTES.length)]);

  // Sport vector configs for card decorations — each card gets a different vector
  const sportCardVectors = [RunnerVector, FootballVector, BasketballVector, SneakerVector, DumbbellVector];

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
    <div className={`min-h-screen pb-20 ${isSportswear ? 'bg-gray-50' : 'bg-white'}`}>

      {/* ═══ SPORT THEME ANIMATIONS ═══ */}
      {isSportswear && (
        <style>{`
          @keyframes sportFloat {
            0%, 100% { transform: translateY(0px) rotate(var(--sport-rotate, 0deg)); }
            50% { transform: translateY(-14px) rotate(calc(var(--sport-rotate, 0deg) + 5deg)); }
          }
          @keyframes sportPulse {
            0%, 100% { opacity: 0.04; }
            50% { opacity: 0.09; }
          }
          @keyframes diagonalMove {
            0% { background-position: 0 0; }
            100% { background-position: 56px 56px; }
          }
          @keyframes sportGlow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            50% { box-shadow: 0 0 24px 4px rgba(16, 185, 129, 0.12); }
          }
          @keyframes lineGrow {
            0% { width: 0; }
            100% { width: 60%; }
          }
          @keyframes energyPulse {
            0%, 100% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.15); opacity: 1; }
          }
          .sport-float {
            animation: sportFloat 5s ease-in-out infinite;
          }
          .sport-pulse {
            animation: sportPulse 4s ease-in-out infinite;
          }
          .sport-stripes {
            background-image: repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 14px,
              rgba(16, 185, 129, 0.04) 14px,
              rgba(16, 185, 129, 0.04) 28px
            );
            animation: diagonalMove 4s linear infinite;
          }
          .sport-card-hover:hover {
            animation: sportGlow 2s ease-in-out infinite;
          }
          .sport-energy {
            animation: energyPulse 2s ease-in-out infinite;
          }
        `}</style>
      )}

      {/* ═══ HEADER ═══ */}
      <header className={`${isSportswear ? 'bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900' : 'bg-black'} text-white relative overflow-hidden`}>

        {/* Sport decorative vectors in header background */}
        {isSportswear && (
          <>
            <div className="absolute inset-0 sport-stripes pointer-events-none" />
            <motion.div
              className="absolute -right-6 top-2 text-emerald-400/[0.06] sport-float pointer-events-none"
              style={{ '--sport-rotate': '-10deg' }}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <RunnerVector className="w-36 h-36 sm:w-44 sm:h-44" />
            </motion.div>
            <motion.div
              className="absolute -left-4 bottom-1 text-emerald-400/[0.05] sport-float pointer-events-none"
              style={{ '--sport-rotate': '15deg', animationDelay: '1.5s' }}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <BasketballVector className="w-28 h-28 sm:w-32 sm:h-32" />
            </motion.div>
            <motion.div
              className="absolute right-1/3 -top-3 text-emerald-300/[0.04] pointer-events-none sport-pulse"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <DumbbellVector className="w-24 h-12" />
            </motion.div>
          </>
        )}

        <div className="max-w-7xl mx-auto px-5 py-5 relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate(-1)}
              className={`p-2 rounded-full transition-colors ${isSportswear ? 'bg-emerald-500/[0.12] hover:bg-emerald-500/[0.2]' : 'bg-white/[0.06] hover:bg-white/[0.12]'}`}
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-light tracking-[-0.02em]">{pageTitle}</h1>
                {isSportswear && (
                  <motion.span
                    className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-[9px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border border-emerald-500/20"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
                  >
                    <Zap className="w-2.5 h-2.5 sport-energy" strokeWidth={2.5} />
                    Sport
                  </motion.span>
                )}
              </div>
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
                        ? `${isSportswear ? 'text-emerald-400' : 'text-orange-400'} font-medium`
                        : 'text-white/40 hover:text-white transition-colors'
                    }`}
                  >
                    {crumb.name}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Level progress */}
          <div className="flex items-center gap-0 mt-4">
            {[1, 2, 3, 4].map((level) => (
              <React.Fragment key={level}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${
                  level < getCurrentLevel()
                    ? `${isSportswear ? 'bg-emerald-500' : 'bg-orange-500'} text-white`
                    : level === getCurrentLevel()
                      ? `${isSportswear ? 'bg-emerald-400 text-gray-900' : 'bg-white text-black'}`
                      : 'bg-white/[0.08] text-white/30'
                }`}>
                  {level < getCurrentLevel() ? <Check className="w-3 h-3" strokeWidth={2} /> : level}
                </div>
                {level < 4 && (
                  <div className={`flex-1 h-px mx-1 ${level < getCurrentLevel() ? (isSportswear ? 'bg-emerald-500' : 'bg-orange-500') : 'bg-white/[0.08]'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </header>

      {/* ═══ SPORT MOTIVATIONAL BANNER ═══ */}
      {isSportswear && (
        <motion.div
          className="max-w-7xl mx-auto px-5 pt-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-900 via-teal-800 to-emerald-900 py-4 px-6">
            <div className="absolute inset-0 sport-stripes opacity-60 pointer-events-none" />
            {/* Sneaker vector floating at left */}
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-emerald-300/[0.08] pointer-events-none">
              <SneakerVector className="w-28 h-14" />
            </div>
            {/* Football vector floating at right */}
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 text-emerald-300/[0.06] pointer-events-none">
              <FootballVector className="w-16 h-16" />
            </div>
            <div className="relative flex items-center justify-center gap-3">
              <Zap className="w-4 h-4 text-emerald-300 flex-shrink-0 sport-energy" strokeWidth={2} />
              <p className="text-center text-[11px] sm:text-[13px] font-bold uppercase tracking-[0.25em] text-white">
                {sportQuote}
              </p>
              <Flame className="w-4 h-4 text-emerald-300 flex-shrink-0 sport-energy" strokeWidth={2} />
            </div>
            <motion.div
              className="mx-auto mt-2.5 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: '60%' }}
              transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
              style={{ maxWidth: '220px' }}
            />
          </div>
        </motion.div>
      )}

      {/* View All Products */}
      {decodedLevel1 && (
        <div className="max-w-7xl mx-auto px-5 pt-5">
          <Link
            to={getViewAllLink()}
            className={`flex items-center justify-center gap-2 w-full text-[13px] font-medium uppercase tracking-[0.1em] py-3.5 rounded-xl transition-colors ${
              isSportswear
                ? 'bg-gradient-to-r from-emerald-700 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-500'
                : 'bg-black text-white hover:bg-neutral-900'
            }`}
          >
            View all in {decodedLevel3 || decodedLevel2 || decodedLevel1}
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </div>
      )}

      {/* ═══ CATEGORIES ═══ */}
      <div className="max-w-7xl mx-auto px-5 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-center">
              <div className={`w-8 h-8 border border-t-2 rounded-full animate-spin mx-auto mb-4 ${isSportswear ? 'border-emerald-200 border-t-emerald-600' : 'border-neutral-200 border-t-black'}`} />
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

            {/* LEVEL 3: Horizontal poster cards — SPORT THEMED when Sportswear */}
            {getCurrentLevel() === 3 && (
              <div className={`relative ${isSportswear ? 'sport-stripes rounded-2xl p-3 -mx-1' : ''}`}>

                {/* Floating sport vector decorations around the card area */}
                {isSportswear && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                    <motion.div
                      className="absolute -right-6 top-4 text-emerald-500/[0.05] sport-float"
                      style={{ '--sport-rotate': '-12deg' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6, duration: 0.8 }}
                    >
                      <FootballVector className="w-32 h-32" />
                    </motion.div>
                    <motion.div
                      className="absolute -left-8 bottom-8 text-emerald-500/[0.04] sport-float"
                      style={{ '--sport-rotate': '10deg', animationDelay: '2s' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.0, duration: 0.8 }}
                    >
                      <SneakerVector className="w-36 h-18" />
                    </motion.div>
                    <motion.div
                      className="absolute right-10 bottom-2 text-emerald-500/[0.03] sport-pulse"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.2 }}
                    >
                      <DumbbellVector className="w-28 h-14" />
                    </motion.div>
                  </div>
                )}

                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="space-y-3 relative z-[1]"
                >
                  {categories.map((category, index) => {
                    const banner = getBannerForCategory(category.name || category.id);
                    const CardVector = sportCardVectors[index % sportCardVectors.length];

                    return (
                      <motion.div key={category.id || index} variants={staggerItem}>
                        <Link to={getCategoryLink(category)} className={`block group ${isSportswear ? 'sport-card-hover rounded-2xl' : ''}`}>
                          <div className={`relative rounded-2xl overflow-hidden h-44 sm:h-48 ${isSportswear ? 'ring-1 ring-emerald-500/[0.08]' : ''} bg-neutral-100`}>
                            {banner?.imageUrl ? (
                              <img src={banner.imageUrl} alt={category.name || category.id} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                            ) : (
                              <div className={`w-full h-full flex items-center px-8 ${
                                isSportswear
                                  ? 'bg-gradient-to-r from-gray-900 via-emerald-950 to-gray-800'
                                  : 'bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-700'
                              }`}>
                                <div className="flex items-center gap-4">
                                  <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
                                    isSportswear ? 'bg-emerald-500/[0.15] text-emerald-400' : 'bg-white/[0.08] text-white/60'
                                  }`}>
                                    {getCategoryIcon(category.name || category.id)}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Gradient overlay */}
                            <div className={`absolute inset-0 ${
                              isSportswear
                                ? 'bg-gradient-to-r from-emerald-900/70 via-gray-900/40 to-transparent'
                                : 'bg-gradient-to-r from-black/60 via-black/30 to-transparent'
                            }`} />

                            {/* Sport vector watermark in card — large, faded */}
                            {isSportswear && (
                              <motion.div
                                className="absolute -right-4 -top-4 text-emerald-300/[0.08] pointer-events-none"
                                initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                transition={{ delay: 0.4 + index * 0.15, duration: 0.6, type: 'spring' }}
                              >
                                <CardVector className="w-28 h-28 sm:w-32 sm:h-32" />
                              </motion.div>
                            )}

                            {/* Sport badge */}
                            {isSportswear && (
                              <motion.div
                                className="absolute top-3 right-3 flex items-center gap-1.5 bg-emerald-500/20 backdrop-blur-sm text-emerald-300 text-[9px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full border border-emerald-400/20"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.5 + index * 0.1, type: 'spring', stiffness: 250 }}
                              >
                                <Dumbbell className="w-3 h-3" strokeWidth={2} />
                                Sport
                              </motion.div>
                            )}

                            {/* Card content */}
                            <div className="absolute inset-0 flex items-end p-5">
                              <div>
                                <h3 className={`font-semibold text-[17px] tracking-[-0.01em] ${isSportswear ? 'text-white drop-shadow-sm' : 'text-white'}`}>
                                  {category.name || category.id}
                                </h3>
                                <span className={`text-[12px] flex items-center gap-1.5 mt-1 transition-all duration-500 ${
                                  isSportswear
                                    ? 'text-emerald-300/70 group-hover:text-emerald-200 group-hover:gap-2.5'
                                    : 'text-white/50 group-hover:text-white/70 group-hover:gap-2.5'
                                }`}>
                                  Explore collection <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                                </span>
                              </div>
                            </div>

                            {/* Bottom emerald accent bar */}
                            {isSportswear && (
                              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
                            )}
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            )}

            {/* LEVEL 4: Cards with banner images — Emerald tint when Sportswear */}
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
                        <div className={`bg-white rounded-xl border overflow-hidden transition-all duration-200 ${
                          isSportswear
                            ? 'border-emerald-100 hover:border-emerald-400 group-hover:shadow-[0_4px_20px_-6px_rgba(16,185,129,0.15)]'
                            : 'border-black/[0.04] hover:border-orange-300 group-hover:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.1)]'
                        }`}>
                          {banner?.imageUrl ? (
                            <div className="aspect-square overflow-hidden">
                              <img
                                src={banner.imageUrl}
                                alt={category.name || category.id}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                              />
                              <div className={`w-full h-full items-center justify-center hidden ${isSportswear ? 'bg-emerald-50 text-emerald-500' : 'bg-neutral-50 text-neutral-400 group-hover:text-orange-500'}`}>
                                {getCategoryIcon(category.name || category.id)}
                              </div>
                            </div>
                          ) : (
                            <div className={`aspect-square flex items-center justify-center transition-colors ${
                              isSportswear
                                ? 'bg-emerald-50/50 group-hover:bg-emerald-50 text-emerald-400 group-hover:text-emerald-600'
                                : 'bg-neutral-50 group-hover:bg-orange-50 text-neutral-400 group-hover:text-orange-500'
                            }`}>
                              {getCategoryIcon(category.name || category.id)}
                            </div>
                          )}
                          <div className="p-3 text-center">
                            <h3 className={`font-medium text-[13px] tracking-[-0.01em] transition-colors ${
                              isSportswear ? 'text-black group-hover:text-emerald-600' : 'text-black group-hover:text-orange-600'
                            }`}>
                              {category.name || category.id}
                            </h3>
                            <p className={`text-[10px] mt-0.5 uppercase tracking-[0.05em] ${isSportswear ? 'text-emerald-400' : 'text-neutral-400'}`}>View products</p>
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
                    ? (isSportswear ? 'bg-emerald-600 text-white' : 'bg-black text-white')
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
            <Link to="/user/browse" className={`flex flex-col items-center gap-0.5 ${isSportswear ? 'text-emerald-600' : 'text-orange-600'}`}>
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
