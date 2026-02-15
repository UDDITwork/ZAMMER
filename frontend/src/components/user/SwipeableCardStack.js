import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, Heart, ShoppingBag, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import { addToWishlist } from '../../services/wishlistService';
import cartService from '../../services/cartService';

// ---------------------------------------------------------------------------
// SwipeableCard -- the top (draggable) card
// ---------------------------------------------------------------------------
const SwipeableCard = ({ product, brand, onSwipe, onTryOn, active }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const likeOpacity = useTransform(x, [-200, 0, 200], [0, 0, 1]);
  const nopeOpacity = useTransform(x, [-200, 0, 200], [1, 0, 0]);

  const handleDragEnd = useCallback(
    (_, info) => {
      if (Math.abs(info.offset.x) > 120) {
        onSwipe(info.offset.x > 0 ? 'right' : 'left');
      }
    },
    [onSwipe]
  );

  const imageUrl =
    product?.images?.[0]?.url ||
    product?.images?.[0] ||
    product?.image ||
    'https://via.placeholder.com/380x500?text=No+Image';

  const zammerPrice = product?.zammerPrice ?? product?.sellingPrice ?? product?.price ?? 0;
  const mrp = product?.mrp ?? product?.originalPrice ?? product?.price ?? 0;
  const discount = mrp > zammerPrice ? Math.round(((mrp - zammerPrice) / mrp) * 100) : 0;

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, rotate, zIndex: 10 }}
      drag={active ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      exit={{
        x: x.get() > 0 ? 600 : -600,
        rotate: x.get() > 0 ? 30 : -30,
        opacity: 0,
        transition: { duration: 0.35, ease: 'easeIn' },
      }}
    >
      <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl">
        <img
          src={imageUrl}
          alt={product?.name || 'Product'}
          className="w-full h-full object-cover"
          draggable={false}
        />

        {/* LIKE stamp */}
        <motion.div
          className="absolute top-6 left-5 px-3 py-1.5 border-4 border-emerald-400 rounded-lg -rotate-12 pointer-events-none"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-emerald-400 font-extrabold text-2xl tracking-wider drop-shadow-lg">LIKE</span>
        </motion.div>

        {/* NOPE stamp */}
        <motion.div
          className="absolute top-6 right-5 px-3 py-1.5 border-4 border-red-500 rounded-lg rotate-12 pointer-events-none"
          style={{ opacity: nopeOpacity }}
        >
          <span className="text-red-500 font-extrabold text-2xl tracking-wider drop-shadow-lg">NOPE</span>
        </motion.div>

        {/* TRY ON */}
        {onTryOn && (
          <button
            onClick={(e) => { e.stopPropagation(); onTryOn(product); }}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-md active:scale-95 transition-transform"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-[10px] font-bold text-zinc-800 uppercase tracking-wide">Try On</span>
          </button>
        )}

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 inset-x-0 px-4 py-3 bg-gradient-to-t from-black/70 via-black/40 to-transparent">
          <p className="uppercase text-[9px] font-semibold tracking-widest text-white/60 mb-0.5">
            {brand || product?.brand || 'Brand'}
          </p>
          <h3 className="text-sm font-bold text-white leading-tight line-clamp-1">
            {product?.name || 'Product Name'}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-bold text-white">
              Rs. {zammerPrice.toLocaleString('en-IN')}
            </span>
            {discount > 0 && (
              <>
                <span className="text-[11px] text-white/50 line-through">Rs. {mrp.toLocaleString('en-IN')}</span>
                <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                  {discount}% OFF
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// StackCard -- background cards (not draggable)
// ---------------------------------------------------------------------------
const StackCard = ({ product, depth }) => {
  const imageUrl =
    product?.images?.[0]?.url ||
    product?.images?.[0] ||
    product?.image ||
    'https://via.placeholder.com/380x500?text=No+Image';

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={false}
      animate={{ scale: 1 - depth * 0.05, y: depth * 8, opacity: 1 - depth * 0.2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{ zIndex: 5 - depth }}
    >
      <div className="w-full h-full rounded-2xl overflow-hidden shadow-lg">
        <img src={imageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
      </div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
const SkeletonCard = ({ depth }) => (
  <div
    className="absolute inset-0"
    style={{
      transform: `scale(${1 - depth * 0.05}) translateY(${depth * 8}px)`,
      zIndex: 5 - depth,
      opacity: 1 - depth * 0.2,
    }}
  >
    <div className="w-full h-full rounded-2xl bg-zinc-200 animate-pulse" />
  </div>
);

// ---------------------------------------------------------------------------
// Action button
// ---------------------------------------------------------------------------
const ActionButton = ({ icon: Icon, iconColor, size = 'md', onClick, label }) => {
  const sz = size === 'sm' ? 'w-11 h-11' : 'w-13 h-13';
  const ic = size === 'sm' ? 'w-4.5 h-4.5' : 'w-5 h-5';

  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`${sz} rounded-full flex items-center justify-center
        bg-white shadow-md ring-1 ring-black/5
        active:scale-90 transition-all duration-150 hover:shadow-lg`}
    >
      <Icon className={`${ic} ${iconColor}`} />
    </button>
  );
};

// ---------------------------------------------------------------------------
// SwipeableCardStack -- main
// ---------------------------------------------------------------------------
const SwipeableCardStack = ({ products = [], brand, onClose, onTryOn, isLoading }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedCards, setSwipedCards] = useState([]);
  const [swipeDirection, setSwipeDirection] = useState(null);

  const currentProduct = products[currentIndex] || null;
  const totalCards = products.length;
  const allSwiped = !isLoading && totalCards > 0 && currentIndex >= totalCards;
  const visibleProducts = products.slice(currentIndex, currentIndex + 3);

  const handleSwipe = useCallback(
    async (direction) => {
      if (currentIndex >= totalCards) return;
      const swiped = products[currentIndex];
      setSwipeDirection(direction);
      setSwipedCards((prev) => [...prev, currentIndex]);

      if (direction === 'right' && swiped?._id) {
        try {
          const res = await addToWishlist(swiped._id);
          if (res.success) toast.success('Added to wishlist', { autoClose: 1500, hideProgressBar: true });
          else if (res.requiresAuth) toast.info('Login to save to wishlist', { autoClose: 2000 });
        } catch { toast.error('Could not add to wishlist'); }
      }

      setTimeout(() => { setCurrentIndex((p) => p + 1); setSwipeDirection(null); }, 350);
    },
    [currentIndex, totalCards, products]
  );

  const handleUndo = useCallback(() => {
    if (swipedCards.length === 0) return;
    setSwipedCards((prev) => prev.slice(0, -1));
    setCurrentIndex(swipedCards[swipedCards.length - 1]);
    setSwipeDirection(null);
  }, [swipedCards]);

  const handleDismiss = useCallback(() => handleSwipe('left'), [handleSwipe]);
  const handleLike = useCallback(() => handleSwipe('right'), [handleSwipe]);

  const handleAddToCart = useCallback(async () => {
    if (!currentProduct?._id) return;
    try {
      const res = await cartService.addToCart(currentProduct._id, 1, {
        size: currentProduct.variants?.[0]?.size || 'M',
        color: currentProduct.variants?.[0]?.color || 'Black',
      });
      if (res.success) toast.success('Added to cart', { autoClose: 1500, hideProgressBar: true });
      else if (res.requiresAuth) toast.info('Login to add to cart', { autoClose: 2000 });
      else toast.error(res.message || 'Could not add to cart');
    } catch { toast.error('Could not add to cart'); }
  }, [currentProduct]);

  const handleStartOver = useCallback(() => {
    setCurrentIndex(0);
    setSwipedCards([]);
    setSwipeDirection(null);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      {/* Compact card container — no background overlay */}
      <div
        className="relative flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="w-[280px] sm:w-[300px] flex items-center justify-between px-1 mb-2">
          <span className="text-zinc-600 text-xs font-medium tabular-nums bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm">
            {isLoading ? '--/--' : totalCards > 0 ? `${Math.min(currentIndex + 1, totalCards)}/${totalCards}` : ''}
          </span>
          <h2 className="text-zinc-800 font-bold text-sm truncate max-w-[120px] text-center bg-white/80 backdrop-blur-sm px-3 py-0.5 rounded-full shadow-sm">
            {brand || 'Discover'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-zinc-600" />
          </button>
        </div>

        {/* Card stack — tight to poster size */}
        <div className="relative w-[280px] h-[373px] sm:w-[300px] sm:h-[400px]">
          {isLoading && (
            <>
              <SkeletonCard depth={2} />
              <SkeletonCard depth={1} />
              <SkeletonCard depth={0} />
            </>
          )}

          {!isLoading && totalCards === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
              <ShoppingBag className="w-10 h-10 text-zinc-300 mb-3" />
              <p className="text-zinc-700 text-base font-semibold mb-1">Products coming soon</p>
              <p className="text-zinc-400 text-xs">{brand || 'This brand'} is preparing new arrivals.</p>
            </div>
          )}

          {allSwiped && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
              <Heart className="w-10 h-10 text-emerald-400 mb-3" />
              <p className="text-zinc-800 text-lg font-bold mb-1">All caught up!</p>
              <p className="text-zinc-400 text-xs mb-4">You've seen all {totalCards} products.</p>
              <button
                onClick={handleStartOver}
                className="px-5 py-2 rounded-full bg-zinc-900 text-white text-xs font-bold active:scale-95 transition-transform"
              >
                Start Over
              </button>
            </div>
          )}

          {!isLoading && totalCards > 0 && !allSwiped && (
            <>
              {visibleProducts.slice(1, 3).reverse().map((prod, revIdx) => {
                const depth = visibleProducts.length - 1 - revIdx;
                return (
                  <StackCard
                    key={prod._id || `stack-${currentIndex + depth}`}
                    product={prod}
                    depth={depth > 2 ? 2 : depth}
                  />
                );
              })}
              <AnimatePresence mode="wait">
                {visibleProducts[0] && (
                  <SwipeableCard
                    key={visibleProducts[0]._id || `card-${currentIndex}`}
                    product={visibleProducts[0]}
                    brand={brand}
                    onSwipe={handleSwipe}
                    onTryOn={onTryOn}
                    active={!swipeDirection}
                  />
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Action buttons */}
        {!isLoading && totalCards > 0 && !allSwiped && (
          <div className="flex items-center justify-center gap-4 mt-3">
            <ActionButton icon={RotateCcw} iconColor="text-amber-500" size="sm" onClick={handleUndo} label="Undo" />
            <ActionButton icon={X} iconColor="text-red-500" size="md" onClick={handleDismiss} label="Dismiss" />
            <ActionButton icon={Heart} iconColor="text-emerald-500" size="md" onClick={handleLike} label="Wishlist" />
            <ActionButton icon={ShoppingBag} iconColor="text-blue-500" size="sm" onClick={handleAddToCart} label="Cart" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SwipeableCardStack;
