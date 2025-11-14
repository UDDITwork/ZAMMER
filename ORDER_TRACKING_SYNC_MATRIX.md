# Order Tracking Synchronization Matrix

This document tracks all variables that need to be synchronized between the delivery agent portal and admin panel for order tracking.

## Database Variables (Order Model)

| Variable | Type | Location | Updated By | Sync Event |
|----------|------|----------|------------|------------|
| `deliveryAgent.agent` | ObjectId | Order.deliveryAgent.agent | Admin (assignment) | Assignment |
| `deliveryAgent.assignedAt` | Date | Order.deliveryAgent.assignedAt | Admin/Backend | Assignment |
| `deliveryAgent.status` | String | Order.deliveryAgent.status | Delivery Agent/Backend | Status Change |
| `deliveryAgent.acceptedAt` | Date | Order.deliveryAgent.acceptedAt | Backend (accept endpoint) | Accept Order |
| `pickup.isCompleted` | Boolean | Order.pickup.isCompleted | Backend (pickup endpoint) | Complete Pickup |
| `pickup.completedAt` | Date | Order.pickup.completedAt | Backend (pickup endpoint) | Complete Pickup |
| `pickup.pickupNotes` | String | Order.pickup.pickupNotes | Backend (pickup endpoint) | Complete Pickup |
| `deliveryAgent.pickupCompletedAt` | Date | Order.deliveryAgent.pickupCompletedAt | Backend (pickup endpoint) | Complete Pickup |
| `delivery.locationReachedAt` | Date | Order.delivery.locationReachedAt | Backend (reached-location endpoint) | Reached Delivery Location |
| `deliveryAgent.locationReachedAt` | Date | Order.deliveryAgent.locationReachedAt | Backend (reached-location endpoint) | Reached Delivery Location |
| `deliveryAgent.status` | String | Order.deliveryAgent.status | Backend (reached-location endpoint) | Reached Delivery Location → 'location_reached' |
| `delivery.isCompleted` | Boolean | Order.delivery.isCompleted | Backend (deliver endpoint) | Complete Delivery |
| `delivery.completedAt` | Date | Order.delivery.completedAt | Backend (deliver endpoint) | Complete Delivery |
| `delivery.deliveryNotes` | String | Order.delivery.deliveryNotes | Backend (deliver endpoint) | Complete Delivery |
| `deliveryAgent.status` | String | Order.deliveryAgent.status | Backend (deliver endpoint) | Complete Delivery → 'delivery_completed' |
| `isDelivered` | Boolean | Order.isDelivered | Backend (deliver endpoint) | Complete Delivery |
| `deliveredAt` | Date | Order.deliveredAt | Backend (deliver endpoint) | Complete Delivery |
| `status` | String | Order.status | Backend | Complete Delivery → 'Delivered' |

## Frontend State Variables (Delivery Agent Portal)

| Variable | Type | Location | Updated By | Sync Event |
|----------|------|----------|------------|------------|
| `orderStates[orderId].sellerLocationReached` | Boolean | AssignedOrders.js | Local (button click) | Reached Seller Location |
| `orderStates[orderId].deliveryLocationReached` | Boolean | AssignedOrders.js | API Response | Reached Delivery Location |
| `pickupForm.orderIdVerification` | String | AssignedOrders.js | User Input | Order ID Entry |
| `deliveryForm.otp` | String | AssignedOrders.js | User Input | OTP Entry |
| `deliveryForm.codPaymentType` | String | AssignedOrders.js | User Input | COD Payment Selection |

## Frontend State Variables (Admin Panel)

| Variable | Type | Location | Updated By | Sync Event |
|----------|------|----------|------------|------------|
| `assignedAcceptedOrders` | Array | AdminDashboard.js | API Fetch | Page Load / Socket Update |
| `selectedTrackingOrder` | Object | AdminDashboard.js | User Click | Order Selection |
| `assignedOrdersLoading` | Boolean | AdminDashboard.js | API Call | Fetch State |

## Socket Events for Real-Time Sync

| Event Name | Emitted From | Received By | Data Included |
|------------|--------------|-------------|---------------|
| `order-accepted-by-agent` | Backend (acceptOrder) | Admin Panel | Order ID, Agent Info, Timestamp |
| `order-pickup-completed` | Backend (completePickup) | Admin Panel, Buyer | Order ID, Pickup Time, Notes |
| `delivery-agent-reached` | Backend (markReachedLocation) | Admin Panel, Buyer, Seller | Order ID, Location Time |
| `order-delivered` | Backend (completeDelivery) | Admin Panel, Buyer, Seller | Order ID, Delivery Time, Notes |

