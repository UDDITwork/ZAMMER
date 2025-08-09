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

// Initialize app
const app = express();

// 🎯 UNIVERSAL: Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5001;

// 🎯 UNIVERSAL: Dynamic Frontend URL - Environment Variable Based
const getFrontendUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // Try production-specific variables first, then fallback
    return process.env.FRONTEND_URL_PROD || 
           process.env.FRONTEND_URL || 
           process.env.PUBLIC_URL ||
           'http://localhost:3000';
  }
  
  // Development environment
  return process.env.FRONTEND_URL_LOCAL || 
         process.env.FRONTEND_URL || 
         process.env.PUBLIC_URL ||
         'http://localhost:3000';
};

const FRONTEND_URL = getFrontendUrl();

// 🎯 UNIVERSAL: Define allowed origins - Environment Variable Based
const getAllowedOrigins = () => {
  const origins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://localhost:3000'
  ];
  
  // Add production frontend URL from environment variables
  if (process.env.NODE_ENV === 'production') {
    const prodUrl = process.env.FRONTEND_URL_PROD || process.env.FRONTEND_URL;
    if (prodUrl && !prodUrl.includes('localhost')) {
      origins.push(prodUrl);
    }
  }
  
  // Add any additional origins from environment variables
  if (process.env.ADDITIONAL_ALLOWED_ORIGINS) {
    const additionalOrigins = process.env.ADDITIONAL_ALLOWED_ORIGINS.split(',');
    origins.push(...additionalOrigins.map(url => url.trim()));
  }
  
  // Add CDN and service domains
  origins.push(
    'https://res.cloudinary.com',
    'https://cloudinary.com'
  );
  
  // Add environment-specific domains
  if (process.env.CDN_DOMAINS) {
    const cdnDomains = process.env.CDN_DOMAINS.split(',');
    origins.push(...cdnDomains.map(domain => domain.trim()));
  }
  
  return origins;
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

// 🎯 PRODUCTION: Enhanced rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'production' ? 1000 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP',
    retryAfter: '15 minutes'
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

// ENHANCED: CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked origin: ${origin}`);
      callback(null, false);  // ✅ CHANGE: Return false instead of error
    }
  },
  credentials: true,  // ✅ CHANGE FROM false TO true
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,  // ✅ CHANGE FROM true TO false
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Log CORS preflight requests
app.options('*', (req, res, next) => {
  const logColor = '\x1b[35m'; // Magenta
  const resetColor = '\x1b[0m';
  console.log(`${logColor}🛫 [CORS-PREFLIGHT] ${req.method} ${req.originalUrl} | Origin: ${req.headers.origin || 'N/A'} | Headers: ${req.headers['access-control-request-headers']}${resetColor}`);
  next();
}, cors(corsOptions));

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
app.use('/api/payment', paymentRoutes);

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