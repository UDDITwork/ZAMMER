import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Get reviews for seller's products
export const getSellerReviews = async (page = 1, limit = 10) => {
  try {
    const token = localStorage.getItem('sellerToken');
    if (!token) {
      throw new Error('No seller token found');
    }

    const response = await axios.get(`${API_URL}/reviews/seller`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        page,
        limit
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching seller reviews:', error);
    throw error;
  }
};

// Get seller's review statistics
export const getSellerReviewStats = async () => {
  try {
    const token = localStorage.getItem('sellerToken');
    if (!token) {
      throw new Error('No seller token found');
    }

    const response = await axios.get(`${API_URL}/reviews/seller`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        page: 1,
        limit: 1 // We only need the stats, not the actual reviews
      }
    });

    return {
      success: true,
      data: {
        totalReviews: response.data.totalReviews,
        averageRating: response.data.averageRating
      }
    };
  } catch (error) {
    console.error('Error fetching seller review stats:', error);
    throw error;
  }
};
