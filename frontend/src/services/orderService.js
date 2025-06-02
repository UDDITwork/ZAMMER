import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const userToken = localStorage.getItem('userToken');
    const sellerToken = localStorage.getItem('sellerToken');
    
    if (userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
    } else if (sellerToken) {
      config.headers.Authorization = `Bearer ${sellerToken}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('sellerToken');
      localStorage.removeItem('sellerData');
      // Redirect will be handled by the calling component
    }
    return Promise.reject(error);
  }
);

export const orderService = {
  // Create new order
  createOrder: async (orderData) => {
    try {
      const response = await api.post('/orders', orderData);
      return {
        success: true,
        data: response.data.data,
        message: 'Order created successfully'
      };
    } catch (error) {
      console.error('Create order error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create order'
      };
    }
  },

  // Get order by ID
  getOrderById: async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Get order error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch order'
      };
    }
  },

  // Get user's orders
  getUserOrders: async (page = 1, limit = 10) => {
    try {
      const response = await api.get(`/orders/myorders?page=${page}&limit=${limit}`);
      return {
        success: true,
        data: response.data.data,
        totalPages: response.data.totalPages,
        currentPage: response.data.currentPage,
        count: response.data.count
      };
    } catch (error) {
      console.error('Get user orders error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch orders'
      };
    }
  },

  // Get seller's orders
  getSellerOrders: async (page = 1, limit = 10, status = '') => {
    try {
      let url = `/orders/seller?page=${page}&limit=${limit}`;
      if (status) {
        url += `&status=${status}`;
      }
      
      const response = await api.get(url);
      return {
        success: true,
        data: response.data.data,
        totalPages: response.data.totalPages,
        currentPage: response.data.currentPage,
        count: response.data.count
      };
    } catch (error) {
      console.error('Get seller orders error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch orders'
      };
    }
  },

  // Update order status (seller only)
  updateOrderStatus: async (orderId, status) => {
    try {
      const response = await api.put(`/orders/${orderId}/status`, {
        status
      });
      return {
        success: true,
        data: response.data.data,
        message: 'Order status updated successfully'
      };
    } catch (error) {
      console.error('Update order status error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update order status'
      };
    }
  },

  // Get seller order statistics
  getSellerOrderStats: async () => {
    try {
      const response = await api.get('/orders/seller/stats');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Get seller stats error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch order statistics'
      };
    }
  },

  // Process payment (mock implementation)
  processPayment: async (paymentData) => {
    try {
      // Mock payment processing - always success for development
      const { amount, method, cardDetails } = paymentData;
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock payment response
      const mockResponse = {
        success: true,
        transactionId: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`,
        amount: amount,
        method: method,
        status: 'completed',
        timestamp: new Date().toISOString()
      };
      
      return mockResponse;
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        message: 'Payment processing failed'
      };
    }
  },

  // Verify payment (mock implementation)
  verifyPayment: async (transactionId) => {
    try {
      // Mock payment verification - always success for development
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        verified: true,
        transactionId: transactionId,
        status: 'verified'
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        message: 'Payment verification failed'
      };
    }
  },

  // Calculate order totals
  calculateOrderTotals: (cartItems, shippingAddress = null) => {
    if (!cartItems || cartItems.length === 0) {
      return {
        subtotal: 0,
        taxPrice: 0,
        shippingPrice: 0,
        totalPrice: 0
      };
    }

    const subtotal = cartItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    // Calculate tax (18% GST)
    const taxPrice = Math.round(subtotal * 0.18);

    // Calculate shipping (free for orders above ₹500)
    const shippingPrice = subtotal >= 500 ? 0 : 50;

    const totalPrice = subtotal + taxPrice + shippingPrice;

    return {
      subtotal: Math.round(subtotal),
      taxPrice,
      shippingPrice,
      totalPrice: Math.round(totalPrice)
    };
  },

  // Format order for API
  formatOrderForAPI: (cartItems, shippingAddress, paymentMethod, paymentResult = null) => {
    const totals = orderService.calculateOrderTotals(cartItems, shippingAddress);
    
    // Group items by seller
    const sellerItems = {};
    cartItems.forEach(item => {
      const sellerId = item.product.seller._id || item.product.seller;
      if (!sellerItems[sellerId]) {
        sellerItems[sellerId] = [];
      }
      sellerItems[sellerId].push({
        product: item.product._id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.price,
        image: item.product.images?.[0] || '',
        size: item.selectedSize || 'M',
        color: item.selectedColor || 'Default'
      });
    });

    // For now, create one order (assuming all items from same seller)
    const sellerId = Object.keys(sellerItems)[0];
    const orderItems = sellerItems[sellerId];

    return {
      orderItems,
      shippingAddress,
      paymentMethod,
      paymentResult,
      taxPrice: totals.taxPrice,
      shippingPrice: totals.shippingPrice,
      totalPrice: totals.totalPrice,
      sellerId
    };
  }
};

export default orderService; 