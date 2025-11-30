# Test Scripts for Implemented Features

This directory contains test scripts for all the recently implemented features.

## Prerequisites

1. Ensure the backend server is running on `http://localhost:5001` (or update `API_URL` env var)
2. Have test accounts ready:
   - Test user account
   - Test seller account
   - Test delivery agent account

## Test Scripts

### 1. `test-return-request-auth.js`
Tests the return request authentication fix.

**What it tests:**
- Return request without authentication should be rejected (401)
- Return request with authentication should be accepted (if order is eligible)

**Run:**
```bash
node tests/test-return-request-auth.js
```

### 2. `test-seller-return-orders.js`
Tests the seller return orders endpoint.

**What it tests:**
- Endpoint requires seller authentication
- Returns filtered return orders for authenticated seller
- Status filtering works correctly

**Run:**
```bash
node tests/test-seller-return-orders.js
```

### 3. `test-delivery-forgot-password.js`
Tests the delivery agent forgot password flow.

**What it tests:**
- Forgot password request via email
- Forgot password request via phone number
- OTP verification (requires manual OTP entry)
- Password reset with token
- Input validation

**Run:**
```bash
node tests/test-delivery-forgot-password.js
```

**Note:** This test requires manual intervention:
1. Run the script to send OTP
2. Check your phone for the OTP
3. Update `testOtp` variable in the script
4. Re-run the script to continue testing

### 4. `test-delivery-earnings.js`
Tests the delivery agent earnings endpoint.

**What it tests:**
- Endpoint requires authentication
- All time earnings retrieval
- Period filtering (day, week, month)
- Custom date range filtering
- Day-wise breakdown structure
- Order-wise breakdown structure

**Run:**
```bash
node tests/test-delivery-earnings.js
```

### 5. `test-all-features.js`
Master script that runs all tests in sequence.

**Run:**
```bash
node tests/test-all-features.js
```

## Configuration

Update test credentials in each script:
- `testUser` - User credentials for return request tests
- `testSeller` - Seller credentials for return orders tests
- `testDeliveryAgent` - Delivery agent credentials for password and earnings tests

## Environment Variables

- `API_URL` - Backend API URL (default: `http://localhost:5001/api`)

## Expected Results

All tests should:
1. ✅ Authenticate successfully
2. ✅ Reject unauthorized requests
3. ✅ Return correct data structures
4. ✅ Handle validation errors properly

