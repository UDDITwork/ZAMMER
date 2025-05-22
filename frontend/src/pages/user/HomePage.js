import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import { AuthContext } from '../../contexts/AuthContext';
import { getMarketplaceProducts } from '../../services/productService';
import { getNearbyShops } from '../../services/userService';
import StarRating from '../../components/common/StarRating';

const HomePage = () => {
  const { userAuth } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [offerProducts, setOfferProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [recommendedShops, setRecommendedShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingShops, setLoadingShops] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOfferProducts();
    fetchProducts();
    fetchNearbyShops();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await getMarketplaceProducts({
        page: 1,
        limit: 8,
        status: 'active'
      });
      if (response.success) {
        setProducts(response.data);
      } else {
        toast.error(response.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOfferProducts = async () => {
    try {
      const response = await getMarketplaceProducts({
        page: 1,
        limit: 4,
        discount: true,
        status: 'active'
      });
      if (response.success) {
        setOfferProducts(response.data);
      }
    } catch (error) {
      console.error('Error fetching offer products:', error);
    }
  };

  const fetchNearbyShops = async () => {
    setLoadingShops(true);
    try {
      const response = await getNearbyShops();
      if (response.success) {
        setShops(response.data);
        // Set recommended shops as a subset or different sorting
        setRecommendedShops(response.data.slice().sort(() => 0.5 - Math.random()).slice(0, 4));
      } else {
        toast.error(response.message || 'Failed to fetch nearby shops');
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
    } finally {
      setLoadingShops(false);
    }
  };

  // Function to handle search
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    // Navigate to search page or filter results
    if (searchQuery.trim()) {
      // Implementation will depend on routing setup
      // navigate(`/user/search?q=${searchQuery}`);
      toast.info(`Searching for: ${searchQuery}`);
    }
  };

  return (
    <div className="user-home-page bg-gray-50 pb-16">
      {/* Header with User Info */}
      <div className="bg-white p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center overflow-hidden mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="font-medium">Hello</p>
              <p className="text-sm text-gray-600">{userAuth.user?.name || 'Jerome Bell'}</p>
            </div>
          </div>
          <button className="p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
        </div>
        
        {/* Location */}
        {userAuth.user?.location?.address && (
          <div className="mt-2 flex items-center text-sm text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>A-94, office no-80-1sector-4, Noida-201301</span>
          </div>
        )}
        
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-gray-100 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <button type="submit" className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Best Offer Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-medium">Best offer for you</h2>
            <Link to="/user/offers" className="text-xs text-gray-500">View All</Link>
          </div>
          
          <div className="relative overflow-x-auto">
            <div className="flex space-x-4 overflow-x-auto pb-4 no-scrollbar">
              {offerProducts.length > 0 ? (
                offerProducts.map((product) => (
                  <div key={product._id} className="flex-shrink-0 w-64 h-32 relative rounded-lg overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-200 to-yellow-100"></div>
                    <div className="absolute inset-0 p-3 flex flex-col justify-between">
                      <div>
                        <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full inline-block">#SPRING ISCOMING</div>
                        <p className="text-sm font-medium mt-1">Fashion Misfits</p>
                      </div>
                      <button className="bg-orange-100 text-orange-500 text-xs px-3 py-1 rounded-full w-fit">
                        Shop Now
                      </button>
                    </div>
                    {product.images && product.images[0] && (
                      <img 
                        src={product.images[0]} 
                        alt={product.name} 
                        className="absolute right-0 bottom-0 h-28 object-cover"
                      />
                    )}
                  </div>
                ))
              ) : (
                <div className="flex-shrink-0 w-64 h-32 relative rounded-lg overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-200 to-yellow-100"></div>
                  <div className="absolute inset-0 p-3 flex flex-col justify-between">
                    <div>
                      <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full inline-block">#SPRING ISCOMING</div>
                      <p className="text-sm font-medium mt-1">Fashion Misfits</p>
                    </div>
                    <button className="bg-orange-100 text-orange-500 text-xs px-3 py-1 rounded-full w-fit">
                      Shop Now
                    </button>
                  </div>
                  <img 
                    src="/placeholder-fashion.jpg" 
                    alt="Spring Fashion" 
                    className="absolute right-0 bottom-0 h-28 object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fashion Categories */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-medium">Fashion Categories</h2>
            <Link to="/user/categories" className="text-xs text-gray-500">View All</Link>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <Link to="/user/categories/women" className="bg-yellow-50 rounded-lg p-2 text-center">
              <div className="h-20 mb-1 flex items-center justify-center">
                <img src="/placeholders/women-category.jpg" alt="Women" className="h-full object-contain" />
              </div>
              <p className="text-xs">Women</p>
              <p className="text-xs text-gray-500">13 styles</p>
            </Link>
            
            <Link to="/user/categories/men" className="bg-blue-50 rounded-lg p-2 text-center">
              <div className="h-20 mb-1 flex items-center justify-center">
                <img src="/placeholders/men-category.jpg" alt="Men" className="h-full object-contain" />
              </div>
              <p className="text-xs">Men</p>
              <p className="text-xs text-gray-500">19 styles</p>
            </Link>
            
            <Link to="/user/categories/kids" className="bg-pink-50 rounded-lg p-2 text-center">
              <div className="h-20 mb-1 flex items-center justify-center">
                <img src="/placeholders/kids-category.jpg" alt="Kids" className="h-full object-contain" />
              </div>
              <p className="text-xs">Kids</p>
              <p className="text-xs text-gray-500">26 styles</p>
            </Link>
          </div>
        </div>

        {/* Nearby Shops */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-medium">Nearby shopList</h2>
            <Link to="/user/nearby-shops" className="text-xs text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          {loadingShops ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : shops.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {shops.slice(0, 4).map((shop, index) => (
                <Link key={shop._id || index} to={`/user/shop/${shop._id}`} className="border rounded-lg overflow-hidden bg-white">
                  <div className="h-28 bg-gray-200 relative">
                    {shop.shop.images && shop.shop.images[0] ? (
                      <img 
                        src={shop.shop.images[0]} 
                        alt={shop.shop.name} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-2">
                    <div className="flex items-center mb-1">
                      <StarRating rating={shop.averageRating || 4.9} className="text-xs" />
                      <span className="text-xs text-gray-500 ml-1">({shop.numReviews || Math.floor(Math.random() * 90) + 10})</span>
                    </div>
                    <p className="text-xs font-medium mb-1">ID - {shop._id.toString().substring(shop._id.toString().length - 8)}</p>
                    <p className="text-xs text-gray-500 flex items-center">
                      Price start of <span className="text-orange-500 font-medium ml-1">INR 230/-</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600 text-sm">No nearby shops found.</p>
            </div>
          )}
        </div>

        {/* Recommended Shops */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-medium">Recommended</h2>
            <Link to="/user/recommended-shops" className="text-xs text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          {loadingShops ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : recommendedShops.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {recommendedShops.slice(0, 4).map((shop, index) => (
                <Link key={shop._id || `rec-${index}`} to={`/user/shop/${shop._id}`} className="border rounded-lg overflow-hidden bg-white">
                  <div className="h-28 bg-gray-200 relative">
                    {shop.shop.images && shop.shop.images[0] ? (
                      <img 
                        src={shop.shop.images[0]} 
                        alt={shop.shop.name} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-2">
                    <div className="flex items-center mb-1">
                      <StarRating rating={shop.averageRating || 4.9} className="text-xs" />
                      <span className="text-xs text-gray-500 ml-1">({shop.numReviews || Math.floor(Math.random() * 90) + 10})</span>
                    </div>
                    <p className="text-xs font-medium mb-1">ID - {shop._id.toString().substring(shop._id.toString().length - 8)}</p>
                    <p className="text-xs text-gray-500 flex items-center">
                      Price start of <span className="text-orange-500 font-medium ml-1">INR 230/-</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600 text-sm">No recommended shops found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="flex justify-between items-center">
          <Link to="/user/dashboard" className="flex flex-col items-center justify-center py-2 flex-1 text-orange-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs">Home</span>
          </Link>
          
          <Link to="/user/shop" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500">
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

export default HomePage; 