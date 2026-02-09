import React from 'react';

const Shimmer = ({ className = '' }) => (
  <div className={`bg-gray-200 animate-pulse rounded ${className}`} />
);

export const ProductCardSkeleton = () => (
  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
    <Shimmer className="aspect-[3/4] rounded-none" />
    <div className="p-3 space-y-2">
      <Shimmer className="h-3 w-16" />
      <Shimmer className="h-4 w-full" />
      <Shimmer className="h-3 w-20" />
      <div className="flex items-baseline gap-2">
        <Shimmer className="h-5 w-16" />
        <Shimmer className="h-3 w-12" />
      </div>
      <div className="flex gap-1 pt-1">
        {[1, 2, 3, 4].map(i => (
          <Shimmer key={i} className="h-5 w-8" />
        ))}
      </div>
      <Shimmer className="h-9 w-full rounded-lg" />
    </div>
  </div>
);

export const ProductGridSkeleton = ({ count = 8, cols = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' }) => (
  <div className={`grid ${cols} gap-4`}>
    {Array.from({ length: count }).map((_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </div>
);

export const ShopCardSkeleton = () => (
  <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
    <Shimmer className="h-48 rounded-none" />
    <div className="p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Shimmer className="h-4 w-20" />
        <Shimmer className="h-4 w-10" />
      </div>
      <Shimmer className="h-5 w-3/4" />
      <Shimmer className="h-3 w-full" />
      <Shimmer className="h-3 w-2/3" />
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <Shimmer className="h-5 w-20" />
        <Shimmer className="h-4 w-16" />
      </div>
    </div>
  </div>
);

export const BannerSkeleton = () => (
  <Shimmer className="w-full rounded-2xl" style={{ height: 'clamp(320px, 45vw, 520px)' }} />
);

export default { ProductCardSkeleton, ProductGridSkeleton, ShopCardSkeleton, BannerSkeleton };
