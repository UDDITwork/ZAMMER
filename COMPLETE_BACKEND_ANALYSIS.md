# ZAMMER MARKETPLACE - COMPLETE BACKEND STRUCTURE AND CODE ANALYSIS

## PROJECT OVERVIEW
- **Project Name**: ZAMMER Marketplace Backend
- **Version**: 1.0.0
- **Architecture**: Node.js + Express.js + MongoDB + Socket.IO
- **Real-time Features**: WebSocket-based notifications
- **Authentication**: JWT-based multi-role authentication
- **Deployment**: Google App Engine Ready

## BACKEND ROOT STRUCTURE
```
backend/
├── package.json                    # Backend dependencies and scripts
├── server.js                      # Main server entry point
├── app.js                         # Express app configuration
├── config/                        # Configuration files
├── models/                        # MongoDB/Mongoose models
├── controllers/                   # Business logic controllers
├── routes/                        # API route definitions
├── middleware/                    # Custom middleware
├── utils/                         # Utility functions
└── public/                        # Static file serving
```

## MAIN APPLICATION FILES

### 1. package.json - Dependencies & Scripts
```json
{
  "name": "zammer-backend",
  "version": "1.0.0",
  "description": "ZAMMER Marketplace Backend API with Real-time Features",
  "main": "server.js",
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=8.0.0"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "npm install --production && npm run copy-frontend",
    "copy-frontend": "if [ -d \"../frontend/build\" ]; then cp -r ../frontend/build/* ./public/; fi"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "bcryptjs": "^3.0.2",
    "cloudinary": "^1.41.3",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "express": "^4.18.2",
    "express-async-handler": "^1.2.0",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.2.1",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "mongodb": "^6.16.0",
    "mongoose": "^8.15.0",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.2",
    "pdfkit": "^0.17.1",
    "socket.io": "^4.8.1",
    "socket.io-client": "^4.8.1"
  }
}
```

### 2. server.js - Main Server Entry Point
**Key Features:**
- **Environment Configuration**: Automatic detection of production/development
- **Dynamic Frontend URL**: Environment-based frontend URL configuration
- **Socket.IO Setup**: Real-time WebSocket communication
- **CORS Configuration**: Advanced CORS with multiple origin support
- **Enhanced Error Handling**: Graceful shutdown and error recovery
- **Production Monitoring**: Memory usage tracking and performance monitoring

**Main Functionality:**
```javascript
// Environment variables and dynamic URL configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = Number(process.env.PORT) || 5001;

// Dynamic frontend URL based on environment
const getFrontendUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.FRONTEND_URL_PROD || 'https://zammer2.uc.r.appspot.com';
  }
  return process.env.FRONTEND_URL_LOCAL || 'http://localhost:3000';
};

// Socket.IO configuration with enhanced CORS
const io = socketIo(httpServer, {
  cors: {
    origin: getAllowedOrigins(),
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  }
});
```

### 3. app.js - Express Application Configuration
**Key Features:**
- **Multi-Role Authentication**: Support for users, sellers, admins, delivery agents
- **Real-time Notifications**: Socket.IO integration for live updates
- **Advanced Security**: Helmet, rate limiting, CORS protection
- **Request Logging**: Comprehensive logging for monitoring
- **Static File Serving**: Frontend build file serving
- **Health Check Endpoint**: Production monitoring endpoint

**Socket.IO Real-time Features:**
```javascript
// Connected users tracking
const connectedSellers = new Map();
const connectedBuyers = new Map();
const connectedDeliveryAgents = new Map();

// Global notification functions
global.emitToSeller = (sellerId, event, data) => {
  io.to(`seller-${sellerId}`).emit(event, data);
};

global.emitToBuyer = (userId, event, data) => {
  io.to(`buyer-${userId}`).emit(event, data);
};

global.emitToDeliveryAgent = (agentId, event, data) => {
  io.to(`delivery-${agentId}`).emit(event, data);
};
```

## DATABASE CONFIGURATION

### config/db.js - MongoDB Atlas Connection
**Key Features:**
- **Retry Logic**: Exponential backoff connection retry
- **Connection Pool**: Optimized connection pooling
- **Error Handling**: Comprehensive error logging and recovery
- **Production Monitoring**: Connection state monitoring

**Connection Configuration:**
```javascript
const connectionOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  retryWrites: true,
  retryReads: true,
  heartbeatFrequencyMS: 10000,
  family: 4 // Force IPv4
};
```

## DATA MODELS

