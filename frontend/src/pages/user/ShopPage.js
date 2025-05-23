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
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Nearby Shops</h1>
          <p className="text-gray-600">Discover local shops in your area</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search shops by name or category..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Map View */}
        <div className="mb-6 rounded-lg overflow-hidden shadow-md">
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

        {/* Shop List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : filteredShops.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredShops.map(shop => (
              <div
                key={shop._id}
                className={`bg-white rounded-lg shadow-md overflow-hidden border-2 ${
                  selectedShop?._id === shop._id ? 'border-orange-500' : 'border-transparent'
                }`}
                onClick={() => setSelectedShop(shop)}
              >
                <div className="h-48 bg-gray-200 relative">
                  {shop.shop.images && shop.shop.images.length > 0 ? (
                    <img
                      src={shop.shop.images[0]}
                      alt={shop.shop.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-white rounded-full px-2 py-1 flex items-center space-x-1 text-xs shadow-sm">
                    <StarRating rating={shop.shop.rating || 0} />
                    <span>({shop.shop.reviews?.length || 0})</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-gray-800">{shop.shop.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{shop.shop.category}</p>
                  {userAuth?.user?.location?.coordinates && (
                    <p className="text-sm text-gray-500 mt-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {calculateDistance(
                        userAuth.user.location.coordinates[1],
                        userAuth.user.location.coordinates[0],
                        shop.shop.location.coordinates[1],
                        shop.shop.location.coordinates[0]
                      )} km away
                    </p>
                  )}
                  <Link
                    to={`/user/shop/${shop._id}`}
                    className="mt-4 block text-center bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-medium transition-colors"
                  >
                    View Shop
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No shops found matching your search.</p>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default ShopPage; 