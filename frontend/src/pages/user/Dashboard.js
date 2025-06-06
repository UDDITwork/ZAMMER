import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import { AuthContext } from '../../contexts/AuthContext';
import socketService from '../../services/socketService';
import { getMarketplaceProducts } from '../../services/productService';
import { getNearbyShops } from '../../services/userService';
import { updateLocation } from '../../utils/locationUtils';
import RealTimeOrderTracker from '../../components/RealTimeOrderTracker';
import orderService from '../../services/orderService';
import productService from '../../services/productService';
import cartService from '../../services/cartService';
import api from '../../services/api';

const Dashboard = () => {
  const { userAuth, logoutUser, updateUser } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingShops, setLoadingShops] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [locationUpdated, setLocationUpdated] = useState(false);
  const [showOrderTracker, setShowOrderTracker] = useState(false);
  const [activeOrders, setActiveOrders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  
  // 🎯 FIX: Add refs to prevent multiple calls
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const navigate = useNavigate();

  // 🎯 FIX: Memoize ALL fetch functions to prevent infinite loops
  const fetchProducts = useCallback(async () => {
    if (fetchingRef.current || !isMountedRef.current) return;
    
    fetchingRef.current = true;
    setLoading(true);
    try {
      console.log('🔍 Fetching marketplace products...');
      const response = await getMarketplaceProducts({
        page: 1,
        limit: 8
      });
      if (response.success && isMountedRef.current) {
        setProducts(response.data);
        console.log('✅ Products fetched successfully:', response.data.length);
      } else {
        console.log('⚠️ Products fetch response:', response);
        toast.error(response.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      toast.error(error.message || 'Something went wrong');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, []); // No dependencies to prevent loops

  const fetchTrendingProducts = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      console.log('📈 Fetching trending products...');
      const response = await getMarketplaceProducts({
        page: 1,
        limit: 4,
        isTrending: true
      });
      if (response.success && isMountedRef.current) {
        setTrendingProducts(response.data);
        console.log('✅ Trending products fetched:', response.data.length);
      }
    } catch (error) {
      console.error('❌ Error fetching trending products:', error);
    }
  }, []); // No dependencies

  const fetchNearbyShops = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setLoadingShops(true);
    try {
      console.log('🏪 [Dashboard] Starting to fetch nearby shops...');
      console.log('🏪 [Dashboard] User auth state:', {
        isAuthenticated: userAuth.isAuthenticated,
        userId: userAuth.user?._id,
        userLocation: userAuth.user?.location
      });
      
      const response = await getNearbyShops();
      console.log('🏪 [Dashboard] Nearby shops API response:', {
        success: response.success,
        count: response.count,
        message: response.message,
        data: response.data
      });
      
      if (response.success && isMountedRef.current) {
        console.log('✅ [Dashboard] Shops fetched successfully:', response.data?.length || 0);
        console.log('🏪 [Dashboard] First shop data:', response.data?.[0]);
        setShops(response.data || []);
        
        if (response.data.length === 0) {
          console.log('⚠️ [Dashboard] No shops returned from API');
          toast.info('No nearby shops found. Please check your location.');
        }

        // 🎯 NEW: Log distance information
        if (response.data && response.data.length > 0) {
          console.log('📊 [Dashboard] Shops with distances:');
          response.data.slice(0, 3).forEach((shop, index) => {
            console.log(`  ${index + 1}. ${shop.shop?.name} - ${shop.distanceText || 'No distance'}`);
          });
        }
      } else {
        console.log('❌ [Dashboard] Shops fetch failed:', response);
        toast.error(response.message || 'Failed to fetch nearby shops');
      }
    } catch (error) {
      console.error('❌ [Dashboard] Error fetching shops:', error);
      toast.error('Failed to fetch nearby shops');
    } finally {
      if (isMountedRef.current) {
        setLoadingShops(false);
      }
    }
  }, [userAuth.user?.location]);

  const fetchOrders = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      console.log('📦 Fetching user orders...');
      const response = await orderService.getUserOrders();
      if (response.success && isMountedRef.current) {
        setOrders(response.data);
        console.log('✅ Orders fetched successfully:', response.data.length);
      } else {
        console.log('⚠️ Orders fetch failed:', response.message);
        // Don't show error toast for orders - might be auth issue
      }
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      // Don't show error toast for orders
    }
  }, []); // No dependencies

  // 🎯 FIX: Enhanced location update with proper context update
  const requestLocationUpdate = useCallback(async () => {
    if (locationLoading || !navigator.geolocation) {
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by your browser.');
        toast.error('Geolocation not supported.');
      }
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    try {
      console.log('📍 Attempting to get current position...');
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 15000, // 15 seconds timeout
          enableHighAccuracy: true,
          maximumAge: 300000 // 5 minutes cache
        });
      });

      const { latitude, longitude } = position.coords;
      console.log('✅ Position obtained:', { latitude, longitude });

      // Use Google Geocoding API to get the address from coordinates
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error('❌ Google Maps API key not found!');
        setLocationError('Google Maps API key not configured.');
        toast.error('Location services not fully configured.');
        setLocationLoading(false);
        return;
      }

      console.log('📡 Calling Google Geocoding API...');
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;

      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();

      console.log('✅ Geocoding API response:', geocodeData);

      let formattedAddress = 'Location detected';
      if (geocodeData.results && geocodeData.results.length > 0) {
        formattedAddress = geocodeData.results[0].formatted_address;
        console.log('🏠 Formatted address:', formattedAddress);
      } else {
        console.warn('⚠️ No geocoding results found.');
        formattedAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      }

      // Create location object
      const newLocation = {
        coordinates: [longitude, latitude],
        address: formattedAddress
      };

      console.log('📍 New location object:', newLocation);
      setLocation(newLocation);

      // 🎯 FIX: Update user location in backend
      if (userAuth.isAuthenticated && userAuth.user) {
        try {
          console.log('💾 Updating user location in backend...');
          const updateResponse = await api.put('/users/profile', { 
            location: newLocation 
          });
          
          console.log('💾 Backend update response:', updateResponse.data);
          
          if (updateResponse.data.success) {
            console.log('✅ User location updated in backend.');
            
            // 🎯 FIX: Update the user in AuthContext
            const updatedUser = {
              ...userAuth.user,
              location: newLocation
            };
            
            // Update context if updateUser function exists
            if (updateUser) {
              updateUser(updatedUser);
            }
            
            toast.success('Location updated successfully!');
            setLocationUpdated(prev => !prev);
            
            // Refetch shops with new location
            fetchNearbyShops();
            
          } else {
            console.warn('⚠️ Failed to update user location in backend:', updateResponse.data.message);
            setLocationError('Failed to save location.');
            toast.error('Failed to save location.');
          }
        } catch (backendError) {
          console.error('❌ Backend location update failed:', backendError);
          setLocationError('Backend update error.');
          toast.error('Error saving location.');
        }
      } else {
        console.log('⚠️ User not authenticated, location update not persisted.');
        toast.success('Location detected!');
        // Still try to fetch shops even without saving
        fetchNearbyShops();
      }

    } catch (error) {
      console.error('❌ Location detection/geocoding error:', error);
      let errorMessage = 'Failed to detect location.';
      
      if (error.code === 1) {
        errorMessage = 'Location access denied. Please enable location permissions.';
      } else if (error.code === 2) {
        errorMessage = 'Location unavailable. Please try again.';
      } else if (error.code === 3) {
        errorMessage = 'Location request timed out. Please try again.';
      }
      
      setLocationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLocationLoading(false);
    }
  }, [locationLoading, fetchNearbyShops, userAuth.isAuthenticated, userAuth.user, updateUser]);

  // 🎯 FIX: Single useEffect with proper cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    // 🎯 FIX: Only fetch if user is authenticated
    if (!userAuth.isAuthenticated || !userAuth.user) {
      console.log('⚠️ User not authenticated, skipping data fetch');
      setLoading(false);
      setLoadingShops(false);
      return;
    }

    console.log('🚀 Dashboard: Starting data fetch for user:', userAuth.user.name);
    console.log('🚀 Dashboard: User location:', userAuth.user.location);
    
    // Fetch all data once
    const initializeData = async () => {
      try {
        await Promise.all([
          fetchProducts(),
          fetchTrendingProducts(),
          fetchOrders()
        ]);
        
        // Fetch shops separately with location dependency
        await fetchNearbyShops();
      } catch (error) {
        console.error('❌ Error initializing dashboard data:', error);
      }
    };

    initializeData();

    // 🎯 FIX: Auto-detect location if not set
    if (!userAuth.user.location || !userAuth.user.location.address) {
      console.log('📍 No user location found, attempting auto-detection...');
      setTimeout(() => {
        requestLocationUpdate();
      }, 1000); // Small delay to let component settle
    }

    // 🎯 FIX: Cleanup function
    return () => {
      isMountedRef.current = false;
      fetchingRef.current = false;
    };
  }, [userAuth.isAuthenticated, userAuth.user?._id]); // Only depend on auth state

  // 🎯 FIX: Separate useEffect for socket connection with cleanup
  useEffect(() => {
    if (!userAuth.isAuthenticated || !userAuth.user?._id) return;

    console.log('🔌 Setting up socket connection for user:', userAuth.user._id);
    
    // Connect to socket
    socketService.connect();
    socketService.joinBuyerRoom(userAuth.user._id);

    // Listen for order status updates
    const handleOrderUpdate = (data) => {
      console.log('📦 Order status update received:', data);
      setActiveOrders(prev => {
        const updated = prev.map(order => 
          order._id === data._id ? { ...order, status: data.status } : order
        );
        return updated;
      });
      
      toast.info(`Order ${data.orderNumber} status updated to ${data.status}`);
      if (data.status === 'Cancelled') {
        toast.warning(`Order #${data.orderNumber} has been cancelled`);
      }
      // Refresh orders list
      fetchOrders();
    };

    const handleNewOrder = (data) => {
      console.log('🎉 New order received:', data);
      setActiveOrders(prev => [...prev, data]);
      toast.success(`New order ${data.orderNumber} received!`);
      fetchOrders();
    };

    socketService.onOrderStatusUpdate(handleOrderUpdate);
    socketService.onNewOrder(handleNewOrder);

    // 🎯 FIX: Proper cleanup
    return () => {
      console.log('🧹 Cleaning up socket connection');
      socketService.removeListener('order-status-update');
      socketService.removeListener('new-order');
      socketService.disconnect();
    };
  }, [userAuth.user?._id, fetchOrders]); // Minimal dependencies

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

  const handleLogout = () => {
    logoutUser();
    navigate('/user/login');
    toast.success('Logged out successfully');
  };

  // Function to truncate text
  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  };

  // 🎯 NEW: Toggle order tracker visibility
  const toggleOrderTracker = () => {
    setShowOrderTracker(prev => !prev);
  };

  // 🎯 FIX: Don't render if not authenticated
  if (!userAuth.isAuthenticated) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-rose-50 to-pink-50">
          <div className="text-center bg-white p-8 rounded-3xl shadow-2xl border border-orange-100 max-w-sm mx-4">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-orange-100 to-pink-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">Welcome Back!</h2>
            <p className="text-gray-600 mb-6">Please log in to access your personalized dashboard</p>
            <Link 
              to="/user/login" 
              className="inline-block bg-gradient-to-r from-orange-500 to-pink-500 text-white px-8 py-3 rounded-full font-semibold hover:from-orange-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="user-dashboard pb-20 bg-gradient-to-br from-gray-50 via-orange-25 to-pink-25 min-h-screen">
        {/* Enhanced Header with Gradient */}
        <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-pink-500 text-white p-6 shadow-xl relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
          
          <div className="container mx-auto relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                  <span className="text-2xl font-bold">Z</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-wide">Zammer</h1>
                  <p className="text-orange-100 text-sm">Premium Marketplace</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link to="/user/profile" className="text-white/90 hover:text-white transition-colors">
                  <div className="text-right">
                    <p className="text-sm opacity-90">Welcome back,</p>
                    <p className="font-semibold">{userAuth.user?.name}</p>
                  </div>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/30 transition-all duration-300 border border-white/30"
                >
                  Logout
                </button>
              </div>
            </div>
            
            {/* Enhanced location display */}
            {userAuth.user?.location?.address && (
              <div className="mt-4 flex items-center text-white/90 text-sm bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{userAuth.user.location.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Location Indicator */}
        {userAuth.user?.location?.address ? (
          <div
            className="p-4 flex items-center justify-between text-sm text-gray-700 cursor-pointer hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-all duration-300 group"
            onClick={requestLocationUpdate}
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-pink-100 rounded-full flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-800">Your Location</div>
                <div className="text-gray-600">{userAuth.user.location.address}</div>
              </div>
            </div>
            <div className="flex items-center text-orange-500">
              {locationLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500 mr-2"></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:rotate-180 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <span className="text-sm font-medium">Refresh</span>
            </div>
          </div>
        ) : (
          <div
            className="p-4 flex items-center justify-between text-sm cursor-pointer hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-all duration-300 border-l-4 border-gradient-to-b border-orange-500 group"
            onClick={requestLocationUpdate}
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-pink-100 rounded-full flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                {locationLoading ? (
                  <span className="font-semibold text-orange-600">Detecting your location...</span>
                ) : locationError ? (
                  <div>
                    <div className="font-semibold text-red-600">Location Error</div>
                    <div className="text-red-500 text-xs">{locationError}</div>
                  </div>
                ) : (
                  <div>
                    <div className="font-semibold text-gray-800">Location not set</div>
                    <div className="text-gray-600 text-xs">Tap to detect your location for personalized recommendations</div>
                  </div>
                )}
              </div>
            </div>
            {!locationLoading && (
              <div className="flex items-center bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:from-orange-600 hover:to-pink-600 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Detect</span>
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          {/* Enhanced Quick Actions */}
          <div className="flex justify-end items-center space-x-6 mb-8">
            {/* My Orders Quick Action */}
            <Link 
              to="/user/my-orders" 
              className="flex flex-col items-center text-sm text-gray-700 hover:text-orange-500 transition-all duration-300 group"
            >
              <div className="w-14 h-14 mx-auto mb-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border border-blue-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <span className="text-xs font-semibold">My Orders</span>
            </Link>
             
            {/* Live Tracking Quick Action */}
            <button 
              onClick={toggleOrderTracker}
              className="flex flex-col items-center text-sm text-gray-700 hover:text-orange-500 transition-all duration-300 group"
            >
              <div className="w-14 h-14 mx-auto mb-2 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border border-green-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xs font-semibold">Live Tracking</span>
            </button>
             
            {/* User Profile Quick Action */}
            <Link 
              to="/user/profile" 
              className="flex flex-col items-center text-sm text-gray-700 hover:text-orange-500 transition-all duration-300 group"
            >
              <div className="w-14 h-14 mx-auto mb-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border border-purple-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-xs font-semibold">My Profile</span>
            </Link>
          </div>
          
          {/* Enhanced Welcome Section */}
          <div className="mb-8 bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
                  Welcome back, {userAuth.user?.name || 'User'}! 🎉
                </h2>
                <p className="text-gray-600">Discover amazing products from local sellers near you.</p>
              </div>
              <div className="hidden md:block w-20 h-20 bg-gradient-to-br from-orange-100 to-pink-100 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Enhanced Best Offer Carousel */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">✨ Best Offers for You</h2>
              <Link to="/user/offers" className="text-orange-500 hover:text-orange-600 font-medium text-sm flex items-center group">
                View All
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="relative overflow-hidden rounded-2xl">
              <div className="flex overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                {trendingProducts.length > 0 ? (
                  trendingProducts.map((product, index) => (
                    <div key={product._id} className="flex-shrink-0 w-3/4 mr-6" style={{ minWidth: '280px' }}>
                      <div className="bg-gradient-to-r from-yellow-100 via-yellow-200 to-orange-100 rounded-2xl overflow-hidden h-44 relative shadow-lg hover:shadow-xl transition-all duration-300 group border border-yellow-200">
                        <div className="p-6 flex flex-col justify-between h-full relative z-10">
                          <div>
                            <span className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs px-3 py-1.5 rounded-full font-semibold shadow-md">SPECIAL OFFER</span>
                            <h3 className="font-bold mt-3 text-gray-800 text-lg">{product.name}</h3>
                          </div>
                          <div>
                            <p className="text-gray-700 text-sm font-medium mb-2">Up to {Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)}% off</p>
                            <Link to={`/user/product/${product._id}`} className="inline-block bg-white text-orange-600 px-4 py-2 rounded-full text-sm font-bold hover:bg-orange-50 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105">
                              Shop Now →
                            </Link>
                          </div>
                        </div>
                        {product.images && product.images.length > 0 && (
                          <img 
                            src={product.images[0]} 
                            alt={product.name} 
                            className="absolute right-4 bottom-4 h-32 object-cover rounded-xl group-hover:scale-110 transition-transform duration-300"
                            style={{ maxWidth: '40%' }}
                          />
                        )}
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -translate-y-16 translate-x-16"></div>
                        <div className="absolute bottom-0 left-0 w-20 h-20 bg-orange-300/30 rounded-full -translate-y-10 -translate-x-10"></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex-shrink-0 w-3/4 mr-6" style={{ minWidth: '280px' }}>
                    <div className="bg-gradient-to-r from-yellow-100 via-yellow-200 to-orange-100 rounded-2xl overflow-hidden h-44 relative shadow-lg border border-yellow-200">
                      <div className="p-6 flex flex-col justify-between h-full">
                        <div>
                          <span className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs px-3 py-1.5 rounded-full font-semibold">SPRING FASHION</span>
                          <h3 className="font-bold mt-3 text-gray-800 text-lg">Spring Collection</h3>
                        </div>
                        <div>
                          <p className="text-gray-700 text-sm font-medium mb-2">Up to 50% off</p>
                          <Link to="/user/shop" className="inline-block bg-white text-orange-600 px-4 py-2 rounded-full text-sm font-bold hover:bg-orange-50 transition-all duration-300 shadow-md">
                            Shop Now →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Fashion Categories */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">🛍️ Fashion Categories</h2>
              <Link to="/user/categories" className="text-orange-500 hover:text-orange-600 font-medium text-sm flex items-center group">
                See All
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <Link to="/user/categories/men" className="category-card group">
                <div className="bg-white rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-100 group-hover:border-blue-200 group-hover:scale-105">
                  <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-gray-800 group-hover:text-blue-600 transition-colors duration-300">Men</span>
                </div>
              </Link>
              <Link to="/user/categories/women" className="category-card group">
                <div className="bg-white rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all duration-300 border border-pink-100 group-hover:border-pink-200 group-hover:scale-105">
                  <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-pink-100 to-pink-200 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-gray-800 group-hover:text-pink-600 transition-colors duration-300">Women</span>
                </div>
              </Link>
              <Link to="/user/categories/kids" className="category-card group">
                <div className="bg-white rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all duration-300 border border-green-100 group-hover:border-green-200 group-hover:scale-105">
                  <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-gray-800 group-hover:text-green-600 transition-colors duration-300">Kids</span>
                </div>
              </Link>
              <Link to="/user/categories/all" className="category-card group">
                <div className="bg-white rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all duration-300 border border-purple-100 group-hover:border-purple-200 group-hover:scale-105">
                  <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-gray-800 group-hover:text-purple-600 transition-colors duration-300">All</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Enhanced Nearby Shops */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">🏪 Nearby Shops</h2>
              <Link to="/user/nearby-shops" className="text-orange-500 hover:text-orange-600 font-medium text-sm flex items-center group">
                See All
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          
          {loadingShops ? (
              <div className="flex justify-center py-12 bg-white rounded-2xl shadow-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500 mx-auto mb-4"></div>
                  <span className="text-gray-600 font-medium">Finding amazing shops near you...</span>
                </div>
              </div>
          ) : shops.length > 0 ? (
              <div className="overflow-x-auto -mx-4 px-4">
                <div className="flex space-x-6">
              {shops.map(shop => (
                    <div key={shop._id} className="flex-shrink-0 w-72 rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white hover:shadow-xl transition-all duration-300 group hover:scale-105">
                      <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
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
                            <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                              </svg>
                            </div>
                            <span className="text-sm text-orange-700 font-bold">{shop.shop?.name}</span>
                          </div>
                        </div>
                        
                        {/* Enhanced Rating Chip */}
                        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center space-x-1 text-sm shadow-lg border border-white/50">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="font-bold">4.9</span>
                          <span className="text-gray-500 text-xs">({Math.floor(Math.random() * 100) + 10})</span>
                        </div>
                        
                        {/* Image indicator */}
                        {shop.shop?.images?.length > 1 && (
                          <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                            +{shop.shop.images.length - 1} more
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4">
                        <h3 className="font-bold text-gray-800 truncate text-lg mb-1">{shop.shop?.name || 'Shop Name'}</h3>
                        {/* 🎯 NEW: Distance display */}
                        {shop.distanceText && (
                          <div className="text-green-600 text-xs font-semibold mb-2 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            {shop.distanceText}
                          </div>
                        )}
                        <p className="text-sm text-orange-600 font-medium mb-2">{shop.shop?.category || 'Fashion'} Fashion</p>
                        
                        {/* Shop description if available */}
                        {shop.shop?.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                            {truncateText(shop.shop.description, 80)}
                          </p>
                        )}
                        
                        <p className="text-sm text-gray-500 mb-4 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>1.5 km from you</span>
                        </p>
                        <div className="mb-4 text-sm">
                          <span className="text-gray-700">Price starts from </span>
                          <span className="text-orange-600 font-bold text-lg">₹230</span>
                        </div>
                  <Link
                    to={`/user/shop/${shop._id}`}
                          className="block text-center bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white py-3 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    Explore Shop →
                  </Link>
                      </div>
                </div>
              ))}
                </div>
            </div>
          ) : (
              <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Nearby Shops Found</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {userAuth.user?.location?.address 
                    ? "We couldn't find any shops in your area yet. Check back soon!" 
                    : "Please set your location to discover amazing shops around you."
                  }
                </p>
                {!userAuth.user?.location?.address && (
                  <button
                    onClick={requestLocationUpdate}
                    disabled={locationLoading}
                    className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white px-8 py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none"
                  >
                    {locationLoading ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Detecting...
                      </span>
                    ) : (
                      'Detect My Location 📍'
                    )}
                  </button>
                )}
            </div>
          )}
        </div>

          {/* Enhanced Featured Products */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">⭐ Featured Products</h2>
              <Link to="/user/products" className="text-orange-500 hover:text-orange-600 font-medium text-sm flex items-center group">
                See All
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          
          {loading ? (
              <div className="flex justify-center py-12 bg-white rounded-2xl shadow-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500 mx-auto mb-4"></div>
                  <span className="text-gray-600 font-medium">Loading amazing products...</span>
                </div>
              </div>
          ) : products.length > 0 ? (
              <div className="grid grid-cols-2 gap-6">
                {products.slice(0, 4).map(product => (
                  <div key={product._id} className="product-card border border-gray-200 rounded-2xl overflow-hidden shadow-lg bg-white hover:shadow-xl transition-all duration-300 group hover:scale-105">
                    <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200">
                    {product.images && product.images.length > 0 ? (
                      <img 
                        src={product.images[0]} 
                        alt={product.name} 
                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-100 to-gray-200">
                        <div className="text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm">No image</span>
                        </div>
                      </div>
                    )}
                      <button className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-white transition-all duration-300 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                  </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-800 mb-2">{truncateText(product.name, 30)}</h3>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <span className="text-orange-600 font-bold text-lg">₹{product.zammerPrice}</span>
                        {product.mrp > product.zammerPrice && (
                            <span className="text-gray-400 text-sm line-through ml-2">₹{product.mrp}</span>
                          )}
                          {product.mrp > product.zammerPrice && (
                            <div className="text-green-600 text-sm font-semibold">
                              {Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)}% off
                            </div>
                          )}
                        </div>
                    </div>
                    <Link
                      to={`/user/product/${product._id}`}
                        className="block text-center bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white py-2.5 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
              <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              <p className="text-gray-600 font-medium">No products available at the moment.</p>
            </div>
          )}
          </div>

          {/* Enhanced Real-Time Order Tracker Section */}
          {showOrderTracker && (
            <div className="mb-8 mt-10">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="flex justify-between items-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </span>
                    Live Order Tracking
                  </h2>
                  <button
                    onClick={toggleOrderTracker}
                    className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-300 shadow-md"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6">
                  <RealTimeOrderTracker orders={activeOrders} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default Dashboard;