// backend/services/smepayService.js - SMEPay API Integration Service

const axios = require('axios');
const crypto = require('crypto');
const smepayConfig = require('../config/smepay');

// Enhanced terminal logging with colors
const terminalLog = (action, status, data = null) => {
  const timestamp = new Date().toISOString();
  const logLevel = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '🔄';
  
  console.log(`${logLevel} [SMEPAY-SERVICE] ${timestamp} - ${action}`, data ? JSON.stringify(data, null, 2) : '');
};

class SMEPayService {
  constructor() {
    this.baseURL = smepayConfig.baseURL;
    this.clientId = smepayConfig.clientId;
    this.clientSecret = smepayConfig.clientSecret;
    this.accessToken = null;
    this.tokenExpiresAt = null;
    
    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: smepayConfig.defaults.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor for automatic token refresh
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Skip auth for authentication endpoint
        if (config.url.includes('/auth')) {
          return config;
        }

        // Ensure we have a valid token
        await this.ensureValidToken();
        
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }

        return config;
      },
      (error) => {
        terminalLog('REQUEST_INTERCEPTOR_ERROR', 'ERROR', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        terminalLog('RESPONSE_INTERCEPTOR_ERROR', 'ERROR', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url
        });

        // If token expired, try to refresh and retry once
        if (error.response?.status === 401 && !error.config._retry) {
          error.config._retry = true;
          
          try {
            await this.authenticate();
            error.config.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.axiosInstance.request(error.config);
          } catch (authError) {
            terminalLog('TOKEN_REFRESH_FAILED', 'ERROR', { error: authError.message });
            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      }
    );

    terminalLog('SMEPAY_SERVICE_INITIALIZED', 'SUCCESS', {
      baseURL: this.baseURL,
      clientId: this.clientId ? `${this.clientId.substring(0, 20)}...` : 'NOT_SET'
    });
  }

  // Authenticate with SMEPay and get access token
  async authenticate() {
    try {
      terminalLog('AUTHENTICATION_START', 'PROCESSING', {
        clientId: this.clientId ? `${this.clientId.substring(0, 20)}...` : 'NOT_SET'
      });

      if (!this.clientId || !this.clientSecret) {
        throw new Error('SMEPay client credentials not configured');
      }

      const authPayload = {
        client_id: this.clientId,
        client_secret: this.clientSecret
      };

      const response = await axios.post(
        `${this.baseURL}${smepayConfig.endpoints.auth}`,
        authPayload,
        {
          timeout: smepayConfig.defaults.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        // Token expires in 1 hour (conservative estimate)
        this.tokenExpiresAt = new Date(Date.now() + 55 * 60 * 1000);

        terminalLog('AUTHENTICATION_SUCCESS', 'SUCCESS', {
          tokenLength: this.accessToken.length,
          expiresAt: this.tokenExpiresAt.toISOString()
        });

        return this.accessToken;
      } else {
        throw new Error('No access token received from SMEPay');
      }
    } catch (error) {
      terminalLog('AUTHENTICATION_ERROR', 'ERROR', {
        error: error.message,
        status: error.response?.status,
        responseData: error.response?.data
      });
      
      this.accessToken = null;
      this.tokenExpiresAt = null;
      
      throw new Error(`SMEPay authentication failed: ${error.message}`);
    }
  }

  // Ensure we have a valid token
  async ensureValidToken() {
    const now = new Date();
    
    if (!this.accessToken || !this.tokenExpiresAt || now >= this.tokenExpiresAt) {
      terminalLog('TOKEN_REFRESH_REQUIRED', 'PROCESSING', {
        hasToken: !!this.accessToken,
        expiresAt: this.tokenExpiresAt?.toISOString(),
        now: now.toISOString()
      });
      
      await this.authenticate();
    }
  }

  // Create order with SMEPay
  async createOrder(orderData) {
    try {
      terminalLog('CREATE_ORDER_START', 'PROCESSING', {
        orderId: orderData.orderId,
        amount: orderData.amount,
        customerEmail: orderData.customerDetails?.email
      });

      // Validate required fields
      if (!orderData.amount || !orderData.orderId) {
        throw new Error('Amount and order ID are required');
      }

      if (!orderData.customerDetails || !orderData.customerDetails.email) {
        throw new Error('Customer details with email are required');
      }

      const orderPayload = {
        client_id: this.clientId,
        amount: orderData.amount.toString(),
        order_id: orderData.orderId,
        callback_url: orderData.callbackUrl || smepayConfig.getCallbackURL(),
        customer_details: {
          email: orderData.customerDetails.email,
          mobile: orderData.customerDetails.mobile || '',
          name: orderData.customerDetails.name || 'Customer'
        }
      };

      terminalLog('CREATE_ORDER_PAYLOAD', 'PROCESSING', {
        ...orderPayload,
        customer_details: {
          ...orderPayload.customer_details,
          mobile: orderPayload.customer_details.mobile ? 
            `${orderPayload.customer_details.mobile.substring(0, 5)}***` : ''
        }
      });

      const response = await this.axiosInstance.post(
        smepayConfig.endpoints.createOrder,
        orderPayload
      );

      if (response.data && response.data.status && response.data.order_slug) {
        terminalLog('CREATE_ORDER_SUCCESS', 'SUCCESS', {
          orderId: orderData.orderId,
          orderSlug: response.data.order_slug,
          message: response.data.message
        });

        return {
          success: true,
          orderSlug: response.data.order_slug,
          message: response.data.message,
          data: response.data
        };
      } else {
        throw new Error('Invalid response from SMEPay create order API');
      }
    } catch (error) {
      terminalLog('CREATE_ORDER_ERROR', 'ERROR', {
        orderId: orderData.orderId,
        error: error.message,
        status: error.response?.status,
        responseData: error.response?.data
      });

      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  // Validate order payment
  async validateOrder(orderData) {
    try {
      terminalLog('VALIDATE_ORDER_START', 'PROCESSING', {
        orderSlug: orderData.slug,
        amount: orderData.amount
      });

      if (!orderData.slug || !orderData.amount) {
        throw new Error('Order slug and amount are required for validation');
      }

      const validatePayload = {
        client_id: this.clientId,
        amount: orderData.amount.toString(),
        slug: orderData.slug
      };

      const response = await this.axiosInstance.post(
        smepayConfig.endpoints.validateOrder,
        validatePayload
      );

      if (response.data && response.data.status !== undefined) {
        const isPaymentSuccessful = response.data.status === true && 
                                   response.data.payment_status === 'paid';

        terminalLog('VALIDATE_ORDER_SUCCESS', 'SUCCESS', {
          orderSlug: orderData.slug,
          paymentStatus: response.data.payment_status,
          isSuccessful: isPaymentSuccessful
        });

        return {
          success: true,
          paymentStatus: response.data.payment_status,
          isPaymentSuccessful,
          data: response.data
        };
      } else {
        throw new Error('Invalid response from SMEPay validate order API');
      }
    } catch (error) {
      terminalLog('VALIDATE_ORDER_ERROR', 'ERROR', {
        orderSlug: orderData.slug,
        error: error.message,
        status: error.response?.status,
        responseData: error.response?.data
      });

      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  // Generate QR code for direct UPI payment
  async generateQR(orderSlug) {
    try {
      terminalLog('GENERATE_QR_START', 'PROCESSING', { orderSlug });

      if (!orderSlug) {
        throw new Error('Order slug is required for QR generation');
      }

      const qrPayload = {
        client_id: this.clientId,
        slug: orderSlug
      };

      const response = await this.axiosInstance.post(
        smepayConfig.endpoints.generateQR,
        qrPayload
      );

      if (response.data && response.data.status && response.data.qrcode) {
        terminalLog('GENERATE_QR_SUCCESS', 'SUCCESS', {
          orderSlug,
          hasQRCode: !!response.data.qrcode,
          hasUPILinks: !!(response.data.link && Object.keys(response.data.link).length > 0),
          refId: response.data.ref_id
        });

        return {
          success: true,
          qrCode: response.data.qrcode,
          upiLinks: response.data.link || {},
          refId: response.data.ref_id,
          data: response.data.data || {}
        };
      } else {
        throw new Error('Invalid response from SMEPay QR generation API');
      }
    } catch (error) {
      terminalLog('GENERATE_QR_ERROR', 'ERROR', {
        orderSlug,
        error: error.message,
        status: error.response?.status,
        responseData: error.response?.data
      });

      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  // Check QR payment status
  async checkQRStatus(statusData) {
    try {
      terminalLog('CHECK_QR_STATUS_START', 'PROCESSING', {
        orderSlug: statusData.slug,
        refId: statusData.refId
      });

      if (!statusData.slug || !statusData.refId) {
        throw new Error('Order slug and ref ID are required for status check');
      }

      const statusPayload = {
        client_id: this.clientId,
        slug: statusData.slug,
        ref_id: statusData.refId
      };

      const response = await this.axiosInstance.post(
        smepayConfig.endpoints.checkQRStatus,
        statusPayload
      );

      if (response.data && response.data.status !== undefined) {
        const isPaymentSuccessful = response.data.payment_status === 'paid';

        terminalLog('CHECK_QR_STATUS_SUCCESS', 'SUCCESS', {
          orderSlug: statusData.slug,
          paymentStatus: response.data.payment_status,
          isSuccessful: isPaymentSuccessful,
          orderId: response.data.order_id
        });

        return {
          success: true,
          paymentStatus: response.data.payment_status,
          isPaymentSuccessful,
          orderId: response.data.order_id,
          callbackUrl: response.data.callback_url,
          data: response.data
        };
      } else {
        throw new Error('Invalid response from SMEPay QR status API');
      }
    } catch (error) {
      terminalLog('CHECK_QR_STATUS_ERROR', 'ERROR', {
        orderSlug: statusData.slug,
        refId: statusData.refId,
        error: error.message,
        status: error.response?.status,
        responseData: error.response?.data
      });

      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  // Verify webhook signature (for secure webhook handling)
  verifyWebhookSignature(payload, signature) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', smepayConfig.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const isValid = signature === expectedSignature;

      terminalLog('WEBHOOK_SIGNATURE_VERIFICATION', isValid ? 'SUCCESS' : 'ERROR', {
        signatureProvided: signature ? `${signature.substring(0, 10)}...` : 'NOT_PROVIDED',
        isValid
      });

      return isValid;
    } catch (error) {
      terminalLog('WEBHOOK_SIGNATURE_VERIFICATION_ERROR', 'ERROR', {
        error: error.message
      });
      return false;
    }
  }

  // Process webhook payload
  async processWebhook(payload, signature) {
    try {
      terminalLog('WEBHOOK_PROCESSING_START', 'PROCESSING', {
        hasPayload: !!payload,
        hasSignature: !!signature,
        payloadKeys: payload ? Object.keys(payload) : []
      });

      // Verify signature if provided
      if (signature && !this.verifyWebhookSignature(payload, signature)) {
        throw new Error('Webhook signature verification failed');
      }

      // Process the webhook based on event type
      const eventType = payload.event_type || 'payment_update';
      
      terminalLog('WEBHOOK_EVENT_PROCESSING', 'PROCESSING', {
        eventType,
        orderId: payload.order_id,
        paymentStatus: payload.payment_status
      });

      const processedData = {
        eventType,
        orderId: payload.order_id,
        paymentStatus: payload.payment_status,
        transactionId: payload.transaction_id,
        amount: payload.amount,
        currency: payload.currency || 'INR',
        timestamp: new Date().toISOString(),
        rawPayload: payload
      };

      terminalLog('WEBHOOK_PROCESSING_SUCCESS', 'SUCCESS', {
        eventType: processedData.eventType,
        orderId: processedData.orderId,
        paymentStatus: processedData.paymentStatus
      });

      return {
        success: true,
        data: processedData
      };
    } catch (error) {
      terminalLog('WEBHOOK_PROCESSING_ERROR', 'ERROR', {
        error: error.message,
        hasPayload: !!payload
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  // Health check for SMEPay service
  async healthCheck() {
    try {
      terminalLog('HEALTH_CHECK_START', 'PROCESSING');

      // Try to authenticate to check if service is working
      const token = await this.authenticate();

      terminalLog('HEALTH_CHECK_SUCCESS', 'SUCCESS', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0
      });

      return {
        success: true,
        status: 'operational',
        timestamp: new Date().toISOString(),
        message: 'SMEPay service is operational'
      };
    } catch (error) {
      terminalLog('HEALTH_CHECK_ERROR', 'ERROR', {
        error: error.message
      });

      return {
        success: false,
        status: 'error',
        timestamp: new Date().toISOString(),
        message: `SMEPay service error: ${error.message}`
      };
    }
  }

  // Retry mechanism for failed requests
  async retryRequest(requestFunction, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        terminalLog('RETRY_ATTEMPT', 'PROCESSING', {
          attempt,
          maxRetries
        });

        const result = await requestFunction();
        
        if (result.success) {
          terminalLog('RETRY_SUCCESS', 'SUCCESS', {
            attempt,
            maxRetries
          });
          return result;
        }

        if (attempt === maxRetries) {
          throw new Error(`All ${maxRetries} retry attempts failed`);
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      } catch (error) {
        terminalLog('RETRY_ATTEMPT_FAILED', 'ERROR', {
          attempt,
          maxRetries,
          error: error.message
        });

        if (attempt === maxRetries) {
          throw error;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
}

// Create singleton instance
const smepayService = new SMEPayService();

// Export the service instance
module.exports = smepayService; 
