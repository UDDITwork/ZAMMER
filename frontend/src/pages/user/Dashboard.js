import React, { useEffect, useState, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import { AuthContext } from '../../contexts/AuthContext';
import { getMarketplaceProducts } from '../../services/productService';
import { getNearbyShops } from '../../services/userService';
import { updateLocation } from '../../utils/locationUtils';

const Dashboard = () => {
  const { userAuth, logoutUser } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingShops, setLoadingShops] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [locationUpdated, setLocationUpdated] = useState(false);
  const navigate = useNavigate();

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

  const fetchNearbyShops = useCallback(async () => {
    setLoadingShops(true);
    try {
      const response = await getNearbyShops();
      if (response.success) {
        console.log('📍 Fetched shops with images:', response.data.map(shop => ({
          id: shop._id,
          name: shop.shop?.name,
          hasMainImage: !!shop.shop?.mainImage,
          hasImages: shop.shop?.images?.length > 0,
          imageCount: shop.shop?.images?.length || 0
        })));
        setShops(response.data);
      } else {
        toast.error(response.message || 'Failed to fetch nearby shops');
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
    } finally {
      setLoadingShops(false);
    }
  }, []);

  const requestLocationUpdate = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Try to get address using Google Maps API
            let address = "Your current location";
            const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
            
            if (apiKey) {
              try {
                const response = await fetch(
                  `https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.coords.latitude},${position.coords.longitude}&key=${apiKey}`
                );
                
                const data = await response.json();
                
                if (data.status === 'OK' && data.results.length > 0) {
                  address = data.results[0].formatted_address;
                }
              } catch (err) {
                console.error('Error getting address:', err);
              }
            }
            
            // Create updated user object with location
            const updatedUserData = {
              ...userAuth.user,
              location: {
                coordinates: [position.coords.longitude, position.coords.latitude],
                address: address
              }
            };
            
            // Update in localStorage
            const userData = localStorage.getItem('userData');
            if (userData) {
              const parsedData = JSON.parse(userData);
              parsedData.location = updatedUserData.location;
              localStorage.setItem('userData', JSON.stringify(parsedData));
            }
            
            // Update state to force re-render
            setLocationUpdated(prev => !prev);
            
            // Refetch nearby shops with new location
            fetchNearbyShops();
            
            toast.success('Location updated successfully');
            
          } catch (error) {
            console.error('Error updating location:', error);
            toast.error('Could not update your location');
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error(`Location error: ${error.message}`);
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser');
    }
  }, [userAuth, fetchNearbyShops]);

  const handleLogout = () => {
    logoutUser();
    navigate('/user/login');
    toast.success('Logged out successfully');
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getMarketplaceProducts({
        page: 1,
        limit: 8
      });
      if (response.success) {
        setProducts(response.data);
      } else {
        toast.error(response.message || 'Failed to fetch products');
      }
    } catch (error) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrendingProducts = useCallback(async () => {
    try {
      const response = await getMarketplaceProducts({
        page: 1,
        limit: 4,
        isTrending: true
      });
      if (response.success) {
        setTrendingProducts(response.data);
      }
    } catch (error) {
      console.error('Error fetching trending products:', error);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchTrendingProducts();
    fetchNearbyShops();
    
    // Only request location if we don't already have it
    if (!userAuth.user?.location?.coordinates) {
      requestLocationUpdate();
      }
  }, [fetchProducts, fetchTrendingProducts, fetchNearbyShops, requestLocationUpdate, userAuth.user?.location?.coordinates]);

  // Function to truncate text
  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  };

  return (
    <UserLayout>
      <div className="user-dashboard pb-16">
        {/* Header */}
        <div className="bg-orange-500 text-white p-4">
          <div className="container mx-auto">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Zammer Marketplace</h1>
              <div className="flex items-center">
                <Link to="/user/profile" className="text-white mr-4">
                Welcome, {userAuth.user?.name}
              </Link>
                <button 
                  onClick={handleLogout}
                  className="bg-white text-orange-500 px-3 py-1 rounded-full text-sm font-medium hover:bg-orange-100"
                >
                  Logout
                </button>
              </div>
            </div>
            
            {userAuth.user?.location?.address && (
              <div className="mt-2 flex items-center text-white text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{userAuth.user.location.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Location Indicator - Make it clickable */}
        {userAuth.user?.location?.address ? (
          <div 
            className="bg-gray-100 p-2 flex items-center text-sm text-gray-700 border-b cursor-pointer hover:bg-gray-200"
            onClick={requestLocationUpdate}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Your location: {userAuth.user.location.address} <span className="text-xs text-orange-500">(tap to refresh)</span></span>
          </div>
        ) : (
          <div 
            className="bg-gray-100 p-2 flex items-center text-sm text-gray-700 border-b cursor-pointer hover:bg-gray-200"
            onClick={requestLocationUpdate}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Click to detect your location</span>
          </div>
        )}

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          {/* Welcome Section */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Welcome, {userAuth.user?.name || 'User'}!</h2>
            <p className="text-gray-600">Discover and shop from local sellers near you.</p>
          </div>

          {/* Best Offer Carousel */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Best offer for you</h2>
            <div className="relative overflow-hidden rounded-lg">
              <div className="flex overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                {trendingProducts.length > 0 ? (
                  trendingProducts.map((product, index) => (
                    <div key={product._id} className="flex-shrink-0 w-3/4 mr-4" style={{ minWidth: '220px' }}>
                      <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-lg overflow-hidden h-40 relative">
                        <div className="p-4 flex flex-col justify-between h-full">
                          <div>
                            <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">OFFER</span>
                            <h3 className="font-medium mt-1">{product.name}</h3>
                          </div>
                          <div>
                            <p className="text-gray-700 text-sm">Up to {Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)}% off</p>
                            <Link to={`/user/product/${product._id}`} className="text-orange-600 text-sm font-medium">Shop Now</Link>
                          </div>
                        </div>
                        {product.images && product.images.length > 0 && (
                          <img 
                            src={product.images[0]} 
                            alt={product.name} 
                            className="absolute right-0 bottom-0 h-32 object-cover"
                            style={{ maxWidth: '40%' }}
                          />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex-shrink-0 w-3/4 mr-4" style={{ minWidth: '220px' }}>
                    <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-lg overflow-hidden h-40 relative">
                      <div className="p-4 flex flex-col justify-between h-full">
                        <div>
                          <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">SPRING FASHION</span>
                          <h3 className="font-medium mt-1">Spring Collection</h3>
                        </div>
                        <div>
                          <p className="text-gray-700 text-sm">Up to 50% off</p>
                          <Link to="/user/shop" className="text-orange-600 text-sm font-medium">Shop Now</Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fashion Categories */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Fashion Categories</h2>
              <Link to="/user/categories" className="text-sm text-orange-600">See All</Link>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <Link to="/user/categories/men" className="category-card">
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium">Men</span>
                </div>
              </Link>
              <Link to="/user/categories/women" className="category-card">
                <div className="bg-pink-50 rounded-lg p-2 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 bg-pink-100 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium">Women</span>
                </div>
              </Link>
              <Link to="/user/categories/kids" className="category-card">
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium">Kids</span>
                </div>
              </Link>
              <Link to="/user/categories/all" className="category-card">
                <div className="bg-purple-50 rounded-lg p-2 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium">All</span>
                </div>
              </Link>
            </div>
        </div>

          {/* Nearby Shops */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Nearby Shops</h2>
              <Link to="/user/nearby-shops" className="text-sm text-orange-600">See All</Link>
            </div>
          
          {loadingShops ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
          ) : shops.length > 0 ? (
              <div className="overflow-x-auto -mx-4 px-4">
                <div className="flex space-x-4">
              {shops.map(shop => (
                    <div key={shop._id} className="flex-shrink-0 w-60 rounded-lg overflow-hidden shadow-sm border border-gray-200 bg-white">
                      <div className="h-32 bg-gray-200 relative">
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
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-400 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                            <span className="text-xs text-orange-600 font-medium">{shop.shop?.name}</span>
                          </div>
                        </div>
                        
                        {/* Rating Chip */}
                        <div className="absolute top-2 right-2 bg-white rounded-full px-2 py-1 flex items-center space-x-1 text-xs shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span>4.9</span>
                          <span className="text-gray-500">({Math.floor(Math.random() * 100) + 10})</span>
                        </div>
                        
                        {/* 🎯 NEW: Image indicator */}
                        {shop.shop?.images?.length > 1 && (
                          <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                            +{shop.shop.images.length - 1} more
                          </div>
                        )}
                      </div>
                      
                      <div className="p-3">
                        <h3 className="font-medium text-gray-800 truncate">{shop.shop?.name || 'Shop Name'}</h3>
                        <p className="text-xs text-gray-500 mt-1">{shop.shop?.category || 'Fashion'} Fashion</p>
                        
                        {/* 🎯 NEW: Shop description if available */}
                        {shop.shop?.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {truncateText(shop.shop.description, 60)}
                          </p>
                        )}
                        
                        <p className="text-xs text-gray-500 mt-1 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>1.5 km from you</span>
                        </p>
                        <div className="mt-3 text-xs">
                          <span className="text-gray-800 font-medium">Price start of </span>
                          <span className="text-orange-600 font-medium">INR 230/-</span>
                        </div>
                  <Link
                    to={`/user/shop/${shop._id}`}
                          className="mt-2 block text-center bg-orange-500 hover:bg-orange-600 text-white py-1 rounded text-xs font-medium transition-colors"
                  >
                    View Shop
                  </Link>
                      </div>
                </div>
              ))}
                </div>
            </div>
          ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No nearby shops found. Please update your location.</p>
            </div>
          )}
        </div>

          {/* Featured Products */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Featured Products</h2>
              <Link to="/user/products" className="text-sm text-orange-600">See All</Link>
            </div>
          
          {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
          ) : products.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {products.slice(0, 4).map(product => (
                  <div key={product._id} className="product-card border rounded-lg overflow-hidden shadow-sm bg-white">
                    <div className="relative h-40 bg-gray-200">
                    {product.images && product.images.length > 0 ? (
                      <img 
                        src={product.images[0]} 
                        alt={product.name} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-400">No image</div>
                    )}
                      <button className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                  </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm text-gray-800">{truncateText(product.name, 20)}</h3>
                    <div className="flex justify-between items-center mt-2">
                      <div>
                        <span className="text-orange-600 font-medium">₹{product.zammerPrice}</span>
                        {product.mrp > product.zammerPrice && (
                            <span className="text-gray-500 text-xs line-through ml-1">₹{product.mrp}</span>
                          )}
                          {product.mrp > product.zammerPrice && (
                            <span className="text-green-600 text-xs ml-1">
                              {Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)}% off
                            </span>
                          )}
                        </div>
                    </div>
                    <Link
                      to={`/user/product/${product._id}`}
                        className="mt-2 block text-center border border-orange-500 text-orange-500 py-1 rounded text-xs font-medium hover:bg-orange-50"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No products found.</p>
            </div>
          )}
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default Dashboard;