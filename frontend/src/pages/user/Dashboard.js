// File: /frontend/src/pages/user/Dashboard.js

import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import { AuthContext } from '../../contexts/AuthContext';
import socketService from '../../services/socketService';
import ReturnRequestModal from '../../components/return/ReturnRequestModal';
import { getMarketplaceProducts } from '../../services/productService';
import { getNearbyShops } from '../../services/userService';
import { updateLocation, getCurrentLocation, calculateDistance } from '../../utils/locationUtils';
import RealTimeOrderTracker from '../../components/RealTimeOrderTracker';
import orderService from '../../services/orderService';
import productService from '../../services/productService';
import cartService from '../../services/cartService';
import api from '../../services/api';
import WishlistButton from '../../components/common/WishlistButton';
import UserHeader from '../../components/header/UserHeader';
import { getPromoBanners } from '../../services/promoBannerService';
import PromoBannerCarousel from '../../components/common/PromoBannerCarousel';
import categoryService from '../../services/categoryService';
import { getLevel2Options } from '../../data/categoryHierarchy';
import CircularCategorySelector from '../../components/user/CircularCategorySelector';
import BrandLogoMarquee from '../../components/user/BrandLogoMarquee';

import BrandDiscoverGrid from '../../components/user/BrandDiscoverGrid';
import Level2BannerGrid from '../../components/user/Level2BannerGrid';
import { getBanners } from '../../services/bannerService';
import ProductCard from '../../components/common/ProductCard';
import { useAddToCart } from '../../hooks/useAddToCart';
import { ProductGridSkeleton } from '../../components/common/SkeletonLoader';
import DecorativeDivider from '../../components/common/DecorativeDivider';
import FashionQuoteStrip from '../../components/common/FashionQuoteStrip';

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
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnModalOrder, setReturnModalOrder] = useState(null);
  const [promoBanners, setPromoBanners] = useState([]);
  const [selectedLevel1, setSelectedLevel1] = useState(() => {
    // Default category based on user gender
    const gender = userAuth?.user?.gender;
    if (gender === 'Female') return 'Women Fashion';
    if (gender === 'Male') return 'Men Fashion';
    return 'Men Fashion'; // Default fallback
  });
  const [level2Banners, setLevel2Banners] = useState([]);

  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const locationUpdateRef = useRef(false); // Prevent multiple simultaneous updates
  const sliderRef = useRef(null); // Ref for featured products slider
  const navigate = useNavigate();
  const { addingToCart, handleAddToCart } = useAddToCart();

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

  const fetchPromoBannersData = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const response = await getPromoBanners({ page: 'dashboard' });
      if (response.success && response.data.length > 0 && isMountedRef.current) {
        setPromoBanners(response.data);
      }
    } catch (error) {
      console.error('Error fetching promo banners:', error);
    }
  }, []);

  const fetchLevel2Banners = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      console.log('🎯 [Dashboard] Fetching Level 2 banners for:', selectedLevel1);
      const response = await getBanners({
        level: 2,
        categoryLevel1: selectedLevel1
      });
      if (response.success && response.data && response.data.length > 0 && isMountedRef.current) {
        setLevel2Banners(response.data);
        console.log('✅ Level 2 banners fetched:', response.data.length);
      } else {
        setLevel2Banners([]);
        console.log('ℹ️ No Level 2 banners found for:', selectedLevel1);
      }
    } catch (error) {
      console.error('❌ Error fetching Level 2 banners:', error);
      setLevel2Banners([]);
    }
  }, [selectedLevel1]);

  const fetchNearbyShops = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setLoadingShops(true);
    try {
      console.log('🏪 [Dashboard] Fetching nearby shops...');
      
      // Get user location from auth context or current location
      let locationParams = {};
      
      if (userAuth.user?.location?.coordinates && userAuth.user.location.coordinates.length === 2) {
        // Use saved user location
        locationParams = {
          lat: userAuth.user.location.coordinates[1], // latitude
          lng: userAuth.user.location.coordinates[0], // longitude
          maxDistance: 5000000 // 5000 km in meters
        };
        console.log('📍 [Dashboard] Using saved user location:', locationParams);
      } else {
        // Try to get current location
        try {
          const currentLocation = await getCurrentLocation();
          if (currentLocation && currentLocation.coordinates) {
            locationParams = {
              lat: currentLocation.latitude,
              lng: currentLocation.longitude,
              maxDistance: 5000000 // 5000 km in meters
            };
            console.log('📍 [Dashboard] Using current location:', locationParams);
          } else {
            console.warn('⚠️ [Dashboard] No location available, fetching all shops');
          }
        } catch (locationError) {
          console.warn('⚠️ [Dashboard] Could not get current location:', locationError.message);
          // Continue without location - will fetch all shops
        }
      }
      
      const response = await getNearbyShops(locationParams);
      
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
      
      // Sort shops by distance (already sorted by backend, but ensure it's correct)
      const sortedShops = shopsData.sort((a, b) => {
        if (a.distance && b.distance) {
          return a.distance - b.distance;
        }
        return 0;
      });
      
      if (isMountedRef.current) {
        setShops(sortedShops);
        console.log('🏪 [Dashboard] Set shops state with', sortedShops.length, 'shops');
        if (sortedShops.length > 0) {
          console.log('📍 [Dashboard] Shop distances:', sortedShops.slice(0, 5).map(s => ({
            name: s.shop?.name,
            distance: s.distanceText || s.distance
          })));
        }
      }

      if (sortedShops.length === 0) {
        console.log('ℹ️ [Dashboard] No shops found - showing empty state');
        if (response.success) {
          toast.info('No shops found in your area. Try expanding your search radius.');
        }
      } else {
        console.log('✅ [Dashboard] Successfully loaded', sortedShops.length, 'shops');
        // Don't show toast on every load to avoid spam
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
  }, [userAuth.isAuthenticated, userAuth.user?._id, userAuth.user?.location]);

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
          fetchOrders(),
          fetchPromoBannersData()
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

  // 🎯 Auto-slide featured products slider every 2 seconds
  useEffect(() => {
    if (!sliderRef.current || trendingProducts.length === 0) return;

    const slider = sliderRef.current;
    const itemWidth = 320 + 24; // w-80 (320px) + space-x-6 (24px)
    let currentIndex = 0;
    const maxIndex = trendingProducts.length - 1;

    // Reset scroll position on mount
    slider.scrollLeft = 0;

    const autoSlide = () => {
      if (!slider || !isMountedRef.current) return;

      // Calculate scroll position
      const scrollAmount = currentIndex * itemWidth;
      
      // Smooth scroll to next item
      slider.scrollTo({
        left: scrollAmount,
        behavior: 'smooth'
      });

      // Move to next item, loop back to start when reaching end
      currentIndex = (currentIndex + 1) % (maxIndex + 1);
    };

    // Start auto-sliding every 2 seconds
    const interval = setInterval(autoSlide, 2000);

    return () => clearInterval(interval);
  }, [trendingProducts.length]);

  // 🎯 Fetch Level 2 banners when selectedLevel1 changes
  useEffect(() => {
    fetchLevel2Banners();
  }, [fetchLevel2Banners]);

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

