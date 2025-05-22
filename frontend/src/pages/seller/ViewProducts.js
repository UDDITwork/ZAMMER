import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import SellerLayout from '../../components/layouts/SellerLayout';
import { getSellerProducts, deleteProduct } from '../../services/productService';

const ViewProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

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

        {loading ? (
          <div className="text-center py-10">
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
                    Inventory
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product._id}>
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.variants?.reduce((total, variant) => total + (variant.inventory || 0), 0) || 0} units
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                      <div className="flex justify-center space-x-3">
                        <Link
                          to={`/seller/edit-product/${product._id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => setConfirmDelete(product._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
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