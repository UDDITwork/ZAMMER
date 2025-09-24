# 🚚 **ZAMMER DELIVERY AGENT SYSTEM - COMPREHENSIVE CONTEXT PROMPT**

## 📋 **SYSTEM OVERVIEW**
This is a complete delivery agent management system for ZAMMER e-commerce platform with real-time order tracking, multi-role notifications, and secure payment processing.

---

## 🗄️ **DATABASE MODELS & SCHEMA VARIABLES**

### **1. DELIVERY AGENT MODEL (`DeliveryAgent.js`)**
```javascript
// Core Information Variables
name, email, mobileNumber, phone, password
vehicleType, vehicleDetails.type, vehicleDetails.model, licenseNumber
currentLocation.coordinates, latitude, longitude, workingAreas

// Status & Assignment Variables  
status: 'available'|'assigned'|'delivering'|'offline'
isActive, isAvailable, isOnline
currentOrder, assignedOrders[] with status tracking
deliveryStats, totalDeliveries, totalEarnings, rating
```

### **2. ORDER MODEL (`Order.js`)**
```javascript
// Delivery Agent Assignment
deliveryAgent: {
  agent: ObjectId ref to DeliveryAgent,
  status: 'unassigned'|'assigned'|'accepted'|'rejected'|'pickup_completed'|'delivery_completed',
  assignedAt, acceptedAt, rejectedAt
}

// Pickup Tracking
pickup: {
  isCompleted, completedAt, pickupNotes,
  verificationMethod: 'order_id'|'qr_code'|'manual'
}

// Delivery Tracking  
delivery: {
  isCompleted, completedAt, deliveryNotes,
  attemptCount, attempts[]
}

// Payment & OTP
otpVerification: {
  isRequired, isVerified, currentOTP
}
codPayment: {
  isCollected, collectedAmount, paymentMethod
}
```

### **3. OTP VERIFICATION MODEL (`OtpVerification.js`)**
```javascript
// OTP Details
code: 6-digit numeric OTP
order, deliveryAgent, user: ObjectId references
purpose: 'delivery_confirmation'|'pickup_confirmation'|'payment_confirmation'
status: 'pending'|'verified'|'expired'|'cancelled'
expiresAt: 10-minute default expiry
attemptCount: max 3 attempts
```

---

## 🔄 **COMPLETE DELIVERY FLOW WITH VARIABLES**

### **PHASE 1: ADMIN ASSIGNMENT**
```javascript
// Admin assigns order via dashboard interface
order.deliveryAgent = {
  agent: deliveryAgentId,
  assignedAt: new Date(),
  assignedBy: req.admin._id,
  status: 'assigned'
}
order.status = 'Pickup_Ready'

// Real-time notification to delivery agent (NO order ID visible yet)
global.emitToDeliveryAgent(agentId, 'order-assigned', {
  orderId: order._id,
  orderDetails: { /* order info without orderNumber */ }
})
```

### **PHASE 2: DELIVERY AGENT ACCEPTANCE**
```javascript
// Agent accepts/rejects order via button click
// Frontend: handleAcceptOrder() function
// Backend: PUT /api/delivery/orders/:id/accept

// On acceptance:
order.deliveryAgent.status = 'accepted'
order.deliveryAgent.acceptedAt = new Date()

// ✅ CRITICAL: Order ID becomes visible AFTER acceptance
// Real-time notifications to ALL parties:
global.emitToAdmin('order-accepted-by-agent', { orderId, orderNumber, deliveryAgent })
global.emitToBuyer(userId, 'order-agent-assigned', { orderId, orderNumber, deliveryAgent })
global.emitToSeller(sellerId, 'order-agent-assigned', { orderId, orderNumber, deliveryAgent })
```

### **PHASE 3: SELLER LOCATION REACHED**
```javascript
// Agent clicks "Reached Seller Location" button
// Frontend: handlePickupComplete() function  
// Backend: PUT /api/delivery/orders/:id/pickup

// Seller tells Order ID to delivery agent
// Agent enters Order ID for verification
// Exact match validation: orderIdVerification === order.orderNumber

// On successful verification:
order.pickup = {
  isCompleted: true,
  completedAt: new Date(),
  verificationMethod: 'order_id',
  pickupNotes: 'Order ID verified'
}
order.deliveryAgent.status = 'pickup_completed'
order.status = 'Out_for_Delivery'

// ✅ Real-time notifications to ALL parties:
global.emitToAdmin('order-pickup-completed', { orderId, orderNumber, pickupTime })
global.emitToBuyer(userId, 'order-pickup-completed', { orderId, orderNumber, pickupTime })
global.emitToSeller(sellerId, 'order-pickup-completed', { orderId, orderNumber, pickupTime })
```

### **PHASE 4: BUYER LOCATION REACHED**
```javascript
// Agent clicks "Reached Buyer Location" button
// Frontend: handleConfirmDelivery() function
// Backend: PUT /api/delivery/orders/:id/delivery

// ✅ OTP GENERATION (Tulio API):
if (order.paymentMethod === 'online') {
  // Generate 6-digit OTP via Tulio API
  const otpRecord = await OtpVerification.createDeliveryOTP({
    orderId: order._id,
    userId: order.user._id,
    deliveryAgentId: req.deliveryAgent.id,
    userPhone: order.user.mobileNumber,
    purpose: 'delivery_confirmation'
  })
  
  // Send OTP via SMS to buyer
  await otpService.sendOTP(order.user.mobileNumber, otpRecord.code)
}

// ✅ SMEPay Dynamic QR (COD Payment):
if (order.paymentMethod === 'cod') {
  // Generate dynamic QR for COD payment collection
  const qrData = await smepayService.generateDynamicQR({
    amount: order.totalPrice,
    orderId: order._id,
    purpose: 'cod_payment'
  })
}
```