const handleReturnFromTracker = (order) => {
  if (!order) {
    toast.error('Unable to open return flow for this order.');
    return;
  }

  console.log('🌀 [Dashboard] Triggering return modal from tracker', {
    orderId: order._id,
    orderNumber: order.orderNumber
  });

  setReturnModalOrder(order);
  setShowReturnModal(true);
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
      <div
        className="min-h-screen"
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 20%, #f8fafc 40%, #eff6ff 60%, #f8fafc 80%, #f5f3ff 100%)',
          backgroundSize: '300% 300%',
          animation: 'bgShift 20s ease infinite',
        }}
      >
        <style>{`
          @keyframes bgShift {
            0%, 100% { background-position: 0% 50%; }
            33% { background-position: 100% 0%; }
            66% { background-position: 50% 100%; }
          }
          /* 3D Art Gallery Effects */
          .gallery-frame {
            position: relative;
            border-radius: 20px;
            background: white;
            box-shadow:
              0 2px 8px rgba(0,0,0,0.04),
              0 8px 24px rgba(0,0,0,0.06),
              inset 0 1px 0 rgba(255,255,255,0.9);
            border: 1px solid rgba(0,0,0,0.06);
            transform: perspective(1200px) rotateX(0deg);
            transition: transform 0.5s cubic-bezier(0.23,1,0.32,1), box-shadow 0.5s ease;
          }
          .gallery-frame:hover {
            box-shadow:
              0 4px 12px rgba(0,0,0,0.06),
              0 16px 48px rgba(0,0,0,0.1),
              inset 0 1px 0 rgba(255,255,255,0.9);
            transform: perspective(1200px) rotateX(0.5deg) translateY(-2px);
          }
          .gallery-exhibit {
            position: relative;
            border-radius: 24px;
            background: linear-gradient(145deg, #fafafa, #ffffff);
            box-shadow:
              0 1px 3px rgba(0,0,0,0.03),
              0 6px 16px rgba(0,0,0,0.04),
              0 20px 60px rgba(0,0,0,0.03);
            border: 1px solid rgba(0,0,0,0.04);
          }
          .gallery-wall {
            position: relative;
            background: linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(249,250,251,0.6) 100%);
            border-radius: 28px;
            padding: 2px;
          }
          .gallery-wall::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 28px;
            padding: 1px;
            background: linear-gradient(145deg, rgba(0,0,0,0.06), rgba(0,0,0,0.02), rgba(0,0,0,0.06));
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            pointer-events: none;
          }
          .gallery-spotlight {
            position: relative;
          }
          .gallery-spotlight::after {
            content: '';
            position: absolute;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            width: 60%;
            height: 40px;
            background: radial-gradient(ellipse at center, rgba(99,102,241,0.06) 0%, transparent 70%);
            pointer-events: none;
          }
          .depth-card {
            transition: transform 0.4s cubic-bezier(0.23,1,0.32,1), box-shadow 0.4s ease;
          }
          .depth-card:hover {
            transform: translateY(-4px) scale(1.01);
            box-shadow: 0 12px 40px rgba(0,0,0,0.1);
          }
        `}</style>
        <UserHeader />

        {/* Circular Category Selector with Brand Logo Marquee */}
        <div className="relative bg-white border-b border-gray-200 overflow-hidden" style={{ borderTop: '1px solid #F0F0F0', borderBottom: '1px solid #F0F0F0' }}>
          {/* Brand logo marquee — scrolls behind the circles */}
          <BrandLogoMarquee />
          {/* Category circles — sit on top */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center">
              <div className="relative" style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.9)) drop-shadow(0 0 40px rgba(255,255,255,0.7))' }}>
                <CircularCategorySelector
                  selectedCategory={selectedLevel1}
                  onSelectCategory={setSelectedLevel1}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Promotional Banners — Gallery Frame */}
          {promoBanners.length > 0 && (
            <div className="mb-8 gallery-frame p-1 sm:p-1.5">
              <div className="rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between mb-0 px-5 pt-5 pb-3">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Hot Deals</h2>
                    <p className="text-gray-500 text-sm">Exclusive offers curated for you</p>
                  </div>
                </div>
                <div className="px-5 pb-5">
                  <PromoBannerCarousel banners={promoBanners} />
                </div>
              </div>
            </div>
          )}

          <DecorativeDivider variant="wave" className="my-2" />

          {/* Level 2 Banners — Gallery Wall */}
          <section className="mb-8 gallery-wall">
            <div className="bg-gradient-to-br from-white via-slate-50/30 to-blue-50/20 rounded-[26px] p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Shop by Category
                </h2>
                <p className="text-gray-600">
                  Explore {selectedLevel1.replace(' Fashion', '')} collections
                </p>
              </div>
              <Link
                to={`/user/browse/${encodeURIComponent(selectedLevel1)}`}
                className="text-orange-600 hover:text-orange-700 font-medium text-sm flex items-center group"
              >
                View All
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <Level2BannerGrid banners={level2Banners} level1Category={selectedLevel1} />
            </div>
          </section>

          <DecorativeDivider variant="herringbone" className="my-2" />

          {/* Trending Products Carousel — Gallery Exhibit */}
          <div className="mb-8 gallery-exhibit -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-6 rounded-2xl">
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
              <div 
                ref={sliderRef}
                className="flex space-x-6 overflow-x-hidden scrollbar-hide"
                style={{ scrollBehavior: 'smooth' }}
              >
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

          <DecorativeDivider variant="diamond" className="my-2" />

          {/* Discover Brands — Gallery Exhibition */}
          <div className="mb-8 gallery-spotlight">
            <div className="gallery-frame p-6 sm:p-8 -mx-4 sm:-mx-6 lg:-mx-8">
              <BrandDiscoverGrid />
            </div>
          </div>

          <FashionQuoteStrip className="my-2" />

          {/* Nearby Shops — Gallery Wing */}
          <div className="mb-8 gallery-exhibit -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-6 rounded-3xl">
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

          <DecorativeDivider variant="dotgrid" className="my-2" />

          {/* Featured Products */}
          <div className="mb-12 bg-gradient-to-br from-slate-50/30 via-transparent to-blue-50/20 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-2 rounded-2xl">
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
              <ProductGridSkeleton count={8} cols="grid-cols-2 md:grid-cols-3 lg:grid-cols-4" />
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.slice(0, 8).map(product => (
                  <ProductCard key={product._id} product={product} onAddToCart={handleAddToCart} isAddingToCart={addingToCart[product._id]} />
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
                  <RealTimeOrderTracker orders={activeOrders} onReturnOrder={handleReturnFromTracker} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ReturnRequestModal
        isOpen={showReturnModal}
        order={returnModalOrder}
        onClose={() => {
          setShowReturnModal(false);
          setReturnModalOrder(null);
        }}
        onReturnRequested={() => {
          toast.success('Return request submitted successfully!');
          setShowReturnModal(false);
          setReturnModalOrder(null);
          fetchOrders();
        }}
        socket={socketService.socket}
      />
    </UserLayout>
  );
};

export default Dashboard;