### 1. User Model (models/User.js)
**Schema Structure:**
```javascript
{
  name: String (required),
  email: String (required, unique, validated),
  password: String (required, min 6 chars, hashed),
  mobileNumber: String (required, unique),
  location: {
    type: "Point",
    coordinates: [Number], // [longitude, latitude]
    address: String
  },
  isVerified: Boolean,
  wishlist: [ObjectId] // References to Product
}
```

**Key Features:**
- **Password Hashing**: bcryptjs with salt rounds
- **Geospatial Indexing**: 2dsphere index for location queries
- **Method**: `matchPassword()` for authentication
- **Automatic Timestamps**: createdAt, updatedAt

### 2. Seller Model (models/Seller.js)
**Schema Structure:**
```javascript
{
  firstName: String (required),
  email: String (required, unique, validated),
  password: String (required, hashed),
  mobileNumber: String (required, unique),
  shop: {
    name: String (required),
    address: String (required),
    gstNumber: String,
    phoneNumber: { main: String, alternate: String },
    category: Enum ['Men', 'Women', 'Kids'],
    openTime: String,
    closeTime: String,
    workingDays: String,
    location: {
      type: "Point",
      coordinates: [Number]
    },
    images: [String],
    mainImage: String,
    description: String (max 500 chars)
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    accountType: String
  },
  isVerified: Boolean,
  resetPasswordToken: String,
  resetPasswordExpires: Date
}
```

**Key Features:**
- **Enhanced Geospatial Indexing**: Multiple indexes for performance
- **Password Hashing**: bcryptjs with detailed logging
- **Shop Image Management**: Main image selection logic
- **Virtual Fields**: mainImageUrl for Cloudinary URLs

### 3. Product Model (models/Product.js)
**Schema Structure:**
```javascript
{
  seller: ObjectId (ref: Seller),
  name: String (required, max 100 chars),
  description: String (required, max 1000 chars),
  category: Enum ['Men', 'Women', 'Kids'],
  subCategory: Enum [
    'T-shirts', 'Shirts', 'Kurties', 'Suits', 'Ethnic Wear',
    'Jackets', 'Jeans', 'Tops', 'Tees', 'Dresses', 'Nightwear',
    'Sleepwear', 'Boys Sets', 'Top Wear', 'Lehengass', 'Rayon', 'Shrugs'
  ],
  productCategory: Enum [
    'Traditional Indian', 'Winter Fashion', 'Party Wear',
    'Sports Destination', 'Office Wear'
  ],
  zammerPrice: Number (required),
  mrp: Number (required, >= zammerPrice),
  discountPercentage: Number (calculated),
  variants: [{
    size: Enum ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    color: String,
    colorCode: String (hex),
    quantity: Number,
    images: [String]
  }],
  images: [String] (required),
  tags: [String],
  isLimitedEdition: Boolean,
  isTrending: Boolean,
  status: Enum ['active', 'paused', 'outOfStock'],
  composition: String (default: 'Cotton 100%'),
  brand: String,
  material: String,
  shipping: String (default: 'Standard'),
  averageRating: Number,
  numReviews: Number
}
```

**Key Features:**
- **Dynamic Discount Calculation**: Auto-calculated from MRP and Zammer price
- **Variant Management**: Size, color, quantity tracking
- **Search Indexing**: Text indexes on name and description
- **Performance Indexes**: Category, seller, status indexes
- **Virtual Fields**: onOffer calculation

