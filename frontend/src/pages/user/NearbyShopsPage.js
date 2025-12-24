// File: /frontend/src/pages/user/NearbyShopsPage.js - FIXED with proper location handling

import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import UserLayout from '../../components/layouts/UserLayout';
import { getNearbyShops, getNearbyShopsWithLocation } from '../../services/userService';
import { AuthContext } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const NearbyShopsPage = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState('');
  const [locationError, setLocationError] = useState(null);
  const [locationStatus, setLocationStatus] = useState('detecting'); // 'detecting', 'success', 'failed', 'fallback'
  
  const { userAuth } = useContext(AuthContext) || {};

  // Enhanced logging for debugging
  const logPageFlow = (action, data, level = 'info') => {
    const logLevels = { info: '🏪', success: '✅', warning: '⚠️', error: '❌' };
    console.log(`${logLevels[level]} [NearbyShopsPage] ${action}`, data || '');
  };

  // 🎯 Helper function to get shop image
  const getShopImage = (shop) => {
    if (shop?.shop?.mainImage) {
      return shop.shop.mainImage;
    }
    if (shop?.shop?.images && shop.shop.images.length > 0) {
      return shop.shop.images[0];
    }
    return null;
  };

  // 🎯 MAIN: Detect location and fetch shops
  const fetchShopsWithLocation = async () => {
    try {
      logPageFlow('STARTING_LOCATION_DETECTION');
      setLocationStatus('detecting');

      // Method 1: Try to get current location via GPS
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude, accuracy } = position.coords;
              
              logPageFlow('GPS_LOCATION_SUCCESS', {
                latitude,
                longitude,
                accuracy: `${accuracy}m`
              }, 'success');

              setUserLocation({
                latitude,
                longitude,
                address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                source: 'GPS'
              });
              setLocationStatus('success');

              // Fetch shops with GPS coordinates (5000km radius)
              const response = await getNearbyShops({
                lat: latitude,
                lng: longitude,
                maxDistance: 5000000, // 5000 km in meters
                limit: 50
              });

              if (response.success) {
                setShops(response.data || []);
                setSearchRadius(response.searchRadius || '50,000km');
                logPageFlow('SHOPS_FETCHED_WITH_GPS', {
                  count: response.data?.length || 0,
                  userLocation: response.userLocation
                }, 'success');
              } else {
                throw new Error(response.message || 'Failed to fetch shops');
              }

            } catch (apiError) {
              logPageFlow('API_ERROR_WITH_GPS', { error: apiError.message }, 'error');
              await fallbackToAllShops();
            }
          },
          async (geoError) => {
            logPageFlow('GPS_LOCATION_FAILED', {
              code: geoError.code,
              message: geoError.message
            }, 'warning');
            
            setLocationError(`Location access ${geoError.code === 1 ? 'denied' : 'failed'}`);
            setLocationStatus('failed');
            
            // Method 2: Try with user's saved location
            await tryUserSavedLocation();
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000
          }
        );
      } else {
        logPageFlow('GEOLOCATION_NOT_SUPPORTED', null, 'warning');
        await tryUserSavedLocation();
      }

    } catch (error) {
      logPageFlow('FETCH_SHOPS_WITH_LOCATION_ERROR', { error: error.message }, 'error');
      await fallbackToAllShops();
    }
  };

  // Method 2: Try user's saved location from auth context
  const tryUserSavedLocation = async () => {
    try {
      if (userAuth?.user?.location?.coordinates?.length === 2) {
        const [lng, lat] = userAuth.user.location.coordinates;
        
        logPageFlow('USING_SAVED_LOCATION', {
          latitude: lat,
          longitude: lng,
          address: userAuth.user.location.address
        });

        setUserLocation({
          latitude: lat,
          longitude: lng,
          address: userAuth.user.location.address || 'Saved location',
          source: 'Saved'
        });
        setLocationStatus('success');

        const response = await getNearbyShops({
          lat: lat,
          lng: lng,
          maxDistance: 5000000, // 5000 km in meters
          limit: 50
        });

        if (response.success) {
          setShops(response.data || []);
          setSearchRadius(response.searchRadius || '50,000km');
          logPageFlow('SHOPS_FETCHED_WITH_SAVED_LOCATION', {
            count: response.data?.length || 0
          }, 'success');
          return;
        }
      }
      
      // If saved location doesn't work, fallback
      await fallbackToAllShops();

    } catch (error) {
      logPageFlow('SAVED_LOCATION_ERROR', { error: error.message }, 'error');
      await fallbackToAllShops();
    }
  };

  // Method 3: Fallback to all shops without location
  const fallbackToAllShops = async () => {
    try {
      logPageFlow('FALLBACK_TO_ALL_SHOPS', null, 'warning');
      setLocationStatus('fallback');

      // Call without location - backend will return all shops
      const response = await getNearbyShops({
        limit: 50
      });

      if (response.success) {
        setShops(response.data || []);
        setSearchRadius('All India');
        logPageFlow('ALL_SHOPS_FETCHED', {
          count: response.data?.length || 0
        }, 'success');
      } else {
        throw new Error(response.message || 'Failed to fetch shops');
      }

    } catch (error) {
      logPageFlow('FALLBACK_ERROR', { error: error.message }, 'error');
      toast.error('Failed to load shops. Please refresh the page.');
      setShops([]);
    }
  };

  // Manual location request
  const requestLocation = async () => {
    setLoading(true);
    await fetchShopsWithLocation();
    setLoading(false);
  };

  // Refresh shops
  const refreshShops = async () => {
    setLoading(true);
    setShops([]);
    await fetchShopsWithLocation();
    setLoading(false);
  };

  useEffect(() => {
    const initializePage = async () => {
      logPageFlow('PAGE_LOAD_START');
      await fetchShopsWithLocation();
      setLoading(false);
    };

    initializePage();
  }, []);

  // Loading state
  if (loading) {
    return (
      <UserLayout>
        <div className="container mx-auto p-4">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600 mb-2">
              {locationStatus === 'detecting' 
                ? 'Detecting your location...' 
                : 'Finding shops near you...'
              }
            </p>
            <p className="text-sm text-gray-500">
              {locationStatus === 'detecting' && 'Please allow location access for better results'}
            </p>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Nearby Shops</h1>
          <p className="text-gray-600">Discover local fashion stores near you</p>
          
          {/* 🎯 Enhanced location and search info */}
          <div className="mt-4 space-y-3">
            {/* Location Status */}
            {userLocation && (
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex items-center text-sm text-green-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="flex-1">
                    <span className="font-semibold">
                      📍 {userLocation.source === 'GPS' ? 'Current Location' : 'Your Location'}: 
                    </span>
                    <span className="ml-2">{userLocation.address}</span>
                    {searchRadius && (
                      <span className="ml-3 text-green-600 font-medium">
                        • Search radius: {searchRadius}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Location Error */}
            {locationError && !userLocation && (
              <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-orange-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <span className="font-semibold">⚠️ Location access {locationError}</span>
                      <span className="ml-2">- Showing all available shops</span>
                    </div>
                  </div>
                  <button 
                    onClick={requestLocation}
                    className="ml-4 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Shop count and refresh */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {shops.length > 0 
                  ? `${shops.length} shop${shops.length !== 1 ? 's' : ''} found`
                  : 'No shops found'
                }
                {locationStatus === 'fallback' && ' (showing all available shops)'}
              </span>
              <button 
                onClick={refreshShops}
                className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
        
        {shops.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops.map((shop, index) => (
              <div key={shop._id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <div className="h-48 bg-gray-200 relative">
                  {/* Shop Image */}
                  {getShopImage(shop) ? (
                    <img 
                      src={getShopImage(shop)} 
                      alt={shop.shop?.name || 'Shop'} 
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  
                  {/* Fallback placeholder */}
                  <div 
                    className={`h-full w-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-200 ${getShopImage(shop) ? 'hidden' : 'flex'}`}
                  >
                    <div className="text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-orange-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <span className="text-sm text-orange-600 font-medium">{shop.shop?.name}</span>
                    </div>
                  </div>
                  
                  {/* Distance badge */}
                  {shop.distanceText && (
                    <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      {shop.distanceText}
                    </div>
                  )}
                  
                  {/* Ranking badge */}
                  <div className="absolute top-3 right-3 bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                    #{index + 1}
                  </div>
                  
                  {/* Category badge */}
                  <div className="absolute bottom-3 right-3 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    {shop.shop?.category || 'Fashion'}
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="mb-3">
                    <h2 className="text-xl font-bold text-gray-800 mb-1">
                      {shop.shop?.name || 'Shop Name'}
                    </h2>
                    <div className="flex items-center text-sm text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {shop.shop?.category || 'Fashion'} Store
                    </div>
                  </div>
                  
                  {/* Shop description */}
                  {shop.shop?.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {shop.shop.description}
                    </p>
                  )}
                  
                  <div className="mb-4">
                    <div className="flex items-start text-sm text-gray-600 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="line-clamp-2">{shop.shop?.address || 'Address not available'}</span>
                    </div>
                    
                    {/* Contact info */}
                    {shop.shop?.phoneNumber?.main && (
                      <div className="flex items-center text-sm text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{shop.shop.phoneNumber.main}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Rating and visit button */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-gray-600">Starting from </span>
                      <span className="text-orange-600 font-bold text-lg">₹230</span>
                      {shop.distanceText && (
                        <div className="text-green-600 text-xs font-semibold mt-1">
                          📍 {shop.distanceText}
                        </div>
                      )}
                    </div>
                    <Link 
                      to={`/user/shop/${shop._id}`}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      Visit Shop
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Nearby Shops Found</h3>
            <p className="text-gray-600 mb-6">
              {userLocation 
                ? "We couldn't find any shops in your area. Our sellers will be expanding soon!" 
                : "Enable location access to find shops near you, or browse all available shops."
              }
            </p>
            <div className="space-x-4">
              <button 
                onClick={refreshShops}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
              >
                Refresh & Try Again
              </button>
              {!userLocation && (
                <button 
                  onClick={requestLocation}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                >
                  Enable Location
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default NearbyShopsPage;