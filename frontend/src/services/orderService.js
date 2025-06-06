// frontend/src/services/orderService.js - Enhanced with Mock Payment System

import api from './api';

// 🎯 NEW: Mock Payment Processor for Testing
class MockPaymentProcessor {
  constructor() {
    this.isTestMode = true; // Set to false when real payment gateway is integrated
    this.testDelay = 2000; // 2 seconds simulation delay
  }

  // 🎯 Mock payment processing for different methods
  async processPayment(paymentData) {
    console.log('💳 [MOCK-PAYMENT] Starting payment simulation...');
    console.log('💳 [MOCK-PAYMENT] Payment Data:', {
      method: paymentData.method,
      amount: paymentData.amount,
      timestamp: new Date().toISOString()
    });

    // Simulate payment processing delay
    await this.simulateDelay();

    // Generate mock transaction based on payment method
    const mockResponse = this.generateMockResponse(paymentData);
    
    console.log('💳 [MOCK-PAYMENT] Payment simulation completed:', mockResponse);
    
    return {
      success: true,
      data: mockResponse,
      message: 'Payment processed successfully (Mock)'
    };
  }

  // Simulate network delay
  async simulateDelay() {
    return new Promise(resolve => {
      setTimeout(resolve, this.testDelay);
    });
  }

  // Generate realistic mock responses for different payment methods
  generateMockResponse(paymentData) {
    const timestamp = new Date().toISOString();
    const mockTransactionId = this.generateTransactionId(paymentData.method);

    switch (paymentData.method) {
      case 'Card':
        return {
          transactionId: mockTransactionId,
          method: 'Card',
          status: 'success',
          amount: paymentData.amount,
          currency: 'INR',
          processingTime: this.testDelay,
          gateway: 'MockCardGateway',
          cardLast4: paymentData.cardDetails?.cardNumber ? 
            paymentData.cardDetails.cardNumber.replace(/\s/g, '').slice(-4) : 
            '1234',
          authCode: this.generateAuthCode(),
          timestamp: timestamp,
          isTest: true
        };

      case 'UPI':
        return {
          transactionId: mockTransactionId,
          method: 'UPI',
          status: 'success',
          amount: paymentData.amount,
          currency: 'INR',
          processingTime: this.testDelay,
          gateway: 'MockUPIGateway',
          upiId: paymentData.upiId,
          bankRefId: this.generateBankRefId(),
          timestamp: timestamp,
          isTest: true
        };

      case 'Cash on Delivery':
        return {
          transactionId: mockTransactionId,
          method: 'Cash on Delivery',
          status: 'pending',
          amount: paymentData.amount,
          currency: 'INR',
          processingTime: 0,
          gateway: 'MockCODSystem',
          note: 'Payment will be collected on delivery',
          timestamp: timestamp,
          isTest: true
        };

      default:
        throw new Error(`Unsupported payment method: ${paymentData.method}`);
    }
  }

  // Generate realistic transaction IDs
  generateTransactionId(method) {
    const prefix = {
      'Card': 'TXN_CARD_',
      'UPI': 'TXN_UPI_',
      'Cash on Delivery': 'TXN_COD_'
    };

    const randomId = Math.random().toString(36).substring(2, 15) + 
                     Date.now().toString(36);
    
    return (prefix[method] || 'TXN_') + randomId.toUpperCase();
  }

  // Generate mock authorization codes for card payments
  generateAuthCode() {
    return Math.floor(Math.random() * 900000) + 100000; // 6-digit code
  }

  // Generate mock bank reference IDs for UPI
  generateBankRefId() {
    return 'BNK' + Math.floor(Math.random() * 9000000000) + 1000000000; // 10-digit number
  }

  // 🎯 Method to simulate payment failures (for testing)
  async simulateFailure(paymentData, errorType = 'generic') {
    await this.simulateDelay();
    
    const errorMessages = {
      'card_declined': 'Card was declined by the issuing bank',
      'insufficient_funds': 'Insufficient funds in the account',
      'upi_timeout': 'UPI transaction timed out',
      'invalid_upi': 'Invalid UPI ID provided',
      'network_error': 'Network error during transaction',
      'generic': 'Payment processing failed. Please try again.'
    };

    return {
      success: false,
      error: errorMessages[errorType] || errorMessages.generic,
      errorCode: errorType.toUpperCase(),
      isTest: true
    };
  }
}

// Create mock payment processor instance
const mockPaymentProcessor = new MockPaymentProcessor();

