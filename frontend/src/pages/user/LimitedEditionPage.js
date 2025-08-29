import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import { getLimitedEditionProducts } from '../../services/productService';
import WishlistButton from '../../components/common/WishlistButton';

const LimitedEditionPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchLimitedEditionProducts();
  }, [page, selectedCategory]);

  const fetchLimitedEditionProducts = async () => {
    setLoading(true);
    try {
      const queryParams = {
        page,
        limit: 12
      };
      
      if (selectedCategory) {
        queryParams.category = selectedCategory;
      }

      const response = await getLimitedEditionProducts(queryParams);
      if (response.success) {
        setProducts(response.data);
        setTotalPages(response.totalPages);
      } else {
        toast.error(response.message || 'Failed to fetch limited edition products');
      }
    } catch (error) {
      console.error('Error fetching limited edition products:', error);
      toast.error('Something went wrong while fetching products');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setPage(1); // Reset to first page when category changes
  };

  const getShopImage = (seller) => {
    if (seller?.shop?.mainImage) {
      return seller.shop.mainImage;
    }
    if (seller?.shop?.images && seller.shop.images.length > 0) {
      return seller.shop.images[0];
    }
    return null;
  };

  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  };

  return (
    <UserLayout>
      <div className="limited-edition-page pb-16">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
          <div className="container mx-auto">
            <h1 className="text-3xl font-bold mb-2">⭐ Limited Edition</h1>
            <p className="text-purple-100">Exclusive products available for a limited time</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-b p-4">
          <div className="container mx-auto">
            <div className="flex items-center space-x-4 overflow-x-auto">
              <button
                onClick={() => handleCategoryChange('')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  selectedCategory === '' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Categories
              </button>
              <button
                onClick={() => handleCategoryChange('Men')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  selectedCategory === 'Men' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Men
              </button>
              <button
                onClick={() => handleCategoryChange('Women')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  selectedCategory === 'Women' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Women
              </button>
              <button
                onClick={() => handleCategoryChange('Kids')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  selectedCategory === 'Kids' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Kids
              </button>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="container mx-auto px-4 py-6">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading limited edition products...</p>
              </div>
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800">
                  {selectedCategory ? `${selectedCategory} - ` : ''}Limited Edition Products ({products.length})
                </h2>
                <p className="text-gray-600 text-sm mt-1">Hurry up! These exclusive items won't last long</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                  <div key={product._id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                    <div className="relative">
                      <div className="h-48 bg-gray-200">
                        {product.images && product.images.length > 0 ? (
                          <img 
                            src={product.images[0]} 
                            alt={product.name} 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-gray-400">
                            No image
                          </div>
                        )}
                      </div>
                      
                      {/* Limited Edition Badge */}
                      <div className="absolute top-2 left-2 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                        ⭐ LIMITED
                      </div>
                      
                      {/* Wishlist Button */}
                      <WishlistButton productId={product._id} />
                    </div>
                    
                    <div className="p-3">
                      <h3 className="font-medium text-sm text-gray-800 mb-1">
                        {truncateText(product.name, 25)}
                      </h3>
                      
                      {/* Shop Info */}
                      {product.seller && (
                        <div className="flex items-center mb-2">
                          <div className="w-4 h-4 mr-1">
                            {getShopImage(product.seller) ? (
                              <img 
                                src={getShopImage(product.seller)} 
                                alt={product.seller.shop?.name} 
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-300 rounded-full"></div>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {product.seller.shop?.name || 'Shop'}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-purple-600 font-bold text-sm">₹{product.zammerPrice}</span>
                          {product.mrp > product.zammerPrice && (
                            <>
                              <span className="text-gray-500 text-xs line-through ml-1">₹{product.mrp}</span>
                              <span className="text-green-600 text-xs ml-1">
                                {Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)}% off
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <Link
                        to={`/user/product/${product._id}`}
                        className="block w-full text-center bg-purple-500 hover:bg-purple-600 text-white py-2 rounded text-xs font-medium transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center mt-8 space-x-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className={`px-4 py-2 text-sm font-medium rounded ${
                      page === 1 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-white text-gray-700 border hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </button>
                  
                  <span className="px-4 py-2 text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className={`px-4 py-2 text-sm font-medium rounded ${
                      page === totalPages 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-white text-gray-700 border hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <div className="mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">No Limited Edition Products</h3>
              <p className="text-gray-600 mb-4">
                {selectedCategory 
                  ? `No limited edition products found in ${selectedCategory} category.`
                  : 'No limited edition products are currently available.'
                }
              </p>
              <Link
                to="/user/dashboard"
                className="inline-block bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Browse All Products
              </Link>
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default LimitedEditionPage; 