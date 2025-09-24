# DELIVERY AGENT SYSTEM VERIFICATION INSTRUCTIONS

## INSTRUCTIONS FOR CURSOR AI

You must verify the delivery agent system implementation by reading the actual codebase files. Do not assume or hallucinate any implementations. Follow these exact steps:

### STEP 1: READ AND ANALYZE CORE FILES

**MANDATORY FILES TO READ:**
1. `backend/models/DeliveryAgent.js` - Read the complete model schema
2. `backend/models/Order.js` - Read the complete model schema  
3. `backend/models/OtpVerification.js` - Read the complete model schema
4. `backend/controllers/deliveryAgentController.js` - Read the complete controller
5. `backend/controllers/adminController.js` - Read order assignment functions
6. `frontend/src/pages/delivery/DeliveryDashboard.js` - Read the dashboard interface
7. `frontend/src/pages/delivery/OrderPickup.js` - Read pickup interface
8. `frontend/src/pages/delivery/OrderDelivery.js` - Read delivery interface
9. `backend/services/otpService.js` - Read OTP generation service
10. `backend/services/smepayService.js` - Read SMEPay integration

### STEP 2: VERIFY DELIVERY AGENT FLOW REQUIREMENTS

**REQUIREMENT 1: ADMIN ORDER ASSIGNMENT**
- Check if admin can assign orders to delivery agents via dashboard interface
- Verify order status changes to 'Pickup_Ready' after assignment
- Confirm delivery agent receives notification WITHOUT order ID visible
- Check if agent status changes to 'assigned'

**REQUIREMENT 2: DELIVERY AGENT ORDER ACCEPTANCE** 
- Verify delivery agent has ACCEPT ORDER button in interface
- Check if agent can accept or reject assigned orders
- Confirm order ID becomes visible ONLY after acceptance
- Verify admin receives instant notification when order is accepted
- Check if buyer and seller receive notifications on acceptance

**REQUIREMENT 3: SELLER LOCATION CONFIRMATION**
- Verify delivery agent has "REACHED SELLER LOCATION" button
- Check if agent can confirm reaching seller location
- Verify order ID verification interface exists
- Confirm seller tells order ID to delivery agent
- Check if exact order ID matching validation works
- Verify all parties receive pickup completion notifications

**REQUIREMENT 4: BUYER LOCATION CONFIRMATION**
- Verify delivery agent has "REACHED BUYER LOCATION" button  
- Check if agent can confirm reaching buyer location
- For online payments: Verify OTP generation using Tulio API
- For COD payments: Verify SMEPay dynamic QR generation
- Check if delivery completion notifies all parties

### STEP 3: VERIFY BUTTON IMPLEMENTATIONS

**SEARCH FOR THESE SPECIFIC FUNCTIONS:**
1. `handleAcceptOrder` - Delivery agent accept order function
2. `handlePickupComplete` - Pickup completion function  
3. `handleConfirmDelivery` - Delivery completion function
4. `acceptOrder` - Backend accept order endpoint
5. `completePickup` - Backend pickup completion endpoint
6. `completeDelivery` - Backend delivery completion endpoint

**VERIFY BUTTON UI ELEMENTS:**
1. Accept Order button in delivery dashboard
2. Complete Pickup button in pickup interface
3. Complete Delivery button in delivery interface

### STEP 4: VERIFY NOTIFICATION SYSTEM

**SEARCH FOR NOTIFICATION EMISSIONS:**
1. `global.emitToAdmin` - Admin notifications
2. `global.emitToBuyer` - Buyer notifications  
3. `global.emitToSeller` - Seller notifications
4. `global.emitToDeliveryAgent` - Agent notifications

**VERIFY NOTIFICATION TRIGGERS:**
1. Order assignment notifications
2. Order acceptance notifications
3. Pickup completion notifications
4. Delivery completion notifications

### STEP 5: VERIFY PAYMENT PROCESSING

**CHECK TULIO API INTEGRATION:**
1. OTP generation for online payments
2. SMS sending to buyer phone number
3. OTP verification process

**CHECK SMEPAY INTEGRATION:**
1. Dynamic QR generation for COD payments
2. Payment collection confirmation
3. COD payment status updates

### STEP 6: VERIFY ORDER ID VISIBILITY CONTROL

**CHECK ORDER ID LOGIC:**
1. Order ID hidden from delivery agent before acceptance
2. Order ID visible after agent accepts order
3. Order ID verification at seller location
4. Exact matching validation (case-sensitive)

### STEP 7: VERIFY STATUS UPDATES

**CHECK STATUS FLOWS:**
1. Order status: 'Confirmed' → 'Pickup_Ready' → 'Out_for_Delivery' → 'Delivered'
2. Delivery agent status: 'available' → 'assigned' → 'accepted' → 'pickup_completed' → 'delivering'
3. Delivery agent assignment status: 'unassigned' → 'assigned' → 'accepted' → 'pickup_completed' → 'delivery_completed'

### STEP 8: REPORT FINDINGS

**FOR EACH REQUIREMENT, REPORT:**
1. ✅ IMPLEMENTED - if feature exists and works correctly
2. ❌ MISSING - if feature is not implemented
3. ⚠️ PARTIAL - if feature exists but has issues
4. 🔧 NEEDS FIX - if feature needs modifications

**INCLUDE SPECIFIC DETAILS:**
- Exact file names and line numbers where code is found
- Function names and their implementations
- Button elements and their click handlers
- API endpoints and their functionality
- Database model fields and their usage

### CRITICAL RULES:

1. **NEVER ASSUME** - Always read the actual files
2. **NEVER HALLUCINATE** - Only report what you find in code
3. **BE SPECIFIC** - Include exact file paths and line numbers
4. **VERIFY EVERYTHING** - Check each requirement systematically
5. **REPORT ACCURATELY** - State exactly what is implemented vs missing

### EXAMPLE VERIFICATION REPORT FORMAT:

```
REQUIREMENT 1: ADMIN ORDER ASSIGNMENT
Status: ✅ IMPLEMENTED
Files: 
- backend/controllers/adminController.js (lines 583-810)
- frontend/src/pages/admin/AdminDashboard.js (lines 714-752)
Details:
- Admin can assign orders via approveAndAssignOrder() function
- Order status changes to 'Pickup_Ready' after assignment
- Delivery agent receives notification via global.emitToDeliveryAgent()
- Agent status updates to 'assigned' in database
```

Follow these instructions exactly to provide accurate verification of the delivery agent system implementation.
