// backend/services/smepayService.js - OFFICIAL SMEPay API Integration

const axios = require('axios');
const crypto = require('crypto');
const smepayConfig = require('../config/smepay');

// Enhanced logging
const terminalLog = (action, status, data = null) => {
  const timestamp = new Date().toISOString();
  const logLevel = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '🔄';
  
  console.log(`${logLevel} [SMEPAY-SERVICE] ${timestamp} - ${action}`, data ? JSON.stringify(data, null, 2) : '');
};

class SMEPayService {
  constructor() {
    // Validate configuration on initialization
    if (!smepayConfig.validateConfig()) {
      throw new Error('SMEPay configuration is invalid. Please check your environment variables.');
    }
    
    this.baseURL = smepayConfig.getBaseURL();
    this.clientId = smepayConfig.clientId;
    this.clientSecret = smepayConfig.clientSecret;
    this.mode = smepayConfig.mode;
    this.accessToken = null;
    this.tokenExpiresAt = null;
    this.isAuthenticating = false;
    
    terminalLog('SMEPAY_SERVICE_INITIALIZED', 'SUCCESS', {
      mode: this.mode,
      baseURL: this.baseURL,
      clientId: this.clientId ? `${this.clientId.substring(0, 15)}...` : 'NOT_SET',
      hasClientSecret: !!this.clientSecret,
      configValid: smepayConfig.validateConfig()
    });
  }

