import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import { getMarketplaceProducts } from '../../services/productService';
import { AuthContext } from '../../contexts/AuthContext';
import cartService from '../../services/cartService';

// 🎯 Enhanced terminal logging for production monitoring
const terminalLog = (action, status, data = null) => {
  const timestamp = new Date().toISOString();
  const logLevel = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '🔄';
  
  console.log(`${logLevel} [PRODUCT-LIST-FRONTEND] ${timestamp} - ${action}`, data ? JSON.stringify(data, null, 2) : '');
};

const ProductListPage = () => {
  const { userAuth } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  
  // 🎯 Get filter parameters from URL
  const category = searchParams.get('category');
  const subcategory = searchParams.get('subcategory');
  const productCategory = searchParams.get('productCategory');
  const search = searchParams.get('search');
  
  // 🎯 Component state
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [addingToCart, setAddingToCart] = useState({});
  
  // 🎯 Refs for preventing multiple calls
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);

  // 🎯 Enhanced product fetching with comprehensive logging
  const fetchProducts = useCallback(async (page = 1) => {
    if (fetchingRef.current || !isMountedRef.current) return;
    
    fetchingRef.current = true;
    setLoading(true);
    
    try {
      terminalLog('PRODUCT_FETCH_START', 'PROCESSING', {
        category,
        subcategory,
        productCategory,
        search,
        page,
        sortBy,
        priceRange
      });

      console.log(`
🛍️ ===============================
   FETCHING FILTERED PRODUCTS
===============================
📂 Category: ${category || 'All'}
📁 Subcategory: ${subcategory || 'All'}
🏷️ Product Category: ${productCategory || 'All'}
🔍 Search: ${search || 'None'}
📄 Page: ${page}
🔢 Sort: ${sortBy}
💰 Price Range: ${priceRange.min || 0} - ${priceRange.max || '∞'}
👤 User: ${userAuth.user?.name || 'Guest'}
🕐 Time: ${new Date().toLocaleString()}
===============================`);
      
      // 🎯 Build filter parameters
      const params = {
        page,
        limit: 12,
        ...(category && { category }),
        ...(subcategory && { subCategory: subcategory }),
        ...(productCategory && { productCategory }),
        ...(search && { search }),
        ...(priceRange.min && { minPrice: priceRange.min }),
        ...(priceRange.max && { maxPrice: priceRange.max })
      };
      
      // 🎯 Add sorting
      switch (sortBy) {
        case 'price-low':
          params.sortBy = 'zammerPrice';
          params.sortOrder = 'asc';
          break;
        case 'price-high':
          params.sortBy = 'zammerPrice';
          params.sortOrder = 'desc';
          break;
        case 'popular':
          params.sortBy = 'views';
          params.sortOrder = 'desc';
          break;
        case 'newest':
        default:
          params.sortBy = 'createdAt';
          params.sortOrder = 'desc';
          break;
      }

      terminalLog('API_CALL_PARAMS', 'PROCESSING', params);
      console.log('📊 Final API Parameters:', params);
      
      const response = await getMarketplaceProducts(params);
      
      terminalLog('API_RESPONSE_RECEIVED', 'PROCESSING', {
        success: response.success,
        count: response.count,
        totalPages: response.totalPages,
        currentPage: response.currentPage
      });

      if (response.success && isMountedRef.current) {
        setProducts(response.data || []);
        setTotalPages(response.totalPages || 1);
        setCurrentPage(response.currentPage || 1);
        
        terminalLog('PRODUCT_FETCH_SUCCESS', 'SUCCESS', {
          productsCount: (response.data || []).length,
          totalPages: response.totalPages,
          currentPage: response.currentPage,
          filters: { category, subcategory, productCategory, search }
        });

        console.log(`
✅ ===============================
   PRODUCTS FETCHED SUCCESSFULLY!
===============================
📦 Products Found: ${(response.data || []).length}
📄 Current Page: ${response.currentPage || 1}
📋 Total Pages: ${response.totalPages || 1}
🎯 Filters Applied: ${Object.keys(params).length}
⏱️ Fetch Time: ${new Date().toLocaleString()}
===============================`);

        // 🎯 Log first few products for debugging
        if (response.data && response.data.length > 0) {
          console.log('📦 First 3 Products:', response.data.slice(0, 3).map(p => ({
            id: p._id,
            name: p.name,
            price: p.zammerPrice,
            category: p.category,
            subCategory: p.subCategory
          })));
        }
        
      } else {
        terminalLog('PRODUCT_FETCH_FAILED', 'ERROR', {
          message: response.message,
          success: response.success
        });
        
        console.log(`❌ Product fetch failed: ${response.message}`);
        toast.error(response.message || 'Failed to fetch products');
      }
    } catch (error) {
      terminalLog('PRODUCT_FETCH_ERROR', 'ERROR', {
        error: error.message,
        stack: error.stack
      });
      
      console.error('❌ Error fetching products:', error);
      toast.error('Something went wrong while loading products');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [category, subcategory, productCategory, search, sortBy, priceRange, userAuth.user?.name]);

  // 🎯 Enhanced useEffect with proper cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    terminalLog('COMPONENT_MOUNT', 'PROCESSING', {
      urlParams: { category, subcategory, productCategory, search },
      userAuthenticated: userAuth.isAuthenticated,
      currentLocation: location.pathname + location.search
    });

    fetchProducts(1);

    return () => {
      isMountedRef.current = false;
      fetchingRef.current = false;
      terminalLog('COMPONENT_UNMOUNT', 'PROCESSING');
    };
  }, [fetchProducts]);

  // 🎯 Enhanced Add to Cart with comprehensive logging
  const handleAddToCart = async (productId, productName) => {
    terminalLog('ADD_TO_CART_START', 'PROCESSING', {
      productId,
      productName,
      userAuth: {
        isAuthenticated: userAuth.isAuthenticated,
        hasToken: !!userAuth.token,
        userName: userAuth.user?.name
      }
    });

    // 🎯 Check authentication
    if (!userAuth.isAuthenticated || !userAuth.token) {
      terminalLog('ADD_TO_CART_AUTH_FAILED', 'ERROR', {
        reason: 'User not authenticated',
        productId,
        redirectTo: '/user/login'
      });
      
      console.log(`
🔒 ===============================
   AUTHENTICATION REQUIRED!
===============================
📦 Product: ${productName}
🚪 Redirecting to: /user/login
⚠️ Reason: User not authenticated
🕐 Time: ${new Date().toLocaleString()}
===============================`);
      
      toast.warning('Please login to add items to cart');
      navigate('/user/login', { 
        state: { 
          from: location.pathname + location.search,
          action: 'add-to-cart',
          productName 
        } 
      });
      return;
    }

    setAddingToCart(prev => ({ ...prev, [productId]: true }));
    
    try {
      terminalLog('CART_SERVICE_CALL', 'PROCESSING', {
        productId,
        quantity: 1,
        user: userAuth.user?.name
      });

      console.log(`
🛒 ===============================
   ADDING TO CART...
===============================
📦 Product: ${productName}
🔢 Product ID: ${productId}
📊 Quantity: 1
👤 User: ${userAuth.user?.name}
⏱️ Time: ${new Date().toLocaleString()}
===============================`);
      
      const response = await cartService.addToCart(productId, 1);
      
      terminalLog('CART_SERVICE_RESPONSE', 'PROCESSING', {
        success: response.success,
        message: response.message,
        requiresAuth: response.requiresAuth
      });
      
      if (response.success) {
        terminalLog('ADD_TO_CART_SUCCESS', 'SUCCESS', {
          productId,
          productName,
          cartData: response.data
        });

        console.log(`
✅ ===============================
   ADDED TO CART SUCCESSFULLY!
===============================
📦 Product: ${productName}
👤 User: ${userAuth.user?.name}
🛒 Cart Updated: ✅
🕐 Time: ${new Date().toLocaleString()}
===============================`);
        
        toast.success(`${productName} added to cart!`);
      } else {
        terminalLog('ADD_TO_CART_FAILED', 'ERROR', {
          productId,
          message: response.message,
          requiresAuth: response.requiresAuth
        });
        
        if (response.requiresAuth) {
          console.log('🔑 Re-authentication required, redirecting...');
          navigate('/user/login', { 
            state: { 
              from: location.pathname + location.search,
              action: 'add-to-cart',
              productName 
            } 
          });
        } else {
          toast.error(response.message || 'Failed to add to cart');
        }
      }
    } catch (error) {
      terminalLog('ADD_TO_CART_ERROR', 'ERROR', {
        productId,
        error: error.message,
        stack: error.stack
      });
      
      console.error('❌ Error adding to cart:', error);
      toast.error('Something went wrong while adding to cart');
    } finally {
      setAddingToCart(prev => ({ ...prev, [productId]: false }));
    }
  };

  // 🎯 Handle page change
  const handlePageChange = (page) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      fetchProducts(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 🎯 Handle sort change
  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setCurrentPage(1);
  };

  // 🎯 Handle price filter
  const applyPriceFilter = () => {
    setCurrentPage(1);
    fetchProducts(1);
    setShowFilters(false);
  };

  // 🎯 Clear all filters
  const clearFilters = () => {
    setPriceRange({ min: '', max: '' });
    setSortBy('newest');
    setCurrentPage(1);
    // Navigate to clean URL
    navigate('/user/products');
  };

  // 🎯 Get page title
  const getPageTitle = () => {
    if (search) return `Search Results: "${search}"`;
    if (category && subcategory) return `${category} - ${subcategory}`;
    if (category) return `${category} Collection`;
    if (productCategory) return productCategory;
    return 'All Products';
  };

  // 🎯 Get filter summary
  const getFilterSummary = () => {
    const filters = [];
    if (category) filters.push(`Category: ${category}`);
    if (subcategory) filters.push(`Type: ${subcategory}`);
    if (productCategory) filters.push(`Collection: ${productCategory}`);
    if (search) filters.push(`Search: "${search}"`);
    if (priceRange.min || priceRange.max) {
      filters.push(`Price: ₹${priceRange.min || 0} - ₹${priceRange.max || '∞'}`);
    }
    return filters;
  };

  return (
    <UserLayout>
      <div className="product-list-page pb-24 bg-gradient-to-br from-gray-50 via-orange-25 to-pink-25 min-h-screen">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-pink-500 text-white p-6 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
          <div className="container mx-auto relative z-10">
            <div className="flex items-center justify-between">
              <button onClick={() => navigate(-1)} className="mr-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold tracking-wide mb-1">{getPageTitle()}</h1>
                <div className="flex flex-wrap gap-2">
                  {getFilterSummary().map((filter, index) => (
                    <span key={index} className="text-orange-100 text-xs bg-white/20 px-2 py-1 rounded-full">
                      {filter}
                    </span>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => setShowFilters(true)}
                className="bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/30 transition-all duration-300 border border-white/30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                </svg>
                Filters
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Sort & Results Bar */}
        <div className="bg-white shadow-sm border-b border-gray-200 p-4">
          <div className="container mx-auto flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {products.length} of {totalPages * 12} products
              {currentPage > 1 && ` (Page ${currentPage} of ${totalPages})`}
            </div>
            <div className="flex items-center space-x-4">
              <select 
                value={sortBy} 
                onChange={(e) => handleSortChange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="popular">Most Popular</option>
              </select>
              {(category || subcategory || productCategory || search || priceRange.min || priceRange.max) && (
                <button 
                  onClick={clearFilters}
                  className="text-orange-500 hover:text-orange-600 text-sm font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="flex justify-center py-12 bg-white rounded-2xl shadow-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500 mx-auto mb-4"></div>
                <span className="text-gray-600 font-medium">Loading products...</span>
              </div>
            </div>
          ) : products.length > 0 ? (
            <>
              {/* Enhanced Products Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map(product => (
                  <div key={product._id} className="product-card bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group hover:scale-105 border border-gray-100">
                    <Link to={`/user/product/${product._id}`} className="block">
                      <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                              e.target.src = '/placeholder-product.jpg';
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                            <div className="text-center">
                              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-sm">No image</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Discount Badge */}
                        {product.mrp > product.zammerPrice && (
                          <div className="absolute top-3 left-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                            {Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)}% OFF
                          </div>
                        )}
                        
                        {/* Category Badge */}
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-orange-600 text-xs px-2 py-1 rounded-full font-medium">
                          {product.subCategory || product.category}
                        </div>
                      </div>
                    </Link>
                    
                    <div className="p-4">
                      <Link to={`/user/product/${product._id}`}>
                        <h3 className="font-bold text-gray-800 mb-2 line-clamp-2 hover:text-orange-600 transition-colors duration-300">
                          {product.name}
                        </h3>
                      </Link>
                      
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <span className="text-orange-600 font-bold text-lg">₹{product.zammerPrice}</span>
                          {product.mrp > product.zammerPrice && (
                            <span className="text-gray-400 text-sm line-through ml-2">₹{product.mrp}</span>
                          )}
                        </div>
                        {product.seller && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {product.seller.firstName || 'Seller'}
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleAddToCart(product._id, product.name);
                        }}
                        disabled={addingToCart[product._id]}
                        className={`w-full py-2 rounded-xl text-sm font-bold transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 ${
                          addingToCart[product._id]
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white'
                        }`}
                      >
                        {addingToCart[product._id] ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent mr-2"></div>
                            Adding...
                          </div>
                        ) : (
                          '🛒 Add to Cart'
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Enhanced Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-12 bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 shadow-md hover:shadow-lg transform hover:scale-105'
                      }`}
                    >
                      Previous
                    </button>
                    
                    {/* Page Numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                            currentPage === pageNum
                              ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md'
                              : 'bg-gray-100 text-gray-600 hover:bg-gradient-to-r hover:from-orange-100 hover:to-pink-100 hover:text-orange-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 shadow-md hover:shadow-lg transform hover:scale-105'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl shadow-lg border-2 border-dashed border-gray-300">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Products Found</h3>
              <p className="text-gray-600 mb-6">
                {category || subcategory || search
                  ? "We couldn't find any products matching your criteria."
                  : "No products are available at the moment."
                }
              </p>
              <div className="space-y-3">
                {(category || subcategory || productCategory || search || priceRange.min || priceRange.max) && (
                  <button
                    onClick={clearFilters}
                    className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white px-6 py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    Clear All Filters
                  </button>
                )}
                <Link
                  to="/user/dashboard"
                  className="inline-block bg-white border-2 border-orange-500 text-orange-500 hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 px-6 py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-105"
                >
                  Browse All Categories
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Filter Modal */}
        {showFilters && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowFilters(false)}></div>
            <div className="relative bg-white rounded-t-3xl p-6 w-full max-w-md shadow-2xl">
              <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-300 rounded-full"></div>
              <h2 className="text-center font-bold text-xl mb-6 text-gray-800">🔍 Filter Products</h2>
              
              {/* Price Range Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Price Range</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Min Price"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="number"
                    placeholder="Max Price"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Sort Options */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Sort By</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowFilters(false)}
                  className="bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={applyPriceFilter}
                  className="bg-gradient-to-r from-orange-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:from-orange-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 z-50 shadow-2xl">
          <div className="flex justify-between items-center px-2 py-3">
            <Link to="/user/dashboard" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-orange-500 transition-colors duration-300 group">
              <div className="w-8 h-8 bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-orange-100 group-hover:to-pink-100 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="text-xs font-medium">Home</span>
            </Link>
            
            <Link to="/user/shop" className="flex flex-col items-center justify-center py-2 flex-1 text-orange-500 group">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-pink-100 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <span className="text-xs font-bold">Shop</span>
            </Link>
            
            <Link to="/user/cart" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-orange-500 transition-colors duration-300 group">
              <div className="w-8 h-8 bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-orange-100 group-hover:to-pink-100 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-xs font-medium">Cart</span>
            </Link>
            
            <Link to="/user/trending" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-orange-500 transition-colors duration-300 group">
              <div className="w-8 h-8 bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-orange-100 group-hover:to-pink-100 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-xs font-medium">Trending</span>
            </Link>
            
            <Link to="/user/limited-edition" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-orange-500 transition-colors duration-300 group">
              <div className="w-8 h-8 bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-orange-100 group-hover:to-pink-100 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <span className="text-xs font-medium">Limited</span>
            </Link>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default ProductListPage;