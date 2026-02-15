// backend/app.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { errorHandler } = require('./middleware/errorMiddleware');
const { 
  globalRequestLogger,
  adminOperationLogger,
  deliveryOperationLogger,
  userOperationLogger,
  paymentOperationLogger,
  orderOperationLogger,
  errorLogger,
  performanceLogger,
  securityLogger
} = require('./middleware/comprehensiveLoggingMiddleware');
const { detectNewDevice, newDeviceErrorHandler } = require('./middleware/deviceMiddleware');

// Routes imports
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const userRoutes = require('./routes/userRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const cartRoutes = require('./routes/cartRoutes');
const shopRoutes = require('./routes/shopRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const virtualTryOnRoutes = require('./routes/virtualTryOnRoutes');
const payoutRoutes = require('./routes/payoutRoutes');
const logRoutes = require('./routes/logRoutes');
const returnRoutes = require('./routes/returnRoutes');
const supportRoutes = require('./routes/supportRoutes');
const adminSupportRoutes = require('./routes/adminSupportRoutes');
const supportUploadRoutes = require('./routes/supportUploadRoutes');
const catalogueRoutes = require('./routes/catalogueRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const promoBannerRoutes = require('./routes/promoBannerRoutes');
const level4BatchSeedRoutes = require('./routes/level4BatchSeedRoutes');
const brandProductSeedRoutes = require('./routes/brandProductSeedRoutes');

// Deployment trigger - Force redeploy with 502 fix (2025-02-09)
// Initialize app
const app = express();

// 🎯 UNIVERSAL: Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5001;

// 🎯 UNIVERSAL: Dynamic Frontend URL - Environment Variable Based
const getFrontendUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // Production: Always return HTTPS URLs
    const prodUrl = process.env.FRONTEND_URL_PROD || 
                   process.env.FRONTEND_URL || 
                   process.env.PUBLIC_URL;
    
    if (!prodUrl) {
      console.warn('⚠️ No FRONTEND_URL_PROD configured in production');
      return null;
    }
    
    // Ensure HTTPS in production
    return prodUrl.startsWith('https://') ? prodUrl : `https://${prodUrl.replace(/^https?:\/\//, '')}`;
  }
  
  // Development environment
  return process.env.FRONTEND_URL_LOCAL || 
         process.env.FRONTEND_URL || 
         process.env.PUBLIC_URL ||
         'http://localhost:3000';
};

const FRONTEND_URL = getFrontendUrl();

// 🎯 FLEXIBLE: Smart CORS Origins - Works on all devices
const getAllowedOrigins = () => {
  // Base origins for all environments (CDN services)
  const baseOrigins = [
    'https://res.cloudinary.com',
    'https://cloudinary.com'
  ];
  
  // 🎯 PRODUCTION FALLBACK: Explicitly allow zammernow.com domains
  // This ensures CORS works even if environment variables aren't set correctly
  // Always check both www and non-www variants for maximum compatibility
  if (process.env.NODE_ENV === 'production') {
    baseOrigins.push(
      'https://zammernow.com',
      'https://www.zammernow.com',
      'https://zammernow.com/',
      'https://www.zammernow.com/',
      'http://zammernow.com', // Fallback for HTTP
      'http://www.zammernow.com',
      'http://zammernow.com/',
      'http://www.zammernow.com/'
    );
  }
  
  // Smart detection: Check if running locally
  const isLocal = process.env.PORT === '5001' || 
                  process.env.NODE_ENV === 'development' ||
                  process.env.FRONTEND_URL_LOCAL ||
                  !process.env.FRONTEND_URL_PROD;
  
  const allowedOrigins = [...baseOrigins];
  
  if (isLocal) {
    // Local Development: Allow localhost variations
    allowedOrigins.push(
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://localhost:3000',
      'http://localhost',
      'http://127.0.0.1'
    );
  }
  
  // Add frontend URL from environment variables (if configured)
  if (FRONTEND_URL) {
    // Add both with and without trailing slash
    const cleanUrl = FRONTEND_URL.replace(/\/$/, '');
    allowedOrigins.push(cleanUrl);
    allowedOrigins.push(`${cleanUrl}/`);
    
    // 🎯 CRITICAL FIX: Automatically add www and non-www versions
    // Extract domain from URL
    const urlMatch = cleanUrl.match(/^https?:\/\/([^\/]+)/);
    if (urlMatch) {
      const domain = urlMatch[1];
      
      // 🎯 SPECIAL HANDLING: Ensure zammernow.com always has both www and non-www variants
      if (domain.toLowerCase().includes('zammernow.com')) {
        // Always add both variants explicitly for zammernow.com
        const zammerBaseUrl = cleanUrl.replace(/^https?:\/\/[^\/]+/, '');
        const protocol = cleanUrl.startsWith('https://') ? 'https://' : 'http://';
        
        allowedOrigins.push(`${protocol}zammernow.com${zammerBaseUrl}`);
        allowedOrigins.push(`${protocol}zammernow.com${zammerBaseUrl}/`);
        allowedOrigins.push(`${protocol}www.zammernow.com${zammerBaseUrl}`);
        allowedOrigins.push(`${protocol}www.zammernow.com${zammerBaseUrl}/`);
      }
      
      // If domain doesn't start with www, add www version
      if (!domain.startsWith('www.')) {
        const wwwVersion = cleanUrl.replace(domain, `www.${domain}`);
        allowedOrigins.push(wwwVersion);
        allowedOrigins.push(`${wwwVersion}/`);
      } else {
        // If domain starts with www, add non-www version
        const nonWwwVersion = cleanUrl.replace('www.', '');
        allowedOrigins.push(nonWwwVersion);
        allowedOrigins.push(`${nonWwwVersion}/`);
      }
    }
    
    // Also add HTTP version if HTTPS is configured (for flexibility)
    if (cleanUrl.startsWith('https://')) {
      const httpVersion = cleanUrl.replace('https://', 'http://');
      allowedOrigins.push(httpVersion);
      allowedOrigins.push(`${httpVersion}/`);
      
      // Add www/non-www versions for HTTP too
      const httpUrlMatch = httpVersion.match(/^http:\/\/([^\/]+)/);
      if (httpUrlMatch) {
        const httpDomain = httpUrlMatch[1];
        if (!httpDomain.startsWith('www.')) {
          const httpWwwVersion = httpVersion.replace(httpDomain, `www.${httpDomain}`);
          allowedOrigins.push(httpWwwVersion);
          allowedOrigins.push(`${httpWwwVersion}/`);
        } else {
          const httpNonWwwVersion = httpVersion.replace('www.', '');
          allowedOrigins.push(httpNonWwwVersion);
          allowedOrigins.push(`${httpNonWwwVersion}/`);
        }
      }
    }
  }
  
  // Add environment-specific domains from CDN_DOMAINS
  if (process.env.CDN_DOMAINS) {
    const cdnDomains = process.env.CDN_DOMAINS.split(',').map(d => d.trim()).filter(Boolean);
    cdnDomains.forEach(domain => {
      const cleanDomain = domain.replace(/\/$/, '');
      allowedOrigins.push(cleanDomain);
      allowedOrigins.push(`${cleanDomain}/`);
    });
  }
  
  // Add ADDITIONAL_ALLOWED_ORIGINS if configured
  if (process.env.ADDITIONAL_ALLOWED_ORIGINS) {
    const additionalOrigins = process.env.ADDITIONAL_ALLOWED_ORIGINS.split(',').map(d => d.trim()).filter(Boolean);
    additionalOrigins.forEach(origin => {
      const cleanOrigin = origin.replace(/\/$/, '');
      allowedOrigins.push(cleanOrigin);
      allowedOrigins.push(`${cleanOrigin}/`);
    });
  }
  
  return allowedOrigins;
};

// 🎯 FLEXIBLE: Check if origin matches allowed patterns
// 🎯 ENHANCED: More permissive for new devices and first-time access
const isOriginAllowed = (origin) => {
  // 🎯 CRITICAL FIX: Always allow requests with no origin (mobile apps, Postman, new devices, etc.)
  // This is essential for new devices that might not send origin headers properly
  if (!origin) {
    console.log('✅ [CORS] Allowing request with no origin (new device/mobile app)');
    return true;
  }
  
  const allowedOrigins = getAllowedOrigins();
  
  // Normalize origin (remove trailing slash for comparison)
  const normalizedOrigin = origin.replace(/\/$/, '');
  
  // 🎯 NEW: Allow localhost and 127.0.0.1 in development (for testing new devices)
  if (process.env.NODE_ENV === 'development') {
    const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i;
    if (localhostPattern.test(normalizedOrigin)) {
      console.log(`✅ [CORS] Allowing localhost origin in development: ${origin}`);
      return true;
    }
  }
  
  // 🎯 SPECIAL CHECK: Explicitly handle zammernow.com domains
  // This ensures both www and non-www variants are always accepted
  if (normalizedOrigin.toLowerCase().includes('zammernow.com')) {
    const zammerMatch = normalizedOrigin.match(/^https?:\/\/(www\.)?zammernow\.com/);
    if (zammerMatch) {
      // Check if any zammernow.com variant is in allowed origins
      const hasZammer = allowedOrigins.some(allowed => {
        const normalizedAllowed = allowed.replace(/\/$/, '').toLowerCase();
        return normalizedAllowed.includes('zammernow.com');
      });
      if (hasZammer) {
        return true; // Allow any zammernow.com variant if zammernow.com is configured
      }
    }
  }
  
  // 🎯 NEW: Allow any origin that matches the configured frontend URL pattern
  // This helps with new devices accessing from slightly different URLs
  if (FRONTEND_URL) {
    const frontendDomain = FRONTEND_URL.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const originDomain = normalizedOrigin.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    
    // Allow if domains match (handles www/non-www variations)
    if (originDomain === frontendDomain || 
        originDomain === `www.${frontendDomain}` ||
        `www.${originDomain}` === frontendDomain) {
      console.log(`✅ [CORS] Allowing origin matching frontend domain: ${origin}`);
      return true;
    }
  }
  
  // Check exact match
  if (allowedOrigins.includes(origin) || allowedOrigins.includes(normalizedOrigin)) {
    return true;
  }
  
  // 🎯 CRITICAL FIX: Check www/non-www variants
  const originMatch = normalizedOrigin.match(/^https?:\/\/(www\.)?([^\/]+)/);
  if (originMatch) {
    const hasWww = !!originMatch[1];
    const domain = originMatch[2];
    
    // Check if non-www version is allowed when origin has www
    if (hasWww) {
      const nonWwwOrigin = normalizedOrigin.replace('www.', '');
      if (allowedOrigins.some(allowed => {
        const normalizedAllowed = allowed.replace(/\/$/, '');
        return normalizedAllowed.toLowerCase() === nonWwwOrigin.toLowerCase() ||
               normalizedAllowed.toLowerCase().startsWith(nonWwwOrigin.toLowerCase());
      })) {
        return true;
      }
    } else {
      // Check if www version is allowed when origin doesn't have www
      const wwwOrigin = normalizedOrigin.replace(/^https?:\/\//, 'https://www.');
      if (allowedOrigins.some(allowed => {
        const normalizedAllowed = allowed.replace(/\/$/, '');
        return normalizedAllowed.toLowerCase() === wwwOrigin.toLowerCase() ||
               normalizedAllowed.toLowerCase().startsWith(wwwOrigin.toLowerCase());
      })) {
        return true;
      }
    }
  }
  
  // Check if origin matches any allowed origin pattern (flexible matching)
  for (const allowed of allowedOrigins) {
    const normalizedAllowed = allowed.replace(/\/$/, '');
    
    // Exact match (case-insensitive)
    if (normalizedOrigin.toLowerCase() === normalizedAllowed.toLowerCase()) {
      return true;
    }
    
    // Pattern match: if allowed origin is a domain pattern, check if origin matches
    // Example: if allowed is "https://example.com", allow "https://example.com" and "https://example.com/"
    if (normalizedOrigin.toLowerCase().startsWith(normalizedAllowed.toLowerCase())) {
      return true;
    }
  }
  
  // 🎯 NEW: In development, log blocked origins for debugging
  if (process.env.NODE_ENV === 'development') {
    console.warn(`⚠️ [CORS] Blocked origin in development: ${origin}`);
    console.log(`   Allowed origins: ${allowedOrigins.slice(0, 5).join(', ')}${allowedOrigins.length > 5 ? '...' : ''}`);
  }
  
  return false;
};

console.log(`
🚀 ===============================
   ZAMMER SERVER CONFIGURATION
===============================
🌍 Environment: ${NODE_ENV}
📡 Port: ${PORT}
🌐 Frontend URL: ${FRONTEND_URL}
🔗 CORS Origins: ${getAllowedOrigins().length} configured
🔧 Available Env Vars: ${JSON.stringify({
  hasFrontendUrlProd: !!process.env.FRONTEND_URL_PROD,
  hasFrontendUrl: !!process.env.FRONTEND_URL,
  hasPublicUrl: !!process.env.PUBLIC_URL,
  hasAdditionalOrigins: !!process.env.ADDITIONAL_ALLOWED_ORIGINS
})}
===============================`);

// 🎯 Create HTTP server for Socket.io
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,  // ✅ CHANGE FROM false TO true
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true // Enhanced compatibility
});

