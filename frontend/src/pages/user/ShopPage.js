// File: /frontend/src/pages/user/ShopPage.js

import React, { useEffect, useState, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getNearbyShops } from '../../services/userService';
import { AuthContext } from '../../contexts/AuthContext';
import StarRating from '../../components/common/StarRating';
import UserLayout from '../../components/layouts/UserLayout';
import UserHeader from '../../components/header/UserHeader';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { MapPin, Search, X, Store } from 'lucide-react';

// Helper functions for distance calculation
const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

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

const ShopPage = () => {
  const { userAuth } = useContext(AuthContext);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);

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
      <UserHeader />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nearby Shops</h1>
              <p className="text-sm text-gray-500 mt-1">Discover local stores in your area</p>
            </div>
            {userAuth?.user?.location?.coordinates && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Location active
              </span>
            )}
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={1.8} />
              <input
                type="text"
                placeholder="Search shops by name or category..."
                className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-10 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2 text-xs text-gray-500">
                {filteredShops.length} shop{filteredShops.length !== 1 ? 's' : ''} found for &ldquo;{searchQuery}&rdquo;
              </p>
            )}
          </div>

          {/* Map */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-8">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Map</h2>
              <span className="text-xs text-gray-500">{shops.length} shops nearby</span>
            </div>
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

          {/* Shop list header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">All Shops</h2>
            <span className="text-sm text-gray-500">
              {loading ? 'Loading...' : `${filteredShops.length} available`}
            </span>
          </div>

          {/* Shop grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-10 h-10 border-3 border-gray-200 border-t-orange-500 rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-500">Finding shops near you...</p>
            </div>
          ) : filteredShops.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredShops.map(shop => (
                <div
                  key={shop._id}
                  className={`bg-white border rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${
                    selectedShop?._id === shop._id ? 'border-orange-400 shadow-md' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedShop(shop)}
                >
                  {/* Image */}
                  <div className="relative h-48 bg-gray-100">
                    {shop.shop.images && shop.shop.images.length > 0 ? (
                      <img
                        src={shop.shop.images[0]}
                        alt={shop.shop.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Store className="w-10 h-10 text-gray-300" strokeWidth={1.2} />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-white rounded-lg px-2 py-1 shadow-sm border border-gray-100">
                      <div className="flex items-center gap-1 text-xs">
                        <StarRating rating={shop.shop.rating || 0} />
                        <span className="text-gray-500">({shop.shop.reviews?.length || 0})</span>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{shop.shop.name}</h3>
                    <span className="inline-block text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5 mb-3">
                      {shop.shop.category}
                    </span>

                    {userAuth?.user?.location?.coordinates && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                        <MapPin className="w-3.5 h-3.5" strokeWidth={1.8} />
                        <span>
                          {calculateDistance(
                            userAuth.user.location.coordinates[1],
                            userAuth.user.location.coordinates[0],
                            shop.shop.location.coordinates[1],
                            shop.shop.location.coordinates[0]
                          )} km away
                        </span>
                      </div>
                    )}

                    <Link
                      to={`/user/shop/${shop._id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="block w-full text-center bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                    >
                      View Shop
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" strokeWidth={1.2} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No shops found</h3>
              <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                {searchQuery
                  ? `No shops matching "${searchQuery}". Try a different search.`
                  : 'No shops found in your area. Check back later!'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-sm font-medium text-orange-600 hover:text-orange-700"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default ShopPage;