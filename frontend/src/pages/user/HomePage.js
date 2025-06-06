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

  // 🎯 FIX: Add refs to prevent multiple calls
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);

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

  // 🎯 FIX: Memoize all fetch functions
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
        // Set recommended shops as a subset or different sorting
        setRecommendedShops(response.data.slice().sort(() => 0.5 - Math.random()).slice(0, 4));

        // 🎯 NEW: Log distance information
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

  // 🎯 FIX: Single useEffect with proper cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    console.log('🚀 HomePage: Initializing...');
    
    // Fetch all data once
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

    // 🎯 FIX: Cleanup function
    return () => {
      console.log('🧹 HomePage: Cleaning up...');
      isMountedRef.current = false;
      fetchingRef.current = false;
    };
  }, []); // No dependencies to prevent loops

  // Function to handle search
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    // Navigate to search page or filter results
    if (searchQuery.trim()) {
      // Implementation will depend on routing setup
      // navigate(`/user/search?q=${searchQuery}`);
      toast.info(`Searching for: ${searchQuery}`);
    }
  };

  return (
    <div className="user-home-page bg-gradient-to-br from-gray-50 via-orange-25 to-pink-25 pb-20 min-h-screen">
      {/* Enhanced Header with Premium Design */}
      <div className="bg-white border-b border-gray-100 shadow-lg relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 opacity-60"></div>
        
        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-pink-100 rounded-2xl flex items-center justify-center overflow-hidden mr-4 shadow-lg border border-orange-200">
                {userAuth.user?.profilePicture ? (
                  <img src={userAuth.user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Hello! 👋</p>
                <p className="text-sm text-gray-600 font-medium">{userAuth.user?.name || 'Jerome Bell'}</p>
              </div>
            </div>
            <button className="p-3 bg-gradient-to-br from-orange-100 to-pink-100 rounded-2xl hover:from-orange-200 hover:to-pink-200 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </div>
          
          {/* Enhanced Location Display */}
          {userAuth.user?.location?.address && (
            <div className="mt-4 flex items-center text-sm text-gray-600 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 border border-gray-200 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>A-94, office no-80-1sector-4, Noida-201301</span>
            </div>
          )}
          
          {/* Enhanced Search Bar */}
          <form onSubmit={handleSearchSubmit} className="mt-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for products, shops, or categories..."
                className="w-full bg-white rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-lg border border-gray-200 transition-all duration-300 hover:shadow-xl"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <button type="submit" className="absolute left-4 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center hover:from-orange-600 hover:to-pink-600 transition-all duration-300 shadow-md hover:shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Enhanced Best Offer Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              ✨ Best Offers for You
            </h2>
            <Link to="/user/offers" className="text-orange-500 hover:text-orange-600 font-medium text-sm flex items-center group">
              View All
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          <div className="relative overflow-x-auto">
            <div className="flex space-x-6 overflow-x-auto pb-4 no-scrollbar">
              {offerProducts.length > 0 ? (
                offerProducts.map((product) => (
                  <div key={product._id} className="flex-shrink-0 w-80 h-40 relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-200 via-yellow-300 to-orange-200"></div>
                    <div className="absolute inset-0 p-6 flex flex-col justify-between relative z-10">
                      <div>
                        <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs px-3 py-1.5 rounded-full inline-block font-bold shadow-md">#SPRING DEALS</div>
                        <p className="text-lg font-bold mt-2 text-gray-800">Fashion Misfits</p>
                      </div>
                      <button className="bg-white text-orange-600 text-sm px-4 py-2 rounded-full w-fit font-bold hover:bg-orange-50 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105">
                        Shop Now →
                      </button>
                    </div>
                    {product.images && product.images[0] && (
                      <img 
                        src={product.images[0]} 
                        alt={product.name} 
                        className="absolute right-4 bottom-4 h-32 object-cover rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-lg"
                      />
                    )}
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full -translate-y-12 translate-x-12"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-orange-300/30 rounded-full -translate-y-8 -translate-x-8"></div>
                  </div>
                ))
              ) : (
                <div className="flex-shrink-0 w-80 h-40 relative rounded-2xl overflow-hidden shadow-lg border border-yellow-200">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-200 via-yellow-300 to-orange-200"></div>
                  <div className="absolute inset-0 p-6 flex flex-col justify-between">
                    <div>
                      <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs px-3 py-1.5 rounded-full inline-block font-bold">#SPRING DEALS</div>
                      <p className="text-lg font-bold mt-2 text-gray-800">Fashion Misfits</p>
                    </div>
                    <button className="bg-white text-orange-600 text-sm px-4 py-2 rounded-full w-fit font-bold hover:bg-orange-50 transition-all duration-300 shadow-md">
                      Shop Now →
                    </button>
                  </div>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full -translate-y-12 translate-x-12"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Fashion Categories */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              👗 Fashion Categories
            </h2>
            <Link to="/user/categories" className="text-orange-500 hover:text-orange-600 font-medium text-sm flex items-center group">
              View All
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <Link to="/user/categories/women" className="bg-white rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all duration-300 border border-yellow-100 group hover:border-yellow-200 hover:scale-105">
              <div className="h-24 mb-3 flex items-center justify-center bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl group-hover:rotate-3 transition-transform duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-200 to-yellow-300 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm font-bold text-gray-800 group-hover:text-yellow-700 transition-colors duration-300">Women</p>
              <p className="text-xs text-gray-500 font-medium">13 styles</p>
            </Link>
            
            <Link to="/user/categories/men" className="bg-white rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-100 group hover:border-blue-200 hover:scale-105">
              <div className="h-24 mb-3 flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl group-hover:rotate-3 transition-transform duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-200 to-blue-300 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm font-bold text-gray-800 group-hover:text-blue-700 transition-colors duration-300">Men</p>
              <p className="text-xs text-gray-500 font-medium">19 styles</p>
            </Link>
            
            <Link to="/user/categories/kids" className="bg-white rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all duration-300 border border-pink-100 group hover:border-pink-200 hover:scale-105">
              <div className="h-24 mb-3 flex items-center justify-center bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl group-hover:rotate-3 transition-transform duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-200 to-pink-300 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm font-bold text-gray-800 group-hover:text-pink-700 transition-colors duration-300">Kids</p>
              <p className="text-xs text-gray-500 font-medium">26 styles</p>
            </Link>
          </div>
        </div>

        {/* Enhanced Nearby Shops */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              🏪 Nearby Shops
            </h2>
            <Link to="/user/nearby-shops" className="text-orange-500 hover:text-orange-600 font-medium text-sm flex items-center group">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          {loadingShops ? (
            <div className="flex justify-center py-12 bg-white rounded-2xl shadow-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500 mx-auto mb-4"></div>
                <span className="text-gray-600 font-medium">Finding amazing shops...</span>
              </div>
            </div>
          ) : shops.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {shops.slice(0, 4).map((shop, index) => (
                <Link key={shop._id || index} to={`/user/shop/${shop._id}`} className="border border-gray-200 rounded-2xl overflow-hidden bg-white hover:shadow-xl transition-all duration-300 shadow-lg group hover:scale-105">
                  <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                    {/* Display actual shop images */}
                    {getShopImage(shop) ? (
                      <img 
                        src={getShopImage(shop)} 
                        alt={shop.shop?.name || 'Shop'} 
                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          console.log('❌ Shop image failed to load:', getShopImage(shop));
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    
                    {/* Enhanced Fallback placeholder */}
                    <div 
                      className={`h-full w-full flex items-center justify-center bg-gradient-to-br from-orange-100 via-orange-200 to-pink-100 ${getShopImage(shop) ? 'hidden' : 'flex'}`}
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                        </div>
                        <span className="text-xs text-orange-700 font-bold">{shop.shop?.name}</span>
                      </div>
                    </div>
                    
                    {/* Multiple images indicator */}
                    {shop.shop?.images?.length > 1 && (
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                        +{shop.shop.images.length - 1} more
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3">
                    <div className="flex items-center mb-2">
                      <StarRating rating={shop.averageRating || 4.9} className="text-xs" />
                      <span className="text-xs text-gray-500 ml-2 font-medium">({shop.numReviews || Math.floor(Math.random() * 90) + 10})</span>
                    </div>
                    <p className="text-sm font-bold mb-2 truncate text-gray-800">{shop.shop?.name || 'Shop Name'}</p>
                    
                    {/* Shop description preview */}
                    {shop.shop?.description && (
                      <p className="text-xs text-gray-600 mb-2 line-clamp-1">
                        {shop.shop.description.length > 40 ? shop.shop.description.substring(0, 40) + '...' : shop.shop.description}
                      </p>
                    )}
                    
                    <p className="text-sm font-medium text-gray-900">₹{shop.zammerPrice?.toFixed(2) || 'N/A'}</p>
                    
                    {/* 🎯 NEW: Distance display */}
                    {shop.distanceText && (
                      <p className="text-xs text-green-600 font-semibold flex items-center mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        {shop.distanceText}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl shadow-lg border-2 border-dashed border-gray-300">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="text-gray-600 text-sm font-medium">No nearby shops found.</p>
            </div>
          )}
        </div>

        {/* Enhanced Recommended Shops */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              💎 Recommended for You
            </h2>
            <Link to="/user/recommended-shops" className="text-orange-500 hover:text-orange-600 font-medium text-sm flex items-center group">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          {loadingShops ? (
            <div className="flex justify-center py-12 bg-white rounded-2xl shadow-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-500 mx-auto mb-4"></div>
                <span className="text-gray-600 font-medium">Finding perfect recommendations...</span>
              </div>
            </div>
          ) : recommendedShops.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {recommendedShops.slice(0, 4).map((shop, index) => (
                <Link key={shop._id || `rec-${index}`} to={`/user/shop/${shop._id}`} className="border border-gray-200 rounded-2xl overflow-hidden bg-white hover:shadow-xl transition-all duration-300 shadow-lg group hover:scale-105">
                  <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                    {/* Display actual shop images */}
                    {getShopImage(shop) ? (
                      <img 
                        src={getShopImage(shop)} 
                        alt={shop.shop?.name || 'Shop'} 
                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          console.log('❌ Recommended shop image failed to load:', getShopImage(shop));
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    
                    {/* Enhanced Fallback placeholder */}
                    <div 
                      className={`h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-100 via-purple-200 to-pink-100 ${getShopImage(shop) ? 'hidden' : 'flex'}`}
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                        </div>
                        <span className="text-xs text-purple-700 font-bold">{shop.shop?.name}</span>
                      </div>
                    </div>
                    
                    {/* Enhanced Recommended badge */}
                    <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                      ⭐ Recommended
                    </div>
                    
                    {/* Multiple images indicator */}
                    {shop.shop?.images?.length > 1 && (
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                        +{shop.shop.images.length - 1} more
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3">
                    <div className="flex items-center mb-2">
                      <StarRating rating={shop.averageRating || 4.9} className="text-xs" />
                      <span className="text-xs text-gray-500 ml-2 font-medium">({shop.numReviews || Math.floor(Math.random() * 90) + 10})</span>
                    </div>
                    <p className="text-sm font-bold mb-2 truncate text-gray-800">{shop.shop?.name || 'Shop Name'}</p>
                    
                    {/* Shop description preview */}
                    {shop.shop?.description && (
                      <p className="text-xs text-gray-600 mb-2 line-clamp-1">
                        {shop.shop.description.length > 40 ? shop.shop.description.substring(0, 40) + '...' : shop.shop.description}
                      </p>
                    )}
                    
                    <p className="text-sm font-medium text-gray-900">₹{shop.zammerPrice?.toFixed(2) || 'N/A'}</p>
                    
                    {/* 🎯 NEW: Distance display */}
                    {shop.distanceText && (
                      <p className="text-xs text-green-600 font-semibold flex items-center mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        {shop.distanceText}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl shadow-lg border-2 border-dashed border-gray-300">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="text-gray-600 text-sm font-medium">No recommended shops available yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 z-50 shadow-2xl">
        <div className="flex justify-between items-center px-2 py-3">
          <Link to="/user/dashboard" className="flex flex-col items-center justify-center py-2 flex-1 text-orange-500 group">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-pink-100 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="text-xs font-bold">Home</span>
          </Link>
          
          <Link to="/user/shop" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-orange-500 transition-colors duration-300 group">
            <div className="w-8 h-8 bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-orange-100 group-hover:to-pink-100 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <span className="text-xs font-medium">Shop</span>
          </Link>
          
          <Link to="/user/cart" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-orange-500 transition-colors duration-300 group">
            <div className="w-8 h-8 bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-orange-100 group-hover:to-pink-100 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-xs font-medium">Cart</span>
          </Link>
          
          <Link to="/user/trending" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-orange-500 transition-colors duration-300 group">
            <div className="w-8 h-8 bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-orange-100 group-hover:to-pink-100 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-xs font-medium">Trending</span>
          </Link>
          
          <Link to="/user/limited-edition" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-orange-500 transition-colors duration-300 group">
            <div className="w-8 h-8 bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-orange-100 group-hover:to-pink-100 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <span className="text-xs font-medium">Limited</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;