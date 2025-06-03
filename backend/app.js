require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { errorHandler } = require('./middleware/errorMiddleware');

// Routes imports
const orderRoutes=require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const userRoutes = require('./routes/userRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const cartRoutes = require('./routes/cartRoutes');

// Initialize app
const app = express();

// 🎯 Create HTTP server for Socket.io
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://zammer-frontend.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  }
});

// 🎯 ENHANCED: Socket.io setup for real-time notifications (Sellers + Buyers)
const connectedSellers = new Map(); // Store seller socket connections
const connectedBuyers = new Map();  // 🎯 NEW: Store buyer socket connections

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // 🎯 SELLER FUNCTIONALITY
  // Seller joins their room for notifications
  socket.on('seller-join', (sellerId) => {
    console.log(`👨‍💼 Seller ${sellerId} joined room`);
    socket.join(`seller-${sellerId}`);
    connectedSellers.set(sellerId, socket.id);
    
    // Send confirmation to seller
    socket.emit('seller-joined', {
      success: true,
      message: 'Connected to order notifications',
      sellerId,
      timestamp: new Date().toISOString()
    });
  });

  // 🎯 NEW: BUYER FUNCTIONALITY
  // Buyer joins their room for order status notifications
  socket.on('buyer-join', (userId) => {
    console.log(`👤 Buyer ${userId} joined room`);
    socket.join(`buyer-${userId}`);
    connectedBuyers.set(userId, socket.id);
    
    // Send confirmation to buyer
    socket.emit('buyer-joined', {
      success: true,
      message: 'Connected to order status updates',
      userId,
      timestamp: new Date().toISOString()
    });
    
    console.log(`
🎉 ===============================
   BUYER CONNECTED TO REAL-TIME!
===============================
👤 Buyer ID: ${userId}
📡 Socket ID: ${socket.id}
🔔 Room: buyer-${userId}
📅 Time: ${new Date().toLocaleString()}
===============================`);
  });

  // 🎯 TESTING ENDPOINTS
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
    
    // Remove seller from connected sellers map
    for (const [sellerId, socketId] of connectedSellers.entries()) {
      if (socketId === socket.id) {
        connectedSellers.delete(sellerId);
        console.log(`👨‍💼 Seller ${sellerId} disconnected`);
        break;
      }
    }
    
    // 🎯 NEW: Remove buyer from connected buyers map
    for (const [userId, socketId] of connectedBuyers.entries()) {
      if (socketId === socket.id) {
        connectedBuyers.delete(userId);
        console.log(`👤 Buyer ${userId} disconnected`);
        break;
      }
    }
  });

  // Handle ping for connection testing
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });
});

// 🎯 ENHANCED: Global notification functions
global.io = io;

// Function to emit notification to seller
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
    } else {
      console.warn('⚠️ Socket.io not available for seller notifications');
    }
  } catch (error) {
    console.error('❌ Error emitting to seller:', error);
  }
};

// 🎯 NEW: Function to emit notification to buyer
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
      
      // Enhanced success logging for buyer notifications
      console.log(`
🔔 ===============================
   BUYER NOTIFICATION SENT!
===============================
👤 Buyer ID: ${userId}
📋 Event: ${event}
📦 Order: ${data.orderNumber || data._id}
📅 Time: ${new Date().toLocaleString()}
📡 Room: buyer-${userId}
===============================`);
    } else {
      console.warn('⚠️ Socket.io not available for buyer notifications');
    }
  } catch (error) {
    console.error('❌ Error emitting to buyer:', error);
  }
};

// Helper function to get appropriate notification message
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

// 🎯 FIXED: Create uploads directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(publicDir, 'uploads');

// Ensure directories exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('📁 Created public directory:', publicDir);
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
}

// 🎯 CRITICAL: Serve static files BEFORE other middleware
app.use('/uploads', express.static(uploadsDir, {
  // Add headers for better caching and CORS
  setHeaders: (res, path, stat) => {
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
  }
}));

app.use(express.static(publicDir));

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://zammer-frontend.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Pre-flight OPTIONS requests
app.options('*', cors());

// Parse JSON body requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🎯 IMPROVED: Request logger with better formatting
  app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.originalUrl}`);
  
  // Log body for POST/PUT requests in development
  if (process.env.NODE_ENV === 'development' && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (req.body && Object.keys(req.body).length > 0) {
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    socketConnections: {
      sellers: connectedSellers.size,
      buyers: connectedBuyers.size,
      total: connectedSellers.size + connectedBuyers.size
    }
  });
});

// 🎯 ENHANCED: Mock image handler with better error handling
app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  
  console.log(`🖼️ Image request: ${filename}`);
  console.log(`🔍 Looking for file at: ${filePath}`);
  
  // Check if actual file exists
  if (fs.existsSync(filePath)) {
    console.log('✅ File found, serving actual file');
    return res.sendFile(filePath);
  }
  
  // 🎯 IMPROVED: Generate placeholder for mock/product images
  if (filename.includes('mock-product') || filename.includes('product-')) {
    console.log('🎨 Generating placeholder image for:', filename);
    
    // Create a better placeholder SVG
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
          Product Image
        </text>
        <text x="150" y="240" text-anchor="middle" fill="#9a3412" font-family="Arial, sans-serif" font-size="10">
          ${filename.substring(0, 20)}${filename.length > 20 ? '...' : ''}
        </text>
        <text x="150" y="260" text-anchor="middle" fill="#9a3412" font-family="Arial, sans-serif" font-size="10">
          Placeholder
        </text>
      </svg>
    `;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    return res.send(placeholderSVG);
  }
  
  // 🎯 ADDED: Return 404 for non-product images
  console.log('❌ File not found and not a product image:', filename);
  res.status(404).json({ 
    error: 'Image not found',
    filename: filename,
    message: 'The requested image does not exist'
  });
});

// 🎯 NEW: Endpoint to check uploads directory
app.get('/api/uploads/status', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    res.json({
      success: true,
      uploadsDir: uploadsDir,
      filesCount: files.length,
      files: files.slice(0, 10), // Show first 10 files
      message: files.length > 10 ? `Showing first 10 of ${files.length} files` : 'All files shown'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      uploadsDir: uploadsDir
    });
  }
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/cart', cartRoutes);
// npm install express-async-handler
// 🎯 IMPROVED: Better 404 handler with detailed logging
app.use((req, res, next) => {
  console.log(`⚠️ Route not found: ${req.method} ${req.originalUrl}`);
  
  // Check if it's an uploads request
  if (req.originalUrl.startsWith('/uploads/')) {
    console.log('🔍 This is an uploads request - check image serving logic');
  }
  
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
});

// 🎯 ENHANCED: Error handler with better logging
app.use((err, req, res, next) => {
  console.error('💥 Error Handler Triggered:');
  console.error('📍 URL:', req.originalUrl);
  console.error('🔧 Method:', req.method);
  console.error('❌ Error:', err.message);
  
  // Don't log stack trace for 404 errors
  if (err.status !== 404) {
    console.error('📋 Stack:', err.stack);
  }
  
  const statusCode = err.status || 500;
  
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      url: req.originalUrl,
      method: req.method
    })
  });
});

// 🎯 ADDED: Graceful shutdown handling
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

// 🎯 ADDED: Unhandled rejection handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// 🎯 NEW: Export both app and server for socket.io usage
module.exports = { app, server, io };