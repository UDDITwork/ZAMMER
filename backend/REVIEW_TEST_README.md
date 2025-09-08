# 🧪 Review System Test Script

This comprehensive test script verifies that the review system is working correctly with all security features and authentication requirements.

## 🎯 What This Test Covers

### ✅ **Authentication & Authorization**
- User login with credentials
- Token-based authentication
- Protected route access

### ✅ **Purchase Verification**
- Checks if user has purchased products
- Verifies payment confirmation
- Ensures only paid orders can be reviewed

### ✅ **Review Functionality**
- Create reviews (with purchase verification)
- Get product reviews (public access)
- Update reviews
- Delete reviews
- Check review eligibility

### ✅ **Security Features**
- Prevents duplicate reviews
- Blocks reviews without purchase
- Requires authentication for all operations
- Validates input data

### ✅ **Data Integrity**
- Verifies review creation
- Checks public visibility
- Confirms deletion
- Validates user ownership

## 🚀 How to Run the Test

### **Prerequisites**
1. Make sure your backend server is running on `http://localhost:5000`
2. Ensure the test user has purchased at least one product
3. Install required dependencies: `npm install axios`

### **Run the Test**

```bash
# Navigate to backend directory
cd backend

# Run the test script
node run-review-test.js

# Or run directly
node test-review-system.js
```

### **Expected Output**
```
🚀 STARTING REVIEW SYSTEM COMPREHENSIVE TEST
============================================================

🧪 TEST 1: User Authentication
✅ Authentication successful for user: [User Name]
ℹ️  User ID: [User ID]
ℹ️  Token: [Token...]

🧪 TEST 2: Get User Orders to Find Purchased Products
✅ Found paid order: [Order Number]
ℹ️  Order ID: [Order ID]
ℹ️  Product ID: [Product ID]

🧪 TEST 3: Check Review Eligibility
✅ User is eligible to review this product

🧪 TEST 4: Create a Review
✅ Review created successfully

🧪 TEST 5: Get Product Reviews (Public Access)
✅ Retrieved [X] reviews for product

... and so on
```

## 🔧 Test Configuration

### **Test User Credentials**
```javascript
const TEST_USER = {
  email: 'udditkantsinha2@gmail.com',
  password: 'jpmcA123'
};
```

### **API Endpoints Tested**
- `POST /api/users/login` - Authentication
- `GET /api/orders/my-orders` - Get user orders
- `GET /api/reviews/check/:productId` - Check review eligibility
- `POST /api/reviews` - Create review
- `GET /api/reviews/product/:productId` - Get product reviews (public)
- `GET /api/reviews/user` - Get user reviews
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review
- `GET /api/reviews/purchased-products` - Get purchased products

## 📊 Test Results Interpretation

### **✅ PASSED Tests**
- All functionality working correctly
- Security measures in place
- Authentication working
- Purchase verification working

### **❌ FAILED Tests**
- Check the error messages
- Verify server is running
- Ensure test user has purchased products
- Check database connectivity

### **🚨 CRITICAL FAILURES**
- Authentication issues
- No purchased products found
- These need immediate attention

## 🛠️ Troubleshooting

### **Common Issues**

1. **Authentication Failed**
   ```
   ❌ Authentication failed: Invalid credentials
   ```
   - Check if user exists in database
   - Verify password is correct
   - Ensure user account is active

2. **No Purchased Products**
   ```
   ⚠️ No paid orders found. User needs to purchase a product first.
   ```
   - User needs to complete a purchase
   - Payment must be confirmed
   - Order status must not be 'Cancelled'

3. **Server Connection Error**
   ```
   ❌ Error: connect ECONNREFUSED 127.0.0.1:5000
   ```
   - Start the backend server
   - Check if port 5000 is available
   - Verify server is running

4. **Database Connection Error**
   ```
   ❌ Error: MongoNetworkError
   ```
   - Check MongoDB connection
   - Verify database is running
   - Check connection string

## 📝 Test Data

The test script creates and manages its own test data:
- Creates a test review with rating 5
- Updates the review to rating 4
- Deletes the test review at the end
- All test data is cleaned up automatically

## 🔒 Security Verification

This test verifies that:
- ✅ Only authenticated users can create reviews
- ✅ Only users who purchased products can review them
- ✅ Payment must be confirmed before reviewing
- ✅ One review per product per user
- ✅ Reviews are visible to everyone (public access)
- ✅ Users can only update/delete their own reviews

## 📈 Success Criteria

The test is considered successful when:
- All critical tests pass
- Authentication works correctly
- Purchase verification is enforced
- Review CRUD operations work
- Security measures are in place
- Public access to reviews works

## 🎉 Expected Final Output

```
📊 TEST RESULTS SUMMARY
✅ Passed: 12
❌ Failed: 0
🚨 Critical Failed: 0

🎉 ALL CRITICAL TESTS PASSED!
✅ Review system is working correctly

🏁 Test completed!
```

This indicates that the review system is fully functional and secure! 🚀


