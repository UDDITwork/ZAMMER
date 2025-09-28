// File: /backend/middleware/comprehensiveLoggingMiddleware.js
// 🎯 COMPREHENSIVE: End-to-end logging middleware for all operations

const { 
  logger, 
  startOperation, 
  endOperation,
  logOrderOperation,
  logDeliveryOperation,
  logPaymentOperation,
  logAdminOperation,
  logUserOperation,
  logDatabaseOperation,
  logExternalAPI,
  logSocketEvent
} = require('../utils/logger');

// Global request logging middleware
const globalRequestLogger = (req, res, next) => {
  const correlationId = req.correlationId || startOperation('REQUEST', req.originalUrl, {
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  req.correlationId = correlationId;
  
  // Log request start
  logger.api('REQUEST_STARTED', {
    correlationId,
    method: req.method,
    url: req.originalUrl,
    headers: {
      'User-Agent': req.get('User-Agent'),
      'Content-Type': req.get('Content-Type'),
      'Authorization': req.get('Authorization') ? 'Bearer ***' : 'None',
      'Origin': req.get('Origin'),
      'X-Forwarded-For': req.get('X-Forwarded-For')
    },
    body: req.body,
    query: req.query,
    params: req.params,
    ip: req.ip,
    userId: req.user?._id || req.admin?._id || req.deliveryAgent?._id,
    userEmail: req.user?.email || req.admin?.email || req.deliveryAgent?.email
  }, 'info', correlationId);
  
  const startTime = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - startTime;
    const logData = {
      correlationId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?._id || req.admin?._id || req.deliveryAgent?._id,
      userEmail: req.user?.email || req.admin?.email || req.deliveryAgent?.email,
      responseSize: typeof data === 'string' ? data.length : JSON.stringify(data).length
    };
    
    logger.api('REQUEST_COMPLETED', logData, res.statusCode >= 400 ? 'error' : 'success', correlationId);
    
    // End operation tracking
    endOperation(correlationId, res.statusCode >= 400 ? 'FAILED' : 'COMPLETED', {
      statusCode: res.statusCode,
      duration
    });
    
    originalSend.call(this, data);
  };
  
  next();
};

// Admin operation logging middleware
const adminOperationLogger = (req, res, next) => {
  if (req.admin && req.correlationId) {
    logAdminOperation('ADMIN_ACTION', req.admin._id, {
      action: req.method + ' ' + req.originalUrl,
      adminEmail: req.admin.email,
      adminName: req.admin.name,
      requestData: req.body,
      queryParams: req.query
    }, req.correlationId);
  }
  next();
};

// Delivery operation logging middleware
const deliveryOperationLogger = (req, res, next) => {
  if (req.deliveryAgent && req.correlationId) {
    logger.delivery('DELIVERY_AGENT_ACTION', {
      agentId: req.deliveryAgent._id,
      agentName: req.deliveryAgent.name,
      agentEmail: req.deliveryAgent.email,
      action: req.method + ' ' + req.originalUrl,
      requestData: req.body,
      queryParams: req.query,
      vehicleType: req.deliveryAgent.vehicleType,
      status: req.deliveryAgent.status
    }, 'info', req.correlationId);
  }
  next();
};

// User operation logging middleware
const userOperationLogger = (req, res, next) => {
  if (req.user && req.correlationId) {
    logUserOperation('USER_ACTION', req.user._id, {
      userEmail: req.user.email,
      userName: req.user.name,
      action: req.method + ' ' + req.originalUrl,
      requestData: req.body,
      queryParams: req.query
    }, req.correlationId);
  }
  next();
};

// Payment operation logging middleware
const paymentOperationLogger = (req, res, next) => {
  const paymentId = req.params.paymentId || req.body.paymentId || req.query.paymentId;
  const amount = req.body.amount || req.query.amount;
  
  if (paymentId && req.correlationId) {
    logPaymentOperation('PAYMENT_ACTION', paymentId, amount, {
      action: req.method + ' ' + req.originalUrl,
      userId: req.user?._id || req.admin?._id,
      userEmail: req.user?.email || req.admin?.email,
      requestData: req.body,
      queryParams: req.query,
      paymentGateway: req.body.gateway || 'unknown'
    }, req.correlationId);
  }
  next();
};

// Order operation logging middleware
const orderOperationLogger = (req, res, next) => {
  const orderId = req.params.orderId || req.params.id || req.body.orderId || req.query.orderId;
  
  if (orderId && req.correlationId) {
    logOrderOperation('ORDER_ACTION', orderId, {
      action: req.method + ' ' + req.originalUrl,
      userId: req.user?._id || req.admin?._id || req.deliveryAgent?._id,
      userEmail: req.user?.email || req.admin?.email || req.deliveryAgent?.email,
      requestData: req.body,
      queryParams: req.query,
      userType: req.user ? 'user' : req.admin ? 'admin' : req.deliveryAgent ? 'delivery' : 'unknown'
    }, req.correlationId);
  }
  next();
};

// Database operation logging middleware
const databaseOperationLogger = (operation, collection, data, correlationId) => {
  logDatabaseOperation(operation, collection, {
    operation,
    collection,
    data: typeof data === 'object' ? JSON.stringify(data).substring(0, 500) : data,
    timestamp: new Date().toISOString()
  }, correlationId);
};

// External API logging middleware
const externalAPILogger = (service, operation, data, correlationId) => {
  logExternalAPI(service, operation, {
    service,
    operation,
    data: typeof data === 'object' ? JSON.stringify(data).substring(0, 500) : data,
    timestamp: new Date().toISOString()
  }, correlationId);
};

// Socket event logging middleware
const socketEventLogger = (event, room, data, correlationId) => {
  logSocketEvent(event, room, {
    event,
    room,
    data: typeof data === 'object' ? JSON.stringify(data).substring(0, 500) : data,
    timestamp: new Date().toISOString()
  }, correlationId);
};

// Error logging middleware
const errorLogger = (error, req, res, next) => {
  const correlationId = req.correlationId;
  
  logger.error('UNHANDLED_ERROR', {
    message: error.message,
    stack: error.stack,
    correlationId,
    method: req.method,
    url: req.originalUrl,
    userId: req.user?._id || req.admin?._id || req.deliveryAgent?._id,
    userEmail: req.user?.email || req.admin?.email || req.deliveryAgent?.email,
    body: req.body,
    query: req.query,
    params: req.params,
    timestamp: new Date().toISOString()
  }, 'error', correlationId);
  
  // End operation with error status
  if (correlationId) {
    endOperation(correlationId, 'FAILED', {
      error: error.message,
      statusCode: res.statusCode || 500
    });
  }
  
  next(error);
};

// Performance monitoring middleware
const performanceLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const correlationId = req.correlationId;
    
    if (duration > 1000) { // Log slow requests
      logger.performance('SLOW_REQUEST', duration, {
        correlationId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        userId: req.user?._id || req.admin?._id || req.deliveryAgent?._id
      }, correlationId);
    }
  });
  
  next();
};

// Security event logging middleware
const securityLogger = (req, res, next) => {
  // Log suspicious activities
  const suspiciousPatterns = [
    /\.\.\//g, // Path traversal
    /<script/i, // XSS attempts
    /union\s+select/i, // SQL injection
    /eval\s*\(/i, // Code injection
  ];
  
  const requestString = JSON.stringify(req.body) + JSON.stringify(req.query) + req.originalUrl;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestString)) {
      logger.security('SUSPICIOUS_REQUEST_DETECTED', {
        correlationId: req.correlationId,
        pattern: pattern.toString(),
        method: req.method,
        url: req.originalUrl,
        body: req.body,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?._id || req.admin?._id || req.deliveryAgent?._id
      }, 'security', req.correlationId);
      break;
    }
  }
  
  next();
};

module.exports = {
  globalRequestLogger,
  adminOperationLogger,
  deliveryOperationLogger,
  userOperationLogger,
  paymentOperationLogger,
  orderOperationLogger,
  databaseOperationLogger,
  externalAPILogger,
  socketEventLogger,
  errorLogger,
  performanceLogger,
  securityLogger
};
