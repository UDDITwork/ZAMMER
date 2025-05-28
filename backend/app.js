require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { errorHandler } = require('./middleware/errorMiddleware');

// Routes imports
const productRoutes = require('./routes/productRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const userRoutes = require('./routes/userRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const cartRoutes = require('./routes/cartRoutes');

// Initialize app
const app = express();

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
    uptime: process.uptime()
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
app.use('/api/sellers', sellerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/cart', cartRoutes);

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
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n📴 Received SIGTERM. Graceful shutdown...');
  process.exit(0);
});

// 🎯 ADDED: Unhandled rejection handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;