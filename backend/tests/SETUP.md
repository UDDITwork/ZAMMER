# Test Setup Guide

## Quick Start

Before running tests, you need to set up test credentials in each test script.

## Required Test Accounts

You need to create or use existing accounts for:

1. **Test User** - For return request tests
   - Update in: `test-return-request-auth.js`
   - Fields: `email`, `password`

2. **Test Seller** - For seller return orders tests
   - Update in: `test-seller-return-orders.js`
   - Fields: `email`, `password`

3. **Test Delivery Agent** - For forgot password and earnings tests
   - Update in: `test-delivery-forgot-password.js` and `test-delivery-earnings.js`
   - Fields: `email`, `password`, `phoneNumber`

## Steps to Run Tests

### 1. Start Backend Server
```bash
cd backend
npm start
# or
node server.js
```

### 2. Update Test Credentials

Edit each test file and update the credentials:
```javascript
// Example in test-return-request-auth.js
const testUser = {
  email: 'your-test-user@example.com',  // Change this
  password: 'your-test-password'         // Change this
};
```

### 3. Run Tests

**Run all tests:**
```bash
node backend/tests/test-all-features.js
```

**Run individual tests:**
```bash
node backend/tests/test-return-request-auth.js
node backend/tests/test-seller-return-orders.js
node backend/tests/test-delivery-earnings.js
```

**Check server health:**
```bash
node backend/tests/test-config.js
```

## Environment Variables

You can set the API URL:
```bash
export API_URL=http://localhost:5001/api
# or on Windows:
set API_URL=http://localhost:5001/api
```

## Common Issues

### "ECONNREFUSED" Error
- **Solution:** Make sure backend server is running on port 5001

### "401 Unauthorized" Error
- **Solution:** Update test credentials with valid account credentials

### "400 Bad Request" Error
- **Solution:** Check that test data exists (e.g., orders for return tests)

### "Network Error"
- **Solution:** Verify BASE_URL is correct and server is accessible

## Test Data Requirements

For comprehensive testing, ensure you have:

1. **For Return Request Test:**
   - At least one "Delivered" order for the test user

2. **For Seller Return Orders Test:**
   - At least one return order associated with the test seller

3. **For Delivery Earnings Test:**
   - At least one completed delivery for the test delivery agent

4. **For Forgot Password Test:**
   - Valid delivery agent phone number for OTP testing

## Expected Behavior

- Tests should show detailed error messages if something fails
- Authentication failures will show status codes and error messages
- Network errors will indicate if server is not running
- Successful tests will show green checkmarks (✅)

