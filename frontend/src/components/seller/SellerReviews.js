import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getSellerReviews } from '../../services/sellerReviewService';
import StarRating from '../common/StarRating';

const SellerReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalReviews: 0,
    averageRating: 0
  });

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async (page = 1) => {
    setLoading(true);
    try {
      const response = await getSellerReviews(page, 10);
      if (response.success) {
        setReviews(response.data);
        setPagination({
          currentPage: response.currentPage,
          totalPages: response.totalPages,
          totalReviews: response.totalReviews,
          averageRating: response.averageRating
        });
      } else {
        toast.error(response.message || 'Failed to fetch reviews');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Something went wrong while loading reviews');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchReviews(newPage);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
      {/* Header with Stats */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
          Customer Reviews
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Reviews */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-2xl border border-blue-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-800">Total Reviews</p>
                <p className="text-2xl font-bold text-blue-900">{pagination.totalReviews}</p>
              </div>
            </div>
          </div>

          {/* Average Rating */}
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-2xl border border-yellow-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-yellow-800">Average Rating</p>
                <div className="flex items-center">
                  <StarRating rating={pagination.averageRating} />
                  <span className="ml-2 text-lg font-bold text-yellow-900">
                    {pagination.averageRating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Reviews */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-2xl border border-green-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">This Page</p>
                <p className="text-2xl font-bold text-green-900">{reviews.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review._id} className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-semibold text-gray-800">{review.user.name}</h4>
                    {review.isVerifiedPurchase && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 mb-3">
                    <StarRating rating={review.rating} />
                    <span className="text-gray-500 text-sm">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>

                  <div className="mb-3">
                    <h5 className="font-medium text-gray-800 mb-1">Product:</h5>
                    <p className="text-gray-600">{review.product.name}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-gray-700 leading-relaxed">{review.review}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Reviews Yet</h3>
          <p className="text-gray-600">Your products haven't received any reviews yet. Keep selling great products!</p>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Previous
          </button>
          
          <div className="flex space-x-2">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-4 py-2 rounded-xl transition-all duration-200 ${
                  page === pagination.currentPage
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default SellerReviews;
