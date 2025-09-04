import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import SellerLayout from '../../components/layouts/SellerLayout';
import StockManagementModal from '../../components/seller/StockManagementModal';
import { 
  getSellerProducts, 
  deleteProduct, 
  toggleLimitedEdition, 
  toggleTrending,
  updateProductStatus,
  getProductInventory,
  addProductStock,
  getLowStockProducts
} from '../../services/productService';
import { getProductReviews } from '../../services/reviewService';
import StarRating from '../../components/common/StarRating';

const ViewProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toggleLoading, setToggleLoading] = useState({}); // Track loading state for individual toggles
  
  // 🎯 NEW: Reviews Modal States
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productReviews, setProductReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // 🎯 NEW: Enhanced Stock Management States
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState(null);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [showLowStockAlert, setShowLowStockAlert] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      console.log('🔍 [SELLER] Fetching seller products...');
      const response = await getSellerProducts();
      
      if (response.success) {
        console.log(`✅ [SELLER] Found ${response.data.length} products`);
        
        // 🎯 NEW: Debug seller product images
        response.data.forEach((product, index) => {
          console.log(`📦 [SELLER] Product ${index + 1}: ${product.name}`);
          console.log(`   📁 Images: ${product.images?.length || 0}`);
          if (product.images && product.images.length > 0) {
            product.images.forEach((img, imgIdx) => {
              console.log(`   🖼️  Image ${imgIdx + 1}: ${img.substring(0, 50)}...`);
              console.log(`   ✅ Is Cloudinary: ${img.includes('cloudinary.com')}`);
            });
          }
        });
        
        setProducts(response.data);
      } else {
        toast.error(response.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('❌ [SELLER] Error fetching products:', error);
      toast.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await deleteProduct(id);
      if (response.success) {
        toast.success('Product deleted successfully');
        setProducts(products.filter(product => product._id !== id));
      } else {
        toast.error(response.message || 'Failed to delete product');
      }
    } catch (error) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setConfirmDelete(null);
    }
  };

  // 🎯 FIXED: Efficient Limited Edition Toggle using specific API
  const handleLimitedEditionToggle = async (productId, currentStatus) => {
    setToggleLoading(prev => ({ ...prev, [`limited_${productId}`]: true }));
    
    try {
      console.log('🎯 Calling toggleLimitedEdition for product:', productId);
      const response = await toggleLimitedEdition(productId);
      
      if (response.success) {
        // Update the local state
        setProducts(prev => prev.map(p => 
          p._id === productId 
            ? { ...p, isLimitedEdition: response.data.isLimitedEdition }
            : p
        ));
        
        toast.success(`Product ${response.data.isLimitedEdition ? 'marked as' : 'removed from'} Limited Edition`);
      } else {
        toast.error(response.message || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error toggling Limited Edition:', error);
      toast.error(error.message || 'Something went wrong while updating the product');
    } finally {
      setToggleLoading(prev => ({ ...prev, [`limited_${productId}`]: false }));
    }
  };

  // 🎯 FIXED: Efficient Trending Toggle using specific API
  const handleTrendingToggle = async (productId, currentStatus) => {
    setToggleLoading(prev => ({ ...prev, [`trending_${productId}`]: true }));
    
    try {
      console.log('🔥 Calling toggleTrending for product:', productId);
      const response = await toggleTrending(productId);
      
      if (response.success) {
        // Update the local state
        setProducts(prev => prev.map(p => 
          p._id === productId 
            ? { ...p, isTrending: response.data.isTrending }
            : p
        ));
        
        toast.success(`Product ${response.data.isTrending ? 'marked as' : 'removed from'} Trending`);
      } else {
        toast.error(response.message || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error toggling Trending:', error);
      toast.error(error.message || 'Something went wrong while updating the product');
    } finally {
      setToggleLoading(prev => ({ ...prev, [`trending_${productId}`]: false }));
    }
  };

  // 🎯 NEW: Handle Status Toggle (Active/Inactive)
  const handleStatusToggle = async (productId, currentStatus) => {
    setToggleLoading(prev => ({ ...prev, [`status_${productId}`]: true }));
    
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      console.log('📊 Calling updateProductStatus for product:', productId, 'to status:', newStatus);
      const response = await updateProductStatus(productId, newStatus);
      
      if (response.success) {
        // Update the local state
        setProducts(prev => prev.map(p => 
          p._id === productId 
            ? { ...p, status: response.data.status }
            : p
        ));
        
        toast.success(`Product ${response.data.status === 'active' ? 'activated' : 'paused'} successfully`);
      } else {
        toast.error(response.message || 'Failed to update product status');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error(error.message || 'Something went wrong while updating the product status');
    } finally {
      setToggleLoading(prev => ({ ...prev, [`status_${productId}`]: false }));
    }
  };

  // 🎯 NEW: Review Functions
  const handleViewReviews = async (product) => {
    setSelectedProduct(product);
    setShowReviewsModal(true);
    setReviewsLoading(true);
    
    try {
      const response = await getProductReviews(product._id);
      if (response.success) {
        setProductReviews(response.data);
      } else {
        toast.error(response.message || 'Failed to fetch reviews');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Something went wrong while loading reviews');
    } finally {
      setReviewsLoading(false);
    }
  };

  // 🎯 NEW: Enhanced Stock Management Functions
  const handleManageStock = (product) => {
    setSelectedProductForStock(product);
    setShowStockModal(true);
  };

  const handleStockUpdated = () => {
    fetchProducts(); // Refresh products to show updated inventory
  };

  const checkLowStockProducts = async () => {
    try {
      const response = await getLowStockProducts(1, 5);
      if (response.success && response.data.products.length > 0) {
        setLowStockProducts(response.data.products);
        setShowLowStockAlert(true);
      }
    } catch (error) {
      console.error('Error checking low stock products:', error);
    }
  };

  // Check for low stock products on component mount
  useEffect(() => {
    checkLowStockProducts();
  }, []);

  // Filter products based on search term and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
      || product.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory 
      ? product.category === selectedCategory
      : true;
    
    return matchesSearch && matchesCategory;
  });

  // Get unique categories from products
  const categories = [...new Set(products.map(product => product.category))];

  return (
    <SellerLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Premium Header */}
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-500 rounded-3xl transform rotate-1 opacity-10"></div>
            <div className="relative bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-pink-600 bg-clip-text text-transparent">
                      Your Products
                    </h1>
                    <p className="text-lg text-gray-600 mt-2">Manage your entire product catalog</p>
                  </div>
                </div>
                
                <Link
                  to="/seller/add-product"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add New Product
                </Link>
              </div>
            </div>
          </div>

          {/* Enhanced Filters */}
          <div className="relative mb-8">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-20"></div>
            <div className="relative bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/50">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-2">
                  <label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-3">
                    Search Products
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name or description..."
                      className="block w-full pl-12 pr-4 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-3">
                    Filter by Category
                  </label>
                  <select
                    id="category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="block w-full px-4 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category, index) => (
                      <option key={index} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('');
                    }}
                    className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 font-semibold"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 🎯 NEW: Low Stock Alert */}
          {showLowStockAlert && lowStockProducts.length > 0 && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-800">Low Stock Alert</h3>
                    <p className="text-yellow-700">You have {lowStockProducts.length} products with low stock</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLowStockAlert(false)}
                  className="text-yellow-600 hover:text-yellow-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {lowStockProducts.slice(0, 3).map((product) => (
                  <div key={product._id} className="flex items-center justify-between text-sm">
                    <span className="text-yellow-800">{product.name}</span>
                    <span className="text-yellow-600 font-medium">
                      Stock: {product.inventory?.availableQuantity || 0}
                    </span>
                  </div>
                ))}
                {lowStockProducts.length > 3 && (
                  <p className="text-yellow-600 text-sm">... and {lowStockProducts.length - 3} more</p>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Stats Summary */}
          {products.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                <div className="relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/50 text-center">
                  <div className="text-3xl font-bold text-gray-800">{products.length}</div>
                  <div className="text-sm text-blue-600 font-semibold">Total Products</div>
                </div>
              </div>
              
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                <div className="relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/50 text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {products.filter(p => p.isLimitedEdition).length}
                  </div>
                  <div className="text-sm text-purple-600 font-semibold">Limited Edition</div>
                </div>
              </div>
              
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-red-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                <div className="relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/50 text-center">
                  <div className="text-3xl font-bold text-pink-600">
                    {products.filter(p => p.isTrending).length}
                  </div>
                  <div className="text-sm text-pink-600 font-semibold">Trending</div>
                </div>
              </div>
              
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                <div className="relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/50 text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {products.filter(p => p.status === 'active').length}
                  </div>
                  <div className="text-sm text-green-600 font-semibold">Active</div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-16">
              <div className="flex justify-center items-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-pink-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                </div>
                <span className="ml-4 text-gray-600 font-medium text-lg">Loading your products...</span>
              </div>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20"></div>
              <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 p-8">
                  {filteredProducts.map((product) => (
                    <div key={product._id} className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden hover:shadow-2xl transition-all duration-300">
                        
                        {/* Product Image */}
                        <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              onLoad={() => {
                                console.log(`✅ [SELLER] Image loaded: ${product.name}`);
                              }}
                              onError={(e) => {
                                console.error(`❌ [SELLER] Image failed: ${product.name} - ${e.target.src}`);
                                console.error('🔍 [SELLER] Debug info:', {
                                  productName: product.name,
                                  imageUrl: e.target.src,
                                  isCloudinary: e.target.src.includes('cloudinary.com')
                                });
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <div className="text-center">
                                <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm font-medium">No Image</span>
                                {/* 🎯 Debug info for seller */}
                                {process.env.NODE_ENV === 'development' && (
                                  <div className="text-xs text-red-500 mt-1">
                                    Debug: {product.images ? `${product.images.length} images` : 'No images'}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Product Badges */}
                          <div className="absolute top-4 left-4 space-y-2">
                            {product.isTrending && (
                              <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                                🔥 Trending
                              </span>
                            )}
                            {product.isLimitedEdition && (
                              <span className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                                ⭐ Limited
                              </span>
                            )}
                          </div>

                          {/* Status Badge */}
                          <div className="absolute top-4 right-4">
                            <button
                              onClick={() => handleStatusToggle(product._id, product.status)}
                              disabled={toggleLoading[`status_${product._id}`]}
                              className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg transition-all duration-200 ${
                                product.status === 'active' 
                                  ? 'bg-green-500 text-white hover:bg-green-600' 
                                  : product.status === 'paused' 
                                  ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                                  : 'bg-red-500 text-white hover:bg-red-600'
                              } ${toggleLoading[`status_${product._id}`] ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              {toggleLoading[`status_${product._id}`] ? (
                                <div className="flex items-center">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-1"></div>
                                  ...
                                </div>
                              ) : (
                                product.status?.toUpperCase()
                              )}
                            </button>
                          </div>
                        </div>
                        
                        {/* Product Details */}
                        <div className="p-6">
                          <h3 className="font-bold text-xl text-gray-800 mb-3 line-clamp-2 group-hover:text-purple-600 transition-colors">
                            {product.name}
                          </h3>
                          
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center space-x-3">
                              <span className="text-purple-600 font-bold text-2xl">₹{product.zammerPrice}</span>
                              {product.mrp > product.zammerPrice && (
                                <div className="flex flex-col">
                                  <span className="text-gray-500 text-sm line-through">₹{product.mrp}</span>
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                                    {Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)}% OFF
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center text-sm text-gray-600 mb-6">
                            <span className="font-medium">
                              Stock: <span className={`font-bold ${
                                product.inventory?.availableQuantity <= (product.inventory?.lowStockThreshold || 5)
                                  ? 'text-red-600'
                                  : 'text-gray-800'
                              }`}>
                                {product.inventory?.availableQuantity || product.variants?.reduce((total, variant) => total + (variant.quantity || 0), 0) || 0}
                              </span>
                              {product.inventory?.availableQuantity <= (product.inventory?.lowStockThreshold || 5) && (
                                <span className="ml-2 text-red-600 text-xs">⚠️ Low Stock</span>
                              )}
                            </span>
                            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                              {product.category}
                            </span>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="space-y-3">
                            {/* Main Actions */}
                            <div className="flex space-x-3">
                              <Link
                                to={`/seller/edit-product/${product._id}`}
                                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-3 px-4 rounded-xl font-semibold text-center transition-all duration-200 shadow-lg hover:shadow-xl"
                              >
                                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </Link>
                              <button
                                onClick={() => setConfirmDelete(product._id)}
                                className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                              >
                                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </div>
                            
                            {/* Toggle Actions */}
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleLimitedEditionToggle(product._id, product.isLimitedEdition)}
                                disabled={toggleLoading[`limited_${product._id}`]}
                                className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 shadow-md ${
                                  product.isLimitedEdition
                                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                } ${toggleLoading[`limited_${product._id}`] ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {toggleLoading[`limited_${product._id}`] ? (
                                  <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-1"></div>
                                    ...
                                  </div>
                                ) : (
                                  <>⭐ {product.isLimitedEdition ? 'Limited' : 'Make Limited'}</>
                                )}
                              </button>
                              
                              <button
                                onClick={() => handleTrendingToggle(product._id, product.isTrending)}
                                disabled={toggleLoading[`trending_${product._id}`]}
                                className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 shadow-md ${
                                  product.isTrending
                                    ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                } ${toggleLoading[`trending_${product._id}`] ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {toggleLoading[`trending_${product._id}`] ? (
                                  <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-1"></div>
                                    ...
                                  </div>
                                ) : (
                                  <>🔥 {product.isTrending ? 'Trending' : 'Make Trending'}</>
                                )}
                              </button>
                            </div>
                            
                            {/* 🎯 NEW: View Reviews Button */}
                            <button
                              onClick={() => handleViewReviews(product)}
                              className="flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 shadow-md bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600"
                            >
                              📝 View Reviews
                            </button>
                            
                            {/* 🎯 NEW: Enhanced Stock Management Button */}
                            <button
                              onClick={() => handleManageStock(product)}
                              className="flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 shadow-md bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
                            >
                              📦 Manage Stock
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-16 text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <svg className="w-16 h-16 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-4">No products found</h3>
              {searchTerm || selectedCategory ? (
                <div>
                  <p className="text-gray-600 text-lg mb-6">No products match your current filters</p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('');
                    }}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Clear filters to show all products
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 text-lg mb-8">Start building your product catalog</p>
                  <Link
                    to="/seller/add-product"
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-4 px-8 rounded-xl font-semibold inline-flex items-center shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Your First Product
                  </Link>
                </div>
              )}
            </div>
          )}
          
          {/* Premium Confirmation Dialog */}
          {confirmDelete && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl blur opacity-30"></div>
                <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-auto">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Delete Product</h3>
                    <p className="text-gray-600 mb-8">
                      Are you sure you want to delete this product? This action cannot be undone and will permanently remove the product from your catalog.
                    </p>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 font-semibold transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(confirmDelete)}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        Delete Product
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🎯 NEW: Reviews Modal */}
          {showReviewsModal && selectedProduct && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">Product Reviews</h3>
                    <p className="text-gray-600 mt-1">{selectedProduct.name}</p>
                  </div>
                  <button
                    onClick={() => setShowReviewsModal(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {reviewsLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-500"></div>
                  </div>
                ) : productReviews.length > 0 ? (
                  <div className="space-y-6">
                    {productReviews.map((review) => (
                      <div key={review._id} className="bg-gray-50 rounded-2xl p-6">
                        <div className="flex items-start justify-between mb-6">
                          <div>
                            <div className="flex items-center space-x-3">
                              <h4 className="font-semibold text-gray-800">{review.user.name}</h4>
                              {review.isVerifiedPurchase && (
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                  Verified Purchase
                                </span>
                              )}
                            </div>
                            <div className="flex items-center mt-1">
                              <StarRating rating={review.rating} />
                              <span className="text-gray-500 text-sm ml-2">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-700">{review.review}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-2xl">
                    <p className="text-gray-600">No reviews yet for this product.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 🎯 NEW: Enhanced Stock Management Modal */}
          <StockManagementModal
            isOpen={showStockModal}
            onClose={() => setShowStockModal(false)}
            product={selectedProductForStock}
            onStockUpdated={handleStockUpdated}
          />
        </div>
      </div>
    </SellerLayout>
  );
};


export default ViewProducts;