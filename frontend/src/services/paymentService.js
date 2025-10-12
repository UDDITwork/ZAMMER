// frontend/src/services/paymentService.js - COMPLETE SMEPay Frontend Integration

import api from './api';

// Enhanced logging for development
const logPayment = (action, data, type = 'info') => {
  if (process.env.NODE_ENV === 'development') {
    const colors = {
      info: '#2196F3',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336'
    };
    
    console.log(
      `%c[PAYMENT-SERVICE] ${action}`,
      `color: ${colors[type]}; font-weight: bold;`,
      data
    );
  }
};

// Error handler for payment operations
const handlePaymentError = (error, operation) => {
  logPayment(`${operation} Error`, error, 'error');
  
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return {
          success: false,
          message: data.message || 'Invalid payment request',
          errorCode: 'INVALID_REQUEST'
        };
      case 401:
        return {
          success: false,
          message: 'Please login to make payments',
          errorCode: 'UNAUTHORIZED',
          requiresAuth: true
        };
      case 403:
        return {
          success: false,
          message: 'Payment not authorized for this order',
          errorCode: 'FORBIDDEN'
        };
      case 404:
        return {
          success: false,
          message: 'Order not found',
          errorCode: 'ORDER_NOT_FOUND'
        };
      case 500:
        return {
          success: false,
          message: 'Payment service unavailable. Please try again.',
          errorCode: 'SERVER_ERROR'
        };
      default:
        return {
          success: false,
          message: data.message || 'Payment processing failed',
          errorCode: 'PAYMENT_ERROR'
        };
    }
  } else if (error.request) {
    return {
      success: false,
      message: 'Network error. Please check your connection.',
      errorCode: 'NETWORK_ERROR'
    };
  } else {
    return {
      success: false,
      message: error.message || 'An unexpected error occurred',
      errorCode: 'UNKNOWN_ERROR'
    };
  }
};

// Payment Service Class
class PaymentService {
  constructor() {
    this.smepayLoaded = false;
    this.pollingIntervals = new Map();
    this.initializeSMEPay();
  }

  // Initialize SMEPay checkout script
  async initializeSMEPay() {
    try {
      logPayment('Initializing SMEPay', null, 'info');

      // Check if script is already loaded
      if (window.smepayCheckout) {
        this.smepayLoaded = true;
        logPayment('SMEPay already loaded', null, 'success');
        return;
      }

      // Load SMEPay checkout script
      const script = document.createElement('script');
      script.src = 'https://typof.co/smepay/checkout.js';
      script.onload = () => {
        this.smepayLoaded = true;
        logPayment('SMEPay script loaded successfully', null, 'success');
      };
      script.onerror = () => {
        logPayment('Failed to load SMEPay script', null, 'error');
      };
      
      document.head.appendChild(script);
    } catch (error) {
      logPayment('SMEPay initialization error', error, 'error');
    }
  }