// 🎯 ENHANCED: Socket.io setup for real-time notifications
const connectedSellers = new Map();
const connectedBuyers = new Map();
const connectedDeliveryAgents = new Map();
const connectedAdmins = new Map(); // 🎯 NEW: Track connected admins

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id} | Origin: ${socket.handshake.headers.origin}`);

  // Seller room joining
  socket.on('seller-join', (sellerId) => {
    console.log(`👨‍💼 Seller ${sellerId} joined room`);
    socket.join(`seller-${sellerId}`);
    connectedSellers.set(sellerId, socket.id);
    
    socket.emit('seller-joined', {
      success: true,
      message: 'Connected to order notifications',
      sellerId,
      timestamp: new Date().toISOString()
    });
  });

  // Buyer room joining
  socket.on('buyer-join', (userId) => {
    console.log(`👤 Buyer ${userId} joined room`);
    socket.join(`buyer-${userId}`);
    connectedBuyers.set(userId, socket.id);
    
    socket.emit('buyer-joined', {
      success: true,
      message: 'Connected to order status updates',
      userId,
      timestamp: new Date().toISOString()
    });
  });

  // 🎯 NEW: Admin room joining
  socket.on('admin-join', (adminId) => {
    console.log(`🔧 Admin ${adminId} joined room`);
    socket.join('admin-room'); // All admins join the same room
    connectedAdmins.set(adminId, socket.id);
    
    socket.emit('admin-joined', {
      success: true,
      message: 'Connected to admin notifications',
      adminId,
      timestamp: new Date().toISOString()
    });
  });

  // 🎯 NEW: Admin live log viewer room joining
  socket.on('admin-logs-join', (adminId) => {
    console.log(`📊 Admin ${adminId} joined live logs room`);
    socket.join('admin-logs-room');
    
    socket.emit('admin-logs-joined', {
      success: true,
      message: 'Connected to live log stream',
      adminId,
      timestamp: new Date().toISOString()
    });
  });

  // 🎯 NEW: Admin leaving live logs room
  socket.on('admin-logs-leave', () => {
    socket.leave('admin-logs-room');
    console.log(`📊 Admin left live logs room: ${socket.id}`);
  });

  // 🎯 NEW: Delivery agent room joining
  socket.on('delivery-join', (agentId) => {
    console.log(`🚚 Delivery Agent ${agentId} joined room`);
    socket.join(`delivery-${agentId}`);
    connectedDeliveryAgents.set(agentId, socket.id);
    
    socket.emit('delivery-joined', {
      success: true,
      message: 'Connected to delivery notifications',
      agentId,
      timestamp: new Date().toISOString()
    });
  });

  // Enhanced ping/pong handling
  socket.on('ping', (data) => {
    socket.emit('pong', {
      timestamp: new Date().toISOString(),
      latency: data?.timestamp ? Date.now() - data.timestamp : 0,
      socketId: socket.id
    });
  });

  // Connection error handling
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });

  // Enhanced disconnect handling
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Socket disconnected: ${socket.id} | Reason: ${reason}`);
    
    // Clean up all connection maps
    for (const [sellerId, socketId] of connectedSellers.entries()) {
      if (socketId === socket.id) {
        connectedSellers.delete(sellerId);
        console.log(`👨‍💼 Seller ${sellerId} disconnected`);
        break;
      }
    }
    
    for (const [userId, socketId] of connectedBuyers.entries()) {
      if (socketId === socket.id) {
        connectedBuyers.delete(userId);
        console.log(`👤 Buyer ${userId} disconnected`);
        break;
      }
    }

    for (const [agentId, socketId] of connectedDeliveryAgents.entries()) {
      if (socketId === socket.id) {
        connectedDeliveryAgents.delete(agentId);
        console.log(`🚚 Delivery Agent ${agentId} disconnected`);
        break;
      }
    }

    // 🎯 NEW: Clean up admin connections
    for (const [adminId, socketId] of connectedAdmins.entries()) {
      if (socketId === socket.id) {
        connectedAdmins.delete(adminId);
        console.log(`🔧 Admin ${adminId} disconnected`);
        break;
      }
    }
  });
});

