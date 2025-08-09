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
      return await this.openSMEPayWidget(smepayOrderSlug, orderId);

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

              // Start polling for payment confirmation
              const confirmationResult = await this.pollPaymentConfirmation(orderId);
              
              resolve({
                success: true,
                data: {
                  ...data,
                  confirmationResult
                },
                message: 'Payment completed successfully'
              });

            } catch (confirmError) {
              logPayment('Payment Confirmation Error', confirmError, 'error');
              loadingOverlay.remove();
              
              resolve({
                success: false,
                message: 'Payment may have succeeded but confirmation failed. Please check your order status.',
                errorCode: 'CONFIRMATION_ERROR'
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
  async pollPaymentConfirmation(orderId, maxAttempts = 20, interval = 3000) {
    logPayment('Starting Payment Confirmation Polling', {
      orderId,
      maxAttempts,
      interval
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
            orderId
          }, 'success');
          return statusResult;
        }

        if (statusResult.data?.paymentStatus === 'failed') {
          throw new Error('Payment failed');
        }

        // Wait before next attempt
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, interval));
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

      const response = await api.post('/payments/smepay/check-qr-status', {
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
  startPaymentPolling(orderId, callback, interval = 5000) {
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