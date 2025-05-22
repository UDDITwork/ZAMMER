require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const path = require('path');
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

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Enhanced CORS configuration with more options
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

// Log request body in development mode
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Request Body:', req.body);
    }
    next();
  });
}

// Request logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Connect to database with enhanced error handling
try {
  connectDB();
  console.log('📦 Database connection established');
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Routes - FIXED: Removed validateRoutePath function
app.use('/api/products', productRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/cart', cartRoutes);

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  console.log(`Route not found: ${req.originalUrl}`);
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
});

// Error handler
app.use(errorHandler);

// Catch-all error handler for unexpected errors
app.use((err, req, res, next) => {
  console.error('Unexpected error:', err);
  res.status(500).json({ message: 'An unexpected error occurred.' });
});

module.exports = app;