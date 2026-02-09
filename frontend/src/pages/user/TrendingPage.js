import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import UserHeader from '../../components/header/UserHeader';
import { getTrendingProducts } from '../../services/productService';
import ProductCard from '../../components/common/ProductCard';
import { ProductGridSkeleton } from '../../components/common/SkeletonLoader';
import { TrendingUp } from 'lucide-react';

const TrendingPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchTrendingProducts();
    // eslint-disable-next-line
  }, [page, selectedCategory]);

  const fetchTrendingProducts = async () => {
    setLoading(true);
    try {
      const queryParams = {
        page,
        limit: 12
      };
      if (selectedCategory) {
        queryParams.category = selectedCategory;
      }
      const response = await getTrendingProducts(queryParams);
      if (response.success) {
        setProducts(response.data);
        setTotalPages(response.totalPages);
      } else {
        toast.error(response.message || 'Failed to fetch trending products');
      }
    } catch (error) {
      console.error('Error fetching trending products:', error);
      toast.error('Something went wrong while fetching products');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setPage(1);
  };

  return (
    <UserLayout>
      <UserHeader />
      <div className="min-h-screen bg-gray-50 pb-16">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-[22px] font-light tracking-[-0.02em] mb-1 flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Trending
            </h1>
            <p className="text-orange-100 text-sm">Most popular products right now</p>
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
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Categories
              </button>
              <button
                onClick={() => handleCategoryChange('Men')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  selectedCategory === 'Men'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Men
              </button>
              <button
                onClick={() => handleCategoryChange('Women')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  selectedCategory === 'Women'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Women
              </button>
              <button
                onClick={() => handleCategoryChange('Kids')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  selectedCategory === 'Kids'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Kids
              </button>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {loading ? (
            <ProductGridSkeleton count={8} cols="grid-cols-2 md:grid-cols-3 lg:grid-cols-4" />
          ) : products.length > 0 ? (
            <>
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedCategory ? `${selectedCategory} - ` : ''}Trending Products ({products.length})
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
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
              <h3 className="text-xl font-medium text-gray-800 mb-2">No Trending Products</h3>
              <p className="text-gray-600 mb-4">
                {selectedCategory 
                  ? `No trending products found in ${selectedCategory} category.`
                  : 'No trending products are currently available.'
                }
              </p>
              <Link
                to="/user/home"
                className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors"
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

export default TrendingPage;