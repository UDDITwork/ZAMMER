import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Sparkles, Star } from 'lucide-react';
import WishlistButton from './WishlistButton';

const ProductCard = ({
  product,
  onAddToCart,
  onTryOn,
  showAddToCart = true,
  isAddingToCart = false,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  if (!product) return null;

  // Compute derived data
  const hasDiscount = product.mrp > product.zammerPrice;
  const discountPercent = hasDiscount
    ? Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)
    : 0;
  const savings = hasDiscount ? product.mrp - product.zammerPrice : 0;

  const isNew = product.createdAt &&
    (Date.now() - new Date(product.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000;

  const totalStock = product.variants?.reduce((sum, v) => sum + (v.quantity || 0), 0);
  const isLowStock = product.inventory?.isLowStock || (totalStock != null && totalStock > 0 && totalStock < 5);
  const isOutOfStock = product.status === 'outOfStock' ||
    product.inventory?.availableQuantity === 0 ||
    (totalStock != null && totalStock === 0);

  const hasSecondImage = product.images && product.images.length > 1 && !imgError;

  // Extract unique sizes from variants
  const sizes = product.variants
    ? [...new Set(product.variants.map(v => v.size).filter(Boolean))]
    : [];

  const rating = product.averageRating || 0;
  const reviewCount = product.numReviews || 0;

  return (
    <div className={`bg-white border border-gray-100 rounded-xl overflow-hidden group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${className}`}>
      {/* IMAGE SECTION */}
      <Link to={`/user/product/${product._id}`} className="block">
        <div className="aspect-[3/4] bg-gray-50 relative overflow-hidden">
          {/* Primary Image */}
          {product.images && product.images.length > 0 && !imgError ? (
            <>
              <img
                src={product.images[0]}
                alt={product.name}
                className={`w-full h-full object-cover ${hasSecondImage ? 'group-hover:opacity-0' : 'group-hover:scale-105'} transition-all duration-500`}
                onError={() => setImgError(true)}
                loading="lazy"
              />
              {/* Second Image on Hover */}
              {hasSecondImage && (
                <img
                  src={product.images[1]}
                  alt={`${product.name} - alternate`}
                  className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  loading="lazy"
                />
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
              <ShoppingBag className="w-10 h-10" strokeWidth={1} />
            </div>
          )}

          {/* BADGE STACK - Top Left */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {isNew && (
              <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                New
              </span>
            )}
            {product.isTrending && (
              <span className="bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                Trending
              </span>
            )}
            {product.isLimitedEdition && (
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                Limited
              </span>
            )}
            {hasDiscount && discountPercent >= 10 && (
              <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          {/* WISHLIST - Top Right */}
          <div className="absolute top-2 right-2 z-20" onClick={(e) => e.preventDefault()}>
            <WishlistButton productId={product._id} size="sm" />
          </div>

          {/* LOW STOCK / OUT OF STOCK */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <div className="bg-white px-4 py-2 rounded-lg text-center">
                <p className="text-sm font-bold text-gray-900">Out of Stock</p>
              </div>
            </div>
          )}

          {isLowStock && !isOutOfStock && (
            <div className="absolute bottom-2 left-2 right-2 z-10">
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded animate-pulse inline-block">
                Only {totalStock} left!
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* CONTENT SECTION */}
      <div className="p-3">
        {/* Brand */}
        {product.brand && (
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5 line-clamp-1">
            {product.brand}
          </p>
        )}

        {/* Product Name */}
        <Link to={`/user/product/${product._id}`}>
          <h3 className="text-sm font-medium text-gray-900 line-clamp-1 hover:text-orange-600 transition-colors leading-snug mb-1">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        {rating > 0 && (
          <div className="flex items-center gap-1 mb-1.5">
            <div className="flex items-center gap-0.5 bg-green-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
              <span>{rating.toFixed(1)}</span>
              <Star className="w-2.5 h-2.5" fill="currentColor" />
            </div>
            {reviewCount > 0 && (
              <span className="text-[10px] text-gray-400">({reviewCount})</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-1.5 mb-1.5">
          <span className="text-orange-600 font-bold text-base">
            ₹{product.zammerPrice?.toLocaleString('en-IN')}
          </span>
          {hasDiscount && (
            <>
              <span className="text-gray-400 text-xs line-through">
                ₹{product.mrp?.toLocaleString('en-IN')}
              </span>
            </>
          )}
        </div>

        {/* Savings callout */}
        {savings >= 100 && (
          <p className="text-green-600 text-[11px] font-medium mb-1.5">
            You save ₹{savings.toLocaleString('en-IN')}
          </p>
        )}

        {/* Size chips - shown on hover */}
        {sizes.length > 0 && (
          <div className="hidden group-hover:flex flex-wrap gap-1 mb-2 animate-slide-up">
            {sizes.slice(0, 5).map(size => (
              <span key={size} className="border border-gray-200 text-gray-500 text-[10px] px-1.5 py-0.5 rounded hover:border-gray-400 transition-colors">
                {size}
              </span>
            ))}
            {sizes.length > 5 && (
              <span className="text-[10px] text-gray-400 px-1 py-0.5">+{sizes.length - 5}</span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {showAddToCart && (
          <div className={`grid ${onTryOn ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5 mt-1`}>
            <button
              onClick={(e) => {
                e.preventDefault();
                if (!isOutOfStock && onAddToCart) {
                  onAddToCart(product._id, product.name, product);
                }
              }}
              disabled={isAddingToCart || isOutOfStock}
              className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                isOutOfStock
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : isAddingToCart
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
            >
              {isOutOfStock ? 'Out of Stock' : isAddingToCart ? 'Adding...' : 'Add to Bag'}
            </button>
            {onTryOn && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onTryOn(product);
                }}
                className="py-2 rounded-lg text-xs font-semibold transition-colors bg-black hover:bg-gray-800 text-white flex items-center justify-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Try On</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