// 🎯 ENHANCED: Global notification functions
global.io = io;

global.emitToSeller = (sellerId, event, data) => {
  try {
    if (io && connectedSellers.has(sellerId)) {
      io.to(`seller-${sellerId}`).emit(event, {
        success: true,
        message: event === 'new-order' ? 'You have a new order!' : 'Order status updated',
        data: data,
        timestamp: new Date().toISOString()
      });
      console.log(`📤 Emitted ${event} to seller ${sellerId}`);
    }
  } catch (error) {
    console.error('❌ Error emitting to seller:', error);
  }
};

global.emitToBuyer = (userId, event, data) => {
  try {
    if (io && connectedBuyers.has(userId)) {
      io.to(`buyer-${userId}`).emit(event, {
        success: true,
        message: `Order update: ${data.status || 'Status changed'}`,
        data: data,
        timestamp: new Date().toISOString()
      });
      console.log(`📤 Emitted ${event} to buyer ${userId}`);
    }
  } catch (error) {
    console.error('❌ Error emitting to buyer:', error);
  }
};

// 🎯 NEW: Global delivery agent notification function
global.emitToDeliveryAgent = (agentId, event, data) => {
  try {
    if (io && connectedDeliveryAgents.has(agentId)) {
      io.to(`delivery-${agentId}`).emit(event, {
        success: true,
        message: `Delivery update: ${event}`,
        data: data,
        timestamp: new Date().toISOString()
      });
      console.log(`📤 Emitted ${event} to delivery agent ${agentId}`);
    }
  } catch (error) {
    console.error('❌ Error emitting to delivery agent:', error);
  }
};