### **PHASE 5: DELIVERY COMPLETION**
```javascript
// Agent enters OTP for online payments OR confirms COD payment
// On successful completion:
order.delivery = {
  isCompleted: true,
  completedAt: new Date(),
  deliveryNotes: 'Delivery completed successfully'
}
order.status = 'Delivered'

// ✅ Final notifications to ALL parties:
global.emitToAdmin('order-delivered', { orderId, orderNumber, deliveryTime })
global.emitToBuyer(userId, 'order-delivered', { orderId, orderNumber, deliveryTime })
global.emitToSeller(sellerId, 'order-delivered', { orderId, orderNumber, deliveryTime })
```

---

## 🎯 **KEY IMPLEMENTATION CHECKPOINTS**

### **1. ORDER ID VISIBILITY CONTROL**
```javascript
// ✅ IMPLEMENTED: Order ID hidden until agent accepts
// In getAvailableOrders(): orderNumber = 'Hidden until pickup'
// After acceptance: orderNumber = actual order number
```

### **2. BUTTON IMPLEMENTATIONS**
```javascript
// ✅ ACCEPT ORDER BUTTON:
// Frontend: <button onClick={handleAcceptOrder}>Accept Order</button>
// Backend: PUT /api/delivery/orders/:id/accept

// ✅ SELLER LOCATION BUTTON:  
// Frontend: <button onClick={handlePickupComplete}>Complete Pickup</button>
// Backend: PUT /api/delivery/orders/:id/pickup

// ✅ BUYER LOCATION BUTTON:
// Frontend: <button onClick={handleConfirmDelivery}>Complete Delivery</button>
// Backend: PUT /api/delivery/orders/:id/delivery
```

### **3. REAL-TIME NOTIFICATIONS**
```javascript
// ✅ INSTANT ADMIN NOTIFICATIONS:
global.emitToAdmin('order-accepted-by-agent', data)
global.emitToAdmin('order-pickup-completed', data)  
global.emitToAdmin('order-delivered', data)

// ✅ BUYER NOTIFICATIONS:
global.emitToBuyer(userId, 'order-agent-assigned', data)
global.emitToBuyer(userId, 'order-pickup-completed', data)
global.emitToBuyer(userId, 'order-delivered', data)

// ✅ SELLER NOTIFICATIONS:
global.emitToSeller(sellerId, 'order-agent-assigned', data)
global.emitToSeller(sellerId, 'order-pickup-completed', data)
global.emitToSeller(sellerId, 'order-delivered', data)
```

### **4. PAYMENT PROCESSING**
```javascript
// ✅ TULIO API OTP (Online Payments):
// Service: otpService.js
// Method: createDeliveryOTP() + sendOTP()
// Integration: Twilio SMS API

// ✅ SMEPay Dynamic QR (COD Payments):
// Service: smepayService.js  
// Method: generateDynamicQR()
// Integration: SMEPay API
```

---

## 🔍 **VERIFICATION CHECKLIST**

When implementing or checking delivery agent flow, verify:

### **✅ Admin Assignment Phase:**
- [ ] Admin can assign orders via dashboard interface
- [ ] Order status changes to 'Pickup_Ready'
- [ ] Delivery agent receives notification (without order ID)
- [ ] Agent status changes to 'assigned'

### **✅ Agent Acceptance Phase:**
- [ ] Agent can accept/reject assigned orders via button
- [ ] Order ID becomes visible after acceptance
- [ ] Admin receives instant notification of acceptance
- [ ] Buyer and seller receive notifications
- [ ] Agent status changes to 'accepted'

### **✅ Seller Location Phase:**
- [ ] Agent can confirm reaching seller location via button
- [ ] Order ID verification interface is available
- [ ] Exact match validation works (case-sensitive)
- [ ] All parties receive pickup completion notifications
- [ ] Order status changes to 'Out_for_Delivery'

### **✅ Buyer Location Phase:**
- [ ] Agent can confirm reaching buyer location via button
- [ ] OTP generation works for online payments (Tulio API)
- [ ] SMEPay dynamic QR works for COD payments
- [ ] Delivery completion updates all parties
- [ ] Order status changes to 'Delivered'

### **✅ Security & Validation:**
- [ ] Order ID visibility control is enforced
- [ ] OTP verification has attempt limits (max 3)
- [ ] Location tracking is implemented
- [ ] Real-time notifications reach all stakeholders
- [ ] Payment processing is secure and validated

---

## 🚨 **CRITICAL VARIABLES TO MONITOR**

### **Order Status Flow:**
```
'Confirmed' → 'Pickup_Ready' → 'Out_for_Delivery' → 'Delivered'
```

### **Delivery Agent Status Flow:**
```
'available' → 'assigned' → 'accepted' → 'pickup_completed' → 'delivering' → 'available'
```

### **Order ID Visibility States:**
```
Hidden → Visible (after acceptance) → Verified (at pickup) → Used (for delivery)
```

### **Notification Triggers:**
```
Assignment → Acceptance → Pickup → Delivery → Completion
```

---

## 💡 **USAGE INSTRUCTIONS**

1. **For New Implementations**: Follow the exact variable names and flow sequence
2. **For Bug Fixes**: Check each phase's button implementations and notification triggers
3. **For Testing**: Verify all stakeholders receive notifications at each phase
4. **For Integration**: Ensure Tulio API and SMEPay services are properly configured
5. **For Security**: Validate order ID visibility control and OTP attempt limits

This context prompt ensures complete understanding of the delivery agent system architecture, variables, and flow requirements for ZAMMER platform.
