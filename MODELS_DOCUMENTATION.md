# 🗄️ ZAMMER BACKEND MODELS - COMPREHENSIVE DOCUMENTATION

## 📋 **OVERVIEW**
This document provides aggressive details about all backend models in the ZAMMER e-commerce platform, including their structure, relationships, methods, and business logic.

---

## 🚚 **1. DELIVERYAGENT.JS - DELIVERY AGENT MANAGEMENT MODEL**

**📍 File Path:** `backend/models/DeliveryAgent.js`

### **🔧 CORE FEATURES IMPLEMENTED:**

#### **📋 Personal Information Management**
- **Name Field**: Required string with 50 character limit and trimming
- **Email Field**: Unique email with validation and lowercase conversion
- **Password Field**: Required with bcrypt hashing and 6+ character minimum
- **Phone Number**: Unique Indian mobile number validation (6-9 digit format)
- **Date of Birth**: Age validation (18-65 years) with custom validator

#### **🆔 Identity & Verification System**
- **Aadhar Number**: 12-digit validation with regex pattern matching
- **PAN Number**: Indian PAN format validation (5 letters + 4 digits + 1 letter)
- **License Number**: Driving license storage with trimming
- **Verification Status**: Document verification tracking (Aadhar, PAN, License, Address)

#### **📍 Address & Location Management**
- **Structured Address**: Street, city, state, pincode with 6-digit validation
- **GPS Coordinates**: Longitude/latitude storage for geolocation
- **Current Location**: Real-time location tracking with timestamp
- **Geospatial Indexing**: 2dsphere indexes for location-based queries

#### **🚗 Vehicle Information System**
- **Vehicle Type**: Enum with options (Bicycle, Motorcycle, Scooter, Car, Van)
- **Vehicle Model**: String storage for vehicle model details
- **Registration Number**: Vehicle registration storage
- **Insurance Expiry**: Date tracking for insurance validation

#### **📊 Work Status & Availability**
- **Online Status**: Boolean flag for real-time online/offline tracking
- **Availability Status**: Boolean flag for order acceptance capability
- **Blocking System**: Blocked status with reason tracking
- **Working Hours**: Start/end time with working days array
- **Preferred Areas**: Array of preferred delivery areas with coordinates

#### **📈 Performance Metrics & Analytics**
- **Delivery Statistics**: Total, completed, cancelled deliveries
- **Rating System**: Average rating with 0-5 scale validation
- **Earnings Tracking**: Total earnings calculation
- **Performance Indicators**: On-time delivery rate percentage
- **Customer Rating Count**: Number of ratings received

#### **💰 Financial Management**
- **Bank Details**: Account number, IFSC code, bank name, account holder
- **Earnings Tracking**: Real-time earnings calculation
- **Payment Processing**: Financial transaction management

#### **🆘 Emergency Contact System**
- **Contact Name**: Emergency contact person name
- **Phone Number**: Emergency contact phone number
- **Relationship**: Relationship with emergency contact

#### **🔐 Security & Authentication**
- **Password Hashing**: bcrypt salt rounds with 10 iterations
- **Password Matching**: Secure password comparison method
- **Reset Token System**: Password reset functionality
- **OTP Management**: Current OTP for delivery confirmation

#### **📱 Real-Time Features**
- **Location Updates**: Method to update current location
- **Last Active Tracking**: Timestamp for last activity
- **Status Synchronization**: Real-time status updates

### **🔗 DATABASE RELATIONSHIPS:**
```javascript
// References
currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }
currentOTP: { orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' } }
```

### **📊 PERFORMANCE OPTIMIZATION:**
- **Geospatial Indexes**: 2dsphere indexes for location queries
- **Compound Indexes**: Email, phone, online status combinations
- **Query Optimization**: Efficient delivery agent searches

### **🛠️ CUSTOM METHODS:**

#### **📍 Location Management**
```javascript
updateLocation(coordinates) // Updates current location with timestamp
```

#### **📊 Performance Calculation**
```javascript
completionRate // Virtual property for delivery completion percentage
```

#### **⏰ Working Hours Validation**
```javascript
isWithinWorkingHours() // Checks if agent is within working schedule
```

#### **📦 Order Acceptance Logic**
```javascript
canAcceptOrder() // Validates if agent can accept new orders
```

#### **📈 Statistics Updates**
```javascript
updateDeliveryStats(type, rating, earnings) // Updates performance metrics
```

#### **🔍 Static Query Methods**
```javascript
findNearbyAgents(coordinates, maxDistance) // Finds agents within radius
getPerformanceAnalytics() // Aggregates performance data
```