// 🎯 NEW: Global admin notification function
global.emitToAdmin = (event, data) => {
  try {
    if (io && connectedAdmins.size > 0) {
      io.to('admin-room').emit(event, {
        success: true,
        message: `Admin notification: ${event}`,
        data: data,
        timestamp: new Date().toISOString()
      });
      console.log(`📤 Emitted ${event} to ${connectedAdmins.size} connected admins`);
    }
  } catch (error) {
    console.error('❌ Error emitting to admin:', error);
  }
};

// 🎯 NEW: Broadcast to all connected users of a type
global.broadcastToSellers = (event, data) => {
  try {
    if (io) {
      io.to('sellers').emit(event, {
        success: true,
        data: data,
        timestamp: new Date().toISOString()
      });
      console.log(`📡 Broadcasted ${event} to all sellers`);
    }
  } catch (error) {
    console.error('❌ Error broadcasting to sellers:', error);
  }
};

// 🎯 PRODUCTION: Enhanced security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disabled for React compatibility
  crossOriginEmbedderPolicy: false
}));

app.set('trust proxy', 1);

// 🎯 PRODUCTION: Enhanced rate limiting with new device support
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'production' ? 1000 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  // 🎯 NEW: Skip rate limiting for health checks and initialization endpoints
  skip: (req) => {
    // Allow health checks and initialization endpoints
    if (req.path === '/api/health' || req.path === '/api/init' || req.path === '/api/device-init') {
      return true;
    }
    return false;
  },
  // 🎯 NEW: Custom key generator to be more lenient for new devices
  keyGenerator: (req) => {
    // Use IP address, but be more lenient for first-time access
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return ip;
  },
  message: {
    error: 'Too many requests from this IP',
    retryAfter: '15 minutes'
  },
  // 🎯 NEW: Custom handler to provide better error messages
  handler: (req, res) => {
    console.warn(`⚠️ [RATE-LIMIT] Blocked request from ${req.ip} to ${req.path}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP',
      message: 'Please wait a few minutes before trying again',
      retryAfter: '15 minutes'
    });
  }
});

app.use('/api/', limiter);

// Special rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Stricter limit for auth
  message: {
    error: 'Too many authentication attempts',
    retryAfter: '15 minutes'
  }
});

app.use('/api/admin/login', authLimiter);
app.use('/api/users/login', authLimiter);
app.use('/api/sellers/login', authLimiter);
app.use('/api/delivery/login', authLimiter);

// ENHANCED: Request logging middleware
app.use((req, res, next) => {
  const logColor = '\x1b[36m'; // Cyan
  const resetColor = '\x1b[0m';
  const timestamp = new Date().toISOString();
  
  console.log(`${logColor}➡️  [${timestamp}] ${req.method} ${req.originalUrl} | Auth: ${req.headers.authorization ? 'YES' : 'NO'} | Origin: ${req.headers.origin || 'N/A'} | IP: ${req.ip}${resetColor}`);
  next();
});

// ADMIN-SPECIFIC REQUEST LOGGING MIDDLEWARE
app.use('/api/admin', (req, res, next) => {
  const timestamp = new Date().toISOString();
  const logColor = '\x1b[35m'; // Magenta for admin requests
  const resetColor = '\x1b[0m';
  
  console.log(`${logColor}🔧 [ADMIN-REQUEST] ${timestamp}${resetColor}`);
  console.log(`${logColor}   Method: ${req.method}${resetColor}`);
  console.log(`${logColor}   URL: ${req.originalUrl}${resetColor}`);
  console.log(`${logColor}   Headers: ${JSON.stringify({
    'Content-Type': req.get('Content-Type'),
    'Authorization': req.get('Authorization') ? 'Bearer ***' : 'None',
    'Origin': req.get('Origin'),
    'User-Agent': req.get('User-Agent')?.substring(0, 50) + '...',
    'X-Forwarded-For': req.get('X-Forwarded-For')
  }, null, 2)}${resetColor}`);
  console.log(`${logColor}   Body: ${JSON.stringify(req.body, null, 2)}${resetColor}`);
  console.log(`${logColor}   Query: ${JSON.stringify(req.query, null, 2)}${resetColor}`);
  console.log(`${logColor}   Params: ${JSON.stringify(req.params, null, 2)}${resetColor}`);
  console.log('🔧' + '═'.repeat(79));
  
  // Log the response when it's sent
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`${logColor}🔧 [ADMIN-RESPONSE] ${timestamp}${resetColor}`);
    console.log(`${logColor}   Status: ${res.statusCode}${resetColor}`);
    console.log(`${logColor}   Response: ${typeof data === 'string' ? data.substring(0, 500) + (data.length > 500 ? '...' : '') : JSON.stringify(data, null, 2)}${resetColor}`);
    console.log('🔧' + '═'.repeat(79));
    originalSend.call(this, data);
  };
  
  next();
});

// ENHANCED: CORS configuration - Flexible for all devices
// 🎯 CRITICAL FIX: More permissive for new devices
const corsOptions = {
  origin: (origin, callback) => {
    // Use flexible origin matching
    if (isOriginAllowed(origin)) {
      // Only log in development to reduce noise
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ [CORS] Allowing origin: ${origin}`);
      }
      callback(null, true);
    } else {
      // 🎯 NEW: In production, be more lenient - log but don't block if it's a close match
      const isCloseMatch = origin && (
        origin.includes('zammer') || 
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      );
      
      if (isCloseMatch && process.env.NODE_ENV === 'production') {
        console.warn(`⚠️ [CORS] Close match origin (allowing): ${origin}`);
        callback(null, true);
      } else {
        console.warn(`🚫 [CORS] Blocked origin: ${origin}`);
        if (process.env.NODE_ENV === 'development') {
          console.log(`📋 [CORS] Allowed origins (${getAllowedOrigins().length} total):`, getAllowedOrigins().slice(0, 10).join(', '), getAllowedOrigins().length > 10 ? '...' : '');
        }
        callback(null, false);
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Device-ID'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Device-Status'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  // 🎯 NEW: Increase max age for preflight caching (helps new devices)
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// 🎯 ENHANCED: Explicit OPTIONS handler for all routes to ensure preflight requests are handled
// 🎯 CRITICAL FIX: Better handling for new devices
app.options('*', (req, res) => {
  const logColor = '\x1b[35m'; // Magenta
  const resetColor = '\x1b[0m';
  const origin = req.headers.origin;
  
  // Only log in development to reduce noise
  if (process.env.NODE_ENV === 'development') {
    console.log(`${logColor}🛫 [CORS-PREFLIGHT] ${req.method} ${req.originalUrl}${resetColor}`);
    console.log(`${logColor}   Origin: ${origin || 'N/A'}${resetColor}`);
    console.log(`${logColor}   Request Headers: ${req.headers['access-control-request-headers'] || 'N/A'}${resetColor}`);
  }
  
  // 🎯 NEW: Always set CORS headers for OPTIONS requests (more permissive)
  // This ensures new devices can complete preflight checks
  const shouldAllow = isOriginAllowed(origin);
  
  if (shouldAllow && origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Allow requests with no origin (new devices, mobile apps)
    res.header('Access-Control-Allow-Origin', '*');
  } else {
    // For blocked origins, still set headers but log warning
    res.header('Access-Control-Allow-Origin', origin);
    if (process.env.NODE_ENV === 'development') {
      console.log(`${logColor}   ⚠️ Preflight allowed with warning${resetColor}`);
    }
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Device-ID');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`${logColor}   ✅ Preflight headers set${resetColor}`);
  }
  
  res.status(204).end();
});

// Parse JSON body requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🎯 Create public directory for uploads
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log(`📁 Created public directory: ${publicDir}`);
}
app.use('/public', express.static(publicDir));

// Connect to database
try {
  connectDB();
  console.log('📦 Database connection initiated');
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
}

// 🎯 ENHANCED: Health check endpoint
app.get('/api/health', (req, res) => {
  const healthData = {
    status: 'ok',
    message: 'ZAMMER API is running',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    configuration: {
      frontendUrl: FRONTEND_URL,
      corsOrigins: getAllowedOrigins().length,
      port: PORT
    },
    socketConnections: {
      sellers: connectedSellers.size,
      buyers: connectedBuyers.size,
      deliveryAgents: connectedDeliveryAgents.size,
      total: connectedSellers.size + connectedBuyers.size + connectedDeliveryAgents.size
    },
    services: {
      database: 'connected',
      realtime: 'active',
      api: 'operational',
      cors: 'configured'
    },
    memoryUsage: process.memoryUsage()
  };
  
  res.status(200).json(healthData);
});

// 🎯 NEW: Device initialization endpoint for first-time access
// This helps new devices establish connection and verify CORS
app.get('/api/device-init', (req, res) => {
  const clientInfo = {
    ip: req.ip || req.connection.remoteAddress,
    origin: req.headers.origin || 'no-origin',
    userAgent: req.headers['user-agent'] || 'unknown',
    timestamp: new Date().toISOString()
  };
  
  console.log(`📱 [DEVICE-INIT] New device initialization:`, {
    ip: clientInfo.ip,
    origin: clientInfo.origin,
    userAgent: clientInfo.userAgent.substring(0, 50)
  });
  
  res.status(200).json({
    success: true,
    message: 'Device initialized successfully',
    data: {
      apiVersion: '1.0.0',
      environment: NODE_ENV,
      frontendUrl: FRONTEND_URL,
      corsEnabled: true,
      timestamp: clientInfo.timestamp,
      clientInfo: {
        ip: clientInfo.ip,
        origin: clientInfo.origin
      },
      endpoints: {
        health: '/api/health',
        userSignup: '/api/users/send-signup-otp',
        userLogin: '/api/users/login',
        products: '/api/products/marketplace',
        shops: '/api/shops'
      },
      instructions: {
        message: 'Welcome to ZAMMER API',
        note: 'All public endpoints are accessible. Authentication required for protected routes.',
        tokenStorage: 'Store authentication tokens in localStorage or sessionStorage'
      }
    }
  });
});

// 🎯 NEW: Enhanced initialization endpoint with CORS verification
app.post('/api/device-init', (req, res) => {
  const { deviceId, deviceInfo } = req.body;
  
  const clientInfo = {
    ip: req.ip || req.connection.remoteAddress,
    origin: req.headers.origin || 'no-origin',
    userAgent: req.headers['user-agent'] || 'unknown',
    deviceId: deviceId || 'not-provided',
    timestamp: new Date().toISOString()
  };
  
  console.log(`📱 [DEVICE-INIT-POST] Device registration:`, {
    ip: clientInfo.ip,
    origin: clientInfo.origin,
    deviceId: clientInfo.deviceId,
    deviceInfo: deviceInfo ? Object.keys(deviceInfo) : []
  });
  
  // Verify CORS is working
  const corsWorking = isOriginAllowed(req.headers.origin);
  
  res.status(200).json({
    success: true,
    message: 'Device registered successfully',
    data: {
      deviceId: deviceId || `device_${Date.now()}`,
      corsStatus: corsWorking ? 'enabled' : 'check-required',
      timestamp: clientInfo.timestamp,
      configuration: {
        frontendUrl: FRONTEND_URL,
        apiVersion: '1.0.0',
        environment: NODE_ENV
      },
      recommendations: {
        localStorage: 'Use localStorage for token storage if available',
        fallback: 'Use sessionStorage or memory storage if localStorage is blocked',
        cors: corsWorking ? 'CORS is properly configured' : 'CORS may need configuration'
      }
    }
  });
});

// 🎯 NEW: Configuration debug endpoint (development only)
if (NODE_ENV === 'development') {
  app.get('/api/debug/config', (req, res) => {
    res.status(200).json({
      environment: NODE_ENV,
      frontendUrl: FRONTEND_URL,
      allowedOrigins: getAllowedOrigins(),
      environmentVariables: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        FRONTEND_URL_PROD: process.env.FRONTEND_URL_PROD,
        FRONTEND_URL: process.env.FRONTEND_URL,
        FRONTEND_URL_LOCAL: process.env.FRONTEND_URL_LOCAL,
        PUBLIC_URL: process.env.PUBLIC_URL,
        ADDITIONAL_ALLOWED_ORIGINS: process.env.ADDITIONAL_ALLOWED_ORIGINS
      },
      socketConnections: {
        sellers: Array.from(connectedSellers.keys()),
        buyers: Array.from(connectedBuyers.keys()),
        deliveryAgents: Array.from(connectedDeliveryAgents.keys())
      }
    });
  });
}

