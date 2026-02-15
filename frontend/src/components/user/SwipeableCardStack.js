import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, Heart, ShoppingBag, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import { addToWishlist } from '../../services/wishlistService';
import cartService from '../../services/cartService';

// ---------------------------------------------------------------------------
// SwipeableCard -- the top (draggable) card in the stack
// ---------------------------------------------------------------------------
const SwipeableCard = ({ product, brand, onSwipe, onTryOn, active }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const likeOpacity = useTransform(x, [-200, 0, 200], [0, 0, 1]);
  const nopeOpacity = useTransform(x, [-200, 0, 200], [1, 0, 0]);

  const handleDragEnd = useCallback(
    (_, info) => {
      const offset = info.offset.x;
      if (Math.abs(offset) > 120) {
        onSwipe(offset > 0 ? 'right' : 'left');
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
      {/* Card — image only with glassmorphism info overlay */}
      <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/20">
        {/* Image */}
        <img
          src={imageUrl}
          alt={product?.name || 'Product'}
          className="w-full h-full object-cover object-top"
          draggable={false}
        />

        {/* LIKE stamp */}
        <motion.div
          className="absolute top-8 left-6 px-4 py-2 border-4 border-emerald-400 rounded-lg -rotate-12 pointer-events-none"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-emerald-400 font-extrabold text-3xl tracking-wider drop-shadow-lg">
            LIKE
          </span>
        </motion.div>

        {/* NOPE stamp */}
        <motion.div
          className="absolute top-8 right-6 px-4 py-2 border-4 border-red-500 rounded-lg rotate-12 pointer-events-none"
          style={{ opacity: nopeOpacity }}
        >
          <span className="text-red-500 font-extrabold text-3xl tracking-wider drop-shadow-lg">
            NOPE
          </span>
        </motion.div>

        {/* TRY ON button */}
        {onTryOn && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTryOn(product);
            }}
            className="absolute top-4 right-4 flex items-center gap-1.5 px-4 py-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg active:scale-95 transition-transform"
          >
            <Sparkles className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
              Try On
            </span>
          </button>
        )}

        {/* Bottom glassmorphism info bar */}
        <div className="absolute bottom-0 inset-x-0 px-5 py-4 bg-white/70 backdrop-blur-xl border-t border-white/30">
          <p className="uppercase text-[10px] font-semibold tracking-widest text-zinc-500 mb-0.5">
            {brand || product?.brand || 'Brand'}
          </p>
          <h3 className="text-base font-bold text-zinc-900 leading-tight line-clamp-1">
            {product?.name || 'Product Name'}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-bold text-zinc-900">
              Rs. {zammerPrice.toLocaleString('en-IN')}
            </span>
            {discount > 0 && (
              <>
                <span className="text-xs text-zinc-400 line-through">
                  Rs. {mrp.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
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
// StackCard -- background cards behind the top card (not draggable)
// ---------------------------------------------------------------------------
const StackCard = ({ product, depth }) => {
  const imageUrl =
    product?.images?.[0]?.url ||
    product?.images?.[0] ||
    product?.image ||
    'https://via.placeholder.com/380x500?text=No+Image';

  const scaleVal = 1 - depth * 0.05;
  const yOffset = depth * 10;

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={false}
      animate={{
        scale: scaleVal,
        y: yOffset,
        opacity: 1 - depth * 0.15,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{ zIndex: 5 - depth }}
    >
      <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-xl ring-1 ring-white/20">
        <img
          src={imageUrl}
          alt="Stacked product"
          className="w-full h-full object-cover object-top"
          draggable={false}
        />
      </div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Skeleton cards (loading state)
// ---------------------------------------------------------------------------
const SkeletonCard = ({ depth }) => {
  const scaleVal = 1 - depth * 0.05;
  const yOffset = depth * 10;

  return (
    <div
      className="absolute inset-0"
      style={{
        transform: `scale(${scaleVal}) translateY(${yOffset}px)`,
        zIndex: 5 - depth,
        opacity: 1 - depth * 0.15,
      }}
    >
      <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-xl bg-zinc-200 animate-pulse ring-1 ring-black/5" />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Action button helper
// ---------------------------------------------------------------------------
const ActionButton = ({ icon: Icon, bgColor, iconColor, size = 'md', onClick, label }) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-14 h-14',
  };
  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
  };

  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center
        ${bgColor} backdrop-blur-md shadow-lg ring-1 ring-black/5
        active:scale-90 transition-all duration-150 hover:shadow-xl`}
    >
      <Icon className={`${iconSizes[size]} ${iconColor}`} />
    </button>
  );
};

// ---------------------------------------------------------------------------
// SwipeableCardStack -- main component
// ---------------------------------------------------------------------------
const SwipeableCardStack = ({ products = [], brand, onClose, onTryOn, isLoading }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedCards, setSwipedCards] = useState([]);
  const [swipeDirection, setSwipeDirection] = useState(null);

  const currentProduct = products[currentIndex] || null;
  const totalCards = products.length;
  const allSwiped = !isLoading && totalCards > 0 && currentIndex >= totalCards;
  const visibleProducts = products.slice(currentIndex, currentIndex + 3);

  // ---- Swipe handler ----
  const handleSwipe = useCallback(
    async (direction) => {
      if (currentIndex >= totalCards) return;

      const swiped = products[currentIndex];
      setSwipeDirection(direction);
      setSwipedCards((prev) => [...prev, currentIndex]);

      if (direction === 'right' && swiped?._id) {
        try {
          const res = await addToWishlist(swiped._id);
          if (res.success) {
            toast.success('Added to wishlist', { autoClose: 1500, hideProgressBar: true });
          } else if (res.requiresAuth) {
            toast.info('Login to save to wishlist', { autoClose: 2000 });
          }
        } catch {
          toast.error('Could not add to wishlist');
        }
      }

      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setSwipeDirection(null);
      }, 350);
    },
    [currentIndex, totalCards, products]
  );

  const handleUndo = useCallback(() => {
    if (swipedCards.length === 0) return;
    const lastIndex = swipedCards[swipedCards.length - 1];
    setSwipedCards((prev) => prev.slice(0, -1));
    setCurrentIndex(lastIndex);
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
      if (res.success) {
        toast.success('Added to cart', { autoClose: 1500, hideProgressBar: true });
      } else if (res.requiresAuth) {
        toast.info('Login to add to cart', { autoClose: 2000 });
      } else {
        toast.error(res.message || 'Could not add to cart');
      }
    } catch {
      toast.error('Could not add to cart');
    }
  }, [currentProduct]);

  const handleStartOver = useCallback(() => {
    setCurrentIndex(0);
    setSwipedCards([]);
    setSwipeDirection(null);
  }, []);

  // ============================================================
  // Render
  // ============================================================
  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/40 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* ---------- Top bar ---------- */}
      <div className="w-full max-w-[380px] flex items-center justify-between px-4 pb-3">
        <span className="text-zinc-500 text-sm font-medium tabular-nums">
          {isLoading
            ? '--/--'
            : totalCards > 0
            ? `${Math.min(currentIndex + 1, totalCards)}/${totalCards}`
            : ''}
        </span>

        <h2 className="text-zinc-900 font-bold text-base truncate max-w-[160px] text-center">
          {brand || 'Discover'}
        </h2>

        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-zinc-600" />
        </button>
      </div>

      {/* ---------- Card stack area ---------- */}
      <div className="relative w-full max-w-[340px] sm:max-w-[360px]" style={{ aspectRatio: '3/4' }}>
        {/* Loading skeleton */}
        {isLoading && (
          <>
            <SkeletonCard depth={2} />
            <SkeletonCard depth={1} />
            <SkeletonCard depth={0} />
          </>
        )}

        {/* Empty state */}
        {!isLoading && totalCards === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 rounded-3xl bg-white/60 backdrop-blur-lg ring-1 ring-black/5">
            <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
              <ShoppingBag className="w-9 h-9 text-zinc-400" />
            </div>
            <p className="text-zinc-800 text-lg font-semibold mb-1">Products coming soon</p>
            <p className="text-zinc-400 text-sm">
              {brand || 'This brand'} is preparing new arrivals for you.
            </p>
          </div>
        )}

        {/* All swiped -- end state */}
        {allSwiped && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 rounded-3xl bg-white/60 backdrop-blur-lg ring-1 ring-black/5">
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <Heart className="w-9 h-9 text-emerald-500" />
            </div>
            <p className="text-zinc-900 text-xl font-bold mb-1">All caught up!</p>
            <p className="text-zinc-400 text-sm mb-5">
              You&apos;ve seen all {totalCards} products from {brand || 'this brand'}.
            </p>
            <button
              onClick={handleStartOver}
              className="px-6 py-2.5 rounded-full bg-zinc-900 text-white text-sm font-bold active:scale-95 transition-transform"
            >
              Start Over
            </button>
          </div>
        )}

        {/* Actual card stack */}
        {!isLoading && totalCards > 0 && !allSwiped && (
          <>
            {visibleProducts
              .slice(1, 3)
              .reverse()
              .map((prod, revIdx) => {
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

      {/* ---------- Action buttons ---------- */}
      {!isLoading && totalCards > 0 && !allSwiped && (
        <div className="w-full max-w-[380px] flex items-center justify-center gap-5 pt-5 pb-6 px-4">
          <ActionButton
            icon={RotateCcw}
            bgColor="bg-white/80"
            iconColor="text-amber-500"
            size="sm"
            onClick={handleUndo}
            label="Undo last swipe"
          />
          <ActionButton
            icon={X}
            bgColor="bg-white/80"
            iconColor="text-red-500"
            size="md"
            onClick={handleDismiss}
            label="Dismiss"
          />
          <ActionButton
            icon={Heart}
            bgColor="bg-white/80"
            iconColor="text-emerald-500"
            size="md"
            onClick={handleLike}
            label="Add to wishlist"
          />
          <ActionButton
            icon={ShoppingBag}
            bgColor="bg-white/80"
            iconColor="text-blue-500"
            size="sm"
            onClick={handleAddToCart}
            label="Add to cart"
          />
        </div>
      )}
    </motion.div>
  );
};

export default SwipeableCardStack;
