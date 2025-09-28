// File: /backend/utils/logger.js - COMPREHENSIVE END-TO-END LOGGING SYSTEM

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 🎯 COMPREHENSIVE: Enhanced logging utility for complete ZAMMER backend tracking
class Logger {
  constructor() {
    this.logLevels = {
      info: '👤',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      critical: '🚨',
      password: '🔐',
      security: '🛡️',
      auth: '🔑',
      reset: '🔄',
      database: '🗄️',
      api: '🌐',
      email: '📧',
      payment: '💳',
      delivery: '🚚',
      admin: '👑',
      order: '📦',
      seller: '🏪',
      user: '👥',
      system: '⚙️',
      performance: '⚡',
      socket: '🔌',
      file: '📁',
      external: '🌍'
    };
    
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDirectory();
    
    // Track active operations for correlation
    this.activeOperations = new Map();
    this.correlationIds = new Set();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  // Generate unique correlation ID for tracking operations
  generateCorrelationId() {
    const correlationId = crypto.randomBytes(8).toString('hex');
    this.correlationIds.add(correlationId);
    return correlationId;
  }

  // Start tracking an operation
  startOperation(operationType, operationId, data = {}) {
    const correlationId = this.generateCorrelationId();
    const startTime = Date.now();
    
    const operation = {
      correlationId,
      operationType,
      operationId,
      startTime,
      data,
      status: 'STARTED',
      logs: []
    };
    
    this.activeOperations.set(correlationId, operation);
    
    this.log(operationType, `OPERATION_STARTED: ${operationType}`, {
      correlationId,
      operationId,
      ...data
    }, true);
    
    return correlationId;
  }

  // End tracking an operation
  endOperation(correlationId, status = 'COMPLETED', result = null) {
    const operation = this.activeOperations.get(correlationId);
    if (!operation) return;

    const duration = Date.now() - operation.startTime;
    operation.status = status;
    operation.endTime = Date.now();
    operation.duration = duration;
    operation.result = result;

    this.log(operation.operationType, `OPERATION_${status}: ${operation.operationType}`, {
      correlationId,
      operationId: operation.operationId,
      duration: `${duration}ms`,
      result
    }, true);

    this.activeOperations.delete(correlationId);
    this.correlationIds.delete(correlationId);
  }

  formatMessage(level, action, data, correlationId = null) {
    const timestamp = new Date().toISOString();
    const icon = this.logLevels[level] || '📝';
    const correlationStr = correlationId ? `[${correlationId}] ` : '';
    const message = `${icon} [${level.toUpperCase()}] ${correlationStr}${timestamp} - ${action}`;
    
    if (data) {
      return `${message}\n${JSON.stringify(data, null, 2)}\n`;
    }
    return `${message}\n`;
  }

  log(level, action, data = null, writeToFile = false, correlationId = null) {
    const message = this.formatMessage(level, action, data, correlationId);
    
    // Enhanced console output with colors
    const colors = {
      info: '\x1b[36m',     // Cyan
      success: '\x1b[32m',  // Green
      warning: '\x1b[33m',  // Yellow
      error: '\x1b[31m',    // Red
      critical: '\x1b[35m', // Magenta
      password: '\x1b[34m', // Blue
      security: '\x1b[41m', // Red background
      auth: '\x1b[42m',     // Green background
      reset: '\x1b[43m',    // Yellow background
      database: '\x1b[44m', // Blue background
      api: '\x1b[45m',      // Magenta background
      email: '\x1b[46m',    // Cyan background
      payment: '\x1b[47m',  // White background
      delivery: '\x1b[100m', // Gray background
      admin: '\x1b[101m',   // Red background
      order: '\x1b[48;5;208m', // Orange background
      seller: '\x1b[48;5;220m', // Yellow background
      user: '\x1b[48;5;75m',   // Light blue background
      system: '\x1b[48;5;240m', // Dark gray background
      performance: '\x1b[48;5;82m', // Light green background
      socket: '\x1b[48;5;141m', // Light purple background
      file: '\x1b[48;5;214m', // Orange background
      external: '\x1b[48;5;196m' // Red background
    };
    
    const resetColor = '\x1b[0m';
    const color = colors[level] || '';
    
    console.log(`${color}${message}${resetColor}`);
    
    // Write to file if requested
    if (writeToFile) {
      this.writeToFile(level, message);
    }
    
    // Store in active operation if correlationId exists
    if (correlationId && this.activeOperations.has(correlationId)) {
      const operation = this.activeOperations.get(correlationId);
      operation.logs.push({
        timestamp: new Date().toISOString(),
        level,
        action,
        data
      });
    }
  }

  writeToFile(level, message) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = `${level}-${date}.log`;
      const filepath = path.join(this.logDir, filename);
      
      fs.appendFileSync(filepath, message);
      
      // Also write to comprehensive log
      const comprehensiveFile = path.join(this.logDir, `comprehensive-${date}.log`);
      fs.appendFileSync(comprehensiveFile, message);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  // Write comprehensive operation log
  writeOperationLog(operation, correlationId) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = `operations-${date}.log`;
      const filepath = path.join(this.logDir, filename);
      
      const operationLog = {
        correlationId,
        operationType: operation.operationType,
        operationId: operation.operationId,
        startTime: operation.startTime,
        endTime: operation.endTime,
        duration: operation.duration,
        status: operation.status,
        data: operation.data,
        result: operation.result,
        logs: operation.logs
      };
      
      const logEntry = `\n${'='.repeat(80)}\n${JSON.stringify(operationLog, null, 2)}\n${'='.repeat(80)}\n`;
      fs.appendFileSync(filepath, logEntry);
    } catch (error) {
      console.error('Failed to write operation log:', error);
    }
  }

  // COMPREHENSIVE SPECIALIZED LOGGING METHODS
  
  // Authentication & Security
  auth(action, data, level = 'auth', correlationId = null) {
    this.log(level, `[AUTH] ${action}`, data, true, correlationId);
  }

  password(action, data, level = 'password', correlationId = null) {
    this.log(level, `[PASSWORD] ${action}`, data, true, correlationId);
  }

  security(action, data, level = 'security', correlationId = null) {
    this.log(level, `[SECURITY] ${action}`, data, true, correlationId);
  }

  // System Operations
  database(action, data, level = 'database', correlationId = null) {
    this.log(level, `[DATABASE] ${action}`, data, true, correlationId);
  }

  api(action, data, level = 'api', correlationId = null) {
    this.log(level, `[API] ${action}`, data, true, correlationId);
  }

  system(action, data, level = 'system', correlationId = null) {
    this.log(level, `[SYSTEM] ${action}`, data, true, correlationId);
  }

  // Business Operations
  order(action, data, level = 'order', correlationId = null) {
    this.log(level, `[ORDER] ${action}`, data, true, correlationId);
  }

  delivery(action, data, level = 'delivery', correlationId = null) {
    this.log(level, `[DELIVERY] ${action}`, data, true, correlationId);
  }

  payment(action, data, level = 'payment', correlationId = null) {
    this.log(level, `[PAYMENT] ${action}`, data, true, correlationId);
  }

  admin(action, data, level = 'admin', correlationId = null) {
    this.log(level, `[ADMIN] ${action}`, data, true, correlationId);
  }

  seller(action, data, level = 'seller', correlationId = null) {
    this.log(level, `[SELLER] ${action}`, data, true, correlationId);
  }

  user(action, data, level = 'user', correlationId = null) {
    this.log(level, `[USER] ${action}`, data, true, correlationId);
  }

  // Technical Operations
  socket(action, data, level = 'socket', correlationId = null) {
    this.log(level, `[SOCKET] ${action}`, data, true, correlationId);
  }

  file(action, data, level = 'file', correlationId = null) {
    this.log(level, `[FILE] ${action}`, data, true, correlationId);
  }

  external(action, data, level = 'external', correlationId = null) {
    this.log(level, `[EXTERNAL] ${action}`, data, true, correlationId);
  }

  // Error Handling
  error(action, data, level = 'error', correlationId = null) {
    this.log(level, `[ERROR] ${action}`, data, true, correlationId);
  }

  critical(action, data, correlationId = null) {
    this.log('critical', `[CRITICAL] ${action}`, data, true, correlationId);
  }

  // ENHANCED REQUEST LOGGING WITH CORRELATION
  request(req, res, next) {
    const start = Date.now();
    const correlationId = this.generateCorrelationId();
    req.correlationId = correlationId;
    
    // Log request start
    this.api('REQUEST_STARTED', {
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
    
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - start;
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
      originalSend.call(this, data);
    };
    
    next();
  }

  // COMPREHENSIVE BUSINESS OPERATION LOGGING
  
  // Order Operations
  logOrderOperation(operation, orderId, data, correlationId = null) {
    this.order(`ORDER_${operation.toUpperCase()}`, {
      orderId,
      operation,
      ...data
    }, 'info', correlationId);
  }

  // Delivery Operations
  logDeliveryOperation(operation, deliveryId, agentId, data, correlationId = null) {
    this.delivery(`DELIVERY_${operation.toUpperCase()}`, {
      deliveryId,
      agentId,
      operation,
      ...data
    }, 'info', correlationId);
  }

  // Payment Operations
  logPaymentOperation(operation, paymentId, amount, data, correlationId = null) {
    this.payment(`PAYMENT_${operation.toUpperCase()}`, {
      paymentId,
      operation,
      amount,
      ...data
    }, 'info', correlationId);
  }

  // Admin Operations
  logAdminOperation(operation, adminId, data, correlationId = null) {
    this.admin(`ADMIN_${operation.toUpperCase()}`, {
      adminId,
      operation,
      ...data
    }, 'info', correlationId);
  }

  // User Operations
  logUserOperation(operation, userId, data, correlationId = null) {
    this.user(`USER_${operation.toUpperCase()}`, {
      userId,
      operation,
      ...data
    }, 'info', correlationId);
  }

  // Database Operations
  logDatabaseOperation(operation, collection, data, correlationId = null) {
    this.database(`DB_${operation.toUpperCase()}`, {
      collection,
      operation,
      ...data
    }, 'info', correlationId);
  }

  // External API Operations
  logExternalAPI(service, operation, data, correlationId = null) {
    this.external(`EXTERNAL_${service.toUpperCase()}_${operation.toUpperCase()}`, {
      service,
      operation,
      ...data
    }, 'info', correlationId);
  }

  // Socket Operations
  logSocketEvent(event, room, data, correlationId = null) {
    this.socket(`SOCKET_${event.toUpperCase()}`, {
      event,
      room,
      ...data
    }, 'info', correlationId);
  }

  // File Operations
  logFileOperation(operation, filePath, data, correlationId = null) {
    this.file(`FILE_${operation.toUpperCase()}`, {
      filePath,
      operation,
      ...data
    }, 'info', correlationId);
  }

  // ENHANCED ERROR LOGGING WITH CORRELATION
  logError(error, context = {}, correlationId = null) {
    this.error('UNHANDLED_ERROR', {
      message: error.message,
      stack: error.stack,
      context: context,
      timestamp: new Date().toISOString()
    }, 'error', correlationId);
  }

  // Performance logging
  performance(operation, duration, data = {}, correlationId = null) {
    this.log('performance', `[PERFORMANCE] ${operation}`, {
      duration: `${duration}ms`,
      ...data
    }, true, correlationId);
  }

  // Security event logging
  securityEvent(event, data, correlationId = null) {
    this.security(`SECURITY_EVENT: ${event}`, {
      ...data,
      timestamp: new Date().toISOString(),
      severity: 'HIGH'
    }, 'security', correlationId);
  }

  // Login attempt logging
  loginAttempt(email, success, data = {}, correlationId = null) {
    this.auth(`LOGIN_ATTEMPT_${success ? 'SUCCESS' : 'FAILED'}`, {
      email,
      success,
      timestamp: new Date().toISOString(),
      ...data
    }, success ? 'success' : 'error', correlationId);
  }

  // Password operation logging
  passwordOperation(operation, userId, email, success, data = {}, correlationId = null) {
    this.password(`PASSWORD_${operation.toUpperCase()}_${success ? 'SUCCESS' : 'FAILED'}`, {
      userId,
      email,
      operation,
      success,
      timestamp: new Date().toISOString(),
      ...data
    }, success ? 'success' : 'error', correlationId);
  }

  // Token operation logging
  tokenOperation(operation, userId, email, success, data = {}, correlationId = null) {
    this.security(`TOKEN_${operation.toUpperCase()}_${success ? 'SUCCESS' : 'FAILED'}`, {
      userId,
      email,
      operation,
      success,
      timestamp: new Date().toISOString(),
      ...data
    }, success ? 'success' : 'error', correlationId);
  }

  // Get active operations for monitoring
  getActiveOperations() {
    return Array.from(this.activeOperations.values());
  }

  // Get operation by correlation ID
  getOperation(correlationId) {
    return this.activeOperations.get(correlationId);
  }

  // Get recent logs (for admin dashboard)
  getRecentLogs(limit = 100) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const comprehensiveFile = path.join(this.logDir, `comprehensive-${date}.log`);
      
      if (!fs.existsSync(comprehensiveFile)) {
        return [];
      }
      
      const content = fs.readFileSync(comprehensiveFile, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      return lines.slice(-limit).map(line => {
        try {
          // Parse log line format
          const match = line.match(/^(.+?) \[(.+?)\] \[(.+?)\] (.+?) - (.+)$/);
          if (match) {
            return {
              icon: match[1],
              level: match[2],
              correlationId: match[3],
              timestamp: match[4],
              message: match[5]
            };
          }
        } catch (e) {
          return { raw: line };
        }
        return { raw: line };
      });
    } catch (error) {
      console.error('Error reading recent logs:', error);
      return [];
    }
  }

  // Clear old logs (maintenance)
  clearOldLogs(daysToKeep = 7) {
    try {
      const files = fs.readdirSync(this.logDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          this.system('LOG_CLEANUP', { deletedFile: file });
        }
      });
    } catch (error) {
      this.error('LOG_CLEANUP_ERROR', { error: error.message });
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Export both class and instance
module.exports = {
  Logger,
  logger,
  
  // BASIC CONVENIENCE FUNCTIONS
  logAuth: (action, data, level, correlationId) => logger.auth(action, data, level, correlationId),
  logPassword: (action, data, level, correlationId) => logger.password(action, data, level, correlationId),
  logSecurity: (action, data, level, correlationId) => logger.security(action, data, level, correlationId),
  logError: (action, data, level, correlationId) => logger.error(action, data, level, correlationId),
  logCritical: (action, data, correlationId) => logger.critical(action, data, correlationId),
  logApi: (action, data, level, correlationId) => logger.api(action, data, level, correlationId),
  logDatabase: (action, data, level, correlationId) => logger.database(action, data, level, correlationId),
  logSystem: (action, data, level, correlationId) => logger.system(action, data, level, correlationId),
  
  // BUSINESS OPERATION FUNCTIONS
  logOrder: (action, data, level, correlationId) => logger.order(action, data, level, correlationId),
  logDelivery: (action, data, level, correlationId) => logger.delivery(action, data, level, correlationId),
  logPayment: (action, data, level, correlationId) => logger.payment(action, data, level, correlationId),
  logAdmin: (action, data, level, correlationId) => logger.admin(action, data, level, correlationId),
  logSeller: (action, data, level, correlationId) => logger.seller(action, data, level, correlationId),
  logUser: (action, data, level, correlationId) => logger.user(action, data, level, correlationId),
  
  // TECHNICAL OPERATION FUNCTIONS
  logSocket: (action, data, level, correlationId) => logger.socket(action, data, level, correlationId),
  logFile: (action, data, level, correlationId) => logger.file(action, data, level, correlationId),
  logExternal: (action, data, level, correlationId) => logger.external(action, data, level, correlationId),
  
  // SPECIALIZED LOGGING FUNCTIONS
  logLoginAttempt: (email, success, data, correlationId) => logger.loginAttempt(email, success, data, correlationId),
  logPasswordOperation: (operation, userId, email, success, data, correlationId) => 
    logger.passwordOperation(operation, userId, email, success, data, correlationId),
  logTokenOperation: (operation, userId, email, success, data, correlationId) => 
    logger.tokenOperation(operation, userId, email, success, data, correlationId),
  logSecurityEvent: (event, data, correlationId) => logger.securityEvent(event, data, correlationId),
  logPerformance: (operation, duration, data, correlationId) => logger.performance(operation, duration, data, correlationId),
  
  // COMPREHENSIVE BUSINESS OPERATION FUNCTIONS
  logOrderOperation: (operation, orderId, data, correlationId) => 
    logger.logOrderOperation(operation, orderId, data, correlationId),
  logDeliveryOperation: (operation, deliveryId, agentId, data, correlationId) => 
    logger.logDeliveryOperation(operation, deliveryId, agentId, data, correlationId),
  logPaymentOperation: (operation, paymentId, amount, data, correlationId) => 
    logger.logPaymentOperation(operation, paymentId, amount, data, correlationId),
  logAdminOperation: (operation, adminId, data, correlationId) => 
    logger.logAdminOperation(operation, adminId, data, correlationId),
  logUserOperation: (operation, userId, data, correlationId) => 
    logger.logUserOperation(operation, userId, data, correlationId),
  logDatabaseOperation: (operation, collection, data, correlationId) => 
    logger.logDatabaseOperation(operation, collection, data, correlationId),
  logExternalAPI: (service, operation, data, correlationId) => 
    logger.logExternalAPI(service, operation, data, correlationId),
  logSocketEvent: (event, room, data, correlationId) => 
    logger.logSocketEvent(event, room, data, correlationId),
  logFileOperation: (operation, filePath, data, correlationId) => 
    logger.logFileOperation(operation, filePath, data, correlationId),
  
  // OPERATION TRACKING FUNCTIONS
  startOperation: (operationType, operationId, data) => logger.startOperation(operationType, operationId, data),
  endOperation: (correlationId, status, result) => logger.endOperation(correlationId, status, result),
  getActiveOperations: () => logger.getActiveOperations(),
  getOperation: (correlationId) => logger.getOperation(correlationId),
  getRecentLogs: (limit) => logger.getRecentLogs(limit),
  clearOldLogs: (daysToKeep) => logger.clearOldLogs(daysToKeep),
  
  // REQUEST MIDDLEWARE
  requestLogger: (req, res, next) => logger.request(req, res, next)
};