// 🎯 NEW: Device detection middleware (must be early in the chain)
app.use(detectNewDevice);

// 🎯 COMPREHENSIVE LOGGING MIDDLEWARE - Apply to all routes
app.use(globalRequestLogger);
app.use(securityLogger);
app.use(performanceLogger);

// Apply specialized logging middleware to specific route groups
app.use('/api/admin', adminOperationLogger);
app.use('/api/delivery', deliveryOperationLogger);
app.use('/api/users', userOperationLogger);
app.use('/api/payments', paymentOperationLogger);
app.use('/api/orders', orderOperationLogger);

// Mount API routes
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/virtual-tryon', virtualTryOnRoutes);
app.use('/api/admin/logs', logRoutes);
app.use('/api/returns', returnRoutes);
// 🎯 IMPORTANT: Mount more specific routes FIRST to avoid path conflicts
app.use('/api/support/upload', supportUploadRoutes);  // More specific - must come first
app.use('/api/support', supportRoutes);               // General support routes
app.use('/api/admin/support', adminSupportRoutes);
app.use('/api/catalogues', catalogueRoutes);          // Catalogue bulk upload routes
app.use('/api/banners', bannerRoutes);               // Banner management routes
app.use('/api/promo-banners', promoBannerRoutes);   // Promo banner management routes
app.use('/api/level4-batch', level4BatchSeedRoutes); // Level 4 batch seeding routes
app.use('/api/brand-products', brandProductSeedRoutes); // Brand product seeding routes

