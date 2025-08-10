// File: /frontend/src/pages/user/NearbyShopsPage.js

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import UserLayout from '../../components/layouts/UserLayout';
import { getNearbyShops } from '../../services/userService';
import { toast } from 'react-toastify';

const NearbyShopsPage = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState('');

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

  useEffect(() => {
    const fetchShops = async () => {
      try {
        console.log('🏪 [NearbyShopsPage] Fetching nearby shops...');
        const response = await getNearbyShops();
        
        if (response.success) {
          console.log('✅ [NearbyShopsPage] Shops fetched successfully:', {
            count: response.count,
            hasUserLocation: !!response.userLocation,
            searchRadius: response.searchRadius
          });
          
          // Log distance information for debugging
          if (response.data && response.data.length > 0) {
            console.log('📊 [NearbyShopsPage] Shops with distances:');
            response.data.slice(0, 5).forEach((shop, index) => {
              console.log(`  ${index + 1}. ${shop.shop?.name} - ${shop.distanceText || 'No distance'}`);
            });
          }
          
          setShops(response.data);
          setUserLocation(response.userLocation);
          setSearchRadius(response.searchRadius);
        } else {
          console.log('⚠️ [NearbyShopsPage] API returned error:', response.message);
          toast.error(response.message || 'Failed to fetch nearby shops');
        }
      } catch (error) {
        console.error('❌ [NearbyShopsPage] Error fetching shops:', error);
        toast.error('Failed to load nearby shops');
      } finally {
        setLoading(false);
      }
    };

    fetchShops();
  }, []);

  return (
    <UserLayout>
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Nearby Shops</h1>
          <p className="text-gray-600">Discover local fashion stores near you</p>
          
          {/* 🎯 NEW: Location and search info */}
          {userLocation && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex items-center text-sm text-blue-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <span className="font-semibold">Searching from: </span>
                  {userLocation.address || `${userLocation.latitude}, ${userLocation.longitude}`}
                  {searchRadius && <span className="ml-2 text-blue-600">• Within {searchRadius}</span>}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Finding shops near you...</p>
          </div>
        ) : shops.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops.map((shop, index) => (
              <div key={shop._id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <div className="h-48 bg-gray-200 relative">
                  {/* 🎯 UPDATED: Display actual shop images */}
                  {getShopImage(shop) ? (
                    <img 
                      src={getShopImage(shop)} 
                      alt={shop.shop?.name || 'Shop'} 
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        console.log('❌ Shop image failed to load:', getShopImage(shop));
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
                  
                  {/* 🎯 NEW: Distance badge - Priority position */}
                  {shop.distanceText && (
                    <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      {shop.distanceText}
                    </div>
                  )}
                  
                  {/* 🎯 NEW: Ranking badge */}
                  <div className="absolute top-3 right-3 bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                    #{index + 1}
                  </div>
                  
                  {/* 🎯 NEW: Image count indicator */}
                  {shop.shop?.images?.length > 1 && (
                    <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-sm flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {shop.shop.images.length}
                    </div>
                  )}
                  
                  {/* 🎯 NEW: Shop category badge */}
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
                  
                  {/* 🎯 NEW: Shop description */}
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
                    
                    {/* 🎯 NEW: Shop hours */}
                    {shop.shop?.openTime && shop.shop?.closeTime && (
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{shop.shop.openTime} - {shop.shop.closeTime}</span>
                      </div>
                    )}
                    
                    {/* 🎯 NEW: Contact info */}
                    {shop.shop?.phoneNumber?.main && (
                      <div className="flex items-center text-sm text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{shop.shop.phoneNumber.main}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* 🎯 NEW: Rating and stats */}
                  <div className="flex items-center justify-between mb-4 py-3 border-t border-gray-100">
                    <div className="flex items-center">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`h-4 w-4 ${i < 4 ? 'text-yellow-400' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        <span className="ml-2 text-sm text-gray-600">(4.8)</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {Math.floor(Math.random() * 50) + 10} reviews
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-gray-600">Starting from </span>
                      <span className="text-orange-600 font-bold text-lg">₹230</span>
                      {/* 🎯 NEW: Distance info in price section */}
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
                ? "We couldn't find any shops in your area. Try expanding the search radius or check back later." 
                : "Please enable location access to find shops near you, or browse all available shops."
              }
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
            >
              Refresh & Try Again
            </button>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default NearbyShopsPage;