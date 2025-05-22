import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getNearbyShops } from '../../services/userService';
import { AuthContext } from '../../contexts/AuthContext';
import StarRating from '../../components/common/StarRating';

const ShopPage = () => {
  const { userAuth } = useContext(AuthContext);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchNearbyShops();
  }, []);

  const fetchNearbyShops = async () => {
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
      } else {
        toast.error(response.message || 'Failed to fetch nearby shops');
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="shop-page pb-16">
      {/* Header */}
      <div className="bg-white p-4 border-b flex items-center">
        <button onClick={() => navigate(-1)} className="mr-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-medium">Nearby Shops</h1>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-white border-b">
        <div className="relative">
          <input
            type="text"
            placeholder="Search shops..."
            className="w-full bg-gray-100 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Shops List */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : filteredShops.length > 0 ? (
          <div className="space-y-4">
            {filteredShops.map((shop) => (
              <Link 
                key={shop._id} 
                to={`/user/shop/${shop._id}`}
                className="block border rounded-lg overflow-hidden bg-white"
              >
                <div className="flex">
                  <div className="w-1/3 h-24 bg-gray-200 relative">
                    {shop.shop.images && shop.shop.images[0] ? (
                      <img 
                        src={shop.shop.images[0]} 
                        alt={shop.shop.name} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="w-2/3 p-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-800">{shop.shop.name}</h3>
                      <div className="flex items-center text-xs">
                        <span className="text-yellow-400 mr-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </span>
                        <span>{shop.averageRating || 4.9}</span>
                        <span className="text-gray-500 ml-1">({shop.numReviews || Math.floor(Math.random() * 100) + 10})</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{shop.shop.category} Fashion</p>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {typeof shop.distance === 'number' 
                        ? `${shop.distance} km from you` 
                        : shop.shop.address || 'Distance not available'}
                    </div>
                    <div className="mt-2 text-xs">
                      <span className="text-gray-800 font-medium">Price start of </span>
                      <span className="text-orange-600 font-medium">INR 230/-</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-600">{searchQuery ? 'No shops match your search' : 'No nearby shops found.'}</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="flex justify-between items-center">
          <Link to="/user/dashboard" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs">Home</span>
          </Link>
          
          <Link to="/user/shop" className="flex flex-col items-center justify-center py-2 flex-1 text-orange-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-xs">Shop</span>
          </Link>
          
          <Link to="/user/cart" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-xs">Cart</span>
          </Link>
          
          <Link to="/user/trending" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-xs">Trending</span>
          </Link>
          
          <Link to="/user/limited-edition" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span className="text-xs">Limited Edition</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ShopPage; 