// ─────────────────────────────────────────────
// UNIVERSAL: Serve React static assets from multiple possible paths
// ─────────────────────────────────────────────
const possiblePaths = [
  path.join(__dirname, 'public'),  // Primary: copied to backend/public
  path.join(__dirname, '..', 'frontend', 'build'),  // Alternative: ../frontend/build
  path.join(__dirname, 'build'),  // Alternative: ./build
  path.join(__dirname, 'dist'),   // Alternative: ./dist
];

let frontendBuildPath = null;
let indexPath = null;

// Find the correct frontend build path
for (const buildPath of possiblePaths) {
  console.log(`🔍 Checking frontend build path: ${buildPath}`);
  
  if (fs.existsSync(buildPath)) {
    const testIndexPath = path.join(buildPath, 'index.html');
    
    if (fs.existsSync(testIndexPath)) {
      frontendBuildPath = buildPath;
      indexPath = testIndexPath;
      console.log(`✅ Frontend build found at: ${frontendBuildPath}`);
      
      // List contents for debugging
      try {
        const contents = fs.readdirSync(buildPath);
        console.log(`📂 Build directory contents: ${contents.join(', ')}`);
      
        // Check static folder structure
        const staticPath = path.join(buildPath, 'static');
        if (fs.existsSync(staticPath)) {
          const staticContents = fs.readdirSync(staticPath);
          console.log(`📂 Static directory contents: ${staticContents.join(', ')}`);
          
          // Check JS and CSS folders
          const jsPath = path.join(staticPath, 'js');
          const cssPath = path.join(staticPath, 'css');
          
          if (fs.existsSync(jsPath)) {
            const jsFiles = fs.readdirSync(jsPath);
            console.log(`📂 JS files: ${jsFiles.join(', ')}`);
          }
          
          if (fs.existsSync(cssPath)) {
            const cssFiles = fs.readdirSync(cssPath);
            console.log(`📂 CSS files: ${cssFiles.join(', ')}`);
          }
        }
      } catch (err) {
        console.log('📂 Could not list build directory contents');
      }
      
      break;
    }
  }
}

