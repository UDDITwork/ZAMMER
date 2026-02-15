import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import SwipeableCardStack from './SwipeableCardStack';
import VirtualTryOnModal from '../common/VirtualTryOnModal';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// All brands with Cloudinary URLs
const ALL_BRANDS = [
  { id: 'gucci', name: 'GUCCI', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127953/zammer_banners/brand_logos/gucci.png', tag: 'LUXURY' },
  { id: 'louis_vuitton', name: 'Louis Vuitton', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127960/zammer_banners/brand_logos/louis_vuitton.svg', tag: 'LUXURY' },
  { id: 'nike', name: 'NIKE', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657448/zammer_banners/brand_logos/nike.jpg' },
  { id: 'adidas', name: 'adidas', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657449/zammer_banners/brand_logos/adidas.jpg' },
  { id: 'zara', name: 'ZARA', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657447/zammer_banners/brand_logos/zara.jpg' },
  { id: 'hm', name: 'H&M', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657447/zammer_banners/brand_logos/hm.jpg' },
  { id: 'supreme', name: 'SUPREME', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127954/zammer_banners/brand_logos/supreme.svg', tag: 'NEW' },
  { id: 'offwhite', name: 'OFF-WHITE', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127956/zammer_banners/brand_logos/offwhite.png', tag: 'NEW' },
  { id: 'tommy', name: 'Tommy Hilfiger', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127957/zammer_banners/brand_logos/tommy_hilfiger.png' },
  { id: 'puma', name: 'PUMA', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657448/zammer_banners/brand_logos/puma.jpg' },
  { id: 'calvinklein', name: 'Calvin Klein', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657449/zammer_banners/brand_logos/calvinklein.jpg' },
  { id: 'uniqlo', name: 'UNIQLO', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127962/zammer_banners/brand_logos/uniqlo_new.png' },
  { id: 'levis', name: "Levi's", logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657447/zammer_banners/brand_logos/levis.jpg' },
  { id: 'mango', name: 'MANGO', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657452/zammer_banners/brand_logos/mango.jpg' },
  { id: 'vanheusen', name: 'Van Heusen', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1771127959/zammer_banners/brand_logos/vanheusen_new.jpg' },
  { id: 'allensolly', name: 'Allen Solly', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657451/zammer_banners/brand_logos/allensolly.jpg' },
  { id: 'jackjones', name: 'Jack & Jones', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657450/zammer_banners/brand_logos/jackjones.jpg' },
  { id: 'forever21', name: 'Forever 21', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657452/zammer_banners/brand_logos/forever21.jpg' },
  { id: 'superdry', name: 'Superdry', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657454/zammer_banners/brand_logos/superdry.jpg', tag: 'NEW' },
  { id: 'uspolo', name: 'U.S. Polo', logo: 'https://res.cloudinary.com/dr17ap4sb/image/upload/f_auto,q_auto/v1770657450/zammer_banners/brand_logos/uspolo.jpg' },
];

const ITEMS_PER_PAGE = 12; // 4 cols x 3 rows
const totalPages = Math.ceil(ALL_BRANDS.length / ITEMS_PER_PAGE);

const BrandDiscoverGrid = () => {
  const [page, setPage] = useState(0);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [brandProducts, setBrandProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [tryOnProduct, setTryOnProduct] = useState(null);

  const pageStart = page * ITEMS_PER_PAGE;
  const currentBrands = ALL_BRANDS.slice(pageStart, pageStart + ITEMS_PER_PAGE);

  const nextPage = useCallback(() => setPage(p => Math.min(p + 1, totalPages - 1)), []);
  const prevPage = useCallback(() => setPage(p => Math.max(p - 1, 0)), []);

  // Fetch products for selected brand from API
  useEffect(() => {
    if (!selectedBrand) {
      setBrandProducts([]);
      return;
    }

    const fetchBrandProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/products/marketplace?brand=${encodeURIComponent(selectedBrand.name)}&limit=20`
        );
        const data = await res.json();
        if (data.success && data.data) {
          setBrandProducts(data.data);
        } else {
          setBrandProducts([]);
        }
      } catch (err) {
        console.error('Failed to fetch brand products:', err);
        setBrandProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchBrandProducts();
  }, [selectedBrand]);

  const handleTryOn = useCallback((product) => {
    setTryOnProduct(product);
  }, []);

  const handleCloseTryOn = useCallback(() => {
    setTryOnProduct(null);
  }, []);

  const handleCloseCardStack = useCallback(() => {
    setSelectedBrand(null);
    setBrandProducts([]);
  }, []);

  return (
    <>
      <div className="w-full">
        {/* Header */}
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Discover Brands</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Shop from your favourite labels</p>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={prevPage} disabled={page === 0}
                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-black hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
              <button onClick={nextPage} disabled={page === totalPages - 1}
                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-black hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>

        {/* Brand Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          <AnimatePresence mode="wait">
            {currentBrands.map((brand, i) => (
              <motion.button
                key={brand.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                onClick={() => setSelectedBrand(brand)}
                className="group relative flex flex-col items-center"
                style={{ perspective: '600px' }}
              >
                {/* Tag badge */}
                {brand.tag && (
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10">
                    <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white shadow-sm ${
                      brand.tag === 'LUXURY' ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                      brand.tag === 'NEW' ? 'bg-gradient-to-r from-violet-500 to-purple-500' :
                      'bg-gradient-to-r from-rose-500 to-pink-500'
                    }`}>
                      {brand.tag}
                    </span>
                  </div>
                )}

                {/* Card */}
                <div className="w-full aspect-square rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center p-3 sm:p-4 overflow-hidden transition-all duration-300 group-hover:border-gray-300 group-hover:shadow-lg group-hover:shadow-black/[0.06]"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    draggable="false"
                  />
                </div>

                {/* Brand name */}
                <p className="mt-1.5 text-[10px] sm:text-xs font-medium text-gray-700 text-center leading-tight line-clamp-2 group-hover:text-black transition-colors">
                  {brand.name}
                </p>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Pagination dots + See All */}
        <div className="flex items-center justify-center mt-5 gap-4">
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`rounded-full transition-all duration-400 ${
                    i === page ? 'w-5 h-2 bg-black' : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          )}
          <Link
            to="/user/products"
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-black transition-colors"
          >
            See all Brands <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
          </Link>
        </div>
      </div>

      {/* Tinder-style Swipeable Card Stack */}
      {selectedBrand && (
        <SwipeableCardStack
          products={brandProducts}
          brand={selectedBrand.name}
          onClose={handleCloseCardStack}
          onTryOn={handleTryOn}
          isLoading={isLoadingProducts}
        />
      )}

      {/* Virtual Try-On Modal */}
      {tryOnProduct && (
        <VirtualTryOnModal
          isOpen={!!tryOnProduct}
          onClose={handleCloseTryOn}
          product={tryOnProduct}
          onTryOnComplete={() => setTryOnProduct(null)}
        />
      )}
    </>
  );
};

export default BrandDiscoverGrid;