### 4. Order Model (models/Order.js) - Enhanced Multi-Stage Order System
**Schema Structure:**
```javascript
{
  user: ObjectId (ref: User),
  seller: ObjectId (ref: Seller),
  orderItems: [{
    product: ObjectId (ref: Product),
    name: String,
    quantity: Number,
    price: Number,
    image: String,
    size: String,
    color: String
  }],
  shippingAddress: {
    address: String,
    city: String,
    postalCode: String,
    country: String,
    phone: String
  },
  paymentMethod: Enum ['Card', 'PayPal', 'Cash on Delivery', 'UPI', 'SMEPay'],
  paymentResult: {
    id: String,
    status: String,
    update_time: String,
    email_address: String,
    smepay_transaction_id: String,
    smepay_order_slug: String,
    smepay_ref_id: String
  },
  totalPrice: Number,
  isPaid: Boolean,
  paidAt: Date,
  isDelivered: Boolean,
  deliveredAt: Date,
  status: Enum [
    'Pending', 'Processing', 'Shipped', 'Delivered', 
    'Cancelled', 'Pickup_Ready', 'Out_for_Delivery'
  ],
  orderNumber: String (unique),
  
  // ADMIN APPROVAL WORKFLOW
  adminApproval: {
    isRequired: Boolean (default: true),
    status: Enum ['pending', 'approved', 'rejected', 'auto_approved'],
    approvedBy: ObjectId (ref: Admin),
    approvedAt: Date,
    rejectionReason: String,
    autoApprovalAt: Date // Auto-approve after 1 hour
  },
  
  // DELIVERY AGENT ASSIGNMENT
  deliveryAgent: {
    agent: ObjectId (ref: DeliveryAgent),
    assignedAt: Date,
    assignedBy: ObjectId (ref: Admin),
    status: Enum [
      'unassigned', 'assigned', 'accepted', 'rejected',
      'pickup_completed', 'delivery_completed'
    ],
    acceptedAt: Date,
    rejectedAt: Date,
    rejectionReason: String
  },
  
  // PICKUP TRACKING
  pickup: {
    isCompleted: Boolean,
    completedAt: Date,
    verificationMethod: Enum ['order_id', 'qr_code', 'manual'],
    pickupLocation: {
      type: "Point",
      coordinates: [Number]
    },
    pickupNotes: String
  },
  
  // DELIVERY TRACKING
  delivery: {
    isAttempted: Boolean,
    isCompleted: Boolean,
    attemptCount: Number,
    attempts: [{
      attemptNumber: Number,
      attemptedAt: Date,
      status: Enum ['failed', 'successful', 'customer_unavailable', 'wrong_address'],
      notes: String,
      location: {
        type: "Point",
        coordinates: [Number]
      }
    }],
    completedAt: Date,
    deliveryLocation: {
      type: "Point",
      coordinates: [Number]
    },
    recipientName: String,
    deliveryNotes: String
  },
  
  // OTP VERIFICATION
  otpVerification: {
    isRequired: Boolean (default: true),
    currentOTP: ObjectId (ref: OtpVerification),
    isVerified: Boolean,
    verifiedAt: Date
  },
  
  // CASH ON DELIVERY
  codPayment: {
    isCollected: Boolean,
    collectedAt: Date,
    collectedAmount: Number,
    paymentMethod: Enum ['cash', 'upi', 'card'],
    transactionId: String,
    collectedBy: ObjectId (ref: DeliveryAgent)
  },
  
  // DELIVERY FEES
  deliveryFees: {
    baseFee: Number (default: 20),
    distanceFee: Number,
    totalFee: Number (default: 20),
    agentEarning: Number (default: 15), // 75% of delivery fee
    platformCommission: Number (default: 5) // 25% of delivery fee
  },
  
  // REAL-TIME TRACKING
  liveTracking: {
    isEnabled: Boolean (default: true),
    lastKnownLocation: {
      type: "Point",
      coordinates: [Number],
      updatedAt: Date
    },
    estimatedArrival: Date
  },
  
  // STATUS HISTORY
  statusHistory: [{
    status: String,
    changedBy: Enum ['buyer', 'seller', 'admin', 'delivery_agent', 'system'],
    changedAt: Date,
    notes: String,
    location: {
      type: "Point",
      coordinates: [Number]
    }
  }],
  
  // INVOICE TRACKING
  invoiceGenerated: Boolean,
  invoiceUrl: String,
  invoiceGeneratedAt: Date
}
```

**Key Methods:**
- `updateStatus(newStatus, changedBy, notes, location)`: Enhanced status tracking
- `assignDeliveryAgent(agentId, assignedBy)`: Delivery agent assignment
- `handleDeliveryAgentResponse(response, reason)`: Accept/reject delivery
- `completePickup(verificationData)`: Mark pickup complete
- `completeDelivery(verificationData)`: Mark delivery complete with OTP
- `approveForDelivery(adminId)`: Admin approval workflow

**Static Methods:**
- `autoApprovePendingOrders()`: Auto-approve orders after timeout
- `findOrdersReadyForAssignment()`: Find orders ready for delivery assignment

## CONTROLLERS

### 1. userController.js - User Management
**Main Endpoints:**
- `registerUser()`: User registration with validation
- `loginUser()`: Authentication with test user support
- `getUserProfile()`: Get user profile data
- `updateUserProfile()`: Update user information
- `getNearbyShops()`: Geospatial shop search with fallback
- `getWishlist()`: Get user's wishlist
- `addToWishlist()`: Add product to wishlist
- `removeFromWishlist()`: Remove from wishlist
- `checkWishlist()`: Check if product is in wishlist
- `verifyEmail()`: Email verification for password reset
- `resetPassword()`: Password reset functionality