if (frontendBuildPath && indexPath) {
  console.log('✅ Frontend build directory found');
  console.log('✅ index.html found');
  
  // ENHANCED: Serve static files with improved configuration
  app.use(express.static(frontendBuildPath, {
    maxAge: NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true,
    index: false, // CRITICAL: Don't serve index.html for directory requests
    dotfiles: 'ignore',
    setHeaders: (res, filePath, stat) => {
      const ext = path.extname(filePath).toLowerCase();
      
      // Set proper MIME types and caching
      if (ext === '.js') {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', NODE_ENV === 'production' ? 'public, max-age=31536000' : 'no-cache');
      } else if (ext === '.css') {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        res.setHeader('Cache-Control', NODE_ENV === 'production' ? 'public, max-age=31536000' : 'no-cache');
      } else if (ext === '.html') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'].includes(ext)) {
        res.setHeader('Cache-Control', NODE_ENV === 'production' ? 'public, max-age=86400' : 'no-cache');
      }
      
      // Log static file serving for debugging (only in development)
      if (NODE_ENV === 'development') {
        console.log(`📁 Serving static file: ${path.basename(filePath)}`);
      }
    }
  }));
  
  // ENHANCED: Handle React Router routes (SPA fallback) - MUST be AFTER static files
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ 
        error: 'API endpoint not found',
        path: req.path,
        method: req.method,
        availableEndpoints: [
          '/api/health',
          '/api/users',
          '/api/sellers',
          '/api/admin',
          '/api/delivery',
          '/api/orders',
          '/api/products'
        ]
      });
    }
    
    // Don't serve index.html for static file requests that failed
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/)) {
      console.log(`❌ Static file not found: ${req.path}`);
      return res.status(404).send(`Static file not found: ${req.path}`);
    }
    
    console.log(`📄 Serving index.html for route: ${req.path}`);
    
    // Send the React app
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(`❌ Error serving index.html for ${req.path}:`, err);
        res.status(500).json({ 
          error: 'Failed to serve frontend',
          path: req.path 
        });
      }
    });
  });
  
} else {
  console.error(`❌ Frontend build not found in any of these locations:`);
  possiblePaths.forEach(p => console.error(`   - ${p}`));
  
  // Fallback for missing build
  app.get('/', (req, res) => {
    res.status(200).json({
      message: 'ZAMMER Marketplace API',
      version: '1.0.0',
      environment: NODE_ENV,
      status: 'operational',
      note: 'Frontend build not found',
      checkedPaths: possiblePaths,
      solution: 'Please run: npm run build and ensure build files are present',
      endpoints: {
        health: '/api/health',
        admin: '/api/admin',
        users: '/api/users',
        sellers: '/api/sellers'
      }
    });
  });
  
  // Catch-all for missing frontend
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.status(404).json({
        error: 'Frontend not available',
        path: req.path,
        message: 'Frontend build files not found on server',
        solution: 'Please build and deploy frontend files'
      });
    }
  });
}

// Enhanced error handling middleware
// Apply comprehensive error logging before default error handler
app.use(errorLogger);
// 🎯 NEW: New device error handler (before default error handler)
app.use(newDeviceErrorHandler);
app.use(errorHandler);

// 🎯 PRODUCTION: Enhanced graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n📴 Received ${signal}. Starting graceful shutdown...`);
  
  // Close server first
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ HTTP server closed');
    
    // Close socket.io
    if (io) {
      io.close(() => {
        console.log('✅ Socket.IO server closed');
      });
    }
    
    // Close database connections
    // Add your database cleanup here if needed
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.log('⚠️ Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = { app, server, io };