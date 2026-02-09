import { useState, useEffect, useCallback } from 'react';

const MAX_ITEMS = 12;
const STORAGE_KEY = 'zammer_recently_viewed';
const EXPIRY_DAYS = 30;

export const useRecentlyViewed = () => {
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validItems = parsed.filter(item => {
          const daysSince = (Date.now() - item.viewedAt) / (1000 * 60 * 60 * 24);
          return daysSince <= EXPIRY_DAYS;
        });
        setRecentlyViewed(validItems);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const addProduct = useCallback((product) => {
    if (!product?._id) return;

    const item = {
      _id: product._id,
      name: product.name,
      images: product.images?.slice(0, 2) || [],
      zammerPrice: product.zammerPrice,
      mrp: product.mrp,
      brand: product.brand,
      averageRating: product.averageRating,
      numReviews: product.numReviews,
      isTrending: product.isTrending,
      isLimitedEdition: product.isLimitedEdition,
      viewedAt: Date.now(),
    };

    setRecentlyViewed(prev => {
      const filtered = prev.filter(p => p._id !== item._id);
      const updated = [item, ...filtered].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRecentlyViewed([]);
  }, []);

  return { recentlyViewed, addProduct, clearAll };
};