---

## 🔐 **2. OTPVERIFICATION.JS - OTP MANAGEMENT MODEL**

**📍 File Path:** `backend/models/OtpVerification.js`

### **🔧 CORE FEATURES IMPLEMENTED:**

#### **📱 OTP Generation & Management**
- **6-Digit Code**: Numeric OTP with exact 6-digit validation
- **Purpose Classification**: Delivery, pickup, payment confirmation
- **Status Tracking**: Pending, verified, expired, cancelled states
- **Expiry Management**: 10-minute default expiry with configurable timing

#### **🔗 Entity Relationships**
- **Order Reference**: Required order association
- **Delivery Agent**: Required agent association
- **User Reference**: Required user association
- **Triple Validation**: Ensures all parties are involved

#### **📍 Location & Delivery Tracking**
- **Delivery Location**: GPS coordinates with address storage
- **Geospatial Data**: 2dsphere indexing for location queries
- **Address Storage**: Human-readable address strings

#### **🔒 Security & Validation**
- **Attempt Counting**: Maximum 3 attempts with tracking
- **IP Address Tracking**: Security audit trail
- **User Agent Logging**: Device/browser tracking
- **Verification Results**: Success/failure with detailed error messages

#### **💰 Payment Integration (COD)**
- **Amount Received**: Cash collection tracking
- **Payment Method**: Cash, UPI, card options
- **Transaction ID**: Payment reference tracking
- **Collection Timestamp**: Payment collection timing

#### **📊 Verification Analytics**
- **Success Tracking**: Verification success rates
- **Error Logging**: Detailed error message storage
- **Verification Source**: Agent, system, admin tracking

### **🛠️ CUSTOM METHODS:**

#### **🔢 OTP Generation**
```javascript
generateOTP() // Static method for 6-digit OTP generation
```

#### **📧 OTP Creation**
```javascript
createDeliveryOTP(orderData) // Creates new OTP with invalidation
```

#### **✅ OTP Verification**
```javascript
verifyOTP(enteredCode, verificationData) // Comprehensive verification
```

#### **🧹 Cleanup Operations**
```javascript
cleanupExpiredOTPs() // Automatic expired OTP cleanup
```

#### **📊 Statistics Generation**
```javascript
getOTPStats(timeframe) // OTP usage analytics
```

### **🔗 DATABASE RELATIONSHIPS:**
```javascript
order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }
deliveryAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryAgent' }
user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
```

---

## 👑 **3. ADMIN.JS - ADMINISTRATOR MANAGEMENT MODEL**

**📍 File Path:** `backend/models/Admin.js`

### **🔧 CORE FEATURES IMPLEMENTED:**

#### **👤 Basic Information**
- **Name Field**: Required admin name with trimming
- **Email Field**: Unique email with validation and lowercase
- **Password Field**: Required with bcrypt hashing (6+ characters)

#### **🔐 Role-Based Access Control**
- **Role System**: Admin and super_admin roles
- **Permission Matrix**: Granular permission system
  - `canViewSellers`: Seller management access
  - `canViewUsers`: User management access
  - `canManageProducts`: Product management access
  - `canManageOrders`: Order management access

#### **📊 Account Management**
- **Active Status**: Account activation/deactivation
- **Last Login Tracking**: Login timestamp recording
- **Creation/Update Timestamps**: Audit trail maintenance

#### **🔐 Security Features**
- **Password Hashing**: bcrypt with 10 salt rounds
- **Password Matching**: Secure comparison method
- **Session Management**: Login tracking

### **🛠️ CUSTOM METHODS:**
```javascript
matchPassword(enteredPassword) // Secure password verification
```

---

## 🛒 **4. CART.JS - SHOPPING CART MANAGEMENT MODEL**

**📍 File Path:** `backend/models/Cart.js`

### **🔧 CORE FEATURES IMPLEMENTED:**

#### **📦 Cart Item Structure**
- **Product Reference**: Required product association
- **Quantity Management**: Minimum 1 quantity with defaults
- **Price Tracking**: Individual item price storage
- **Variant Support**: Size and color selection tracking

#### **👤 User Association**
- **User Reference**: Required user association
- **One Cart Per User**: Unique user constraint

#### **💰 Financial Calculation**
- **Automatic Total**: Pre-save hook for total calculation
- **Price Aggregation**: Sum of all item prices × quantities

#### **🎯 Product Variants**
- **Size Selection**: Product size tracking
- **Color Selection**: Product color tracking
- **Variant Flexibility**: Extensible variant system