// 🎯 Enhanced Order Service with Mock Payments
const orderService = {
  // 🎯 NEW: Process payment using mock system
  async processPayment(paymentData) {
    try {
      console.log('🔄 [ORDER-SERVICE] Processing payment...', {
        method: paymentData.method,
        amount: paymentData.amount
      });

      // For testing, use mock payment processor
      if (mockPaymentProcessor.isTestMode) {
        console.log('🧪 [ORDER-SERVICE] Using mock payment system for testing');
        
        // 🎯 Simulate different scenarios based on amount (for testing)
        if (paymentData.amount === 999) {
          // Special test case: simulate failure
          return await mockPaymentProcessor.simulateFailure(paymentData, 'card_declined');
        }
        
        return await mockPaymentProcessor.processPayment(paymentData);
      }

      // 🎯 TODO: Replace with real payment gateway when ready
      // Example for real payment integration:
      /*
      const response = await api.post('/payments/process', paymentData);
      return response.data;
      */

      throw new Error('Real payment gateway not configured yet');
      
    } catch (error) {
      console.error('❌ [ORDER-SERVICE] Payment processing error:', error);
      return {
        success: false,
        message: error.message || 'Payment processing failed'
      };
    }
  },

  // Create order (existing functionality)
  async createOrder(orderData) {
    try {
      console.log('📦 [ORDER-SERVICE] Creating order...', {
        itemCount: orderData.orderItems?.length,
        totalPrice: orderData.totalPrice,
        paymentMethod: orderData.paymentMethod
      });

      const response = await api.post('/orders', orderData);
      
      console.log('✅ [ORDER-SERVICE] Order created successfully:', {
        orderId: response.data.data._id,
        orderNumber: response.data.data.orderNumber
      });

      return response.data;
    } catch (error) {
      console.error('❌ [ORDER-SERVICE] Order creation error:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create order'
      };
    }
  },

  // Get user orders
  async getUserOrders(page = 1, limit = 10) {
    try {
      const response = await api.get(`/orders/myorders?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user orders:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch orders'
      };
    }
  },

  // Get order by ID
  async getOrderById(orderId) {
    try {
      const response = await api.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching order:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch order'
      };
    }
  },

  // Get order invoice
  async getOrderInvoice(orderId) {
    try {
      const response = await api.get(`/orders/${orderId}/invoice`);
      return response.data;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch invoice'
      };
    }
  },

  // 🎯 Enhanced: Format order data for API with better error handling
  formatOrderForAPI(cartItems, shippingAddress, paymentMethod) {
    try {
      console.log('📋 [ORDER-SERVICE] Formatting order data...', {
        itemCount: cartItems.length,
        paymentMethod
      });

      if (!cartItems || cartItems.length === 0) {
        throw new Error('No items in cart');
      }

      // Group items by seller
      const itemsBySeller = cartItems.reduce((acc, item) => {
        const sellerId = item.product.seller._id || item.product.seller;
        if (!acc[sellerId]) {
          acc[sellerId] = [];
        }
        acc[sellerId].push(item);
        return acc;
      }, {});

      // Check if all items are from the same seller
      const sellerIds = Object.keys(itemsBySeller);
      if (sellerIds.length > 1) {
        throw new Error('All items must be from the same seller');
      }

      const sellerId = sellerIds[0];
      
      // Calculate totals
      const subtotal = cartItems.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);

      const taxPrice = Math.round(subtotal * 0.18); // 18% GST
      const shippingPrice = subtotal >= 500 ? 0 : 50; // Free shipping above ₹500
      const totalPrice = subtotal + taxPrice + shippingPrice;

      // Format order items
      const orderItems = cartItems.map(item => ({
        product: item.product._id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.price,
        image: item.product.images?.[0] || '',
        size: item.selectedSize || 'Standard',
        color: item.selectedColor || 'Default'
      }));

      const formattedOrder = {
        sellerId,
        orderItems,
        shippingAddress,
        paymentMethod,
        taxPrice,
        shippingPrice,
        totalPrice: Math.round(totalPrice)
      };

      console.log('✅ [ORDER-SERVICE] Order data formatted successfully:', {
        sellerId,
        itemCount: orderItems.length,
        totalPrice: formattedOrder.totalPrice
      });

      return formattedOrder;
      
    } catch (error) {
      console.error('❌ [ORDER-SERVICE] Error formatting order:', error);
      throw error;
    }
  },

  // 🎯 NEW: Enable/disable test mode
  setTestMode(enabled) {
    mockPaymentProcessor.isTestMode = enabled;
    console.log(`🧪 [ORDER-SERVICE] Test mode ${enabled ? 'enabled' : 'disabled'}`);
  },

  // 🎯 NEW: Get payment status for testing
  isTestMode() {
    return mockPaymentProcessor.isTestMode;
  }
};

export default orderService;