**Key Features:**
- **Test User Support**: Automatic test user creation
- **Geospatial Queries**: Location-based shop finding
- **Enhanced Error Handling**: Comprehensive logging
- **Wishlist Management**: Full CRUD operations

### 2. orderController.js - Enhanced Order Management System
**Main Endpoints:**
- `createOrder()`: Multi-step order creation with validation
- `getOrderById()`: Get single order with authorization
- `getUserOrders()`: Paginated user order history
- `getSellerOrders()`: Paginated seller order management
- `updateOrderStatus()`: Status updates with notifications
- `getSellerOrderStats()`: Order analytics for sellers
- `getOrderInvoice()`: Invoice generation and retrieval

**Key Features:**
- **7-Step Order Creation Process**:
  1. Order items validation
  2. Product and seller verification
  3. Unique order number generation
  4. Order object creation
  5. Database persistence
  6. Data population
  7. Real-time notifications

- **Real-time Notifications**:
  - Socket.IO seller notifications
  - Socket.IO buyer notifications
  - Email notifications with HTML templates
  - Status change broadcasts

- **Order Number Generation**:
  ```javascript
  // Format: ORD-YYYYMMDD-XXX
  // Example: ORD-20250108-001
  const generateOrderNumber = async () => {
    const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');
    const lastOrder = await Order.findOne({
      orderNumber: { $regex: `^ORD-${dateString}-` }
    }).sort({ orderNumber: -1 });
    
    const sequence = lastOrder ? 
      parseInt(lastOrder.orderNumber.split('-')[2]) + 1 : 1;
    
    return `ORD-${dateString}-${sequence.toString().padStart(3, '0')}`;
  };
  ```

- **Invoice Generation**: Automatic PDF invoice generation on delivery
- **Analytics**: Order statistics and revenue tracking
- **Email Templates**: Professional HTML email notifications

## MIDDLEWARE

### authMiddleware.js - Multi-Role Authentication System
**Authentication Middleware:**

1. **protectUser()**: User authentication
   - JWT token validation
   - User session management
   - Enhanced error messages

2. **protectSeller()**: Seller authentication
   - Seller-specific token validation
   - Shop verification

3. **protectAdmin()**: Admin authentication
   - Admin token validation
   - Active status checking
   - Role-based access

4. **protectDeliveryAgent()**: Delivery agent authentication
   - Agent token validation
   - Block status checking
   - Last active tracking

5. **optionalUserAuth()**: Optional authentication
   - Guest user support
   - Graceful degradation

6. **protectMultiRole()**: Multi-role authentication
   - Supports multiple user types
   - Dynamic role detection
   - Flexible access control

**Key Features:**
- **Enhanced Error Logging**: Detailed error tracking
- **Token Type Detection**: Multiple JWT secret support
- **Session Management**: Last active time tracking
- **Security Features**: Account blocking and verification

### errorMiddleware.js - Global Error Handler
**Error Handling Features:**
- **Validation Errors**: MongoDB validation error formatting
- **Cast Errors**: ObjectId cast error handling
- **Duplicate Key Errors**: Unique constraint violations
- **Production Error Masking**: Stack trace hiding in production
- **Structured Error Responses**: Consistent error format

## API ROUTES STRUCTURE

### User Routes (routes/userRoutes.js)
```javascript
// Public routes
POST /api/users/register        // User registration
POST /api/users/login          // User login

// Protected routes
GET /api/users/profile         // Get user profile
PUT /api/users/profile         // Update user profile

// Wishlist routes
GET /api/users/wishlist        // Get wishlist
POST /api/users/wishlist       // Add to wishlist
DELETE /api/users/wishlist/:id // Remove from wishlist
GET /api/users/wishlist/check/:id // Check wishlist status

// Password reset
POST /api/users/verify-email   // Email verification
POST /api/users/reset-password // Password reset
```

## REAL-TIME FEATURES

### Socket.IO Implementation
**Connection Management:**
```javascript
// User type tracking
const connectedSellers = new Map();
const connectedBuyers = new Map();
const connectedDeliveryAgents = new Map();

// Room joining events
socket.on('seller-join', (sellerId) => {
  socket.join(`seller-${sellerId}`);
  connectedSellers.set(sellerId, socket.id);
});

socket.on('buyer-join', (userId) => {
  socket.join(`buyer-${userId}`);
  connectedBuyers.set(userId, socket.id);
});

socket.on('delivery-join', (agentId) => {
  socket.join(`delivery-${agentId}`);
  connectedDeliveryAgents.set(agentId, socket.id);
});
```