  // Wait for SMEPay to load
  async waitForSMEPay(timeout = 15000) {
    return new Promise((resolve, reject) => {
      if (this.smepayLoaded && window.smepayCheckout) {
        resolve(true);
        return;
      }

      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (window.smepayCheckout) {
          this.smepayLoaded = true;
          clearInterval(checkInterval);
          resolve(true);
          return;
        }

        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error('SMEPay widget failed to load'));
        }
      }, 100);
    });
  }

  // Create SMEPay payment order
  async createSMEPayOrder(orderData) {
    try {
      logPayment('Creating SMEPay Order', {
        orderId: orderData.orderId,
        amount: orderData.amount
      }, 'info');

      const response = await api.post('/payments/smepay/create-order', {
        orderId: orderData.orderId,
        amount: orderData.amount,
        callbackUrl: orderData.callbackUrl || `${window.location.origin}/payment/callback`
      });

      logPayment('SMEPay Order Created', {
        orderSlug: response.data.data.smepayOrderSlug,
        orderNumber: response.data.data.orderNumber
      }, 'success');

      return response.data;
    } catch (error) {
      return handlePaymentError(error, 'Create SMEPay Order');
    }
  }

  // 🎯 NEW: Complete payment flow with real SMEPay integration
  async processRealSMEPayPayment(orderId) {
    try {
      logPayment('Starting Real SMEPay Payment Flow', { orderId }, 'info');

      // Step 1: Create SMEPay order
      const createResult = await this.createSMEPayOrder({
        orderId: orderId,
        amount: null // Amount will be fetched from order
      });

      if (!createResult.success) {
        return createResult;
      }

      const { smepayOrderSlug, callbackUrl } = createResult.data;

      logPayment('SMEPay Order Created, Opening Payment Widget', {
        orderSlug: smepayOrderSlug,
        callbackUrl
      }, 'info');

      // Step 2: Open SMEPay payment widget
      const widgetResult = await this.openSMEPayWidget(smepayOrderSlug, orderId);

      // 🎯 FIXED: Handle widget result with fallback
      if (widgetResult.success) {
        return widgetResult;
      } else {
        // If widget failed but order was created, try to validate the order
        logPayment('Widget failed, trying to validate order', { orderSlug: smepayOrderSlug }, 'warning');
        
        try {
          const validateResult = await this.validatePaymentOrder(orderId);
          if (validateResult.success && validateResult.data?.isPaymentSuccessful) {
            logPayment('Order validation successful after widget failure', validateResult.data, 'success');
            return {
              success: true,
              message: 'Payment completed successfully (validated)',
              data: validateResult.data
            };
          }
        } catch (validateError) {
          logPayment('Order validation also failed', validateError, 'error');
        }
        
        return widgetResult; // Return original widget result
      }

    } catch (error) {
      return handlePaymentError(error, 'Process Real SMEPay Payment');
    }
  }

  // 🎯 NEW: Open SMEPay widget with proper callback handling
  async openSMEPayWidget(orderSlug, orderId) {
    try {
      logPayment('Opening SMEPay Widget', { orderSlug, orderId }, 'info');

      // Ensure SMEPay is loaded
      await this.waitForSMEPay();

      if (!window.smepayCheckout) {
        throw new Error('SMEPay widget not available');
      }

      return new Promise((resolve, reject) => {
        // Show loading state
        const loadingOverlay = this.showPaymentLoading();

        window.smepayCheckout({
          slug: orderSlug,
          onSuccess: async (data) => {
            try {
              logPayment('SMEPay Payment Widget Success', data, 'success');
              loadingOverlay.remove();

              // 🎯 FIXED: Update order payment status first
              const updateResult = await this.updateOrderPaymentStatus(orderId, 'completed', data);
              
              if (!updateResult.success) {
                logPayment('Order Status Update Failed', updateResult, 'warning');
                // Continue anyway as payment was successful
              }

              // Start polling for payment confirmation
              const confirmationResult = await this.pollPaymentConfirmation(orderId);
              
              resolve({
                success: true,
                data: {
                  ...data,
                  confirmationResult,
                  orderUpdated: updateResult.success
                },
                message: 'Payment completed successfully'
              });

            } catch (confirmError) {
              logPayment('Payment Confirmation Error', confirmError, 'error');
              loadingOverlay.remove();
              
              // 🎯 FIXED: Still resolve as success since payment was completed
              resolve({
                success: true,
                message: 'Payment completed successfully. Order status will be updated shortly.',
                errorCode: 'CONFIRMATION_PENDING',
                data: { ...data }
              });
            }
          },
          onFailure: (error) => {
            logPayment('SMEPay Payment Widget Failed', error, 'error');
            loadingOverlay.remove();
            
            resolve({
              success: false,
              message: 'Payment was cancelled or failed',
              errorCode: 'PAYMENT_CANCELLED',
              error
            });
          },
          onClose: () => {
            logPayment('SMEPay Widget Closed', null, 'warning');
            loadingOverlay.remove();
            
            resolve({
              success: false,
              message: 'Payment window was closed',
              errorCode: 'PAYMENT_CLOSED'
            });
          }
        });
      });

    } catch (error) {
      logPayment('Widget Launch Error', error, 'error');
      return {
        success: false,
        message: error.message || 'Failed to launch payment widget',
        errorCode: 'WIDGET_ERROR'
      };
    }
  }

  // 🎯 NEW: Show payment loading overlay
  showPaymentLoading() {
    const overlay = document.createElement('div');
    overlay.id = 'smepay-loading-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    
    overlay.innerHTML = `
      <div style="text-align: center; padding: 2rem; background: white; border-radius: 1rem; color: #333; max-width: 400px; margin: 1rem;">
        <div style="width: 60px; height: 60px; border: 4px solid #f3f3f3; border-top: 4px solid #ff6b35; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
        <h3 style="margin: 0 0 0.5rem; color: #333;">Processing Payment</h3>
        <p style="margin: 0; color: #666; font-size: 14px;">Please complete your payment in the SMEPay window...</p>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </div>
    `;
    
    document.body.appendChild(overlay);
    return overlay;
  }

  // 🎯 NEW: Poll payment confirmation
  async pollPaymentConfirmation(orderId, maxAttempts = 12, interval = 2000) {
    logPayment('Starting Payment Confirmation Polling', {
      orderId,
      maxAttempts,
      interval,
      totalTimeout: maxAttempts * interval / 1000 + 's'
    }, 'info');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const statusResult = await this.checkPaymentStatus(orderId);

        logPayment('Polling Status Check', {
          attempt,
          isPaymentSuccessful: statusResult.data?.isPaymentSuccessful,
          paymentStatus: statusResult.data?.paymentStatus
        }, 'info');

        if (statusResult.success && statusResult.data?.isPaymentSuccessful) {
          logPayment('Payment Confirmed via Polling', {
            attempts: attempt,
            orderId,
            totalTime: attempt * interval / 1000 + 's'
          }, 'success');
          return statusResult;
        }

        if (statusResult.data?.paymentStatus === 'failed') {
          throw new Error('Payment failed');
        }

        // 🚀 OPTIMIZED: Progressive polling - faster intervals for first few attempts
        const dynamicInterval = attempt <= 3 ? 1500 : interval;
        
        // Wait before next attempt
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, dynamicInterval));
        }

      } catch (error) {
        logPayment('Polling Attempt Failed', {
          attempt,
          error: error.message
        }, 'warning');

        if (attempt === maxAttempts) {
          throw error;
        }
      }
    }

    throw new Error('Payment confirmation timed out');
  }

  // Generate QR code for payment
  async generatePaymentQR(orderId) {
    try {
      logPayment('Generating Payment QR', { orderId }, 'info');

      const response = await api.post('/payments/smepay/generate-qr', {
        orderId: orderId
      });

      logPayment('Payment QR Generated', {
        hasQRCode: !!response.data.data.qrCode,
        hasUPILinks: !!response.data.data.upiLinks
      }, 'success');

      return response.data;
    } catch (error) {
      return handlePaymentError(error, 'Generate Payment QR');
    }
  }

  // Check payment status
  async checkPaymentStatus(orderId) {
    try {
      logPayment('Checking Payment Status', { orderId }, 'info');

      // 🚀 OPTIMIZED: Use fast confirmation endpoint for better performance
      const response = await api.post('/payments/smepay/fast-confirm', {
        orderId: orderId
      });

      logPayment('Payment Status Checked', {
        paymentStatus: response.data.data.paymentStatus,
        isPaymentSuccessful: response.data.data.isPaymentSuccessful
      }, 'success');

      return response.data;
    } catch (error) {
      return handlePaymentError(error, 'Check Payment Status');
    }
  }

  // Validate payment order
  async validatePaymentOrder(orderId) {
    try {
      logPayment('Validating Payment Order', { orderId }, 'info');

      const response = await api.post('/payments/smepay/validate-order', {
        orderId: orderId
      });

      logPayment('Payment Order Validated', {
        isPaymentSuccessful: response.data.data.isPaymentSuccessful,
        orderStatus: response.data.data.orderStatus
      }, 'success');

      return response.data;
    } catch (error) {
      return handlePaymentError(error, 'Validate Payment Order');
    }
  }

  // Start payment status polling with cleanup
  startPaymentPolling(orderId, callback, interval = 3000) { // 🚀 OPTIMIZED: Reduced from 5s to 3s
    if (this.pollingIntervals.has(orderId)) {
      this.stopPaymentPolling(orderId);
    }

    const intervalId = setInterval(async () => {
      try {
        const result = await this.checkPaymentStatus(orderId);
        callback(result);

        if (result.success && result.data?.isPaymentSuccessful) {
          this.stopPaymentPolling(orderId);
        }
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    }, interval);

    this.pollingIntervals.set(orderId, intervalId);
    return intervalId;
  }

  // Stop payment polling
  stopPaymentPolling(orderId) {
    const intervalId = this.pollingIntervals.get(orderId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(orderId);
      logPayment('Stopped polling for order', { orderId }, 'info');
    }
  }

  // Cleanup all polling intervals
  cleanup() {
    for (const [orderId, intervalId] of this.pollingIntervals.entries()) {
      clearInterval(intervalId);
      logPayment('Cleaned up polling for order', { orderId }, 'info');
    }
    this.pollingIntervals.clear();
  }

  // Get available payment methods
  async getPaymentMethods() {
    try {
      logPayment('Fetching Payment Methods', null, 'info');

      const response = await api.get('/payments/methods');

      logPayment('Payment Methods Fetched', {
        methodCount: response.data.data.length
      }, 'success');

      return response.data;
    } catch (error) {
      return handlePaymentError(error, 'Get Payment Methods');
    }
  }

  // Get payment history
  async getPaymentHistory(page = 1, limit = 10) {
    try {
      logPayment('Fetching Payment History', { page, limit }, 'info');

      const response = await api.get(`/payments/history?page=${page}&limit=${limit}`);

      logPayment('Payment History Fetched', {
        count: response.data.pagination?.totalOrders || 0,
        totalPages: response.data.pagination?.totalPages || 0
      }, 'success');

      return response.data;
    } catch (error) {
      return handlePaymentError(error, 'Get Payment History');
    }
  }

  // 🎯 NEW: Update order payment status after successful payment
  async updateOrderPaymentStatus(orderId, status, paymentData = {}) {
    try {
      logPayment('Updating Order Payment Status', { orderId, status }, 'info');

      const response = await api.put(`/orders/${orderId}/payment-status`, {
        status: status,
        paymentData: paymentData,
        updatedAt: new Date().toISOString()
      });

      logPayment('Order Payment Status Updated', {
        orderId,
        newStatus: status,
        success: response.data.success
      }, 'success');

      return response.data;
    } catch (error) {
      logPayment('Order Payment Status Update Failed', { orderId, error: error.message }, 'error');
      return {
        success: false,
        message: 'Failed to update order payment status',
        error: error.message
      };
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await api.get('/payments/health');
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: 'Payment service unavailable'
      };
    }
  }

  // ========================================
  // CASHFREE PAYMENT GATEWAY METHODS
  // ========================================

  /**
   * Create Cashfree payment order
   * @param {Object} orderData - {orderId, amount}
   * @returns {Promise<Object>}
   */
  async createCashfreeOrder(orderData) {
    try {
      logPayment('Creating Cashfree Order', {
        orderId: orderData.orderId,
        amount: orderData.amount
      }, 'info');

      const response = await api.post('/payments/cashfree/create-order', {
        orderId: orderData.orderId,
        amount: orderData.amount
      });

      logPayment('Cashfree Order Created', {
        cashfreeOrderId: response.data.data.cashfreeOrderId,
        paymentSessionId: response.data.data.paymentSessionId ? 'RECEIVED' : 'MISSING'
      }, 'success');

      return response.data;
    } catch (error) {
      return handlePaymentError(error, 'Create Cashfree Order');
    }
  }

  /**
   * Check Cashfree payment status (polling endpoint)
   * @param {string} orderId - MongoDB order ID
   * @returns {Promise<Object>}
   */
  async checkCashfreeStatus(orderId) {
    try {
      logPayment('Checking Cashfree Status', { orderId }, 'info');

      const response = await api.post('/payments/cashfree/check-status', {
        orderId: orderId
      });

      logPayment('Cashfree Status Checked', {
        isPaymentSuccessful: response.data.data.isPaymentSuccessful,
        cashfreeOrderStatus: response.data.data.cashfreeOrderStatus
      }, 'success');

      return response.data;
    } catch (error) {
      return handlePaymentError(error, 'Check Cashfree Status');
    }
  }

  /**
   * Verify Cashfree payment
   * @param {string} orderId - MongoDB order ID
   * @returns {Promise<Object>}
   */
  async verifyCashfreePayment(orderId) {
    try {
      logPayment('Verifying Cashfree Payment', { orderId }, 'info');

      const response = await api.post('/payments/cashfree/verify-payment', {
        orderId: orderId
      });

      logPayment('Cashfree Payment Verified', {
        isPaymentSuccessful: response.data.data.isPaymentSuccessful
      }, 'success');

      return response.data;
    } catch (error) {
      return handlePaymentError(error, 'Verify Cashfree Payment');
    }
  }

  /**
   * Process Cashfree payment (complete flow)
   * @param {string} orderId - MongoDB order ID
   * @returns {Promise<Object>}
   */
  async processCashfreePayment(orderId) {
    try {
      logPayment('Starting Cashfree Payment Flow', { orderId }, 'info');

      // Step 1: Create Cashfree order
      const createResult = await this.createCashfreeOrder({ orderId });

      if (!createResult.success) {
        return createResult;
      }

      const { cashfreeOrderId, paymentSessionId } = createResult.data;

      if (!paymentSessionId) {
        return {
          success: false,
          message: 'Payment session ID not received from Cashfree',
          errorCode: 'MISSING_SESSION_ID'
        };
      }

      logPayment('Cashfree Order Created, Opening Checkout', {
        cashfreeOrderId,
        paymentSessionId: '****' // Hide session ID in logs
      }, 'info');

      // Step 2: Initialize Cashfree checkout (redirect or SDK)
      // This will be implemented in the CheckoutPage component
      // Return session ID for frontend to handle
      return {
        success: true,
        message: 'Cashfree order created successfully',
        data: {
          orderId,
          cashfreeOrderId,
          paymentSessionId,
          requiresCheckout: true
        }
      };

    } catch (error) {
      return handlePaymentError(error, 'Process Cashfree Payment');
    }
  }

  /**
   * Poll Cashfree payment confirmation
   * @param {string} orderId - MongoDB order ID
   * @param {number} maxAttempts - Maximum polling attempts
   * @param {number} interval - Polling interval in ms
   * @returns {Promise<Object>}
   */
  async pollCashfreeConfirmation(orderId, maxAttempts = 12, interval = 3000) {
    logPayment('Starting Cashfree Payment Polling', {
      orderId,
      maxAttempts,
      interval,
      totalTimeout: maxAttempts * interval / 1000 + 's'
    }, 'info');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const statusResult = await this.checkCashfreeStatus(orderId);

        logPayment('Cashfree Polling Attempt', {
          attempt,
          isPaymentSuccessful: statusResult.data?.isPaymentSuccessful,
          cashfreeOrderStatus: statusResult.data?.cashfreeOrderStatus
        }, 'info');

        if (statusResult.success && statusResult.data?.isPaymentSuccessful) {
          logPayment('Cashfree Payment Confirmed via Polling', {
            attempts: attempt,
            orderId,
            totalTime: attempt * interval / 1000 + 's'
          }, 'success');
          return statusResult;
        }

        // Check if payment failed
        if (statusResult.data?.cashfreeOrderStatus === 'EXPIRED' ||
            statusResult.data?.cashfreeOrderStatus === 'TERMINATED') {
          throw new Error('Payment failed or expired');
        }

        // Progressive polling - faster intervals for first few attempts
        const dynamicInterval = attempt <= 3 ? 2000 : interval;
        
        // Wait before next attempt
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, dynamicInterval));
        }

      } catch (error) {
        logPayment('Cashfree Polling Attempt Failed', {
          attempt,
          error: error.message
        }, 'warning');

        if (attempt === maxAttempts) {
          throw error;
        }
      }
    }

    throw new Error('Cashfree payment confirmation timed out');
  }

  /**
   * Start Cashfree payment polling
   * @param {string} orderId - MongoDB order ID
   * @param {Function} callback - Callback function
   * @param {number} interval - Polling interval in ms
   * @returns {number} - Interval ID
   */
  startCashfreePolling(orderId, callback, interval = 3000) {
    if (this.pollingIntervals.has(`cashfree_${orderId}`)) {
      this.stopCashfreePolling(orderId);
    }

    const intervalId = setInterval(async () => {
      try {
        const result = await this.checkCashfreeStatus(orderId);
        callback(result);

        if (result.success && result.data?.isPaymentSuccessful) {
          this.stopCashfreePolling(orderId);
        }
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    }, interval);

    this.pollingIntervals.set(`cashfree_${orderId}`, intervalId);
    return intervalId;
  }

  /**
   * Stop Cashfree payment polling
   * @param {string} orderId - MongoDB order ID
   */
  stopCashfreePolling(orderId) {
    const intervalId = this.pollingIntervals.get(`cashfree_${orderId}`);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(`cashfree_${orderId}`);
      logPayment('Stopped Cashfree polling for order', { orderId }, 'info');
    }
  }
}

// Create singleton instance
const paymentService = new PaymentService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    paymentService.cleanup();
  });
}

export default paymentService;