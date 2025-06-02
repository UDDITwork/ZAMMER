import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import SellerLayout from '../../components/layouts/SellerLayout';
import { 
  getSellerProducts, 
  deleteProduct, 
  toggleLimitedEdition, 
  toggleTrending,
  updateProductStatus 
} from '../../services/productService';

const ViewProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toggleLoading, setToggleLoading] = useState({}); // Track loading state for individual toggles

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await getSellerProducts();
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
      <div className="view-products-container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Your Products</h1>
          <Link
            to="/seller/add-product"
            className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md text-sm"
          >
            Add New Product
          </Link>
        </div>

        <div className="filters bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Products
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or description"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Category
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
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
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        {products.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-2xl font-bold text-gray-800">{products.length}</div>
              <div className="text-sm text-gray-600">Total Products</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-2xl font-bold text-purple-600">
                {products.filter(p => p.isLimitedEdition).length}
              </div>
              <div className="text-sm text-gray-600">Limited Edition</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-2xl font-bold text-pink-600">
                {products.filter(p => p.isTrending).length}
              </div>
              <div className="text-sm text-gray-600">Trending</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-2xl font-bold text-green-600">
                {products.filter(p => p.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading products...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inventory
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-12 w-12 flex-shrink-0 mr-4">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="h-full w-full object-cover rounded-md"
                            />
                          ) : (
                            <div className="h-full w-full bg-gray-200 rounded-md flex items-center justify-center text-gray-500 text-xs">
                              No Image
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{product.name}</h4>
                          <p className="text-sm text-gray-500 truncate max-w-xs">
                            {product.description.slice(0, 60)}
                            {product.description.length > 60 ? '...' : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.category}</div>
                      <div className="text-sm text-gray-500">{product.subCategory}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">₹{product.zammerPrice}</div>
                      <div className="text-sm text-gray-500">MRP: ₹{product.mrp}</div>
                      {product.mrp > product.zammerPrice && (
                        <div className="text-xs text-green-600">
                          {Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)}% off
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        {/* Status Badges */}
                        <div className="flex flex-wrap gap-1">
                          {product.isLimitedEdition && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              ⭐ Limited Edition
                            </span>
                          )}
                          {product.isTrending && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                              🔥 Trending
                            </span>
                          )}
                          <button
                            onClick={() => handleStatusToggle(product._id, product.status)}
                            disabled={toggleLoading[`status_${product._id}`]}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                              product.status === 'active' 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            } ${toggleLoading[`status_${product._id}`] ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            {toggleLoading[`status_${product._id}`] ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-1"></div>
                            ) : (
                              product.status === 'active' ? '✓' : '○'
                            )}
                            {product.status === 'active' ? ' Active' : ' Paused'}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.variants?.reduce((total, variant) => total + (variant.quantity || 0), 0) || 0} units
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col space-y-2">
                        {/* Main Actions */}
                        <div className="flex justify-center space-x-2">
                          <Link
                            to={`/seller/edit-product/${product._id}`}
                            className="text-indigo-600 hover:text-indigo-900 px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-50 text-xs"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => setConfirmDelete(product._id)}
                            className="text-red-600 hover:text-red-900 px-2 py-1 rounded border border-red-200 hover:bg-red-50 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                        
                        {/* Toggle Actions */}
                        <div className="flex justify-center space-x-1">
                          <button
                            onClick={() => handleLimitedEditionToggle(product._id, product.isLimitedEdition)}
                            disabled={toggleLoading[`limited_${product._id}`]}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              product.isLimitedEdition
                                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            } ${toggleLoading[`limited_${product._id}`] ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {toggleLoading[`limited_${product._id}`] ? (
                              <div className="flex items-center">
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
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              product.isTrending
                                ? 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            } ${toggleLoading[`trending_${product._id}`] ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {toggleLoading[`trending_${product._id}`] ? (
                              <div className="flex items-center">
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-1"></div>
                                ...
                              </div>
                            ) : (
                              <>🔥 {product.isTrending ? 'Trending' : 'Make Trending'}</>
                            )}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Confirmation Dialog */}
            {confirmDelete && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-sm mx-auto">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Are you sure you want to delete this product? This action cannot be undone.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(confirmDelete)}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600 mb-4">No products found.</p>
            {searchTerm || selectedCategory ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('');
                }}
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                Clear filters to show all products
              </button>
            ) : (
              <Link
                to="/seller/add-product"
                className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md text-sm inline-block"
              >
                Add Your First Product
              </Link>
            )}
          </div>
        )}
      </div>
    </SellerLayout>
  );
};

export default ViewProducts;