// backend/services/cashfreePGService.js - Cashfree Payment Gateway Service

const axios = require('axios');
const cashfreePGConfig = require('../config/cashfreePG');

// Enhanced logging
const terminalLog = (action, status, data = null) => {
  const timestamp = new Date().toISOString();
  const logLevel = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '🔄';
  
  console.log(`${logLevel} [CASHFREE-PG-SERVICE] ${timestamp} - ${action}`, 
    data ? JSON.stringify(data, null, 2) : '');
};

const resolveOrderLookupParams = (identifiers = {}) => {
  const merchantOrderId = identifiers?.merchantOrderId;
  const cfOrderId = identifiers?.cfOrderId;

  if (!merchantOrderId && !cfOrderId) {
    throw new Error('Cashfree order identifier (merchantOrderId or cfOrderId) is required');
  }

  return {
    merchantOrderId,
    cfOrderId,
    lookupId: merchantOrderId || cfOrderId,
    lookupType: merchantOrderId ? 'merchantOrderId' : 'cfOrderId'
  };
};

class CashfreePGService {
  constructor() {
    // Validate configuration on initialization
    try {
      const config = cashfreePGConfig.getConfig();
      this.baseURL = config.baseUrl;
      this.appId = config.appId;
      this.secretKey = config.secretKey;
      this.apiVersion = config.apiVersion;
      this.environment = config.environment;
      
      terminalLog('CASHFREE_PG_SERVICE_INITIALIZED', 'SUCCESS', {
        environment: this.environment,
        baseURL: this.baseURL,
        appId: this.appId ? `${this.appId.substring(0, 15)}...` : 'NOT_SET',
        hasSecretKey: !!this.secretKey,
        apiVersion: this.apiVersion
      });
    } catch (error) {
      terminalLog('CASHFREE_PG_INIT_FAILED', 'ERROR', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create Order - POST /orders
   * Official Cashfree API: Create payment order
   * @param {Object} orderData - Order details
   * @returns {Promise<Object>} - Created order with payment_session_id
   */
  async createOrder(orderData) {
    try {
      const {
        orderId,
        orderAmount,
        orderCurrency = 'INR',
        customerDetails,
        orderNote,
        orderTags,
        orderMeta
      } = orderData;

      terminalLog('CREATE_ORDER_START', 'PROCESSING', {
        orderId,
        orderAmount,
        customerId: customerDetails.customer_id
      });

      // Validate required fields
      if (!orderAmount || orderAmount < 1) {
        throw new Error('Order amount is required and must be at least ₹1');
      }

      if (!customerDetails || !customerDetails.customer_id || !customerDetails.customer_phone) {
        throw new Error('Customer details (customer_id and customer_phone) are required');
      }

      // Validate and format data
      const validatedAmount = cashfreePGConfig.utils.validateOrderAmount(orderAmount);
      const validatedPhone = cashfreePGConfig.utils.validateCustomerPhone(customerDetails.customer_phone);
      const validatedCustomerId = cashfreePGConfig.utils.validateCustomerId(customerDetails.customer_id);

      // Prepare request payload (based on official API documentation)
      const requestPayload = {
        order_amount: validatedAmount,
        order_currency: orderCurrency,
        customer_details: {
          customer_id: validatedCustomerId,
          customer_phone: validatedPhone,
          customer_email: customerDetails.customer_email || undefined,
          customer_name: customerDetails.customer_name || undefined
        }
      };

      // Add optional fields if provided
      if (orderId) {
        requestPayload.order_id = orderId;
      }

      if (orderNote) {
        requestPayload.order_note = orderNote;
      }

      if (orderTags && Object.keys(orderTags).length > 0) {
        requestPayload.order_tags = orderTags;
      }

      if (orderMeta) {
        requestPayload.order_meta = orderMeta;
      }

      // Generate unique request ID
      const requestId = cashfreePGConfig.utils.generateRequestId();

      // Get headers
      const headers = cashfreePGConfig.getHeaders(requestId);

      terminalLog('CREATE_ORDER_REQUEST', 'PROCESSING', {
        url: `${this.baseURL}${cashfreePGConfig.endpoints.createOrder}`,
        requestId,
        payload: {
          ...requestPayload,
          customer_details: {
            ...requestPayload.customer_details,
            customer_phone: `${requestPayload.customer_details.customer_phone.substring(0, 4)}****`
          }
        }
      });

      // Make API request to Cashfree
      const response = await axios({
        method: 'POST',
        url: `${this.baseURL}${cashfreePGConfig.endpoints.createOrder}`,
        headers: headers,
        data: requestPayload,
        timeout: 30000 // 30 seconds
      });

      terminalLog('CREATE_ORDER_SUCCESS', 'SUCCESS', {
        cf_order_id: response.data.cf_order_id,
        order_id: response.data.order_id,
        payment_session_id: response.data.payment_session_id ? 'RECEIVED' : 'MISSING',
        order_status: response.data.order_status,
        order_amount: response.data.order_amount
      });

      return {
        success: true,
        data: response.data,
        requestId
      };

    } catch (error) {
      terminalLog('CREATE_ORDER_ERROR', 'ERROR', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      return this.handleError(error, 'Create Order');
    }
  }

  /**
   * Get Order Status - GET /orders/{order_id}
   * Official Cashfree API: Get order details
   * @param {string} cfOrderId - Cashfree order ID
   * @returns {Promise<Object>} - Order details with payment status
   */
  async getOrderStatus(identifiers = {}) {
    let lookupId;
    let lookupType;
    let merchantOrderId;
    let cfOrderId;
    try {
      ({ lookupId, lookupType, merchantOrderId, cfOrderId } = resolveOrderLookupParams(identifiers));

      terminalLog('GET_ORDER_STATUS_START', 'PROCESSING', { lookupId, lookupType, merchantOrderId, cfOrderId });

      if (!lookupId) {
        throw new Error('Cashfree Order ID is required');
      }

      // Generate unique request ID
      const requestId = cashfreePGConfig.utils.generateRequestId();

      // Get headers
      const headers = cashfreePGConfig.getHeaders(requestId);

      terminalLog('GET_ORDER_STATUS_REQUEST', 'PROCESSING', {
        url: `${this.baseURL}${cashfreePGConfig.endpoints.getOrder}/${lookupId}`,
        requestId,
        lookupType
      });

      // Make API request to Cashfree
      const response = await axios({
        method: 'GET',
        url: `${this.baseURL}${cashfreePGConfig.endpoints.getOrder}/${lookupId}`,
        headers: headers,
        timeout: 15000 // 15 seconds
      });

      const orderStatus = response.data.order_status;
      const mappedStatus = cashfreePGConfig.orderStatusMap[orderStatus] || 'unknown';

      terminalLog('GET_ORDER_STATUS_SUCCESS', 'SUCCESS', {
        cf_order_id: response.data.cf_order_id,
        order_id: response.data.order_id,
        order_status: orderStatus,
        mapped_status: mappedStatus,
        order_amount: response.data.order_amount,
        created_at: response.data.created_at
      });

      return {
        success: true,
        data: response.data,
        isPaymentSuccessful: orderStatus === 'PAID',
        orderStatus: mappedStatus,
        requestId
      };

    } catch (error) {
      terminalLog('GET_ORDER_STATUS_ERROR', 'ERROR', {
        lookupId,
        lookupType,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      return this.handleError(error, 'Get Order Status');
    }
  }

  /**
   * Get Payment Details - GET /orders/{order_id}/payments
   * Official Cashfree API: Get payment transaction details
   * @param {string} cfOrderId - Cashfree order ID
   * @returns {Promise<Object>} - Payment details
   */
  async getPaymentDetails(identifiers = {}) {
    let lookupId;
    let lookupType;
    let merchantOrderId;
    let cfOrderId;
    try {
      ({ lookupId, lookupType, merchantOrderId, cfOrderId } = resolveOrderLookupParams(identifiers));

      terminalLog('GET_PAYMENT_DETAILS_START', 'PROCESSING', {
        lookupId,
        lookupType,
        merchantOrderId,
        cfOrderId
      });

      if (!lookupId) {
        throw new Error('Cashfree Order ID is required');
      }

      // Generate unique request ID
      const requestId = cashfreePGConfig.utils.generateRequestId();

      // Get headers
      const headers = cashfreePGConfig.getHeaders(requestId);

      terminalLog('GET_PAYMENT_DETAILS_REQUEST', 'PROCESSING', {
        url: `${this.baseURL}${cashfreePGConfig.endpoints.getOrderPayments}/${lookupId}/payments`,
        requestId,
        lookupType
      });

      // Make API request to Cashfree
      const response = await axios({
        method: 'GET',
        url: `${this.baseURL}${cashfreePGConfig.endpoints.getOrderPayments}/${lookupId}/payments`,
        headers: headers,
        timeout: 15000 // 15 seconds
      });

      const payments = response.data || [];
      const latestPayment = payments.length > 0 ? payments[0] : null;

      terminalLog('GET_PAYMENT_DETAILS_SUCCESS', 'SUCCESS', {
        lookupId,
        lookupType,
        payment_count: payments.length,
        latest_payment_status: latestPayment?.payment_status,
        payment_method: latestPayment?.payment_group
      });

      return {
        success: true,
        data: response.data,
        latestPayment,
        requestId
      };

    } catch (error) {
      terminalLog('GET_PAYMENT_DETAILS_ERROR', 'ERROR', {
        lookupId,
        lookupType,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      return this.handleError(error, 'Get Payment Details');
    }
  }

  /**
   * Verify Payment - Combined order status + payment details check
   * @param {string} cfOrderId - Cashfree order ID
   * @returns {Promise<Object>} - Verification result
   */
  async verifyPayment(identifiers = {}) {
    let merchantOrderId;
    let cfOrderId;
    try {
      ({ merchantOrderId, cfOrderId } = resolveOrderLookupParams(identifiers));
      terminalLog('VERIFY_PAYMENT_START', 'PROCESSING', { merchantOrderId, cfOrderId });

      // Step 1: Get order status
      const orderResult = await this.getOrderStatus({ merchantOrderId, cfOrderId });
      
      if (!orderResult.success) {
        return orderResult;
      }

      const orderStatus = orderResult.data.order_status;
      const isPaymentSuccessful = orderStatus === 'PAID';

      terminalLog('VERIFY_PAYMENT_ORDER_STATUS', 'PROCESSING', {
        merchantOrderId,
        cfOrderId,
        orderStatus,
        isPaymentSuccessful
      });

      // Step 2: If order is paid, get payment details
      let paymentDetails = null;
      if (isPaymentSuccessful) {
        const paymentResult = await this.getPaymentDetails({ merchantOrderId, cfOrderId });
        if (paymentResult.success) {
          paymentDetails = paymentResult.latestPayment;
        }
      }

      terminalLog('VERIFY_PAYMENT_SUCCESS', 'SUCCESS', {
        merchantOrderId,
        cfOrderId,
        orderStatus,
        isPaymentSuccessful,
        hasPaymentDetails: !!paymentDetails,
        paymentMethod: paymentDetails?.payment_group
      });

      return {
        success: true,
        isPaymentSuccessful,
        data: {
          order: orderResult.data,
          payment: paymentDetails,
          orderStatus: orderStatus,
          verifiedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      terminalLog('VERIFY_PAYMENT_ERROR', 'ERROR', {
        merchantOrderId,
        cfOrderId,
        error: error.message
      });

      return this.handleError(error, 'Verify Payment');
    }
  }

  /**
   * Health Check - Verify service configuration
   * @returns {Promise<Object>} - Health status
   */
  async healthCheck() {
    try {
      const config = cashfreePGConfig.getConfig();
      
      return {
        success: true,
        service: 'CashfreePGService',
        environment: config.environment,
        baseURL: config.baseUrl,
        apiVersion: config.apiVersion,
        configured: !!(config.appId && config.secretKey),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        service: 'CashfreePGService',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Error Handler - Handles Cashfree API error responses
   * Official Cashfree Error Response Format:
   * {
   *   "message": "authentication Failed",        // Human readable message
   *   "code": "request_failed",                  // Error code
   *   "type": "authentication_error",            // Error type
   *   "help": "Check latest errors..."           // Optional help text
   * }
   * 
   * @param {Error} error - Error object from axios
   * @param {string} operation - Operation name for logging
   * @returns {Object} - Formatted error response
   */
  handleError(error, operation) {
    if (error.response) {
      // Cashfree API returned an error response
      const { status, data } = error.response;
      
      // Log the actual error response for debugging
      terminalLog('CASHFREE_API_ERROR_RESPONSE', 'ERROR', {
        status: status,
        code: data?.code,
        type: data?.type,
        message: data?.message,
        help: data?.help,
        fullResponse: data
      });
      
      // Extract error details from Cashfree response
      const cashfreeErrorMessage = data?.message || '';  // "authentication Failed"
      const cashfreeErrorCode = data?.code || '';        // "request_failed"
      const cashfreeErrorType = data?.type || '';        // "authentication_error"
      const cashfreeHelp = data?.help || '';
      
      // Get human-readable status message
      const statusMessage = cashfreePGConfig.statusMessages[status] || 'Unknown error';
      
      // Map Cashfree error code to our internal code
      const mappedErrorCode = cashfreePGConfig.errorCodeMap[cashfreeErrorCode] || cashfreeErrorCode.toUpperCase();

      // Return formatted error response
      return {
        success: false,
        error: cashfreeErrorMessage || statusMessage,  // Use Cashfree's message first
        errorCode: mappedErrorCode,                    // Our mapped code
        cashfreeCode: cashfreeErrorCode,               // Original Cashfree code
        cashfreeType: cashfreeErrorType,               // Original Cashfree type
        statusCode: status,                            // HTTP status (400, 401, etc.)
        help: cashfreeHelp,                            // Help text if available
        details: data,                                 // Complete error object
        operation                                      // Operation that failed
      };
    } else if (error.request) {
      // Network error - request sent but no response received
      terminalLog('NETWORK_ERROR', 'ERROR', {
        message: 'No response received from Cashfree',
        requestUrl: error.config?.url
      });
      
      return {
        success: false,
        error: 'Network error - Unable to reach Cashfree servers',
        errorCode: 'NETWORK_ERROR',
        statusCode: 0,
        operation
      };
    } else {
      // Other errors (configuration, validation, etc.)
      terminalLog('GENERAL_ERROR', 'ERROR', {
        message: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
        errorCode: 'UNKNOWN_ERROR',
        operation
      };
    }
  }
}

// Create singleton instance
const cashfreePGService = new CashfreePGService();

module.exports = cashfreePGService;

