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
      console.log('🏪 [ShopDetailPage] Fetching products for shop:', shopId);
      
      // 🎯 FIXED: Use the correct API call with seller filter
      const response = await getMarketplaceProducts({
        seller: shopId, // 🎯 CRITICAL: Filter by seller ID
        limit: 20,
        page: 1,
        status: 'active' // Only get active products
      });
      
      console.log('🏪 [ShopDetailPage] Shop products API response:', {
        success: response.success,
        count: response.count,
        total: response.total,
        productsFound: response.data?.length || 0,
        shopId: shopId
      });

      if (response.success) {
        setProducts(response.data || []);
        
        // 🎯 ENHANCED: Log detailed results
        console.log(`✅ [ShopDetailPage] Successfully fetched ${response.data?.length || 0} products for shop ${shopId}`);
        
        if (response.data && response.data.length > 0) {
          console.log('🏪 [ShopDetailPage] Sample products:', response.data.slice(0, 2).map(p => ({
            id: p._id,
            name: p.name,
            seller: p.seller?._id,
            sellerMatches: p.seller?._id === shopId
          })));
        } else {
          console.log('📦 [ShopDetailPage] No products found for this shop');
        }
      } else {
        console.error('❌ [ShopDetailPage] Failed to fetch shop products:', response.message);
        toast.error(response.message || 'Failed to fetch shop products');
      }
    } catch (error) {
      console.error('❌ [ShopDetailPage] Error fetching shop products:', error);
      toast.error('Something went wrong while loading shop products');
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30 flex justify-center items-center">
          <div className="text-center">
            <div className="relative mb-8">
              <div className="w-24 h-24 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 w-24 h-24 border-4 border-transparent border-t-amber-400 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Loading Shop Details</h3>
              <p className="text-gray-600">Please wait while we fetch the shop information...</p>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  if (!shop) {
    return (
      <UserLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/30 flex justify-center items-center">
          <div className="text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-red-100 to-red-200 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 max-w-md">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Shop Not Found</h2>
              <p className="text-gray-600 mb-8">The shop you're looking for doesn't exist or has been removed.</p>
              <Link 
                to="/user/dashboard" 
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 inline-flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  const shopImages = getShopImages(shop);
  const hasMultipleImages = shopImages.length > 1;

  return (
    <UserLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Premium Shop Banner with Image Gallery */}
          <div className="relative mb-12">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl blur opacity-20"></div>
            <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
              
              {/* Hero Image Section */}
              <div className="relative h-80 md:h-96 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 overflow-hidden">
                {shopImages.length > 0 ? (
                  <div className="relative h-full">
                    <img 
                      src={shopImages[currentImageIndex]} 
                      alt={`${shop.shop?.name} - Image ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    
                    {/* Premium Image Navigation */}
                    {hasMultipleImages && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-6 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-lg hover:bg-white/30 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center group"
                        >
                          <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-6 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-lg hover:bg-white/30 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center group"
                        >
                          <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        
                        {/* Enhanced Image Indicators */}
                        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-3">
                          {shopImages.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                index === currentImageIndex 
                                  ? 'bg-white scale-125 shadow-lg' 
                                  : 'bg-white/50 hover:bg-white/70'
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
                      <div className="w-32 h-32 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                        <svg className="w-16 h-16 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <h3 className="text-3xl font-bold mb-2">{shop.shop?.name}</h3>
                      <p className="text-white/80 text-lg">Premium Fashion Store</p>
                    </div>
                  </div>
                )}
                
                {/* Premium Shop Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-8 text-white">
                  <div className="flex items-end justify-between">
                    <div>
                      <h1 className="text-4xl md:text-5xl font-bold mb-4">{shop.shop?.name}</h1>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="bg-white/20 backdrop-blur-lg px-4 py-2 rounded-full border border-white/30 font-medium">
                          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          {shop.shop?.category} Fashion
                        </span>
                        {shopImages.length > 1 && (
                          <span className="bg-white/20 backdrop-blur-lg px-4 py-2 rounded-full border border-white/30 font-medium flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {shopImages.length} Photos
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
                      <StarRating 
                        rating={shop.averageRating || 4.8} 
                        numReviews={shop.numReviews || 24} 
                        showCount={true}
                        className="text-white"
                      />
                      <p className="text-white/80 text-sm mt-2">Customer Rating</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Enhanced Shop Details */}
              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Shop Information Card */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                    <div className="relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/50">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg mr-3">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Shop Information</h3>
                      </div>
                      
                      <div className="space-y-4">
                        {shop.shop?.description && (
                          <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                            <p className="text-gray-700 leading-relaxed">{shop.shop.description}</p>
                          </div>
                        )}
                        
                        <div className="flex items-start p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3 mt-0.5">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">Address</p>
                            <p className="text-gray-600 text-sm">{shop.shop?.address}</p>
                          </div>
                        </div>
                        
                        {shop.shop?.phoneNumber?.main && (
                          <div className="flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">Contact</p>
                              <p className="text-gray-600 text-sm">{shop.shop.phoneNumber.main}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Business Hours Card */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                    <div className="relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/50">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg mr-3">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Business Hours</h3>
                      </div>
                      
                      <div className="space-y-4">
                        {shop.shop?.openTime && shop.shop?.closeTime ? (
                          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800">Daily Hours</p>
                                  <p className="text-purple-700 font-semibold">
                                    {shop.shop.openTime} - {shop.shop.closeTime}
                                  </p>
                                </div>
                              </div>
                              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <p className="text-gray-500 text-center">Hours not specified</p>
                          </div>
                        )}
                        
                        {shop.shop?.workingDays && (
                          <div className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">Working Days</p>
                                <p className="text-gray-600 text-sm">{shop.shop.workingDays}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Premium Shop Products Section */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur opacity-20"></div>
            <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 p-8">
              
              {/* Section Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg mr-4">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-indigo-800 to-purple-600 bg-clip-text text-transparent">
                      Our Products
                    </h2>
                    <p className="text-gray-600 mt-1">Discover our premium collection</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-3 rounded-xl border border-indigo-200">
                  <div className="text-sm text-indigo-600 font-semibold">
                    {loadingProducts ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500 mr-2"></div>
                        Loading...
                      </div>
                    ) : (
                      `${products.length} items available`
                    )}
                  </div>
                </div>
              </div>
              
              {loadingProducts ? (
                <div className="text-center py-20">
                  <div className="relative mb-8">
                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
                    <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 max-w-md mx-auto">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading Products</h3>
                    <p className="text-gray-600">Please wait while we fetch the latest products...</p>
                  </div>
                </div>
              ) : products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {products.map(product => (
                    <Link key={product._id} to={`/user/product/${product._id}`} className="block group">
                      <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                        <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden hover:shadow-2xl transition-all duration-300 transform group-hover:scale-105">
                          
                          {/* Product Image */}
                          <div className="relative h-56 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                            {product.images && product.images[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                  <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span className="text-sm font-medium">No Image</span>
                                </div>
                              </div>
                            )}
                            
                            {/* Premium Product Badges */}
                            <div className="absolute top-3 left-3 space-y-2">
                              {product.isTrending && (
                                <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                                  🔥 Trending
                                </span>
                              )}
                              {product.isLimitedEdition && (
                                <span className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                                  ⭐ Limited
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Product Details */}
                          <div className="p-6">
                            <h3 className="font-bold text-lg text-gray-800 mb-3 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                              {product.name}
                            </h3>
                            
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-2">
                                <span className="text-indigo-600 font-bold text-xl">₹{product.zammerPrice}</span>
                                {product.mrp > product.zammerPrice && (
                                  <span className="text-gray-500 text-sm line-through">₹{product.mrp}</span>
                                )}
                              </div>
                              {product.mrp > product.zammerPrice && (
                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                                  {Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)}% OFF
                                </span>
                              )}
                            </div>
                            
                            {/* View Product Button */}
                            <button className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 group-hover:scale-105">
                              View Product
                            </button>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-8">
                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-8 max-w-md mx-auto">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">No Products Available</h3>
                    <p className="text-gray-600 mb-6">This shop hasn't added any products yet. Check back later for exciting new arrivals!</p>
                    <Link 
                      to="/user/nearby-shops" 
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 inline-flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Browse Other Shops
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default ShopDetailPage;