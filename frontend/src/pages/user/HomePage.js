import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import { AuthContext } from '../../contexts/AuthContext';
import { getMarketplaceProducts } from '../../services/productService';
import { getNearbyShops } from '../../services/userService';
import StarRating from '../../components/common/StarRating';

const HomePage = () => {
  const { userAuth } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [offerProducts, setOfferProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [recommendedShops, setRecommendedShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingShops, setLoadingShops] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const getShopImage = (shop) => {
    if (shop?.shop?.mainImage) {
      return shop.shop.mainImage;
    }
    if (shop?.shop?.images && shop.shop.images.length > 0) {
      return shop.shop.images[0];
    }
    return null;
  };

  const fetchProducts = useCallback(async () => {
    if (fetchingRef.current || !isMountedRef.current) return;
    
    fetchingRef.current = true;
    setLoading(true);
    try {
      console.log('🔍 HomePage: Fetching products...');
      const response = await getMarketplaceProducts({
        page: 1,
        limit: 8,
        status: 'active'
      });
      if (response.success && isMountedRef.current) {
        setProducts(response.data);
        console.log('✅ HomePage: Products fetched:', response.data.length);
      } else {
        toast.error(response.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('❌ HomePage: Error fetching products:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, []);

  const fetchOfferProducts = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      console.log('🎁 HomePage: Fetching offer products...');
      const response = await getMarketplaceProducts({
        page: 1,
        limit: 4,
        discount: true,
        status: 'active'
      });
      if (response.success && isMountedRef.current) {
        setOfferProducts(response.data);
        console.log('✅ HomePage: Offer products fetched:', response.data.length);
      }
    } catch (error) {
      console.error('❌ HomePage: Error fetching offer products:', error);
    }
  }, []);

  const fetchNearbyShops = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setLoadingShops(true);
    try {
      console.log('🏪 HomePage: Fetching nearby shops...');
      const response = await getNearbyShops();
      if (response.success && isMountedRef.current) {
        console.log('✅ HomePage: Shops fetched:', response.data.length);
        setShops(response.data);
        setRecommendedShops(response.data.slice().sort(() => 0.5 - Math.random()).slice(0, 4));

        if (response.data && response.data.length > 0) {
          console.log('📊 [HomePage] Shops with distances:');
          response.data.slice(0, 3).forEach((shop, index) => {
            console.log(`  ${index + 1}. ${shop.shop?.name} - ${shop.distanceText || 'No distance'}`);
          });
        }
      } else {
        toast.error(response.message || 'Failed to fetch nearby shops');
      }
    } catch (error) {
      console.error('❌ HomePage: Error fetching shops:', error);
    } finally {
      if (isMountedRef.current) {
        setLoadingShops(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    console.log('🚀 HomePage: Initializing...');
    
    const initializeData = async () => {
      try {
        await Promise.all([
          fetchProducts(),
          fetchOfferProducts(),
          fetchNearbyShops()
        ]);
      } catch (error) {
        console.error('❌ HomePage: Error initializing data:', error);
      }
    };

    initializeData();

    return () => {
      console.log('🧹 HomePage: Cleaning up...');
      isMountedRef.current = false;
      fetchingRef.current = false;
    };
  }, [fetchProducts, fetchOfferProducts, fetchNearbyShops]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      toast.info(`Searching for: ${searchQuery}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
                {userAuth.user?.profilePicture ? (
                  <img src={userAuth.user.profilePicture} alt="Profile" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">Welcome back!</p>
                <p className="text-sm text-gray-600">{userAuth.user?.name || 'User'}</p>
              </div>
            </div>
            <button className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors border border-gray-200">
              <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </div>
          
          {/* Location Display */}
          {userAuth.user?.location?.address && (
            <div className="mb-6 flex items-center text-sm text-gray-600 bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
              <svg className="h-5 w-5 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <p className="font-medium text-blue-900">Delivering to</p>
                <p className="text-blue-700">{userAuth.user.location.address}</p>
              </div>
            </div>
          )}
          
          {/* Professional Search Bar */}
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search products, brands, or categories..."
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <button 
                type="submit" 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured Offers Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Special Offers</h2>
              <p className="text-gray-600">Limited time deals</p>
            </div>
            <Link 
              to="/user/offers" 
              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center group"
            >
              View All
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          <div className="relative">
            <div className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide">
              {offerProducts.length > 0 ? (
                offerProducts.map((product) => (
                  <div key={product._id} className="flex-shrink-0 w-80">
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 h-44 relative overflow-hidden border border-orange-100 hover:shadow-lg transition-all duration-300 group">
                      <div className="flex flex-col justify-between h-full relative z-10">
                        <div>
                          <span className="bg-red-600 text-white text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wide">
                            Special Deal
                          </span>
                          <h3 className="font-bold mt-3 text-gray-900 text-lg">{product.name}</h3>
                        </div>
                        <div>
                          <p className="text-gray-700 text-sm font-medium mb-3">
                            Save up to {Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)}%
                          </p>
                          <Link 
                            to={`/user/product/${product._id}`}
                            className="inline-flex items-center bg-white hover:bg-gray-50 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border border-red-200 hover:border-red-300"
                          >
                            Shop Now
                            <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                      {product.images && product.images[0] && (
                        <img 
                          src={product.images[0]} 
                          alt={product.name} 
                          className="absolute right-4 bottom-4 h-28 w-28 object-cover rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-lg"
                        />
                      )}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/20 rounded-full -translate-y-16 translate-x-16"></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-shrink-0 w-80">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 h-44 relative overflow-hidden border border-gray-200">
                    <div className="flex flex-col justify-between h-full">
                      <div>
                        <span className="bg-gray-400 text-white text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wide">
                          Coming Soon
                        </span>
                        <h3 className="font-bold mt-3 text-gray-700 text-lg">New Offers</h3>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm font-medium mb-3">Exciting deals coming soon</p>
                        <Link 
                          to="/user/shop" 
                          className="inline-flex items-center bg-white hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border border-gray-300"
                        >
                          Browse Products
                          <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Shop by Category</h2>
              <p className="text-gray-600">Find what you're looking for</p>
            </div>
            <Link 
              to="/user/categories" 
              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center group"
            >
              View All
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <Link to="/user/categories/women" className="group">
              <div className="bg-white border border-gray-200 hover:border-pink-300 rounded-2xl p-6 text-center transition-all duration-200 hover:shadow-md">
                <div className="w-16 h-16 mx-auto mb-4 bg-pink-50 group-hover:bg-pink-100 rounded-2xl flex items-center justify-center transition-colors">
                  <svg className="h-8 w-8 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 group-hover:text-pink-600 transition-colors">Women's Fashion</p>
                  <p className="text-sm text-gray-500 mt-1">Latest trends & styles</p>
                </div>
              </div>
            </Link>
            
            <Link to="/user/categories/men" className="group">
              <div className="bg-white border border-gray-200 hover:border-blue-300 rounded-2xl p-6 text-center transition-all duration-200 hover:shadow-md">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 group-hover:bg-blue-100 rounded-2xl flex items-center justify-center transition-colors">
                  <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Men's Fashion</p>
                  <p className="text-sm text-gray-500 mt-1">Professional & casual wear</p>
                </div>
              </div>
            </Link>
            
            <Link to="/user/categories/kids" className="group">
              <div className="bg-white border border-gray-200 hover:border-green-300 rounded-2xl p-6 text-center transition-all duration-200 hover:shadow-md">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-50 group-hover:bg-green-100 rounded-2xl flex items-center justify-center transition-colors">
                  <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 group-hover:text-green-600 transition-colors">Kids' Collection</p>
                  <p className="text-sm text-gray-500 mt-1">Comfort & style for children</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Nearby Shops */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Nearby Shops</h2>
              <p className="text-gray-600">Discover local businesses</p>
            </div>
            <Link 
              to="/user/nearby-shops" 
              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center group"
            >
              View All
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          {loadingShops ? (
            <div className="flex justify-center py-12 bg-white rounded-2xl border border-gray-200">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
                <span className="text-gray-600 font-medium">Finding shops near you...</span>
              </div>
            </div>
          ) : shops.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shops.slice(0, 6).map((shop, index) => (
                <Link key={shop._id || index} to={`/user/shop/${shop._id}`} className="group">
                  <div className="bg-white border border-gray-200 hover:border-blue-300 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg">
                    <div className="h-48 bg-gray-100 relative overflow-hidden">
                      {getShopImage(shop) ? (
                        <img 
                          src={getShopImage(shop)} 
                          alt={shop.shop?.name || 'Shop'} 
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            console.log('❌ Shop image failed to load:', getShopImage(shop));
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      
                      <div 
                        className={`h-full w-full flex items-center justify-center bg-gray-100 ${getShopImage(shop) ? 'hidden' : 'flex'}`}
                      >
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                          </div>
                          <span className="text-sm text-gray-500 font-medium">{shop.shop?.name}</span>
                        </div>
                      </div>
                      
                      {shop.shop?.images?.length > 1 && (
                        <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-medium">
                          +{shop.shop.images.length - 1} photos
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6">
                      <div className="flex items-center mb-3">
                        <StarRating rating={shop.averageRating || 4.9} className="text-sm" />
                        <span className="text-sm text-gray-500 ml-2">({shop.numReviews || Math.floor(Math.random() * 90) + 10})</span>
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 mb-2">{shop.shop?.name || 'Shop Name'}</h3>
                      
                      {shop.shop?.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {shop.shop.description.length > 60 ? shop.shop.description.substring(0, 60) + '...' : shop.shop.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-bold text-blue-600">
                          Starting at ₹{shop.zammerPrice?.toFixed(2) || '299'}
                        </p>
                        
                        {shop.distanceText && (
                          <p className="text-sm text-green-600 font-medium flex items-center">
                            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            {shop.distanceText}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-300">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">No Shops Found</h3>
              <p className="text-gray-600">We're working to bring more shops to your area.</p>
            </div>
          )}
        </div>

        {/* Recommended Shops */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Recommended for You</h2>
              <p className="text-gray-600">Curated based on your preferences</p>
            </div>
            <Link 
              to="/user/recommended-shops" 
              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center group"
            >
              View All
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          {loadingShops ? (
            <div className="flex justify-center py-12 bg-white rounded-2xl border border-gray-200">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-purple-600 mx-auto mb-4"></div>
                <span className="text-gray-600 font-medium">Finding perfect recommendations...</span>
              </div>
            </div>
          ) : recommendedShops.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendedShops.slice(0, 4).map((shop, index) => (
                <Link key={shop._id || `rec-${index}`} to={`/user/shop/${shop._id}`} className="group">
                  <div className="bg-white border border-gray-200 hover:border-purple-300 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg">
                    <div className="h-40 bg-gray-100 relative overflow-hidden">
                      {getShopImage(shop) ? (
                        <img 
                          src={getShopImage(shop)} 
                          alt={shop.shop?.name || 'Shop'} 
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            console.log('❌ Recommended shop image failed to load:', getShopImage(shop));
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      
                      <div 
                        className={`h-full w-full flex items-center justify-center bg-gray-100 ${getShopImage(shop) ? 'hidden' : 'flex'}`}
                      >
                        <div className="text-center">
                          <div className="w-12 h-12 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-2">
                            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                          </div>
                          <span className="text-xs text-gray-500 font-medium">{shop.shop?.name}</span>
                        </div>
                      </div>
                      
                      <div className="absolute top-3 left-3 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                        Recommended
                      </div>
                      
                      {shop.shop?.images?.length > 1 && (
                        <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded-full text-xs font-medium">
                          +{shop.shop.images.length - 1} more
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-center mb-2">
                        <StarRating rating={shop.averageRating || 4.9} className="text-xs" />
                        <span className="text-xs text-gray-500 ml-2">({shop.numReviews || Math.floor(Math.random() * 90) + 10})</span>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">{shop.shop?.name || 'Shop Name'}</h3>
                      
                      {shop.shop?.description && (
                        <p className="text-gray-600 text-xs mb-2 line-clamp-2">
                          {shop.shop.description.length > 40 ? shop.shop.description.substring(0, 40) + '...' : shop.shop.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-purple-600">From ₹{shop.zammerPrice?.toFixed(2) || '299'}</p>
                        
                        {shop.distanceText && (
                          <p className="text-xs text-green-600 font-medium flex items-center">
                            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            {shop.distanceText}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-300">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">No Recommendations Yet</h3>
              <p className="text-gray-600">Browse our shops to get personalized recommendations.</p>
            </div>
          )}
        </div>
      </div>

      {/* Professional Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <Link to="/user/dashboard" className="flex flex-col items-center py-2 flex-1 text-blue-600 group">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-1 group-hover:bg-blue-100 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="text-xs font-semibold">Home</span>
            </Link>
            
            <Link to="/user/shop" className="flex flex-col items-center py-2 flex-1 text-gray-500 hover:text-blue-600 transition-colors group">
              <div className="w-10 h-10 bg-gray-50 group-hover:bg-blue-50 rounded-xl flex items-center justify-center mb-1 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <span className="text-xs font-medium">Shop</span>
            </Link>
            
            <Link to="/user/cart" className="flex flex-col items-center py-2 flex-1 text-gray-500 hover:text-blue-600 transition-colors group">
              <div className="w-10 h-10 bg-gray-50 group-hover:bg-blue-50 rounded-xl flex items-center justify-center mb-1 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-xs font-medium">Cart</span>
            </Link>
            
            <Link to="/user/trending" className="flex flex-col items-center py-2 flex-1 text-gray-500 hover:text-blue-600 transition-colors group">
              <div className="w-10 h-10 bg-gray-50 group-hover:bg-blue-50 rounded-xl flex items-center justify-center mb-1 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-xs font-medium">Trending</span>
            </Link>
            
            <Link to="/user/limited-edition" className="flex flex-col items-center py-2 flex-1 text-gray-500 hover:text-blue-600 transition-colors group">
              <div className="w-10 h-10 bg-gray-50 group-hover:bg-blue-50 rounded-xl flex items-center justify-center mb-1 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <span className="text-xs font-medium">Limited</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;