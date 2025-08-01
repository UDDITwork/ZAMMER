// frontend/src/services/paymentService.js - SMEPay Integration Service

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
  async waitForSMEPay(timeout = 10000) {
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

  // Launch SMEPay widget for payment
  async launchSMEPayWidget(orderSlug, callbacks = {}) {
    try {
      logPayment('Launching SMEPay Widget', { orderSlug }, 'info');

      // Ensure SMEPay is loaded
      await this.waitForSMEPay();

      if (!window.smepayCheckout) {
        throw new Error('SMEPay widget not available');
      }

      return new Promise((resolve, reject) => {
        window.smepayCheckout({
          slug: orderSlug,
          onSuccess: (data) => {
            logPayment('SMEPay Payment Success', data, 'success');
            
            if (callbacks.onSuccess) {
              callbacks.onSuccess(data);
            }

            // Handle success - redirect to callback URL
            const callbackUrl = data.callback_url;
            const orderId = data.order_id;
            
            if (callbackUrl && orderId) {
              const redirectUrl = `${callbackUrl}?order_id=${encodeURIComponent(orderId)}`;
              logPayment('Redirecting to callback', { redirectUrl }, 'info');
              window.location.href = redirectUrl;
            }

            resolve({
              success: true,
              data: data,
              message: 'Payment completed successfully'
            });
          },
          onFailure: (error) => {
            logPayment('SMEPay Payment Failed', error, 'error');
            
            if (callbacks.onFailure) {
              callbacks.onFailure(error);
            }

            resolve({
              success: false,
              message: 'Payment was cancelled or failed',
              errorCode: 'PAYMENT_CANCELLED'
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
        count: response.data.count,
        totalPages: response.data.totalPages
      }, 'success');

      return response.data;
    } catch (error) {
      return handlePaymentError(error, 'Get Payment History');
    }
  }

  // Complete payment flow for an order
  async processOrderPayment(orderId, paymentMethod = 'smepay') {
    try {
      logPayment('Starting Complete Payment Flow', {
        orderId,
        paymentMethod
      }, 'info');

      if (paymentMethod === 'smepay') {
        // Step 1: Create SMEPay order
        const createResult = await this.createSMEPayOrder({
          orderId: orderId,
          amount: null // Amount will be fetched from order
        });

        if (!createResult.success) {
          return createResult;
        }

        const orderSlug = createResult.data.smepayOrderSlug;

        // Step 2: Launch payment widget
        const paymentResult = await this.launchSMEPayWidget(orderSlug, {
          onSuccess: (data) => {
            logPayment('Payment Flow Success', data, 'success');
          },
          onFailure: (error) => {
            logPayment('Payment Flow Failure', error, 'error');
          }
        });

        return paymentResult;
      } else {
        return {
          success: false,
          message: 'Unsupported payment method',
          errorCode: 'INVALID_PAYMENT_METHOD'
        };
      }
    } catch (error) {
      return handlePaymentError(error, 'Process Order Payment');
    }
  }

  // Poll payment status until completion or timeout
  async pollPaymentStatus(orderId, maxAttempts = 30, interval = 2000) {
    try {
      logPayment('Starting Payment Status Polling', {
        orderId,
        maxAttempts,
        interval
      }, 'info');

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const statusResult = await this.checkPaymentStatus(orderId);

        if (!statusResult.success) {
          logPayment('Polling failed', statusResult, 'error');
          return statusResult;
        }

        const { isPaymentSuccessful, paymentStatus } = statusResult.data;

        logPayment('Polling Status', {
          attempt,
          paymentStatus,
          isPaymentSuccessful
        }, 'info');

        if (isPaymentSuccessful) {
          logPayment('Payment Completed via Polling', {
            attempts: attempt,
            paymentStatus
          }, 'success');
          return statusResult;
        }

        if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
          return {
            success: false,
            message: `Payment ${paymentStatus}`,
            errorCode: `PAYMENT_${paymentStatus.toUpperCase()}`
          };
        }

        // Wait before next attempt
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      }

      // Timeout reached
      return {
        success: false,
        message: 'Payment status check timed out',
        errorCode: 'POLLING_TIMEOUT'
      };
    } catch (error) {
      return handlePaymentError(error, 'Poll Payment Status');
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

export default paymentService;