### **🛠️ CUSTOM METHODS:**
```javascript
// Automatic total calculation in pre-save hook
CartSchema.pre('save', function(next) {
  this.total = this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  next();
});
```

---

## 📦 **5. ORDER.JS - ORDER MANAGEMENT MODEL**

**📍 File Path:** `backend/models/Order.js`

### **🔧 CORE FEATURES IMPLEMENTED:**

#### **📋 Order Item Management**
- **Product Reference**: Required product association
- **Item Details**: Name, quantity, price, image, size, color
- **Variant Tracking**: Size and color information

#### **👥 User & Seller Association**
- **User Reference**: Required buyer association
- **Seller Reference**: Required seller association
- **Relationship Tracking**: Buyer-seller order relationship

#### **📍 Shipping & Delivery**
- **Address Structure**: Complete shipping address with validation
- **Phone Number**: Contact information for delivery
- **Country Support**: International shipping capability

#### **💳 Payment Processing**
- **Payment Methods**: Card, PayPal, Cash on Delivery, UPI, SMEPay
- **Payment Results**: Transaction ID, status, update time
- **SMEPay Integration**: Specific SMEPay transaction fields
- **Payment Status**: Paid/unpaid with timestamp

#### **📊 Financial Management**
- **Tax Calculation**: Tax price tracking
- **Shipping Cost**: Shipping price management
- **Total Calculation**: Complete order total
- **COD Handling**: Cash on delivery processing

#### **📈 Order Status Management**
- **Status Enum**: Pending, Processing, Shipped, Delivered, Cancelled, etc.
- **Status History**: Complete status change tracking
- **Timestamps**: Creation and update tracking

#### **🆕 ADMIN APPROVAL WORKFLOW**
- **Approval Required**: Boolean flag for admin approval
- **Approval Status**: Pending, approved, rejected, auto_approved
- **Approver Tracking**: Admin who approved the order
- **Auto-Approval**: Automatic approval after 1 hour
- **Rejection Handling**: Rejection reason storage

#### **🚚 DELIVERY AGENT ASSIGNMENT**
- **Agent Reference**: Delivery agent assignment
- **Assignment Tracking**: Assignment timestamp and assigner
- **Status Management**: Unassigned, assigned, accepted, rejected states
- **Response Handling**: Agent acceptance/rejection with reasons

#### **📦 PICKUP TRACKING**
- **Completion Status**: Pickup completion tracking
- **Verification Methods**: Order ID, QR code, manual verification
- **Location Tracking**: Pickup location coordinates
- **Notes System**: Pickup-related notes

#### **🚚 DELIVERY TRACKING**
- **Attempt Management**: Multiple delivery attempts
- **Completion Status**: Delivery completion tracking
- **Location Tracking**: Delivery location coordinates
- **Recipient Information**: Delivery recipient details

#### **🔐 OTP VERIFICATION**
- **OTP Requirement**: Boolean flag for OTP verification
- **OTP Reference**: Current OTP association
- **Verification Status**: OTP verification tracking
- **Verification Timestamp**: OTP verification timing

#### **💰 COD PAYMENT HANDLING**
- **Collection Status**: Cash collection tracking
- **Amount Tracking**: Collected amount storage
- **Payment Method**: Cash, UPI, card options
- **Transaction Tracking**: Payment transaction details

#### **📊 DELIVERY FEES & EARNINGS**
- **Base Fee**: Standard delivery fee (₹20)
- **Distance Fee**: Additional distance-based fee
- **Agent Earning**: Agent's share (₹15 - 75%)
- **Platform Commission**: Platform's share (₹5 - 25%)

#### **⏰ DELIVERY TIME ESTIMATION**
- **Estimated Time**: 2-hour default estimation
- **Actual Time**: Real delivery time tracking
- **On-Time Status**: Delivery timing validation

#### **📍 REAL-TIME TRACKING**
- **Live Tracking**: Real-time location updates
- **Location History**: Last known location tracking
- **ETA Calculation**: Estimated arrival time

### **🛠️ CUSTOM METHODS:**

#### **📊 Status Management**
```javascript
updateStatus(newStatus, changedBy, notes, location) // Comprehensive status updates
assignDeliveryAgent(agentId, assignedBy) // Agent assignment
handleDeliveryAgentResponse(response, reason) // Agent response handling
completePickup(verificationData) // Pickup completion
completeDelivery(verificationData) // Delivery completion with OTP
approveForDelivery(adminId) // Admin approval
```

