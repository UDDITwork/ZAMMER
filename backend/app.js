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

// Initialize app
const app = express();

// 🎯 PRODUCTION: Get environment variables
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// 🎯 PRODUCTION: Define allowed origins for CORS
const getAllowedOrigins = () => {
  const origins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://localhost:3000'
  ];
  
  // Add production URLs
  if (FRONTEND_URL) {
    origins.push(FRONTEND_URL);
  }
  
  // Add Amplify app domains (update these with your actual Amplify URLs)
  origins.push(
    /https:\/\/.*\.amplifyapp\.com$/,
    /https:\/\/.*\.cloudfront\.net$/,
    // Add your custom domain here if you have one
    // 'https://your-custom-domain.com'
  );
  
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
===============================`);

// 🎯 Create HTTP server for Socket.io
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// 🎯 ENHANCED: Socket.io setup for real-time notifications (Sellers + Buyers)
const connectedSellers = new Map();
const connectedBuyers = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // 🎯 SELLER FUNCTIONALITY
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

  // 🎯 BUYER FUNCTIONALITY
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
    
    console.log(`✅ Buyer ${userId} connected to real-time updates`);
  });

  // Testing endpoints
  socket.on('test-new-order', (data) => {
    console.log('📦 Test order received:', data);
    socket.emit('new-order', data);
  });

  socket.on('test-order-update', (data) => {
    console.log('🔄 Test order update received:', data);
    socket.emit('order-status-update', data);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
    
    // Remove from maps
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
  });

  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });
});

// 🎯 Global notification functions
global.io = io;

global.emitToSeller = (sellerId, event, data) => {
  try {
    console.log(`📡 Emitting ${event} to seller: ${sellerId}`);
    
    if (io) {
      io.to(`seller-${sellerId}`).emit(event, {
        success: true,
        message: event === 'new-order' ? 'You have a new order!' : 'Order status updated',
        data: data,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Notification sent to seller-${sellerId}`);
    }
  } catch (error) {
    console.error('❌ Error emitting to seller:', error);
  }
};

global.emitToBuyer = (userId, event, data) => {
  try {
    console.log(`📡 Emitting ${event} to buyer: ${userId}`);
    
    if (io) {
      io.to(`buyer-${userId}`).emit(event, {
        success: true,
        message: getNotificationMessage(event, data),
        data: data,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Notification sent to buyer-${userId}`);
    }
  } catch (error) {
    console.error('❌ Error emitting to buyer:', error);
  }
};

const getNotificationMessage = (event, data) => {
  switch (event) {
    case 'order-status-update':
      return `Your order ${data.orderNumber} is now ${data.status}`;
    case 'order-shipped':
      return `Your order ${data.orderNumber} has been shipped!`;
    case 'order-delivered':
      return `Your order ${data.orderNumber} has been delivered!`;
    case 'invoice-ready':
      return `Invoice ready for order ${data.orderNumber}`;
    default:
      return 'Order update received';
  }
};

// 🎯 PRODUCTION: Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...getAllowedOrigins()],
    },
  },
}));

// 🎯 PRODUCTION: Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'production' ? 100 : 1000, // More restrictive in production
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// 🎯 Create uploads directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(publicDir, 'uploads');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('📁 Created public directory:', publicDir);
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
}

// 🎯 Serve static files
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, path, stat) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
  }
}));

app.use(express.static(publicDir));

// 🎯 PRODUCTION: Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['set-cookie']
};

app.use(cors(corsOptions));

// Pre-flight OPTIONS requests
app.options('*', cors(corsOptions));

// Parse JSON body requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🎯 Request logger (simplified for production)
app.use((req, res, next) => {
  if (NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.originalUrl}`);
    
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      console.log('📦 Request Body Keys:', Object.keys(req.body));
    }
  }
  next();
});

// Connect to database
try {
  connectDB();
  console.log('📦 Database connection initiated');
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
}

// 🎯 PRODUCTION: Enhanced health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'ZAMMER API is running',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    socketConnections: {
      sellers: connectedSellers.size,
      buyers: connectedBuyers.size,
      total: connectedSellers.size + connectedBuyers.size
    },
    services: {
      database: 'connected',
      realtime: 'active',
      api: 'operational'
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ZAMMER Marketplace API',
    version: '1.0.0',
    environment: NODE_ENV,
    documentation: '/api/health',
    status: 'operational'
  });
});

// Enhanced image handler
app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  
  if (NODE_ENV === 'development') {
    console.log(`🖼️ Image request: ${filename}`);
  }
  
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  
  // Generate placeholder for mock/product images
  if (filename.includes('mock-product') || filename.includes('product-')) {
    const placeholderSVG = `
      <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f97316;stop-opacity:0.1" />
            <stop offset="100%" style="stop-color:#f97316;stop-opacity:0.3" />
          </linearGradient>
        </defs>
        <rect width="300" height="300" fill="url(#grad1)" stroke="#f97316" stroke-width="2"/>
        <circle cx="150" cy="120" r="30" fill="#f97316" opacity="0.3"/>
        <rect x="120" y="160" width="60" height="40" fill="#f97316" opacity="0.3" rx="5"/>
        <text x="150" y="220" text-anchor="middle" fill="#ea580c" font-family="Arial, sans-serif" font-size="14" font-weight="bold">
          ZAMMER Product
        </text>
        <text x="150" y="240" text-anchor="middle" fill="#9a3412" font-family="Arial, sans-serif" font-size="10">
          ${filename.substring(0, 20)}${filename.length > 20 ? '...' : ''}
        </text>
      </svg>
    `;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(placeholderSVG);
  }
  
  res.status(404).json({
    error: 'Image not found',
    filename: filename,
    message: 'The requested image does not exist'
  });
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/cart', cartRoutes);

// 404 handler
app.use((req, res, next) => {
  if (NODE_ENV === 'development') {
    console.log(`⚠️ Route not found: ${req.method} ${req.originalUrl}`);
  }
  
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
});

// Error handler
app.use((err, req, res, next) => {
  if (NODE_ENV === 'development') {
    console.error('💥 Error Handler Triggered:');
    console.error('📍 URL:', req.originalUrl);
    console.error('🔧 Method:', req.method);
    console.error('❌ Error:', err.message);
    
    if (err.status !== 404) {
      console.error('📋 Stack:', err.stack);
    }
  }
  
  const statusCode = err.status || 500;
  
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(NODE_ENV === 'development' && {
      stack: err.stack,
      url: req.originalUrl,
      method: req.method
    })
  });
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n📴 Received SIGINT. Graceful shutdown...');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n📴 Received SIGTERM. Graceful shutdown...');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

module.exports = { app, server, io };