  // 🎯 OFFICIAL: Authentication endpoint
  async authenticate() {
    if (this.isAuthenticating) {
      // Wait for ongoing authentication
      while (this.isAuthenticating) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (this.accessToken && this.tokenExpiresAt > new Date()) {
        return this.accessToken;
      }
    }

    // Check if token is still valid
    if (this.accessToken && this.tokenExpiresAt > new Date()) {
      terminalLog('TOKEN_STILL_VALID', 'SUCCESS', {
        expiresAt: this.tokenExpiresAt.toISOString(),
        remainingMinutes: Math.floor((this.tokenExpiresAt - new Date()) / 60000)
      });
      return this.accessToken;
    }

    this.isAuthenticating = true;

    try {
      const authURL = `${this.baseURL}${smepayConfig.endpoints.auth}`;
      
      terminalLog('AUTHENTICATION_START', 'PROCESSING', {
        endpoint: authURL,
        mode: this.mode,
        clientId: this.clientId ? `${this.clientId.substring(0, 15)}...` : 'NOT_SET',
        hasClientSecret: !!this.clientSecret
      });

      // 🔥 VALIDATE CREDENTIALS
      if (!this.clientId || !this.clientSecret) {
        throw new Error('SMEPay client credentials are not configured. Check SMEPAY_CLIENT_ID and SMEPAY_CLIENT_SECRET environment variables.');
      }

      // 🔥 OFFICIAL: Authentication payload structure
      const authPayload = {
        client_id: this.clientId.trim(),
        client_secret: this.clientSecret.trim()
      };

      terminalLog('AUTH_REQUEST_DETAILS', 'PROCESSING', {
        url: authURL,
        method: 'POST',
        payload: {
          client_id: this.clientId ? `${this.clientId.substring(0, 15)}...` : 'NOT_SET',
          client_secret: this.clientSecret ? `${this.clientSecret.substring(0, 10)}...` : 'NOT_SET'
        }
      });

      // 🔥 OFFICIAL: Make authentication request
      const response = await axios({
        method: 'POST',
        url: authURL,
        data: authPayload,
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'ZAMMER-Marketplace/1.0'
        },
        validateStatus: function (status) {
          return status < 500; // Don't throw for 4xx errors
        }
      });

      terminalLog('AUTH_RESPONSE_RECEIVED', 'PROCESSING', {
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        responseHeaders: response.headers['content-type'],
        responseKeys: response.data ? Object.keys(response.data) : [],
        fullResponse: response.data
      });

      // 🔥 HANDLE ERROR RESPONSES
      if (response.status === 401) {
        terminalLog('AUTH_UNAUTHORIZED', 'ERROR', {
          status: response.status,
          response: response.data,
          possibleIssues: [
            'Invalid client_id',
            'Invalid client_secret', 
            'Credentials not active in ' + this.mode + ' mode',
            'Account suspended'
          ]
        });
        throw new Error(`SMEPay Authentication Failed: ${response.data?.message || 'Invalid credentials'}`);
      }

      if (response.status === 403) {
        terminalLog('AUTH_FORBIDDEN', 'ERROR', {
          status: response.status,
          response: response.data
        });
        throw new Error(`SMEPay Access Forbidden: ${response.data?.message || 'Access denied'}`);
      }

      if (response.status >= 400) {
        terminalLog('AUTH_CLIENT_ERROR', 'ERROR', {
          status: response.status,
          response: response.data
        });
        throw new Error(`SMEPay Client Error: ${response.data?.message || 'Request failed'}`);
      }

      // 🔥 VALIDATE SUCCESS RESPONSE (flexible structure)
      let accessToken = null;
      
      // Try different possible response structures
      if (response.data?.access_token) {
        accessToken = response.data.access_token;
      } else if (response.data?.token) {
        accessToken = response.data.token;
      } else if (response.data?.data?.access_token) {
        accessToken = response.data.data.access_token;
      } else if (response.data?.data?.token) {
        accessToken = response.data.data.token;
      }

      if (!accessToken) {
        terminalLog('AUTH_NO_TOKEN', 'ERROR', {
          responseKeys: Object.keys(response.data || {}),
          response: response.data
        });
        throw new Error('No access token received in authentication response');
      }

      // 🔥 STORE TOKEN WITH EXPIRATION
      this.accessToken = accessToken;
      // Set expiration to 55 minutes (tokens usually expire in 1 hour)
      this.tokenExpiresAt = new Date(Date.now() + 55 * 60 * 1000);

      terminalLog('AUTHENTICATION_SUCCESS', 'SUCCESS', {
        tokenLength: this.accessToken.length,
        expiresAt: this.tokenExpiresAt.toISOString(),
        tokenType: response.data.token_type || 'Bearer',
        mode: this.mode
      });

      return this.accessToken;

    } catch (error) {
      // Clear stored token on error
      this.accessToken = null;
      this.tokenExpiresAt = null;

      terminalLog('AUTHENTICATION_ERROR', 'ERROR', {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        isAxiosError: error.isAxiosError,
        code: error.code,
        mode: this.mode
      });

      // Provide specific error messages
      if (error.code === 'ENOTFOUND') {
        throw new Error(`SMEPay server not reachable (${this.mode} mode). Please check your internet connection and SMEPay service status.`);
      }
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Connection refused by SMEPay server (${this.mode} mode). Service may be down.`);
      }
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('SMEPay authentication request timed out. Please try again.');
      }

      throw new Error(`SMEPay authentication failed: ${error.message}`);
    } finally {
      this.isAuthenticating = false;
    }
  }

  // 🎯 OFFICIAL: Create order endpoint
  async createOrder(orderData) {
    try {
      terminalLog('CREATE_ORDER_START', 'PROCESSING', {
        orderId: orderData.orderId,
        amount: orderData.amount,
        customerEmail: orderData.customerDetails?.email,
        mode: this.mode
      });

      // 🔥 VALIDATE INPUT DATA
      if (!orderData.amount || orderData.amount <= 0) {
        throw new Error('Valid amount is required (must be greater than 0)');
      }

      if (!orderData.orderId) {
        throw new Error('Order ID is required');
      }

      if (!orderData.customerDetails?.email) {
        throw new Error('Customer email is required');
      }

      // 🔥 ENSURE AUTHENTICATION
      const token = await this.authenticate();
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }

      // 🔥 OFFICIAL: Create order payload structure (based on WooCommerce plugin)
      const orderPayload = {
        client_id: this.clientId,
        amount: parseFloat(orderData.amount).toFixed(2), // Ensure decimal format
        order_id: orderData.orderId.toString(),
        callback_url: orderData.callbackUrl || smepayConfig.getCallbackURL('success'),
        customer_details: {
          email: orderData.customerDetails.email,
          mobile: orderData.customerDetails.mobile || '',
          name: orderData.customerDetails.name || 'Customer'
        },
        currency: 'INR' // SMEPay primarily supports INR
      };

      terminalLog('CREATE_ORDER_PAYLOAD', 'PROCESSING', {
        ...orderPayload,
        customer_details: {
          ...orderPayload.customer_details,
          mobile: orderPayload.customer_details.mobile ? 
            `${orderPayload.customer_details.mobile.substring(0, 5)}***` : ''
        }
      });

      const createOrderURL = `${this.baseURL}${smepayConfig.endpoints.createOrder}`;

      // 🔥 OFFICIAL: Make create order request
      const response = await axios({
        method: 'POST',
        url: createOrderURL,
        data: orderPayload,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'ZAMMER-Marketplace/1.0'
        },
        timeout: 30000,
        validateStatus: function (status) {
          return status < 500;
        }
      });

      terminalLog('CREATE_ORDER_RESPONSE', 'PROCESSING', {
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        responseKeys: response.data ? Object.keys(response.data) : [],
        responseData: response.data
      });

      // 🔥 HANDLE ERROR RESPONSES
      if (response.status === 401) {
        // Token might be expired, clear it
        this.accessToken = null;
        this.tokenExpiresAt = null;
        throw new Error('Authentication token expired. Please retry the request.');
      }

      if (response.status >= 400) {
        throw new Error(`SMEPay API Error (${response.status}): ${response.data?.message || response.statusText}`);
      }

      // 🔥 OFFICIAL: Validate success response (flexible structure)
      let orderSlug = null;
      let isSuccess = false;
      
      // Try different possible response structures
      if (response.data?.status === true || response.data?.success === true) {
        isSuccess = true;
      }
      
      if (response.data?.order_slug) {
        orderSlug = response.data.order_slug;
      } else if (response.data?.data?.order_slug) {
        orderSlug = response.data.data.order_slug;
      } else if (response.data?.slug) {
        orderSlug = response.data.slug;
      }

      if (!isSuccess) {
        throw new Error(`Order creation failed: ${response.data?.message || 'Invalid response from SMEPay'}`);
      }

      if (!orderSlug) {
        throw new Error('No order slug received in create order response');
      }

      terminalLog('CREATE_ORDER_SUCCESS', 'SUCCESS', {
        orderId: orderData.orderId,
        orderSlug: orderSlug,
        message: response.data.message || 'Order created successfully',
        mode: this.mode
      });

      return {
        success: true,
        orderSlug: orderSlug,
        message: response.data.message || 'Order created successfully',
        data: response.data
      };

    } catch (error) {
      terminalLog('CREATE_ORDER_ERROR', 'ERROR', {
        orderId: orderData.orderId,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        mode: this.mode
      });

      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  // 🎯 OFFICIAL: Validate order endpoint
  async validateOrder(orderData) {
    try {
      terminalLog('VALIDATE_ORDER_START', 'PROCESSING', {
        orderSlug: orderData.slug,
        amount: orderData.amount,
        mode: this.mode
      });

      if (!orderData.slug || !orderData.amount) {
        throw new Error('Order slug and amount are required for validation');
      }

      // Ensure we have valid authentication
      const token = await this.authenticate();
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }

      // 🔥 OFFICIAL: Validate order payload
      const validatePayload = {
        client_id: this.clientId,
        amount: parseFloat(orderData.amount).toFixed(2),
        slug: orderData.slug
      };

      const validateURL = `${this.baseURL}${smepayConfig.endpoints.validateOrder}`;

      const response = await axios({
        method: 'POST',
        url: validateURL,
        data: validatePayload,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'ZAMMER-Marketplace/1.0'
        },
        timeout: 15000,
        validateStatus: function (status) {
          return status < 500;
        }
      });

      terminalLog('VALIDATE_ORDER_RESPONSE', 'PROCESSING', {
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        responseKeys: response.data ? Object.keys(response.data) : [],
        responseData: response.data
      });

      if (response.status >= 400) {
        throw new Error(`SMEPay Validate API Error (${response.status}): ${response.data?.message || response.statusText}`);
      }

      // 🔥 OFFICIAL: Parse validation response
      let isPaymentSuccessful = false;
      let paymentStatus = 'pending';
      
      // Check various possible response structures
      if (response.data?.payment_status === 'paid' || 
          response.data?.payment_status === 'success' ||
          response.data?.status === 'paid' ||
          response.data?.status === 'success') {
        isPaymentSuccessful = true;
        paymentStatus = 'paid';
      } else if (response.data?.payment_status) {
        paymentStatus = response.data.payment_status;
      } else if (response.data?.status) {
        paymentStatus = response.data.status;
      }

      terminalLog('VALIDATE_ORDER_SUCCESS', 'SUCCESS', {
        orderSlug: orderData.slug,
        paymentStatus: paymentStatus,
        isSuccessful: isPaymentSuccessful,
        mode: this.mode
      });

      return {
        success: true,
        paymentStatus: paymentStatus,
        isPaymentSuccessful: isPaymentSuccessful,
        data: response.data
      };

    } catch (error) {
      terminalLog('VALIDATE_ORDER_ERROR', 'ERROR', {
        orderSlug: orderData.slug,
        error: error.message,
        status: error.response?.status,
        responseData: error.response?.data,
        mode: this.mode
      });

      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  // 🎯 Generate QR code (placeholder - implement if endpoint exists)
  async generateQR(orderSlug) {
    try {
      terminalLog('GENERATE_QR_START', 'PROCESSING', { orderSlug, mode: this.mode });

      // Note: This endpoint may not exist in all SMEPay versions
      // The QR generation might be handled by the frontend widget instead
      
      return {
        success: false,
        error: 'QR generation is handled by the SMEPay frontend widget. Use the order_slug with the checkout.js script.'
      };

    } catch (error) {
      terminalLog('GENERATE_QR_ERROR', 'ERROR', {
        orderSlug,
        error: error.message,
        mode: this.mode
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  // 🎯 Check QR status (placeholder - implement if endpoint exists)
  async checkQRStatus(statusData) {
    try {
      terminalLog('CHECK_QR_STATUS_START', 'PROCESSING', {
        orderSlug: statusData.slug,
        mode: this.mode
      });

      // Use validate order as fallback for checking status
      return await this.validateOrder({
        slug: statusData.slug,
        amount: statusData.amount || 0
      });

    } catch (error) {
      terminalLog('CHECK_QR_STATUS_ERROR', 'ERROR', {
        orderSlug: statusData.slug,
        error: error.message,
        mode: this.mode
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  // 🎯 Process webhook
  async processWebhook(payload, signature) {
    try {
      terminalLog('WEBHOOK_PROCESSING_START', 'PROCESSING', {
        hasPayload: !!payload,
        hasSignature: !!signature,
        payloadKeys: payload ? Object.keys(payload) : [],
        mode: this.mode
      });

      console.log('🔔 Processing SMEPay webhook:', {
        timestamp: new Date().toISOString(),
        payload: payload,
        signature: signature
      });

      // 🎯 CRITICAL: Enhanced webhook processing for SMEPay
      let processedData = {
        eventType: 'payment_update',
        orderId: null,
        orderSlug: null,
        paymentStatus: 'pending',
        transactionId: null,
        amount: 0,
        currency: 'INR',
        timestamp: new Date().toISOString(),
        rawPayload: payload
      };

      // 🎯 CRITICAL: Extract data from various possible SMEPay webhook formats
      if (payload) {
        // Try different possible response structures
        if (payload.order_id) {
          processedData.orderId = payload.order_id;
        } else if (payload.orderId) {
          processedData.orderId = payload.orderId;
        }

        if (payload.order_slug) {
          processedData.orderSlug = payload.order_slug;
        } else if (payload.slug) {
          processedData.orderSlug = payload.slug;
        } else if (payload.orderSlug) {
          processedData.orderSlug = payload.orderSlug;
        }

        if (payload.payment_status) {
          processedData.paymentStatus = payload.payment_status;
        } else if (payload.status) {
          processedData.paymentStatus = payload.status;
        } else if (payload.paymentStatus) {
          processedData.paymentStatus = payload.paymentStatus;
        }

        if (payload.transaction_id) {
          processedData.transactionId = payload.transaction_id;
        } else if (payload.txn_id) {
          processedData.transactionId = payload.txn_id;
        } else if (payload.transactionId) {
          processedData.transactionId = payload.transactionId;
        }

        if (payload.amount) {
          processedData.amount = parseFloat(payload.amount) || 0;
        }

        if (payload.currency) {
          processedData.currency = payload.currency;
        }

        // 🎯 CRITICAL: Determine event type based on payment status
        if (processedData.paymentStatus === 'paid' || 
            processedData.paymentStatus === 'success' || 
            processedData.paymentStatus === 'completed') {
          processedData.eventType = 'payment_completed';
        } else if (processedData.paymentStatus === 'failed' || 
                   processedData.paymentStatus === 'cancelled') {
          processedData.eventType = 'payment_failed';
        } else if (processedData.paymentStatus === 'pending') {
          processedData.eventType = 'payment_pending';
        }
      }

      // 🎯 CRITICAL: Validate essential data
      if (!processedData.orderSlug && !processedData.orderId) {
        throw new Error('Webhook missing order identifier (order_slug or order_id)');
      }

      if (!processedData.paymentStatus) {
        throw new Error('Webhook missing payment status');
      }

      terminalLog('WEBHOOK_PROCESSING_SUCCESS', 'SUCCESS', {
        eventType: processedData.eventType,
        orderId: processedData.orderId,
        orderSlug: processedData.orderSlug,
        paymentStatus: processedData.paymentStatus,
        transactionId: processedData.transactionId,
        amount: processedData.amount,
        mode: this.mode
      });

      console.log('✅ Webhook processed successfully:', {
        eventType: processedData.eventType,
        orderSlug: processedData.orderSlug,
        paymentStatus: processedData.paymentStatus,
        transactionId: processedData.transactionId
      });

      return {
        success: true,
        data: processedData
      };

    } catch (error) {
      terminalLog('WEBHOOK_PROCESSING_ERROR', 'ERROR', {
        error: error.message,
        hasPayload: !!payload,
        mode: this.mode
      });

      console.error('❌ Webhook processing error:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 🎯 Health check
  async healthCheck() {
    try {
      terminalLog('HEALTH_CHECK_START', 'PROCESSING', { mode: this.mode });

      // Test configuration
      const configInfo = smepayConfig.getConfigInfo();
      
      if (!configInfo.isValid) {
        return {
          success: false,
          status: 'configuration_error',
          message: 'SMEPay configuration is invalid',
          config: configInfo
        };
      }

      // Test authentication
      const token = await this.authenticate();

      terminalLog('HEALTH_CHECK_SUCCESS', 'SUCCESS', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        configValid: configInfo.isValid,
        mode: this.mode
      });

      return {
        success: true,
        status: 'operational',
        timestamp: new Date().toISOString(),
        message: `SMEPay service is operational (${this.mode} mode)`,
        config: {
          mode: this.mode,
          baseURL: configInfo.baseURL,
          hasCredentials: configInfo.hasClientId && configInfo.hasClientSecret,
          endpoints: configInfo.endpoints,
          widgetScript: smepayConfig.widget.scriptURL
        }
      };

    } catch (error) {
      terminalLog('HEALTH_CHECK_ERROR', 'ERROR', {
        error: error.message,
        mode: this.mode
      });

      return {
        success: false,
        status: 'error',
        timestamp: new Date().toISOString(),
        message: `SMEPay service error (${this.mode} mode): ${error.message}`,
        config: smepayConfig.getConfigInfo()
      };
    }
  }
}

// Create singleton instance
const smepayService = new SMEPayService();

module.exports = smepayService;