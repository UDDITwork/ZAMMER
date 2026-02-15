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
      {/* Card */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-zinc-900">
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden">
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
            <span className="text-emerald-400 font-extrabold text-3xl tracking-wider">
              LIKE
            </span>
          </motion.div>

          {/* NOPE stamp */}
          <motion.div
            className="absolute top-8 right-6 px-4 py-2 border-4 border-red-500 rounded-lg rotate-12 pointer-events-none"
            style={{ opacity: nopeOpacity }}
          >
            <span className="text-red-500 font-extrabold text-3xl tracking-wider">
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
              className="absolute bottom-4 right-4 flex items-center gap-1.5 px-4 py-2 bg-white/95 backdrop-blur-sm rounded-full shadow-lg active:scale-95 transition-transform"
            >
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                Try On
              </span>
            </button>
          )}
        </div>

        {/* Info */}
        <div className="px-5 py-4">
          <p className="uppercase text-[10px] font-semibold tracking-widest text-white/50 mb-0.5">
            {brand || product?.brand || 'Brand'}
          </p>
          <h3 className="text-lg font-bold text-white leading-tight line-clamp-1">
            {product?.name || 'Product Name'}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-base font-bold text-white">
              Rs. {zammerPrice.toLocaleString('en-IN')}
            </span>
            {discount > 0 && (
              <>
                <span className="text-sm text-white/40 line-through">
                  Rs. {mrp.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
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
      <div className="rounded-3xl overflow-hidden shadow-2xl bg-zinc-900">
        <div className="aspect-[3/4] overflow-hidden">
          <img
            src={imageUrl}
            alt="Stacked product"
            className="w-full h-full object-cover object-top"
            draggable={false}
          />
        </div>
        <div className="px-5 py-4">
          <div className="h-3 w-16 bg-white/10 rounded mb-2" />
          <div className="h-4 w-40 bg-white/15 rounded mb-2" />
          <div className="h-3 w-24 bg-white/10 rounded" />
        </div>
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
      <div className="rounded-3xl overflow-hidden shadow-2xl bg-zinc-800 animate-pulse">
        <div className="aspect-[3/4] bg-zinc-700" />
        <div className="px-5 py-4 space-y-2.5">
          <div className="h-3 w-16 bg-zinc-600 rounded" />
          <div className="h-5 w-44 bg-zinc-600 rounded" />
          <div className="h-3 w-28 bg-zinc-600 rounded" />
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Action button helper
// ---------------------------------------------------------------------------
const ActionButton = ({ icon: Icon, ringColor, size = 'md', onClick, label }) => {
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
        bg-zinc-900/80 backdrop-blur-sm border-2 ${ringColor}
        active:scale-90 transition-all duration-150 shadow-lg hover:shadow-xl`}
    >
      <Icon className={`${iconSizes[size]} text-white`} />
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

  // ---- Current product helper ----
  const currentProduct = products[currentIndex] || null;
  const totalCards = products.length;
  const allSwiped = !isLoading && totalCards > 0 && currentIndex >= totalCards;

  // ---- Visible stack (up to 3 cards starting at currentIndex) ----
  const visibleProducts = products.slice(currentIndex, currentIndex + 3);

  // ---- Swipe handler ----
  const handleSwipe = useCallback(
    async (direction) => {
      if (currentIndex >= totalCards) return;

      const swiped = products[currentIndex];
      setSwipeDirection(direction);
      setSwipedCards((prev) => [...prev, currentIndex]);

      // On right swipe (like) -> add to wishlist
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

      // Small delay so exit animation plays before advancing
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setSwipeDirection(null);
      }, 350);
    },
    [currentIndex, totalCards, products]
  );

  // ---- Undo ----
  const handleUndo = useCallback(() => {
    if (swipedCards.length === 0) return;
    const lastIndex = swipedCards[swipedCards.length - 1];
    setSwipedCards((prev) => prev.slice(0, -1));
    setCurrentIndex(lastIndex);
    setSwipeDirection(null);
  }, [swipedCards]);

  // ---- Programmatic swipe left (dismiss) ----
  const handleDismiss = useCallback(() => {
    handleSwipe('left');
  }, [handleSwipe]);

  // ---- Programmatic swipe right (wishlist / like) ----
  const handleLike = useCallback(() => {
    handleSwipe('right');
  }, [handleSwipe]);

  // ---- Add to cart ----
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

  // ---- Start over ----
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
      className="fixed inset-0 z-[9999] flex flex-col items-center bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* ---------- Top bar ---------- */}
      <div className="w-full max-w-[440px] flex items-center justify-between px-5 pt-4 pb-2">
        {/* Card counter */}
        <span className="text-white/70 text-sm font-medium tabular-nums">
          {isLoading
            ? '--/--'
            : totalCards > 0
            ? `${Math.min(currentIndex + 1, totalCards)}/${totalCards}`
            : ''}
        </span>

        {/* Brand name */}
        <h2 className="text-white font-bold text-base truncate max-w-[180px] text-center">
          {brand || 'Discover'}
        </h2>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* ---------- Card stack area ---------- */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-4 overflow-hidden">
        <div className="relative w-full max-w-[420px]" style={{ minHeight: '60vh', maxHeight: '68vh' }}>
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
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-5">
                <ShoppingBag className="w-10 h-10 text-white/30" />
              </div>
              <p className="text-white/80 text-lg font-semibold mb-1">
                Products coming soon
              </p>
              <p className="text-white/40 text-sm">
                {brand?.name || 'This brand'} is preparing new arrivals for you.
              </p>
            </div>
          )}

          {/* All swiped -- end state */}
          {allSwiped && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5">
                <Heart className="w-9 h-9 text-emerald-400" />
              </div>
              <p className="text-white text-xl font-bold mb-1">All caught up!</p>
              <p className="text-white/40 text-sm mb-6">
                You&apos;ve seen all {totalCards} products from {brand || 'this brand'}.
              </p>
              <button
                onClick={handleStartOver}
                className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-bold active:scale-95 transition-transform"
              >
                Start Over
              </button>
            </div>
          )}

          {/* Actual card stack */}
          {!isLoading && totalCards > 0 && !allSwiped && (
            <>
              {/* Background cards (rendered bottom-up so z-order is correct) */}
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

              {/* Top (draggable) card with AnimatePresence */}
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

        {/* ---------- Product info below card ---------- */}
        {!isLoading && currentProduct && !allSwiped && (
          <div className="w-full max-w-[420px] mt-3 px-1">
            <p className="uppercase text-[10px] font-semibold tracking-widest text-white/50">
              {brand?.name || currentProduct?.brand || 'Brand'}
            </p>
            <h3 className="text-lg font-bold text-white leading-tight line-clamp-1 mt-0.5">
              {currentProduct?.name || 'Product Name'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-base font-bold text-white">
                Rs.{' '}
                {(
                  currentProduct?.zammerPrice ??
                  currentProduct?.sellingPrice ??
                  currentProduct?.price ??
                  0
                ).toLocaleString('en-IN')}
              </span>
              {(() => {
                const zp =
                  currentProduct?.zammerPrice ??
                  currentProduct?.sellingPrice ??
                  currentProduct?.price ??
                  0;
                const mp =
                  currentProduct?.mrp ??
                  currentProduct?.originalPrice ??
                  currentProduct?.price ??
                  0;
                const disc = mp > zp ? Math.round(((mp - zp) / mp) * 100) : 0;
                if (disc <= 0) return null;
                return (
                  <>
                    <span className="text-sm text-white/40 line-through">
                      Rs. {mp.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                      {disc}% OFF
                    </span>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* ---------- Action buttons ---------- */}
      {!isLoading && totalCards > 0 && !allSwiped && (
        <div className="w-full max-w-[420px] flex items-center justify-center gap-5 pb-8 pt-4 px-4">
          {/* Undo */}
          <ActionButton
            icon={RotateCcw}
            ringColor="border-amber-400/60"
            size="sm"
            onClick={handleUndo}
            label="Undo last swipe"
          />

          {/* Dismiss (X) */}
          <ActionButton
            icon={X}
            ringColor="border-red-500/70"
            size="md"
            onClick={handleDismiss}
            label="Dismiss"
          />

          {/* Like (Heart) */}
          <ActionButton
            icon={Heart}
            ringColor="border-emerald-400/70"
            size="md"
            onClick={handleLike}
            label="Add to wishlist"
          />

          {/* Add to Cart */}
          <ActionButton
            icon={ShoppingBag}
            ringColor="border-blue-400/60"
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
