import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import StarRating from '../../components/common/StarRating';
import { getShop, getShopProducts, rateShop } from '../../services/shopService';
import UserLayout from '../../components/layouts/UserLayout';
import { getNearbyShops } from '../../services/userService';
import { getMarketplaceProducts } from '../../services/productService';

const ShopDetailPage = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [rating, setRating] = useState(0);
  const [isRating, setIsRating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // 🎯 NEW: Helper function to get shop image
  const getShopImage = (shop) => {
    if (shop?.shop?.mainImage) {
      return shop.shop.mainImage;
    }
    if (shop?.shop?.images && shop.shop.images.length > 0) {
      return shop.shop.images[0];
    }
    return null;
  };

  // 🎯 NEW: Get all shop images
  const getShopImages = (shop) => {
    if (shop?.shop?.images && shop.shop.images.length > 0) {
      return shop.shop.images;
    }
    return [];
  };

  // Move function definitions above useEffect
  const fetchShopDetails = async () => {
    setLoading(true);
    try {
      // This is a temporary solution since we don't have a dedicated shop API yet
      const response = await getNearbyShops();
      if (response.success) {
        const foundShop = response.data.find(s => s._id === shopId);
        if (foundShop) {
          console.log('🏪 Found shop with images:', {
            id: foundShop._id,
            name: foundShop.shop?.name,
            hasMainImage: !!foundShop.shop?.mainImage,
            hasImages: foundShop.shop?.images?.length > 0,
            imageCount: foundShop.shop?.images?.length || 0,
            images: foundShop.shop?.images
          });
          setShop(foundShop);
        } else {
          toast.error('Shop not found');
        }
      } else {
        toast.error(response.message || 'Failed to fetch shop details');
      }
    } catch (error) {
      console.error('Error fetching shop details:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const fetchShopProducts = async () => {
    setLoadingProducts(true);
    try {
      // This is a temporary solution - in a real implementation, 
      // we'd have a dedicated endpoint for shop products
      const response = await getMarketplaceProducts({
        seller: shopId,
        limit: 10
      });
      if (response.success) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Error fetching shop products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchShopDetails();
    fetchShopProducts();
  }, [shopId]);

  const handleRateShop = async () => {
    if (rating === 0) {
      toast.warning('Please select a rating');
      return;
    }

    try {
      const response = await rateShop(shopId, rating);
      if (response.success) {
        toast.success('Rating submitted successfully');
        setIsRating(false);
        // Refresh shop details to get updated rating
        fetchShopDetails();
      } else {
        toast.error(response.message || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Error rating shop:', error);
      toast.error('Something went wrong');
    }
  };

  // 🎯 NEW: Handle image navigation
  const nextImage = () => {
    const images = getShopImages(shop);
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    const images = getShopImages(shop);
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading shop details...</p>
          </div>
        </div>
      </UserLayout>
    );
  }

  if (!shop) {
    return (
      <UserLayout>
        <div className="text-center py-12">
          <div className="bg-red-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Shop Not Found</h2>
          <p className="text-gray-600 mb-4">The shop you're looking for doesn't exist or has been removed.</p>
          <Link 
            to="/user/dashboard" 
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </UserLayout>
    );
  }

  const shopImages = getShopImages(shop);
  const hasMultipleImages = shopImages.length > 1;

  return (
    <UserLayout>
      <div className="container mx-auto p-4 max-w-6xl">
        {/* 🎯 NEW: Enhanced Shop Banner with Image Gallery */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="relative h-64 md:h-80 bg-gradient-to-r from-orange-500 to-orange-600">
            {shopImages.length > 0 ? (
              <div className="relative h-full">
                <img 
                  src={shopImages[currentImageIndex]} 
                  alt={`${shop.shop?.name} - Image ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                
                {/* Image Navigation */}
                {hasMultipleImages && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white p-2 rounded-full transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white p-2 rounded-full transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    
                    {/* Image Indicators */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                      {shopImages.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-white">
                  <svg className="w-24 h-24 mx-auto mb-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <h3 className="text-2xl font-bold opacity-90">{shop.shop?.name}</h3>
                </div>
              </div>
            )}
            
            {/* Shop Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 text-white">
              <div className="flex items-end justify-between">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold mb-2">{shop.shop?.name}</h1>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                      {shop.shop?.category} Fashion
                    </span>
                    {shopImages.length > 1 && (
                      <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {shopImages.length} Photos
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <StarRating 
                    rating={shop.averageRating || 4.8} 
                    numReviews={shop.numReviews || 24} 
                    showCount={true}
                    className="text-white"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Shop Details */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Shop Information</h3>
                <div className="space-y-3">
                  {shop.shop?.description && (
                    <div>
                      <p className="text-gray-600">{shop.shop.description}</p>
                    </div>
                  )}
                  
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-gray-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-gray-600">{shop.shop?.address}</p>
                  </div>
                  
                  {shop.shop?.phoneNumber?.main && (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <p className="text-gray-600">{shop.shop.phoneNumber.main}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Business Hours</h3>
                <div className="space-y-2">
                  {shop.shop?.openTime && shop.shop?.closeTime ? (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-gray-600">
                        {shop.shop.openTime} - {shop.shop.closeTime}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500">Hours not specified</p>
                  )}
                  
                  {shop.shop?.workingDays && (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-600">{shop.shop.workingDays}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Shop Products */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Our Products</h2>
            <div className="text-sm text-gray-500">
              {loadingProducts ? 'Loading...' : `${products.length} items available`}
            </div>
          </div>
          
          {loadingProducts ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading products...</p>
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(product => (
                <Link key={product._id} to={`/user/product/${product._id}`} className="block group">
                  <div className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="h-40 bg-gray-200 relative">
                      {product.images && product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      
                      {/* Product badges */}
                      <div className="absolute top-2 left-2 space-y-1">
                        {product.isTrending && (
                          <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                            Trending
                          </span>
                        )}
                        {product.isLimitedEdition && (
                          <span className="bg-purple-500 text-white px-2 py-1 rounded text-xs font-medium">
                            Limited
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm text-gray-800 truncate group-hover:text-orange-600 transition-colors">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-1">
                          <span className="text-orange-600 font-bold text-sm">₹{product.zammerPrice}</span>
                          {product.mrp > product.zammerPrice && (
                            <span className="text-gray-500 text-xs line-through">₹{product.mrp}</span>
                          )}
                        </div>
                        {product.mrp > product.zammerPrice && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                            {Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)}% OFF
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Products Available</h3>
              <p className="text-gray-600 mb-4">This shop hasn't added any products yet. Check back later!</p>
              <Link 
                to="/user/nearby-shops" 
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                Browse Other Shops
              </Link>
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default ShopDetailPage; 