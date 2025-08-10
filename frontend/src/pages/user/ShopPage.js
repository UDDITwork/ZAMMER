// File: /frontend/src/pages/user/ShopPage.js

import React, { useEffect, useState, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getNearbyShops } from '../../services/userService';
import { AuthContext } from '../../contexts/AuthContext';
import StarRating from '../../components/common/StarRating';
import UserLayout from '../../components/layouts/UserLayout';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const ShopPage = () => {
  const { userAuth } = useContext(AuthContext);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const navigate = useNavigate();

  const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  const fetchNearbyShops = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getNearbyShops();
      if (response.success) {
        // Add calculated distance if we have user coordinates
        let shopsWithDistance = response.data;
        
        if (userAuth?.user?.location?.coordinates) {
          const [userLong, userLat] = userAuth.user.location.coordinates;
          
          shopsWithDistance = response.data.map(shop => {
            let distance = "Unknown";
            
            // Calculate distance if shop has coordinates
            if (shop.shop?.location?.coordinates) {
              const [shopLong, shopLat] = shop.shop.location.coordinates;
              distance = calculateDistance(userLat, userLong, shopLat, shopLong);
            }
            
            return {
              ...shop,
              distance
            };
          });
          
          // Sort by distance (already sorted by MongoDB, but re-sort after our calculation)
          shopsWithDistance.sort((a, b) => {
            if (a.distance === "Unknown") return 1;
            if (b.distance === "Unknown") return -1;
            return a.distance - b.distance;
          });
        }
        
        setShops(shopsWithDistance);
        // Set map center to user's location if available
        if (userAuth?.user?.location?.coordinates) {
          setMapCenter({
            lat: userAuth.user.location.coordinates[1],
            lng: userAuth.user.location.coordinates[0]
          });
        }
      } else {
        toast.error(response.message || 'Failed to fetch nearby shops');
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
      toast.error('Failed to fetch nearby shops');
    } finally {
      setLoading(false);
    }
  }, [userAuth]);

  useEffect(() => {
    fetchNearbyShops();
  }, [fetchNearbyShops]);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return parseFloat(distance.toFixed(1));
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  // Filter shops based on search query
  const filteredShops = shops.filter(shop => 
    shop.shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shop.shop.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mapContainerStyle = {
    width: '100%',
    height: '300px'
  };

  const defaultCenter = {
    lat: 20.5937, // Default to India's center
    lng: 78.9629
  };

  return (
    <UserLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Premium Header */}
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-500 to-indigo-500 rounded-3xl transform -rotate-1 opacity-10"></div>
            <div className="relative bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-600 bg-clip-text text-transparent">
                    Nearby Shops
                  </h1>
                  <p className="text-lg text-gray-600 mt-2">Discover amazing local shops in your area</p>
                </div>
              </div>
              
              {userAuth?.user?.location?.coordinates && (
                <div className="mt-6 flex items-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">Location Services Active</p>
                    <p className="text-green-600 text-sm">Showing shops sorted by distance from your location</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Premium Search Bar */}
          <div className="relative mb-8">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl blur opacity-20"></div>
            <div className="relative bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/50">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search shops by name or category..."
                  className="w-full pl-14 pr-6 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-5 flex items-center"
                  >
                    <svg className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              {searchQuery && (
                <div className="mt-3 text-sm text-gray-600">
                  {filteredShops.length} shop{filteredShops.length !== 1 ? 's' : ''} found for "{searchQuery}"
                </div>
              )}
            </div>
          </div>

          {/* Premium Map View */}
          <div className="relative mb-12">
            <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl blur opacity-20"></div>
            <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
              <div className="p-6 pb-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center shadow-lg mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Interactive Map</h2>
                  </div>
                  <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
                    {shops.length} shops nearby
                  </div>
                </div>
              </div>
              
              <div className="rounded-2xl overflow-hidden mx-6 mb-6 shadow-lg">
                <LoadScript googleMapsApiKey={googleMapsApiKey}>
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={mapCenter || defaultCenter}
                    zoom={12}
                  >
                    {shops.map(shop => (
                      <Marker
                        key={shop._id}
                        position={{
                          lat: shop.shop.location.coordinates[1],
                          lng: shop.shop.location.coordinates[0]
                        }}
                        onClick={() => setSelectedShop(shop)}
                      />
                    ))}
                  </GoogleMap>
                </LoadScript>
              </div>
            </div>
          </div>

          {/* Premium Shop List */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20"></div>
            <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
              
              {/* Section Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Available Shops</h2>
                    <p className="text-gray-600">Click on any shop to explore their products</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-3 rounded-xl border border-purple-200">
                  <div className="text-sm text-purple-600 font-semibold">
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 mr-2"></div>
                        Loading...
                      </div>
                    ) : (
                      `${filteredShops.length} shops available`
                    )}
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-20">
                  <div className="relative mb-8">
                    <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto"></div>
                    <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-pink-400 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 max-w-md mx-auto">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Discovering Shops</h3>
                    <p className="text-gray-600">Finding the best shops near you...</p>
                  </div>
                </div>
              ) : filteredShops.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredShops.map(shop => (
                    <div
                      key={shop._id}
                      className="relative group cursor-pointer"
                      onClick={() => setSelectedShop(shop)}
                    >
                      <div className={`absolute -inset-1 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300 ${
                        selectedShop?._id === shop._id ? 'from-orange-400 to-pink-400 opacity-60' : ''
                      }`}></div>
                      <div className={`relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border overflow-hidden hover:shadow-2xl transition-all duration-300 transform group-hover:scale-105 ${
                        selectedShop?._id === shop._id ? 'border-orange-300 shadow-2xl scale-105' : 'border-white/50'
                      }`}>
                        
                        {/* Shop Image */}
                        <div className="relative h-56 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                          {shop.shop.images && shop.shop.images.length > 0 ? (
                            <img
                              src={shop.shop.images[0]}
                              alt={shop.shop.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                              <div className="text-center text-gray-400">
                                <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span className="text-sm font-medium">No Image</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Premium Rating Badge */}
                          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-white/50">
                            <div className="flex items-center space-x-2 text-sm">
                              <StarRating rating={shop.shop.rating || 0} />
                              <span className="font-semibold text-gray-700">({shop.shop.reviews?.length || 0})</span>
                            </div>
                          </div>
                          
                          {/* Selected Indicator */}
                          {selectedShop?._id === shop._id && (
                            <div className="absolute top-4 left-4 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        {/* Shop Details */}
                        <div className="p-6">
                          <h3 className="font-bold text-xl text-gray-800 mb-2 group-hover:text-purple-600 transition-colors">
                            {shop.shop.name}
                          </h3>
                          <p className="text-gray-600 mb-4 bg-gray-100 px-3 py-1 rounded-full text-sm inline-block">
                            {shop.shop.category}
                          </p>
                          
                          {userAuth?.user?.location?.coordinates && (
                            <div className="flex items-center mb-4 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-blue-800 font-semibold text-sm">
                                  {calculateDistance(
                                    userAuth.user.location.coordinates[1],
                                    userAuth.user.location.coordinates[0],
                                    shop.shop.location.coordinates[1],
                                    shop.shop.location.coordinates[0]
                                  )} km away
                                </p>
                                <p className="text-blue-600 text-xs">From your location</p>
                              </div>
                            </div>
                          )}
                          
                          <Link
                            to={`/user/shop/${shop._id}`}
                            className="block w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 px-4 rounded-xl font-semibold text-center shadow-lg hover:shadow-xl transition-all duration-200 group-hover:scale-105"
                          >
                            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Shop
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-8">
                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-8 max-w-md mx-auto">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">No Shops Found</h3>
                    <p className="text-gray-600 mb-6">
                      {searchQuery 
                        ? `No shops found matching "${searchQuery}". Try a different search term.`
                        : 'No shops found in your area. Check back later for new shops!'
                      }
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        Clear Search
                      </button>
                    )}
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

export default ShopPage;