#### **🔍 Static Methods**
```javascript
autoApprovePendingOrders() // Automatic order approval
findOrdersReadyForAssignment() // Orders ready for delivery
```

#### **📊 Virtual Properties**
```javascript
canAssignDeliveryAgent // Assignment eligibility check
deliveryStage // Current delivery stage
```

---

## ❤️ **6. WISHLIST.JS - WISHLIST MANAGEMENT MODEL**

**📍 File Path:** `backend/models/Wishlist.js`

### **🔧 CORE FEATURES IMPLEMENTED:**

#### **📦 Wishlist Item Structure**
- **Product Reference**: Required product association
- **Addition Timestamp**: When item was added to wishlist
- **No Separate ID**: Efficient storage without individual item IDs

#### **👤 User Association**
- **One Wishlist Per User**: Unique user constraint
- **User Reference**: Required user association

#### **🛠️ CONVENIENCE METHODS:**

#### **➕ Add Product**
```javascript
addProduct(userId, productId) // Adds product if not already present
```

#### **➖ Remove Product**
```javascript
removeProduct(userId, productId) // Removes product from wishlist
```

#### **🔍 Check Product**
```javascript
isProductInWishlist(userId, productId) // Checks if product exists
```

---

## 👤 **7. USER.JS - USER MANAGEMENT MODEL**

**📍 File Path:** `backend/models/User.js`

### **🔧 CORE FEATURES IMPLEMENTED:**

#### **👤 Basic Information**
- **Name Field**: Required user name
- **Email Field**: Unique email with validation and lowercase
- **Password Field**: Required with bcrypt hashing (6+ characters)
- **Mobile Number**: Unique mobile number storage

#### **📍 Location Management**
- **GPS Coordinates**: Longitude/latitude storage
- **Address Storage**: Human-readable address
- **Geospatial Indexing**: 2dsphere index for location queries

#### **📊 Account Management**
- **Verification Status**: Account verification tracking
- **Wishlist Integration**: Product wishlist array
- **Timestamps**: Creation and update tracking

#### **🔐 Security Features**
- **Password Hashing**: bcrypt with salt rounds
- **Password Matching**: Secure comparison method

### **🛠️ CUSTOM METHODS:**
```javascript
matchPassword(enteredPassword) // Secure password verification
```

---

## ⭐ **8. REVIEW.JS - PRODUCT REVIEW MODEL**

**📍 File Path:** `backend/models/Review.js`

### **🔧 CORE FEATURES IMPLEMENTED:**

#### **📝 Review Content**
- **Product Reference**: Required product association
- **User Reference**: Required user association
- **Rating System**: 1-5 star rating with validation
- **Review Text**: Required review content

#### **📊 Review Management**
- **Timestamps**: Creation and update tracking
- **Unique Constraint**: One review per user per product
- **Compound Indexing**: Product-user combination indexing

#### **🔍 Data Integrity**
- **Rating Validation**: Minimum 1, maximum 5 stars
- **Required Fields**: All essential fields are required
- **Unique Reviews**: Prevents duplicate reviews

---

## 🏷️ **9. PRODUCT.JS - PRODUCT MANAGEMENT MODEL**

**📍 File Path:** `backend/models/Product.js`

### **🔧 CORE FEATURES IMPLEMENTED:**

#### **📦 Product Information**
- **Seller Reference**: Required seller association
- **Name Field**: Required with 100 character limit
- **Description**: Required with 1000 character limit
- **Brand Information**: Brand name storage

#### **🏷️ Categorization System**
- **Main Category**: Men, Women, Kids
- **Sub Category**: 17 different sub-categories
- **Special Category**: Traditional, Winter, Party, Sports, Office
- **Tag System**: Flexible tag array

#### **💰 Pricing System**
- **ZAMMER Price**: Platform selling price
- **MRP**: Maximum retail price
- **Discount Calculation**: Automatic discount percentage
- **Price Validation**: MRP must be >= Zammer price

#### **🎨 Variant Management**
- **Size Options**: XS to 4XL with enum validation
- **Color System**: Color name with hex code
- **Quantity Tracking**: Per-variant stock management
- **Variant Images**: Individual variant image arrays

#### **🖼️ Media Management**
- **Image Arrays**: Multiple product images
- **Variant Images**: Per-variant image storage
- **Image Validation**: Required image arrays

#### **📊 Product Status**
- **Status Management**: Active, paused, out of stock
- **Limited Edition**: Special edition flag
- **Trending Status**: Trending product flag

