# OTP Implementation Status & Required Changes

## Current Status

### ✅ Buyer (User) - COMPLETE
- ✅ OTP-based signup: `/api/users/send-signup-otp`, `/api/users/verify-signup-otp`
- ✅ OTP-based forgot password: `/api/users/forgot-password`, `/api/users/verify-forgot-password-otp`, `/api/users/reset-password/:resetToken`
- ✅ Uses MSG91 standard API format
- ✅ Frontend components updated

### ❌ Seller - INCOMPLETE
- ❌ Signup: Currently direct registration (NO OTP)
- ❌ Forgot password: Currently email-based token (NO OTP)

### ❌ Delivery Agent - INCOMPLETE  
- ❌ Signup: Currently direct registration (NO OTP)
- ❌ Forgot password: NO IMPLEMENTATION FOUND

## Required Implementation

### 1. Seller OTP-Based Signup
- **Backend endpoints:**
  - `POST /api/sellers/send-signup-otp` - Send OTP via MSG91
  - `POST /api/sellers/verify-signup-otp` - Verify OTP and register seller
  
- **Backend changes:**
  - Add `sendSignupOTP` controller (similar to buyer)
  - Add `verifySignupOTPAndRegister` controller (similar to buyer)
  - Update routes in `sellerRoutes.js`
  
- **Frontend changes:**
  - Update `SellerRegister.js` to 2-step OTP flow (like `UserRegister.js`)
  - Add service functions in `sellerService.js`

### 2. Seller OTP-Based Forgot Password
- **Backend endpoints:**
  - `POST /api/sellers/forgot-password` - Send OTP via MSG91 (REPLACE existing)
  - `POST /api/sellers/verify-forgot-password-otp` - Verify OTP and generate reset token
  - `PUT /api/sellers/reset-password/:resetToken` - Reset password using token (KEEP existing)
  
- **Backend changes:**
  - Replace `forgotPassword` controller with OTP-based version
  - Add `verifyForgotPasswordOTP` controller
  - Add `getResetPasswordToken()` method to Seller model (DONE)
  - Update routes
  
- **Frontend changes:**
  - Update `SellerForgotPassword.js` to 3-step OTP flow (like `UserForgotPassword.js`)
  - Add service functions

### 3. Delivery Agent OTP-Based Signup
- **Backend endpoints:**
  - `POST /api/delivery/send-signup-otp` - Send OTP via MSG91
  - `POST /api/delivery/verify-signup-otp` - Verify OTP and register agent
  
- **Backend changes:**
  - Add `sendSignupOTP` controller
  - Add `verifySignupOTPAndRegister` controller
  - Update routes in `deliveryAgentRoutes.js`
  
- **Frontend changes:**
  - Update delivery agent registration component to 2-step OTP flow

### 4. Delivery Agent OTP-Based Forgot Password
- **Backend endpoints:**
  - `POST /api/delivery/forgot-password` - Send OTP via MSG91
  - `POST /api/delivery/verify-forgot-password-otp` - Verify OTP and generate reset token
  - `PUT /api/delivery/reset-password/:resetToken` - Reset password using token
  
- **Backend changes:**
  - Add `forgotPassword` controller
  - Add `verifyForgotPasswordOTP` controller
  - Add `resetPassword` controller
  - Add `getResetPasswordToken()` method to DeliveryAgent model
  - Update routes
  
- **Frontend changes:**
  - Create delivery agent forgot password component (3-step OTP flow)

## MSG91 Standard Method Verification

### ✅ Delivery OTP Verification - VERIFIED
- Uses MSG91's `/api/v5/otp/verify` API first (authoritative)
- Then updates internal database record

### ⚠️ Signup/Forgot Password OTP Verification - NEEDS VERIFICATION
- Currently uses `msg91Service.verifyOTPSession()` which checks in-memory session
- Should also verify with MSG91's `/api/v5/otp/verify` API for consistency
- **Recommendation:** Update `verifyOTPSession` to call MSG91 API first, similar to `verifyDeliveryOTP`

## Implementation Priority

1. **HIGH:** Seller OTP signup and forgot password (most common use case)
2. **MEDIUM:** Delivery agent OTP signup and forgot password
3. **LOW:** Update signup/forgot password OTP verification to use MSG91 API directly (optional improvement)

## Files to Modify

### Backend
- `backend/models/Seller.js` - Add `getResetPasswordToken()` ✅ DONE
- `backend/models/DeliveryAgent.js` - Add `getResetPasswordToken()`
- `backend/controllers/sellerController.js` - Add OTP endpoints
- `backend/controllers/deliveryAgentController.js` - Add OTP endpoints
- `backend/routes/sellerRoutes.js` - Add OTP routes
- `backend/routes/deliveryAgentRoutes.js` - Add OTP routes
- `backend/services/msg91Service.js` - Verify `verifyOTPSession` uses MSG91 API

### Frontend
- `frontend/src/pages/auth/SellerRegister.js` - Convert to OTP flow
- `frontend/src/pages/auth/SellerForgotPassword.js` - Convert to OTP flow
- `frontend/src/services/sellerService.js` - Add OTP service functions
- Delivery agent registration component - Convert to OTP flow
- Create delivery agent forgot password component

