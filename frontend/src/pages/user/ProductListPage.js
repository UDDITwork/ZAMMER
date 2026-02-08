import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import UserHeader from '../../components/header/UserHeader';
import { getMarketplaceProducts } from '../../services/productService';
import { AuthContext } from '../../contexts/AuthContext';
import cartService from '../../services/cartService';
import WishlistButton from '../../components/common/WishlistButton';
import VirtualTryOnModal from '../../components/common/VirtualTryOnModal';
import { ChevronLeft, SlidersHorizontal, Sparkles, ShoppingBag, X } from 'lucide-react';

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

  // Get filter parameters from URL - support both legacy and new 4-level hierarchy
  const category = searchParams.get('category');
  const subcategory = searchParams.get('subCategory');
  const productCategory = searchParams.get('productCategory');
  const search = searchParams.get('search');

  // NEW: 4-level hierarchy parameters
  const categoryLevel1 = searchParams.get('categoryLevel1') || searchParams.get('level1');
  const categoryLevel2 = searchParams.get('categoryLevel2') || searchParams.get('level2');
  const categoryLevel3 = searchParams.get('categoryLevel3') || searchParams.get('level3');
  const categoryLevel4 = searchParams.get('categoryLevel4') || searchParams.get('level4');
  
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
        categoryLevel1,
        categoryLevel2,
        categoryLevel3,
        categoryLevel4,
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
📊 Level 1: ${categoryLevel1 || 'All'}
📊 Level 2: ${categoryLevel2 || 'All'}
📊 Level 3: ${categoryLevel3 || 'All'}
📊 Level 4: ${categoryLevel4 || 'All'}
📄 Page: ${page}
🔢 Sort: ${sortBy}
💰 Price Range: ${priceRange.min || 0} - ${priceRange.max || '∞'}
👤 User: ${userAuth.user?.name || 'Guest'}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

      // Build filter parameters - supporting both legacy and new 4-level hierarchy
      const params = {
        page,
        limit: 12,
        ...(category && { category }),
        ...(subcategory && { subCategory: subcategory }),
        ...(productCategory && { productCategory }),
        ...(search && { search }),
        ...(priceRange.min && { minPrice: priceRange.min }),
        ...(priceRange.max && { maxPrice: priceRange.max }),
        // NEW: 4-level hierarchy parameters
        ...(categoryLevel1 && { categoryLevel1 }),
        ...(categoryLevel2 && { categoryLevel2 }),
        ...(categoryLevel3 && { categoryLevel3 }),
        ...(categoryLevel4 && { categoryLevel4 })
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
  }, [category, subcategory, productCategory, search, categoryLevel1, categoryLevel2, categoryLevel3, categoryLevel4, sortBy, priceRange, userAuth.user?.name]);

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

  // Get page title - support both legacy and 4-level hierarchy
  const getPageTitle = () => {
    if (search) return `Search Results: "${search}"`;
    // 4-level hierarchy title
    if (categoryLevel4) return categoryLevel4;
    if (categoryLevel3) return categoryLevel3;
    if (categoryLevel2) return categoryLevel2;
    if (categoryLevel1) return categoryLevel1;
    // Legacy title
    if (category && subcategory) return `${category} - ${subcategory}`;
    if (category) return `${category} Collection`;
    if (productCategory) return productCategory;
    return 'All Products';
  };

  // Get filter summary - support both legacy and 4-level hierarchy
  const getFilterSummary = () => {
    const filters = [];
    // 4-level hierarchy breadcrumb
    if (categoryLevel1) filters.push(categoryLevel1);
    if (categoryLevel2) filters.push(categoryLevel2);
    if (categoryLevel3) filters.push(categoryLevel3);
    if (categoryLevel4) filters.push(categoryLevel4);
    // Legacy filters (only if no hierarchy)
    if (!categoryLevel1) {
      if (category) filters.push(`Category: ${category}`);
      if (subcategory) filters.push(`Type: ${subcategory}`);
    }
    if (productCategory) filters.push(`Collection: ${productCategory}`);
    if (search) filters.push(`Search: "${search}"`);
    if (priceRange.min || priceRange.max) {
      filters.push(`Price: ₹${priceRange.min || 0} - ₹${priceRange.max || '∞'}`);
    }
    return filters;
  };

  return (
    <UserLayout>
      <UserHeader />
      <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-5">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" strokeWidth={2} />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{getPageTitle()}</h1>
                  {getFilterSummary().length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {getFilterSummary().map((filter, index) => (
                        <span key={index} className="text-xs bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-full border border-orange-200">
                          {filter}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowFilters(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors border border-gray-200"
              >
                <SlidersHorizontal className="w-4 h-4" strokeWidth={2} />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sort & Results Bar */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{products.length}</span> products
                {currentPage > 1 && (
                  <span className="ml-2 text-gray-500">• Page {currentPage} of {totalPages}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 bg-white transition-all"
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="popular">Most Popular</option>
                </select>
                {(category || subcategory || productCategory || search || priceRange.min || priceRange.max || categoryLevel1 || categoryLevel2 || categoryLevel3 || categoryLevel4) && (
                  <button
                    onClick={clearFilters}
                    className="text-orange-600 hover:text-orange-700 text-sm font-medium transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-3 border-gray-200 border-t-orange-500 rounded-full animate-spin mb-4"></div>
              <span className="text-sm text-gray-500 font-medium">Loading products...</span>
            </div>
          ) : products.length > 0 ? (
            <>
              {/* Products Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
                {products.map(product => (
                  <div key={product._id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow group">
                    <Link to={`/user/product/${product._id}`} className="block">
                      <div className="aspect-square bg-gray-50 relative overflow-hidden">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = '/placeholder-product.jpg';
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                            <ShoppingBag className="w-12 h-12" strokeWidth={1} />
                          </div>
                        )}

                        {/* Discount Badge */}
                        {product.mrp > product.zammerPrice && (
                          <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded-md font-semibold">
                            {Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)}% OFF
                          </div>
                        )}

                        {/* Category Badge */}
                        <div className="absolute bottom-2 left-2 bg-white text-gray-700 text-xs px-2 py-1 rounded-md font-medium border border-gray-200">
                          {product.categoryLevel3 || product.subCategory || product.category}
                        </div>

                        {/* Fabric Type Badge */}
                        {product.fabricType && (
                          <div className="absolute bottom-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-md font-medium">
                            {product.fabricType}
                          </div>
                        )}

                        {/* Wishlist Button */}
                        <div className="absolute top-2 right-2 z-20">
                          <WishlistButton
                            productId={product._id}
                            size="sm"
                          />
                        </div>
                      </div>
                    </Link>

                    <div className="p-3">
                      <Link to={`/user/product/${product._id}`}>
                        <h3 className="font-semibold text-gray-900 mb-1.5 line-clamp-2 hover:text-orange-600 transition-colors text-sm leading-tight">
                          {product.name}
                        </h3>
                      </Link>

                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-orange-600 font-bold text-base">₹{product.zammerPrice?.toLocaleString('en-IN')}</span>
                        {product.mrp > product.zammerPrice && (
                          <span className="text-gray-400 text-xs line-through">₹{product.mrp?.toLocaleString('en-IN')}</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleAddToCart(product._id, product.name);
                          }}
                          disabled={addingToCart[product._id]}
                          className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                            addingToCart[product._id]
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-orange-600 hover:bg-orange-700 text-white'
                          }`}
                        >
                          {addingToCart[product._id] ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-300 border-t-transparent mr-1"></div>
                              <span>Adding...</span>
                            </div>
                          ) : (
                            'Add to Bag'
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedProduct(product);
                            setShowVirtualTryOn(true);
                          }}
                          className="py-2 rounded-lg text-xs font-semibold transition-colors bg-black hover:bg-gray-800 text-white flex items-center justify-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Try On</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center">
                  <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        currentPage === 1
                          ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                          : 'hover:bg-gray-50 text-gray-700'
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
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            currentPage === pageNum
                              ? 'bg-orange-600 text-white'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        currentPage === totalPages
                          ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Products Found</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                {category || subcategory || search
                  ? "We couldn't find any products matching your criteria. Try adjusting your filters."
                  : "No products are available at the moment. Please check back later."
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {(category || subcategory || productCategory || search || priceRange.min || priceRange.max || categoryLevel1 || categoryLevel2 || categoryLevel3 || categoryLevel4) && (
                  <button
                    onClick={clearFilters}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
                  >
                    Clear All Filters
                  </button>
                )}
                <Link
                  to="/user/dashboard"
                  className="inline-block bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-semibold transition-colors"
                >
                  Browse All Categories
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Filter Modal */}
        {showFilters && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)}></div>
            <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Filter Products</h2>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Price Range Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Price Range</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">Min Price</label>
                      <input
                        type="number"
                        placeholder="₹0"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">Max Price</label>
                      <input
                        type="number"
                        placeholder="₹10000"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Sort Options */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 bg-white transition-all"
                  >
                    <option value="newest">Newest First</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="popular">Most Popular</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowFilters(false)}
                    className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-2.5 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyPriceFilter}
                    className="bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-lg font-semibold transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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