#### **📈 Performance Metrics**
- **Average Rating**: Product rating calculation
- **Review Count**: Number of reviews
- **Rating System**: 0-5 star rating

#### **🏷️ Product Details**
- **Composition**: Material composition (default: Cotton 100%)
- **Material**: Material type information
- **Shipping**: Shipping method specification

#### **📊 Virtual Properties**
```javascript
onOffer // Checks if product has discount
```

#### **🔍 Indexing Strategy**
- **Text Search**: Name and description text indexing
- **Category Indexing**: Category and sub-category indexes
- **Status Indexing**: Status-based query optimization
- **Feature Indexing**: Trending and limited edition indexes

---

## 📊 **DATABASE RELATIONSHIPS SUMMARY**

### **🔗 Primary Relationships:**
1. **User ↔ Order**: One-to-many (user can have multiple orders)
2. **Seller ↔ Order**: One-to-many (seller can have multiple orders)
3. **User ↔ Cart**: One-to-one (one cart per user)
4. **User ↔ Wishlist**: One-to-one (one wishlist per user)
5. **Product ↔ Review**: One-to-many (product can have multiple reviews)
6. **User ↔ Review**: One-to-many (user can write multiple reviews)
7. **DeliveryAgent ↔ Order**: One-to-many (agent can handle multiple orders)
8. **Admin ↔ Order**: One-to-many (admin can approve multiple orders)

### **🔗 Complex Relationships:**
1. **Order ↔ OTPVerification**: One-to-one (one OTP per order)
2. **Order ↔ DeliveryAgent**: Many-to-one (multiple orders to one agent)
3. **Product ↔ CartItem**: One-to-many (product can be in multiple carts)
4. **Product ↔ WishlistItem**: One-to-many (product can be in multiple wishlists)

---

## 🛠️ **TECHNICAL FEATURES SUMMARY**

### **🔐 Security Features:**
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: Comprehensive field validation
- **Unique Constraints**: Email, phone, username uniqueness
- **Data Sanitization**: Input trimming and cleaning

### **📊 Performance Optimization:**
- **Indexing Strategy**: Strategic database indexing
- **Geospatial Indexes**: Location-based query optimization
- **Compound Indexes**: Multi-field query optimization
- **Text Search**: Full-text search capabilities

### **🔄 Real-Time Features:**
- **Status Tracking**: Real-time status updates
- **Location Updates**: GPS coordinate tracking
- **Live Notifications**: Real-time notification system
- **WebSocket Integration**: Real-time communication

### **📈 Analytics & Reporting:**
- **Performance Metrics**: Delivery agent performance tracking
- **Order Analytics**: Order processing analytics
- **User Behavior**: User interaction tracking
- **Financial Reports**: Revenue and earnings tracking

---

## 🎯 **BUSINESS LOGIC IMPLEMENTATION**

### **🚚 Delivery System:**
- **Agent Assignment**: Intelligent agent assignment
- **Route Optimization**: Optimal delivery routes
- **Real-Time Tracking**: Live delivery tracking
- **OTP Verification**: Secure delivery confirmation

### **💰 Payment Processing:**
- **Multiple Methods**: Card, UPI, COD, SMEPay
- **Transaction Tracking**: Complete payment history
- **COD Handling**: Cash on delivery processing
- **Refund Management**: Payment refund system

### **📦 Order Management:**
- **Status Workflow**: Complete order lifecycle
- **Admin Approval**: Order approval system
- **Cancellation Handling**: Order cancellation logic
- **Invoice Generation**: Automatic invoice creation

### **👥 User Management:**
- **Authentication**: Secure login system
- **Profile Management**: User profile handling
- **Wishlist System**: Product wishlist functionality
- **Review System**: Product review management

---

## 📋 **DEPLOYMENT CONSIDERATIONS**

### **🔧 Database Setup:**
- **MongoDB Atlas**: Cloud database hosting
- **Index Creation**: Strategic index deployment
- **Data Migration**: Existing data migration
- **Backup Strategy**: Regular data backups

### **🚀 Performance Optimization:**
- **Connection Pooling**: Database connection management
- **Query Optimization**: Efficient query design
- **Caching Strategy**: Redis caching implementation
- **Load Balancing**: Traffic distribution

### **🔒 Security Measures:**
- **Data Encryption**: Sensitive data encryption
- **Access Control**: Role-based access control
- **Audit Logging**: Complete audit trail
- **Input Validation**: Comprehensive input sanitization

---

*This comprehensive documentation covers all backend models in the ZAMMER e-commerce platform, providing detailed insights into the data architecture, business logic, and technical implementation.* 