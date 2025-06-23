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

// Initialize app
const app = express();

// 🎯 FIXED: Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 8080; // FIXED: Use 8080 for production to match app.yaml

// 🎯 DYNAMIC: Set Frontend URL based on environment
const FRONTEND_URL = NODE_ENV === 'production' 
  ? 'https://onyx-osprey-462815-i9.appspot.com'
  : 'http://localhost:3000';

// 🎯 PRODUCTION: Define allowed origins for CORS
const getAllowedOrigins = () => {
  const origins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://localhost:3000',
    'https://onyx-osprey-462815-i9.appspot.com',
    'https://onyx-osprey-462815-i9.uc.r.appspot.com'
  ];
  
  // 🎯 Cloudinary domains
  origins.push(
    'https://res.cloudinary.com',
    'https://cloudinary.com'
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
    credentials: false,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// 🎯 ENHANCED: Socket.io setup for real-time notifications
const connectedSellers = new Map();
const connectedBuyers = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

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

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
    
    for (const [sellerId, socketId] of connectedSellers.entries()) {
      if (socketId === socket.id) {
        connectedSellers.delete(sellerId);
        break;
      }
    }
    
    for (const [userId, socketId] of connectedBuyers.entries()) {
      if (socketId === socket.id) {
        connectedBuyers.delete(userId);
        break;
      }
    }
  });
});

// 🎯 Global notification functions
global.io = io;

global.emitToSeller = (sellerId, event, data) => {
  try {
    if (io) {
      io.to(`seller-${sellerId}`).emit(event, {
        success: true,
        message: event === 'new-order' ? 'You have a new order!' : 'Order status updated',
        data: data,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error emitting to seller:', error);
  }
};

global.emitToBuyer = (userId, event, data) => {
  try {
    if (io) {
      io.to(`buyer-${userId}`).emit(event, {
        success: true,
        message: `Order update: ${data.status}`,
        data: data,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error emitting to buyer:', error);
  }
};

// 🎯 PRODUCTION: Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

app.set('trust proxy', 1);

// 🎯 PRODUCTION: Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: NODE_ENV === 'production' ? 1000 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// 🎯 PRODUCTION: Enhanced CORS configuration
const corsOptions = {
  origin: getAllowedOrigins(),
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Parse JSON body requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🎯 Create public directory for uploads
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
app.use('/public', express.static(publicDir));

// Connect to database
try {
  connectDB();
  console.log('📦 Database connection initiated');
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
}

// 🎯 Health check endpoint
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

// ─────────────────────────────────────────────
// FIXED: Serve React static assets from frontend/build
// ─────────────────────────────────────────────
const possiblePaths = [
  path.join(__dirname, 'public'),  // Primary: copied to backend/public
  path.join(__dirname, '..', 'frontend', 'build'),  // Alternative: ../frontend/build
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
  
  // FIXED: Serve static files FIRST with correct configuration
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
      
      // Log static file serving for debugging
      console.log(`📁 Serving static file: ${req.path} -> ${filePath}`);
    }
  }));
  
  // FIXED: Handle React Router routes (SPA fallback) - MUST be AFTER static files
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ 
        error: 'API endpoint not found',
        path: req.path,
        method: req.method 
      });
    }
    
    // FIXED: Don't serve index.html for static file requests that failed
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
      solution: 'Please run: npm run build:frontend:prod and redeploy'
    });
  });
  
  // Catch-all for missing frontend
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.status(404).json({
        error: 'Frontend not available',
        path: req.path,
        message: 'Frontend build files not found on server'
      });
    }
  });
}

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n📴 Received SIGINT. Graceful shutdown...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n📴 Received SIGTERM. Graceful shutdown...');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = { app, server, io };