## Tracking Steps Synchronization

### Step 1: Accepted by Delivery Agent
- **Backend Variable**: `deliveryAgent.status = 'accepted'`, `deliveryAgent.acceptedAt`
- **Socket Event**: `order-accepted-by-agent`
- **Admin Display**: Shows "Accepted by Delivery Agent" with timestamp
- **Delivery Agent Display**: Order status changes to "accepted"

### Step 2: Delivery Agent Reached Seller Location
- **Frontend Variable**: `orderStates[orderId].sellerLocationReached = true` (local only)
- **Backend Variable**: Not tracked separately (implicit in pickup)
- **Admin Display**: Shows "Delivery Agent Reached Seller Location" when pickup is completed
- **Delivery Agent Display**: Button "Reached Seller Location" → Opens pickup modal

### Step 3: Order Has Been Picked Up
- **Backend Variable**: `pickup.isCompleted = true`, `pickup.completedAt`, `deliveryAgent.status = 'pickup_completed'`
- **Socket Event**: `order-pickup-completed`
- **Admin Display**: Shows "Order Has Been Picked Up" with timestamp and order ID verification notes
- **Delivery Agent Display**: Order status updates to "pickup_completed", "Reached Delivery Location" button appears
- **Buyer Display**: Order tracking shows "Picked Up" status

### Step 4: Delivery Agent Has Reached Delivery Address
- **Backend Variable**: `deliveryAgent.status = 'location_reached'`, `delivery.locationReachedAt`, `deliveryAgent.locationReachedAt`
- **Socket Event**: `delivery-agent-reached`
- **Admin Display**: Shows "Delivery Agent Has Reached Delivery Address" with timestamp
- **Delivery Agent Display**: OTP input form appears (prepaid) or COD payment options (COD)
- **Buyer Display**: Order tracking shows "Agent Reached" status, OTP sent (if prepaid)

### Step 5: Order Has Been Delivered
- **Backend Variable**: `delivery.isCompleted = true`, `delivery.completedAt`, `deliveryAgent.status = 'delivery_completed'`, `isDelivered = true`, `status = 'Delivered'`
- **Socket Event**: `order-delivered`
- **Admin Display**: Shows "Order Has Been Delivered" with timestamp and delivery notes
- **Delivery Agent Display**: Order removed from active list or marked as delivered
- **Buyer Display**: Order tracking shows "Delivered" status

## Payment Flow Synchronization

### Prepaid Orders (SMEPay/Cashfree)
1. **Reached Delivery Location**: OTP sent via MSG91
2. **OTP Verification**: `otpVerification.isVerified = true`, `otpVerification.verifiedAt`
3. **Delivery Completion**: `delivery.isCompleted = true`

### COD Orders
1. **Reached Delivery Location**: QR code generated (SMEPay) or cash option shown
2. **Payment Confirmation**: 
   - If QR: `codPayment.paymentMethod = 'qr'`, `codPayment.isCollected = true`
   - If Cash: `codPayment.paymentMethod = 'cash'`, `codPayment.isCollected = true`
3. **Delivery Completion**: `delivery.isCompleted = true`

## Sync Verification Checklist

- [x] Order acceptance updates `deliveryAgent.status` and emits socket event
- [x] Pickup completion updates `pickup.isCompleted` and emits socket event
- [x] Reached delivery location updates `deliveryAgent.status` to 'location_reached' and emits socket event
- [x] Delivery completion updates `delivery.isCompleted` and emits socket event
- [x] Admin panel listens to all socket events and refreshes assigned orders list
- [x] Tracking timeline shows all steps with correct completion status
- [x] Buyer tracking updates when pickup and delivery are completed
- [x] Seller receives notifications for pickup and delivery events

## Notes

- **Reached Seller Location**: Currently tracked locally in frontend only. Backend infers this from pickup completion status.
- **Real-time Updates**: Admin panel refreshes automatically via socket events when delivery agent performs actions.
- **Order Timeline**: Backend maintains `orderTimeline` array for detailed tracking history (if available in schema).