**Real-time Events:**
- `new-order`: Seller receives new order notification
- `order-status-update`: Buyer receives status updates
- `delivery-assignment`: Delivery agent receives new assignment
- `pickup-completed`: Pickup confirmation
- `delivery-completed`: Delivery confirmation
- `invoice-ready`: Invoice generation notification

## SECURITY FEATURES

### 1. Authentication & Authorization
- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: bcryptjs with salt rounds
- **Role-based Access**: Multi-level access control
- **Session Management**: Active session tracking

### 2. API Security
- **Helmet**: Security headers configuration
- **Rate Limiting**: Request throttling
- **CORS**: Cross-origin resource sharing control
- **Input Validation**: express-validator integration

### 3. Database Security
- **Input Sanitization**: MongoDB injection prevention
- **Schema Validation**: Mongoose schema enforcement
- **Index Optimization**: Performance and security indexes

## PRODUCTION FEATURES

### 1. Monitoring & Logging
- **Structured Logging**: JSON-formatted logs for production
- **Terminal Logging**: Color-coded development logs
- **Performance Monitoring**: Memory usage tracking
- **Health Check Endpoint**: `/api/health` with system status

### 2. Error Handling
- **Graceful Shutdown**: SIGTERM and SIGINT handling
- **Uncaught Exception Handling**: Process error recovery
- **Error Recovery**: Automatic retry mechanisms
- **Fallback Responses**: Service degradation handling

### 3. Deployment Configuration
- **Environment Variables**: Production/development configuration
- **Dynamic Frontend URLs**: Environment-based URL configuration
- **Google App Engine**: Production deployment ready
- **Static File Serving**: Frontend build file serving

## API ENDPOINTS SUMMARY

### User Management
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User authentication
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/nearby-shops` - Location-based shop search

### Order Management
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details
- `GET /api/orders/myorders` - Get user orders
- `GET /api/orders/seller` - Get seller orders
- `PUT /api/orders/:id/status` - Update order status
- `GET /api/orders/seller/stats` - Order statistics
- `GET /api/orders/:id/invoice` - Get order invoice

### Wishlist Management
- `GET /api/users/wishlist` - Get user wishlist
- `POST /api/users/wishlist` - Add to wishlist
- `DELETE /api/users/wishlist/:id` - Remove from wishlist
- `GET /api/users/wishlist/check/:id` - Check wishlist status

### System Endpoints
- `GET /api/health` - Health check with system status
- `GET /api/debug/config` - Configuration debug (development only)

## TECHNOLOGY STACK

### Core Technologies
- **Node.js 20+**: JavaScript runtime
- **Express.js 4.18**: Web framework
- **MongoDB 6.16**: Database
- **Mongoose 8.15**: ODM
- **Socket.IO 4.8**: Real-time communication

### Authentication & Security
- **jsonwebtoken 9.0**: JWT implementation
- **bcryptjs 3.0**: Password hashing
- **helmet 7.1**: Security headers
- **express-rate-limit 7.1**: Rate limiting

### File & Media Handling
- **multer 1.4**: File upload middleware
- **cloudinary 1.41**: Image management
- **pdfkit 0.17**: PDF generation

### Validation & Utilities
- **express-validator 7.2**: Input validation
- **axios 1.6**: HTTP client
- **dotenv 16.5**: Environment configuration

## DEPLOYMENT NOTES

### Environment Variables Required
```env
# Database
MONGO_URI=mongodb+srv://...

# JWT Secrets
JWT_SECRET=your_jwt_secret
ADMIN_JWT_SECRET=admin_jwt_secret
DELIVERY_AGENT_JWT_SECRET=delivery_jwt_secret

# Frontend URLs
FRONTEND_URL_PROD=https://your-production-frontend.com
FRONTEND_URL_LOCAL=http://localhost:3000

# Email Configuration (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password

# Additional Origins (comma-separated)
ADDITIONAL_ALLOWED_ORIGINS=https://additional-domain.com

# CDN Domains (comma-separated)
CDN_DOMAINS=https://res.cloudinary.com
```

### Google App Engine Configuration
- **Node.js 20+ Runtime**: Compatible with GAE
- **Dynamic Port Binding**: `process.env.PORT` support
- **Static File Serving**: Frontend build integration
- **Health Check**: Required for GAE load balancing
- **Graceful Shutdown**: SIGTERM handling for GAE

This backend provides a comprehensive, production-ready API system for the ZAMMER marketplace with real-time features, multi-role authentication, advanced order management, and extensive monitoring capabilities.
