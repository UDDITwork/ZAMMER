// File: /frontend/src/pages/user/Dashboard.js

import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import { AuthContext } from '../../contexts/AuthContext';
import socketService from '../../services/socketService';
import { getMarketplaceProducts } from '../../services/productService';
import { getNearbyShops } from '../../services/userService';
import { updateLocation, getCurrentLocation, calculateDistance } from '../../utils/locationUtils';
import RealTimeOrderTracker from '../../components/RealTimeOrderTracker';
import orderService from '../../services/orderService';
import productService from '../../services/productService';
import cartService from '../../services/cartService';
import api from '../../services/api';
import WishlistButton from '../../components/common/WishlistButton';

// Safe JSON parsing helper
const safeJsonParse = (data, defaultValue = null) => {
  try {
    if (data === null || data === undefined || data === 'undefined') {
      return defaultValue;
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('JSON Parse Error:', error);
    return defaultValue;
  }
};

// Safe API call wrapper
const safeApiCall = async (apiFunction, fallbackValue = []) => {
  try {
    const response = await apiFunction();
    return response && response.success ? (response.data || fallbackValue) : fallbackValue;
  } catch (error) {
    console.error('Safe API Call Error:', error);
    return fallbackValue;
  }
};

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
  
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const locationUpdateRef = useRef(false); // Prevent multiple simultaneous updates
  const navigate = useNavigate();

  // Memoized fetch functions
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
      
      if (response && response.success && isMountedRef.current) {
        const productsData = Array.isArray(response.data) ? response.data : [];
        setProducts(productsData);
        console.log('✅ Products fetched successfully:', productsData.length);
      } else {
        setProducts([]);
        if (response && response.message) {
          toast.error(response.message);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      setProducts([]);
      const errorMessage = error?.response?.data?.message || error?.message || 'Something went wrong';
      toast.error(errorMessage);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, []);

  const fetchTrendingProducts = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      console.log('📈 Fetching trending products...');
      const response = await getMarketplaceProducts({
        page: 1,
        limit: 4,
        isTrending: true
      });
      
      if (response && response.success && isMountedRef.current) {
        const trendingData = Array.isArray(response.data) ? response.data : [];
        setTrendingProducts(trendingData);
        console.log('✅ Trending products fetched:', trendingData.length);
      } else {
        setTrendingProducts([]);
      }
    } catch (error) {
      console.error('❌ Error fetching trending products:', error);
      setTrendingProducts([]);
    }
  }, []);

  const fetchNearbyShops = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setLoadingShops(true);
    try {
      console.log('🏪 [Dashboard] Fetching nearby shops...');
      const response = await getNearbyShops();
      
      if (!response) {
        console.error('❌ [Dashboard] No response received from getNearbyShops');
        toast.error('No response from server');
        setShops([]);
        return;
      }

      if (!response.success && (!response.data || response.data.length === 0)) {
        console.error('❌ [Dashboard] API returned failure:', response.message);
        toast.error(response.message || 'Failed to fetch nearby shops');
        setShops([]);
        return;
      }

      const shopsData = Array.isArray(response.data) ? response.data : [];
      
      if (isMountedRef.current) {
        setShops(shopsData);
        console.log('🏪 [Dashboard] Set shops state with', shopsData.length, 'shops');
      }

      if (shopsData.length === 0) {
        console.log('ℹ️ [Dashboard] No shops found - showing empty state');
        if (response.success) {
          toast.info('No shops available in the database');
        }
      } else {
        console.log('✅ [Dashboard] Successfully loaded', shopsData.length, 'shops');
        toast.success(`Found ${shopsData.length} shops!`);
      }

    } catch (error) {
      console.error('❌ [Dashboard] Error fetching shops:', error);
      toast.error(`Failed to load shops: ${error.message}`);
      setShops([]);
      
    } finally {
      if (isMountedRef.current) {
        setLoadingShops(false);
      }
    }
  }, [userAuth.isAuthenticated, userAuth.user?._id]);

  const fetchOrders = useCallback(async () => {
    if (!userAuth.isAuthenticated || !userAuth.user?._id) {
      console.log('⚠️ User not authenticated, skipping orders fetch');
      return;
    }

    try {
      console.log('📦 Fetching user orders...');
      const response = await orderService.getMyOrders({
        page: 1,
        limit: 10
      });
      
      if (response && response.success && isMountedRef.current) {
        const ordersData = Array.isArray(response.data) ? response.data : [];
        setOrders(ordersData);
        
        const active = ordersData.filter(order => 
          !['Delivered', 'Cancelled'].includes(order.status)
        );
        setActiveOrders(active);
        
        console.log('✅ Orders fetched successfully:', ordersData.length);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      setOrders([]);
    }
  }, [userAuth.isAuthenticated, userAuth.user?._id]);

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
          timeout: 15000,
          enableHighAccuracy: true,
          maximumAge: 300000
        });
      });

      const { latitude, longitude } = position.coords;
      console.log('✅ Position obtained:', { latitude, longitude });

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

      const newLocation = {
        coordinates: [longitude, latitude],
        address: formattedAddress
      };

      console.log('📍 New location object:', newLocation);
      setLocation(newLocation);

      if (userAuth.isAuthenticated && userAuth.user) {
        // Prevent multiple simultaneous location updates
        if (locationUpdateRef.current) {
          console.log('⚠️ Location update already in progress, skipping...');
          return;
        }
        
        locationUpdateRef.current = true;
        
        try {
          console.log('💾 Updating user location in backend...');
          console.log('🔍 User auth status:', {
            isAuthenticated: userAuth.isAuthenticated,
            hasUser: !!userAuth.user,
            hasToken: !!userAuth.token,
            userId: userAuth.user?._id
          });
          
          const updateResponse = await api.put('/users/profile', { 
            location: newLocation 
          });
          
          console.log('💾 Backend update response:', updateResponse.data);
          
          if (updateResponse.data.success) {
            console.log('✅ User location updated in backend.');
            
            const updatedUser = {
              ...userAuth.user,
              location: newLocation
            };
            
            if (updateUser) {
              updateUser(updatedUser);
            }
            
            toast.success('Location updated successfully!');
            setLocationUpdated(prev => !prev);
            
            fetchNearbyShops();
            
            // Reset the update flag on success
            locationUpdateRef.current = false;
            
          } else {
            console.warn('⚠️ Failed to update user location in backend:', updateResponse.data.message);
            setLocationError('Failed to save location.');
            toast.error('Failed to save location.');
            locationUpdateRef.current = false;
          }
        } catch (backendError) {
          console.error('❌ Backend location update failed:', backendError);
          console.error('❌ Error details:', {
            message: backendError.message,
            response: backendError.response?.data,
            status: backendError.response?.status,
            statusText: backendError.response?.statusText
          });
          
          const errorMessage = backendError.response?.data?.message || 
                              backendError.message || 
                              'Unknown error occurred';
          
          setLocationError(`Backend update error: ${errorMessage}`);
            toast.error(`Error saving location: ${errorMessage}`);
        } finally {
          locationUpdateRef.current = false;
        }
      } else {
        console.log('⚠️ User not authenticated, location update not persisted.');
        toast.success('Location detected!');
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

  useEffect(() => {
    isMountedRef.current = true;
    
    if (!userAuth.isAuthenticated || !userAuth.user) {
      console.log('⚠️ User not authenticated, skipping data fetch');
      setLoading(false);
      setLoadingShops(false);
      return;
    }

    console.log('🚀 Dashboard: Starting data fetch for user:', userAuth.user.name);
    
    const initializeData = async () => {
      try {
        await Promise.all([
          fetchProducts(),
          fetchTrendingProducts(),
          fetchOrders()
        ]);
        
        await fetchNearbyShops();
      } catch (error) {
        console.error('❌ Error initializing dashboard data:', error);
      }
    };

    initializeData();

    // 🎯 CRITICAL FIX: Enhanced location check with change detection
    const checkAndUpdateLocation = async () => {
      if (!userAuth.user.location || !userAuth.user.location.coordinates) {
        console.log('📍 No user location found, attempting auto-detection...');
        setTimeout(() => {
          requestLocationUpdate();
        }, 1000);
        return;
      }

      // Check if location has changed significantly (>1km)
      try {
        const currentLocation = await getCurrentLocation();
        if (currentLocation && currentLocation.coordinates) {
          const distance = calculateDistance(
            userAuth.user.location.coordinates,
            currentLocation.coordinates
          );
          
          if (distance > 1) { // More than 1km difference
            console.log(`📍 Location changed by ${distance.toFixed(2)}km, updating...`);
            requestLocationUpdate();
          } else {
            console.log(`📍 Location unchanged (${distance.toFixed(2)}km difference)`);
          }
        }
      } catch (error) {
        console.log('📍 Could not check location change:', error.message);
      }
    };

    checkAndUpdateLocation();

    return () => {
      isMountedRef.current = false;
      fetchingRef.current = false;
    };
  }, [userAuth.isAuthenticated, userAuth.user?._id]);

  useEffect(() => {
    if (!userAuth.isAuthenticated || !userAuth.user?._id) return;

    console.log('🔌 Setting up socket connection for user:', userAuth.user._id);
    
    socketService.connect();
    socketService.joinBuyerRoom(userAuth.user._id);

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

    return () => {
      console.log('🧹 Cleaning up socket connection');
      socketService.removeListener('order-status-update');
      socketService.removeListener('new-order');
      socketService.disconnect();
    };
  }, [userAuth.user?._id]);

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

  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  };

  const toggleOrderTracker = () => {
    setShowOrderTracker(prev => !prev);
  };

  if (!userAuth.isAuthenticated) {
    return (
      <UserLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-blue-50 rounded-2xl flex items-center justify-center">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Welcome Back</h2>
              <p className="text-gray-600 mb-8">Please sign in to access your dashboard</p>
              <Link 
                to="/user/login" 
                className="inline-flex items-center justify-center w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Professional Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">Z</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                  <p className="text-sm text-gray-600">Welcome back, {userAuth.user?.name}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Link 
                  to="/user/profile" 
                  className="flex items-center space-x-3 text-gray-700 hover:text-orange-600 transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">Profile</span>
                </Link>
                
                <button 
                  onClick={handleLogout}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Location Bar */}
        {userAuth.user?.location?.address ? (
          <div className="bg-orange-50 border-b border-orange-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div 
                className="flex items-center justify-between py-3 cursor-pointer group"
                onClick={requestLocationUpdate}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-orange-900">Current Location</p>
                    <p className="text-sm text-orange-700">{userAuth.user.location.address}</p>
                  </div>
                </div>
                
                <div className="flex items-center text-orange-600 group-hover:text-orange-700">
                  {locationLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600 mr-2"></div>
                  ) : (
                    <svg className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  <span className="text-sm font-medium">Update</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border-b border-amber-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div 
                className="flex items-center justify-between py-3 cursor-pointer group"
                onClick={requestLocationUpdate}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    {locationLoading ? (
                      <p className="text-sm font-medium text-amber-900">Detecting your location...</p>
                    ) : locationError ? (
                      <div>
                        <p className="text-sm font-medium text-red-900">Location Error</p>
                        <p className="text-sm text-red-700">{locationError}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-amber-900">Location not set</p>
                        <p className="text-sm text-amber-700">Enable location for personalized recommendations</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {!locationLoading && (
                  <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Enable Location
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quick Actions */}
          <div className="mb-8">
            <div className="flex justify-end items-center space-x-4">
              <Link 
                to="/user/my-orders" 
                className="flex items-center space-x-2 bg-white border border-gray-200 hover:border-orange-300 px-4 py-3 rounded-xl transition-all duration-200 group"
              >
                <div className="w-8 h-8 bg-orange-50 group-hover:bg-orange-100 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-orange-600">My Orders</span>
              </Link>
               
              <button 
                onClick={toggleOrderTracker}
                className="flex items-center space-x-2 bg-white border border-gray-200 hover:border-green-300 px-4 py-3 rounded-xl transition-all duration-200 group"
              >
                <div className="w-8 h-8 bg-green-50 group-hover:bg-green-100 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-green-600">Track Orders</span>
              </button>
               
              <Link 
                to="/user/profile" 
                className="flex items-center space-x-2 bg-white border border-gray-200 hover:border-purple-300 px-4 py-3 rounded-xl transition-all duration-200 group"
              >
                <div className="w-8 h-8 bg-purple-50 group-hover:bg-purple-100 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-purple-600">Profile</span>
              </Link>
            </div>
          </div>
          
          {/* Welcome Section */}
          <div className="mb-12">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Welcome back, {userAuth.user?.name}
                  </h2>
                  <p className="text-lg text-gray-600">Discover quality products from trusted sellers</p>
                </div>
                <div className="hidden md:block w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center">
                  <svg className="h-10 w-10 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Trending Products Carousel */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Trending Products</h2>
                <p className="text-gray-600">Popular items this week</p>
              </div>
              <Link 
                to="/user/trending" 
                className="text-orange-600 hover:text-orange-700 font-medium text-sm flex items-center group"
              >
                View All
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            
            <div className="relative">
              <div className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide">
                {trendingProducts.length > 0 ? (
                  trendingProducts.map((product, index) => (
                    <Link 
                      key={product._id} 
                      to={`/user/product/${product._id}`} 
                      className="flex-shrink-0 w-80 group"
                      onClick={() => console.log('🛒 Navigating to product:', product._id, product.name)}
                    >
                      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 h-44 relative overflow-hidden border border-orange-100 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group-hover:border-orange-300">
                        <div className="flex flex-col justify-between h-full relative z-10">
                          <div className="pr-32">
                            <span className="bg-orange-600 text-white text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wide">
                              Featured
                            </span>
                            <h3 className="font-bold mt-3 text-gray-900 text-lg leading-tight break-words group-hover:text-orange-600 transition-colors">{product.name}</h3>
                          </div>
                          <div className="pr-32">
                            <p className="text-gray-700 text-sm font-medium mb-3">
                              Save up to {Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)}%
                            </p>
                            <div className="inline-flex items-center bg-white hover:bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border border-orange-200 hover:border-orange-300 group-hover:shadow-md">
                              View Product
                              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        {product.images && product.images.length > 0 && (
                          <img 
                            src={product.images[0]} 
                            alt={product.name} 
                            className="absolute right-4 bottom-4 h-28 w-28 object-cover rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-lg"
                          />
                        )}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/20 rounded-full -translate-y-16 translate-x-16 group-hover:bg-orange-300/30 transition-colors"></div>
                        {/* Click indicator */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="flex-shrink-0 w-80">
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 h-44 relative overflow-hidden border border-gray-200">
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <span className="bg-gray-400 text-white text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wide">
                            Coming Soon
                          </span>
                          <h3 className="font-bold mt-3 text-gray-700 text-lg">New Collection</h3>
                        </div>
                        <div>
                          <p className="text-gray-600 text-sm font-medium mb-3">Exciting products coming soon</p>
                          <Link 
                            to="/user/shop" 
                            className="inline-flex items-center bg-white hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border border-gray-300"
                          >
                            Browse Now
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

          {/* Product Categories */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Categories</h2>
                <p className="text-gray-600">Shop by category</p>
              </div>
              <Link 
                to="/user/categories" 
                className="text-orange-600 hover:text-orange-700 font-medium text-sm flex items-center group"
              >
                View All
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/user/categories/men" className="group">
                <div className="bg-white border border-gray-200 hover:border-orange-300 rounded-2xl p-6 text-center transition-all duration-200 hover:shadow-md">
                  <div className="w-16 h-16 mx-auto mb-4 bg-orange-50 group-hover:bg-orange-100 rounded-2xl flex items-center justify-center transition-colors">
                    <svg className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">Men's Fashion</span>
                </div>
              </Link>
              
              <Link to="/user/categories/women" className="group">
                <div className="bg-white border border-gray-200 hover:border-pink-300 rounded-2xl p-6 text-center transition-all duration-200 hover:shadow-md">
                  <div className="w-16 h-16 mx-auto mb-4 bg-pink-50 group-hover:bg-pink-100 rounded-2xl flex items-center justify-center transition-colors">
                    <svg className="h-8 w-8 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 group-hover:text-pink-600 transition-colors">Women's Fashion</span>
                </div>
              </Link>
              
              <Link to="/user/categories/kids" className="group">
                <div className="bg-white border border-gray-200 hover:border-green-300 rounded-2xl p-6 text-center transition-all duration-200 hover:shadow-md">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-50 group-hover:bg-green-100 rounded-2xl flex items-center justify-center transition-colors">
                    <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 group-hover:text-green-600 transition-colors">Kids' Fashion</span>
                </div>
              </Link>
              
              <Link to="/user/categories/all" className="group">
                <div className="bg-white border border-gray-200 hover:border-purple-300 rounded-2xl p-6 text-center transition-all duration-200 hover:shadow-md">
                  <div className="w-16 h-16 mx-auto mb-4 bg-purple-50 group-hover:bg-purple-100 rounded-2xl flex items-center justify-center transition-colors">
                    <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">All Categories</span>
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
                className="text-orange-600 hover:text-orange-700 font-medium text-sm flex items-center group"
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
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-orange-600 mx-auto mb-4"></div>
                  <span className="text-gray-600 font-medium">Finding shops near you...</span>
                </div>
              </div>
            ) : shops.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shops.slice(0, 6).map(shop => (
                  <div key={shop._id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 group hover:border-blue-300">
                    <div className="h-48 bg-gray-100 relative overflow-hidden">
                      {getShopImage(shop) ? (
                        <img 
                          src={getShopImage(shop)} 
                          alt={shop.shop?.name || 'Shop'} 
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      
                      <div 
                        className={`h-full w-full flex items-center justify-center bg-gray-100 ${getShopImage(shop) ? 'hidden' : 'flex'}`}
                      >
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                          </div>
                          <span className="text-sm text-gray-500 font-medium">{shop.shop?.name}</span>
                        </div>
                      </div>
                      
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/50">
                        <div className="flex items-center space-x-1 text-sm">
                          <svg className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="font-semibold text-gray-900">{shop.averageRating?.toFixed(1) || '4.8'}</span>
                          <span className="text-gray-500">({shop.numReviews || 0})</span>
                        </div>
                      </div>
                      
                      {shop.shop?.images?.length > 1 && (
                        <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-medium">
                          +{shop.shop.images.length - 1} photos
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6">
                      <h3 className="font-bold text-gray-900 text-lg mb-2">{shop.shop?.name || 'Shop Name'}</h3>
                      
                      {shop.distanceText && (
                        <div className="text-green-600 text-sm font-medium mb-2 flex items-center">
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          {shop.distanceText} away
                        </div>
                      )}
                      
                      <p className="text-orange-600 font-medium mb-4 bg-orange-50 px-3 py-1 rounded-full text-sm inline-block">
                        {shop.shop?.category || 'Fashion'} Store
                      </p>
                      
                      {shop.shop?.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {truncateText(shop.shop.description, 100)}
                        </p>
                      )}
                      
                      <Link
                        to={`/user/shop/${shop._id}`}
                        className="block text-center bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-xl font-semibold transition-colors duration-200"
                      >
                        Visit Shop
                      </Link>
                    </div>
                  </div>
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
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {userAuth.user?.location?.address 
                    ? "We couldn't find any shops in your area yet. Check back soon!" 
                    : "Please set your location to discover shops around you."
                  }
                </p>
                {!userAuth.user?.location?.address && (
                  <button
                    onClick={requestLocationUpdate}
                    disabled={locationLoading}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
                  >
                    {locationLoading ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Detecting...
                      </span>
                    ) : (
                      'Enable Location'
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Featured Products */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
                <p className="text-gray-600">Handpicked for you</p>
              </div>
              <Link 
                to="/user/products" 
                className="text-orange-600 hover:text-orange-700 font-medium text-sm flex items-center group"
              >
                View All
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          
            {loading ? (
              <div className="flex justify-center py-12 bg-white rounded-2xl border border-gray-200">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-orange-600 mx-auto mb-4"></div>
                  <span className="text-gray-600 font-medium">Loading products...</span>
                </div>
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.slice(0, 8).map(product => (
                  <div key={product._id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 group hover:border-blue-300">
                    <div className="relative h-56 bg-gray-100">
                      {product.images && product.images.length > 0 ? (
                        <img 
                          src={product.images[0]} 
                          alt={product.name} 
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onLoad={(e) => {
                            console.log(`✅ Image loaded successfully: ${product.name}`);
                          }}
                          onError={(e) => {
                            console.error(`❌ Image failed to load: ${product.name}`);
                            e.target.src = '/placeholder-product.jpg';
                          }}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400 bg-gray-100">
                          <div className="text-center">
                            <svg className="h-12 w-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-medium">No image</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="absolute top-4 right-4 z-10">
                        <WishlistButton productId={product._id} size="sm" className="shadow-lg" />
                      </div>
                      
                      {product.mrp > product.zammerPrice && (
                        <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                          {Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)}% OFF
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6">
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">{truncateText(product.name, 50)}</h3>
                      
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className="text-orange-600 font-bold text-xl">₹{product.zammerPrice?.toLocaleString('en-IN')}</span>
                          {product.mrp > product.zammerPrice && (
                            <span className="text-gray-400 text-sm line-through ml-2">₹{product.mrp?.toLocaleString('en-IN')}</span>
                          )}
                        </div>
                      </div>
                      
                      <Link
                        to={`/user/product/${product._id}`}
                        className="block text-center bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-xl font-semibold transition-colors duration-200"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">No Products Available</h3>
                <p className="text-gray-600">Check back later for new arrivals.</p>
              </div>
            )}
          </div>

          {/* Order Tracker Section */}
          {showOrderTracker && (
            <div className="mb-12">
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="flex justify-between items-center p-6 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Order Tracking</h2>
                      <p className="text-sm text-gray-600">Real-time order updates</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleOrderTracker}
                    className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
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