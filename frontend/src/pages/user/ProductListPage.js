import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import { getMarketplaceProducts } from '../../services/productService';
import { AuthContext } from '../../contexts/AuthContext';
import cartService from '../../services/cartService';
import WishlistButton from '../../components/common/WishlistButton';
import VirtualTryOnModal from '../../components/common/VirtualTryOnModal';

// Enhanced terminal logging for production monitoring
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
  
  // Get filter parameters from URL
  const category = searchParams.get('category');
  const subcategory = searchParams.get('subCategory');
  const productCategory = searchParams.get('productCategory');
  const search = searchParams.get('search');
  
  // Component state
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [addingToCart, setAddingToCart] = useState({});
  
  // Virtual Try-On state
  const [showVirtualTryOn, setShowVirtualTryOn] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Refs for preventing multiple calls
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);

  // Enhanced product fetching with comprehensive logging
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
      
      // Build filter parameters
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
      
      // Add sorting
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

        // Log first few products for debugging
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

  // Enhanced useEffect with proper cleanup
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

  // Enhanced Add to Cart with comprehensive logging
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

    // Check authentication
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

  // Handle page change
  const handlePageChange = (page) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      fetchProducts(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle sort change
  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setCurrentPage(1);
  };

  // Handle price filter
  const applyPriceFilter = () => {
    setCurrentPage(1);
    fetchProducts(1);
    setShowFilters(false);
  };

  // Clear all filters
  const clearFilters = () => {
    setPriceRange({ min: '', max: '' });
    setSortBy('newest');
    setCurrentPage(1);
    navigate('/user/products');
  };

  // Get page title
  const getPageTitle = () => {
    if (search) return `Search Results: "${search}"`;
    if (category && subcategory) return `${category} - ${subcategory}`;
    if (category) return `${category} Collection`;
    if (productCategory) return productCategory;
    return 'All Products';
  };

  // Get filter summary
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
      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Professional Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-6">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => navigate(-1)} 
                  className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                >
                  <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {getFilterSummary().map((filter, index) => (
                      <span key={index} className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
                        {filter}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowFilters(true)}
                className="bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-medium transition-colors border border-gray-200 flex items-center space-x-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                </svg>
                <span>Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sort & Results Bar */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{products.length}</span> of <span className="font-medium">{totalPages * 12}</span> products
                {currentPage > 1 && (
                  <span className="ml-2 text-gray-500">• Page {currentPage} of {totalPages}</span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <select 
                  value={sortBy} 
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="popular">Most Popular</option>
                </select>
                {(category || subcategory || productCategory || search || priceRange.min || priceRange.max) && (
                  <button 
                    onClick={clearFilters}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex justify-center py-16 bg-white rounded-2xl border border-gray-200">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
                <span className="text-gray-600 font-medium">Loading products...</span>
              </div>
            </div>
          ) : products.length > 0 ? (
            <>
              {/* Products Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-12">
                {products.map(product => (
                  <div key={product._id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 group hover:border-blue-300">
                    <Link to={`/user/product/${product._id}`} className="block">
                      <div className="h-56 bg-gray-100 relative overflow-hidden">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.src = '/placeholder-product.jpg';
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                            <div className="text-center">
                              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-sm font-medium">No image</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Discount Badge */}
                        {product.mrp > product.zammerPrice && (
                          <div className="absolute top-3 left-3 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-bold">
                            {Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)}% OFF
                          </div>
                        )}
                        
                        {/* Category Badge */}
                        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-gray-700 text-xs px-3 py-1 rounded-full font-medium border border-white/50">
                          {product.categoryLevel3 || product.subCategory || product.category}
                        </div>

                        {/* Fabric Type Badge */}
                        {product.fabricType && (
                          <div className="absolute bottom-3 right-3 bg-blue-500/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full font-medium">
                            {product.fabricType}
                          </div>
                        )}
                        
                        {/* Wishlist Button */}
                        <div className="absolute top-3 right-3 z-20">
                          <WishlistButton 
                            productId={product._id} 
                            size="sm"
                            className="shadow-lg"
                          />
                        </div>
                      </div>
                    </Link>
                    
                    <div className="p-4">
                      <Link to={`/user/product/${product._id}`}>
                        <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors duration-200 text-sm leading-tight">
                          {product.name}
                        </h3>
                      </Link>
                      
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className="text-blue-600 font-bold text-lg">₹{product.zammerPrice?.toLocaleString('en-IN')}</span>
                          {product.mrp > product.zammerPrice && (
                            <span className="text-gray-400 text-sm line-through ml-2">₹{product.mrp?.toLocaleString('en-IN')}</span>
                          )}
                        </div>
                        {product.seller && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {product.seller.firstName || 'Seller'}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleAddToCart(product._id, product.name);
                          }}
                          disabled={addingToCart[product._id]}
                          className={`py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            addingToCart[product._id]
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                          }`}
                        >
                          {addingToCart[product._id] ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent mr-2"></div>
                              Adding...
                            </div>
                          ) : (
                            'Add to Cart'
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedProduct(product);
                            setShowVirtualTryOn(true);
                          }}
                          className="py-3 rounded-xl text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm hover:shadow-md hover:from-purple-600 hover:to-indigo-600"
                        >
                          Try On
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Professional Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center">
                  <div className="bg-white rounded-2xl border border-gray-200 p-2 shadow-sm">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                          currentPage === 1
                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            : 'bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-600 border border-gray-200 hover:border-blue-300'
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
                            className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-600 border border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                          currentPage === totalPages
                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            : 'bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-600 border border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No Products Found</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {category || subcategory || search
                  ? "We couldn't find any products matching your criteria. Try adjusting your filters."
                  : "No products are available at the moment. Please check back later."
                }
              </p>
              <div className="space-y-4">
                {(category || subcategory || productCategory || search || priceRange.min || priceRange.max) && (
                  <button
                    onClick={clearFilters}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors duration-200"
                  >
                    Clear All Filters
                  </button>
                )}
                <Link
                  to="/user/dashboard"
                  className="inline-block bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-xl font-semibold transition-colors duration-200"
                >
                  Browse All Categories
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Professional Filter Modal */}
        {showFilters && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowFilters(false)}></div>
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Filter Products</h2>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Price Range Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Price Range</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Min Price</label>
                      <input
                        type="number"
                        placeholder="₹0"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                        className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Max Price</label>
                      <input
                        type="number"
                        placeholder="₹10000"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                        className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Sort Options */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Sort By</label>
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="newest">Newest First</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="popular">Most Popular</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowFilters(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyPriceFilter}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors duration-200"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Professional Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-40 shadow-lg">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center py-3">
              <Link to="/user/dashboard" className="flex flex-col items-center py-2 flex-1 text-gray-500 hover:text-blue-600 transition-colors group">
                <div className="w-10 h-10 bg-gray-50 group-hover:bg-blue-50 rounded-xl flex items-center justify-center mb-1 transition-colors">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <span className="text-xs font-medium">Home</span>
              </Link>
              
              <Link to="/user/shop" className="flex flex-col items-center py-2 flex-1 text-blue-600 group">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-1">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold">Shop</span>
              </Link>
              
              <Link to="/user/cart" className="flex flex-col items-center py-2 flex-1 text-gray-500 hover:text-blue-600 transition-colors group">
                <div className="w-10 h-10 bg-gray-50 group-hover:bg-blue-50 rounded-xl flex items-center justify-center mb-1 transition-colors">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="text-xs font-medium">Cart</span>
              </Link>
              
              <Link to="/user/trending" className="flex flex-col items-center py-2 flex-1 text-gray-500 hover:text-blue-600 transition-colors group">
                <div className="w-10 h-10 bg-gray-50 group-hover:bg-blue-50 rounded-xl flex items-center justify-center mb-1 transition-colors">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-xs font-medium">Trending</span>
              </Link>
              
              <Link to="/user/limited-edition" className="flex flex-col items-center py-2 flex-1 text-gray-500 hover:text-blue-600 transition-colors group">
                <div className="w-10 h-10 bg-gray-50 group-hover:bg-blue-50 rounded-xl flex items-center justify-center mb-1 transition-colors">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <span className="text-xs font-medium">Limited</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Virtual Try-On Modal */}
      <VirtualTryOnModal
        isOpen={showVirtualTryOn}
        onClose={() => {
          setShowVirtualTryOn(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onTryOnComplete={(result) => {
          console.log('Virtual try-on completed:', result);
          toast.success('Virtual try-on completed! Check out the result.');
        }}
      />
    </UserLayout>
  );
};

export default ProductListPage;