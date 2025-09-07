// File: /backend/utils/logger.js - Centralized logging utility

const fs = require('fs');
const path = require('path');

// 🎯 ENHANCED: Centralized logging utility for ZAMMER backend
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
      admin: '👑'
    };
    
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, action, data) {
    const timestamp = new Date().toISOString();
    const icon = this.logLevels[level] || '📝';
    const message = `${icon} [${level.toUpperCase()}] ${timestamp} - ${action}`;
    
    if (data) {
      return `${message}\n${JSON.stringify(data, null, 2)}\n`;
    }
    return `${message}\n`;
  }

  log(level, action, data = null, writeToFile = false) {
    const message = this.formatMessage(level, action, data);
    
    // Console output with colors
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
      admin: '\x1b[101m'    // Red background
    };
    
    const resetColor = '\x1b[0m';
    const color = colors[level] || '';
    
    console.log(`${color}${message}${resetColor}`);
    
    // Write to file if requested
    if (writeToFile) {
      this.writeToFile(level, message);
    }
  }

  writeToFile(level, message) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = `${level}-${date}.log`;
      const filepath = path.join(this.logDir, filename);
      
      fs.appendFileSync(filepath, message);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  // Specific logging methods for different operations
  auth(action, data, level = 'auth') {
    this.log(level, `[AUTH] ${action}`, data, true);
  }

  password(action, data, level = 'password') {
    this.log(level, `[PASSWORD] ${action}`, data, true);
  }

  security(action, data, level = 'security') {
    this.log(level, `[SECURITY] ${action}`, data, true);
  }

  database(action, data, level = 'database') {
    this.log(level, `[DATABASE] ${action}`, data);
  }

  api(action, data, level = 'api') {
    this.log(level, `[API] ${action}`, data);
  }

  error(action, data, level = 'error') {
    this.log(level, `[ERROR] ${action}`, data, true);
  }

  critical(action, data) {
    this.log('critical', `[CRITICAL] ${action}`, data, true);
  }

  // Request logging
  request(req, res, next) {
    const start = Date.now();
    const originalSend = res.send;
    
    res.send = function(data) {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?._id,
        userEmail: req.user?.email
      };
      
      logger.api('REQUEST_COMPLETED', logData);
      originalSend.call(this, data);
    };
    
    next();
  }

  // Error logging with stack trace
  logError(error, context = {}) {
    this.error('UNHANDLED_ERROR', {
      message: error.message,
      stack: error.stack,
      context: context,
      timestamp: new Date().toISOString()
    });
  }

  // Performance logging
  performance(operation, duration, data = {}) {
    this.log('info', `[PERFORMANCE] ${operation}`, {
      duration: `${duration}ms`,
      ...data
    });
  }

  // Security event logging
  securityEvent(event, data) {
    this.security(`SECURITY_EVENT: ${event}`, {
      ...data,
      timestamp: new Date().toISOString(),
      severity: 'HIGH'
    });
  }

  // Login attempt logging
  loginAttempt(email, success, data = {}) {
    this.auth(`LOGIN_ATTEMPT_${success ? 'SUCCESS' : 'FAILED'}`, {
      email,
      success,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  // Password operation logging
  passwordOperation(operation, userId, email, success, data = {}) {
    this.password(`PASSWORD_${operation.toUpperCase()}_${success ? 'SUCCESS' : 'FAILED'}`, {
      userId,
      email,
      operation,
      success,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  // Token operation logging
  tokenOperation(operation, userId, email, success, data = {}) {
    this.security(`TOKEN_${operation.toUpperCase()}_${success ? 'SUCCESS' : 'FAILED'}`, {
      userId,
      email,
      operation,
      success,
      timestamp: new Date().toISOString(),
      ...data
    });
  }
}

// Create singleton instance
const logger = new Logger();

// Export both class and instance
module.exports = {
  Logger,
  logger,
  
  // Convenience functions
  logAuth: (action, data, level) => logger.auth(action, data, level),
  logPassword: (action, data, level) => logger.password(action, data, level),
  logSecurity: (action, data, level) => logger.security(action, data, level),
  logError: (action, data, level) => logger.error(action, data, level),
  logCritical: (action, data) => logger.critical(action, data),
  logApi: (action, data, level) => logger.api(action, data, level),
  logDatabase: (action, data, level) => logger.database(action, data, level),
  
  // Specialized logging functions
  logLoginAttempt: (email, success, data) => logger.loginAttempt(email, success, data),
  logPasswordOperation: (operation, userId, email, success, data) => 
    logger.passwordOperation(operation, userId, email, success, data),
  logTokenOperation: (operation, userId, email, success, data) => 
    logger.tokenOperation(operation, userId, email, success, data),
  logSecurityEvent: (event, data) => logger.securityEvent(event, data),
  logPerformance: (operation, duration, data) => logger.performance(operation, duration, data)
};
