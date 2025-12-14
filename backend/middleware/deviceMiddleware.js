// File: /backend/middleware/deviceMiddleware.js
// 🎯 NEW: Middleware to handle first-time device access and device tracking

const logDevice = (action, data, level = 'info') => {
  const timestamp = new Date().toISOString();
  const logLevels = {
    info: '📱',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  
  console.log(`${logLevels[level]} [DEVICE-MIDDLEWARE] ${timestamp} - ${action}`, 
    data ? JSON.stringify(data, null, 2) : '');
};

// 🎯 NEW: Middleware to detect and log first-time device access
const detectNewDevice = (req, res, next) => {
  try {
    const deviceId = req.headers['x-device-id'] || req.headers['x-device-id'] || null;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const origin = req.headers.origin || 'no-origin';
    
    // Check if this looks like a first-time access
    const isFirstTimeAccess = !deviceId && 
                              !req.headers.authorization && 
                              req.method === 'GET' &&
                              (req.path === '/' || req.path.startsWith('/api/health') || req.path.startsWith('/api/device-init'));
    
    if (isFirstTimeAccess) {
      logDevice('FIRST_TIME_ACCESS_DETECTED', {
        ip,
        origin,
        userAgent: userAgent.substring(0, 100),
        path: req.path,
        method: req.method,
        hasDeviceId: !!deviceId,
        hasAuth: !!req.headers.authorization
      }, 'info');
      
      // Add helpful headers for new devices
      res.setHeader('X-First-Access', 'true');
      res.setHeader('X-Device-Init-Endpoint', '/api/device-init');
    }
    
    // Always add device info to request for logging
    req.deviceInfo = {
      deviceId,
      ip,
      origin,
      userAgent: userAgent.substring(0, 100),
      isFirstTimeAccess
    };
    
    next();
  } catch (error) {
    logDevice('DEVICE_DETECTION_ERROR', { error: error.message }, 'error');
    // Don't block the request if device detection fails
    next();
  }
};

// 🎯 NEW: Middleware to provide helpful error messages for new devices
const newDeviceErrorHandler = (err, req, res, next) => {
  // Check if this is a CORS error
  if (err.message && err.message.includes('CORS')) {
    logDevice('CORS_ERROR_DETECTED', {
      origin: req.headers.origin,
      path: req.path,
      error: err.message
    }, 'warning');
    
    return res.status(403).json({
      success: false,
      error: 'CORS Error',
      message: 'Cross-origin request blocked. Please check your origin configuration.',
      help: {
        endpoint: '/api/device-init',
        note: 'Try calling /api/device-init first to verify CORS configuration'
      }
    });
  }
  
  // Check if this is an authentication error for a new device
  if (err.status === 401 && !req.headers.authorization) {
    logDevice('AUTH_ERROR_NEW_DEVICE', {
      path: req.path,
      ip: req.ip
    }, 'info');
    
    return res.status(401).json({
      success: false,
      error: 'Authentication Required',
      message: 'This endpoint requires authentication. Please login first.',
      help: {
        loginEndpoint: '/api/users/login',
        signupEndpoint: '/api/users/send-signup-otp',
        note: 'After login, include the token in Authorization header'
      }
    });
  }
  
  next(err);
};

module.exports = {
  detectNewDevice,
  newDeviceErrorHandler
};
