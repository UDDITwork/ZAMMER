# Order Status Tracking Variables and Values

This document outlines all order status tracking variables in the database and their possible values.

## Main Order Status (`status`)

**Field Path:** `order.status`

**Type:** String (Enum)

**Possible Values:**
- `'Pending'` - Order has been placed but not yet processed
- `'Processing'` - Order is being prepared by seller
- `'Shipped'` - Order has been shipped (legacy status)
- `'Delivered'` - Order has been successfully delivered to customer
- `'Cancelled'` - Order has been cancelled by any party
- `'Pickup_Ready'` - Order is ready for pickup by delivery agent (assigned to agent)
- `'Out_for_Delivery'` - Order has been picked up and is on the way to customer

**Updated By:** 
- `buyer` - When buyer cancels
- `seller` - When seller updates status
- `admin` - When admin assigns delivery agent or updates status
- `delivery_agent` - When agent completes pickup/delivery or cancels
- `system` - Automatic status updates

---

## Delivery Agent Status (`deliveryAgent.status`)

**Field Path:** `order.deliveryAgent.status`

**Type:** String (Enum)

**Possible Values:**
- `'unassigned'` - No delivery agent assigned yet
- `'assigned'` - Order assigned to delivery agent (awaiting acceptance)
- `'accepted'` - Delivery agent has accepted the order
- `'rejected'` - Delivery agent rejected the order assignment
- `'pickup_completed'` - Agent has completed pickup from seller
- `'location_reached'` - Agent has reached buyer's delivery location
- `'delivery_completed'` - Agent has completed delivery to buyer

**Updated By:** Delivery agent actions (accept, reject, pickup, delivery)

---

## Payment Status (`paymentStatus`)

**Field Path:** `order.paymentStatus`

**Type:** String (Enum)

**Possible Values:**
- `'pending'` - Payment not yet initiated
- `'processing'` - Payment is being processed
- `'completed'` - Payment successfully completed
- `'failed'` - Payment attempt failed
- `'cancelled'` - Payment was cancelled
- `'refunded'` - Payment has been refunded

---

## Admin Approval Status (`adminApproval.status`)

**Field Path:** `order.adminApproval.status`

**Type:** String (Enum)

**Possible Values:**
- `'pending'` - Awaiting admin approval for delivery assignment
- `'approved'` - Admin has approved order for delivery assignment
- `'rejected'` - Admin has rejected the order
- `'auto_approved'` - Order auto-approved after timeout (1 hour)

---

## Cancellation Details (`cancellationDetails`)

**Field Path:** `order.cancellationDetails`

**Type:** Object

**Fields:**
- `cancelledBy` (String, Enum): `'buyer'`, `'seller'`, `'admin'`, `'delivery_agent'`
- `cancelledAt` (Date): Timestamp when order was cancelled
- `cancellationReason` (String): Reason provided for cancellation
- `cancelledByName` (String): Name of the person who cancelled

**When Set:** Automatically set when `order.status` is changed to `'Cancelled'`

---

## Status History (`statusHistory`)

**Field Path:** `order.statusHistory[]`

**Type:** Array of Objects

**Object Structure:**
```javascript
{
  status: String,           // The status value
  changedBy: String,        // 'buyer', 'seller', 'admin', 'delivery_agent', 'system'
  changedAt: Date,          // Timestamp
  notes: String,            // Optional notes about the status change
  location: {              // Optional location data
    type: 'Point',
    coordinates: [Number, Number]  // [longitude, latitude]
  }
}
```

**Purpose:** Tracks complete history of all status changes for audit trail

---

## Pickup Status (`pickup`)

**Field Path:** `order.pickup`

**Type:** Object

**Fields:**
- `isCompleted` (Boolean): Whether pickup from seller is completed
- `completedAt` (Date): Timestamp when pickup was completed
- `sellerLocationReachedAt` (Date): When agent reached seller location
- `verificationMethod` (String, Enum): `'order_id'`, `'qr_code'`, `'manual'`
- `pickupLocation` (Object): GeoJSON Point with coordinates
- `pickupNotes` (String): Notes from pickup

---

## Delivery Status (`delivery`)

**Field Path:** `order.delivery`

**Type:** Object

**Fields:**
- `isAttempted` (Boolean): Whether delivery was attempted
- `isCompleted` (Boolean): Whether delivery is completed
- `attemptCount` (Number): Number of delivery attempts
- `attempts` (Array): History of delivery attempts
- `locationReachedAt` (Date): When agent reached buyer location
- `locationNotes` (String): Notes about location
- `completedAt` (Date): When delivery was completed
- `deliveryLocation` (Object): GeoJSON Point with coordinates
- `recipientName` (String): Name of person who received order
- `deliveryNotes` (String): Notes from delivery

---

## COD Payment Status (`codPayment`)

**Field Path:** `order.codPayment`

**Type:** Object

**Fields:**
- `isCollected` (Boolean): Whether COD payment was collected
- `collectedAt` (Date): When payment was collected
- `collectedAmount` (Number): Amount collected
- `paymentMethod` (String, Enum): `'cash'`, `'upi'`, `'card'`
- `transactionId` (String): Transaction ID if applicable
- `collectedBy` (ObjectId): Reference to DeliveryAgent who collected

---

## Order Status Flow

### Normal Flow:
1. `Pending` → Order created
2. `Processing` → Seller starts processing
3. `Pickup_Ready` → Admin assigns delivery agent
4. `Out_for_Delivery` → Agent completes pickup
5. `Delivered` → Agent completes delivery

### Cancellation Flow:
- Any status → `Cancelled` (by buyer, seller, admin, or delivery_agent)
- `cancellationDetails` is automatically populated
- Order moves to Cancelled tab for all parties

### Delivery Agent Cancellation:
- When delivery agent cancels:
  1. `order.status` → `'Cancelled'`
  2. `cancellationDetails.cancelledBy` → `'delivery_agent'`
  3. `cancellationDetails.cancellationReason` → Reason provided
  4. `deliveryAgent.status` → `'rejected'`
  5. `deliveryAgent.agent` → `null` (unassigned for reassignment)
  6. `deliveryAgent.status` → `'unassigned'`
  7. Status history entry added with `changedBy: 'delivery_agent'`

---

## Database Updates When Delivery Agent Cancels Order

### Fields Updated:
1. **`order.status`** → `'Cancelled'`
2. **`order.cancellationDetails`**:
   - `cancelledBy`: `'delivery_agent'`
   - `cancelledAt`: Current timestamp
   - `cancellationReason`: Reason provided by agent
   - `cancelledByName`: Agent's name
3. **`order.deliveryAgent`**:
   - `status`: `'rejected'` → then `'unassigned'`
   - `rejectedAt`: Current timestamp
   - `rejectionReason`: Cancellation reason
   - `agent`: `null` (unassigned)
   - `assignedAt`: `null`
4. **`order.statusHistory[]`**: New entry added with:
   - `status`: `'Cancelled'`
   - `changedBy`: `'delivery_agent'`
   - `changedAt`: Current timestamp
   - `notes`: Cancellation reason
5. **`deliveryAgent.assignedOrdersCount`**: Decremented (if > 0)

---

## Visibility Across Parties

When an order is cancelled by delivery agent:

### Admin View:
- Order appears in **Cancelled** tab
- Can see cancellation reason
- Can reassign order to another agent if needed
- `order.status` = `'Cancelled'`
- `cancellationDetails.cancelledBy` = `'delivery_agent'`

### Buyer View:
- Order appears in **Cancelled** tab
- Can see cancellation reason
- May be eligible for refund if prepaid
- `order.status` = `'Cancelled'`

### Seller View:
- Order appears in **Cancelled** tab
- Can see cancellation reason
- Inventory may be restored
- `order.status` = `'Cancelled'`

### Delivery Agent View:
- Order removed from assigned orders list
- Order appears in cancelled/history if applicable
- `order.status` = `'Cancelled'`

---

## API Endpoint

**Route:** `PUT /api/delivery/orders/:id/cancel`

**Access:** Private (Delivery Agent only)

**Request Body:**
```json
{
  "cancellationReason": "Customer unavailable / Wrong address / Other valid reason"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "orderId": "...",
    "orderNumber": "ORD-20251122-001",
    "status": "Cancelled",
    "cancelledBy": "delivery_agent",
    "cancelledAt": "2025-11-22T10:30:00.000Z",
    "cancellationReason": "Customer unavailable"
  }
}
```

---

## Files Modified

1. **Backend Controller:** `backend/controllers/deliveryAgentController.js`
   - Added `cancelOrder` function

2. **Backend Routes:** `backend/routes/deliveryRoutes.js`
   - Added route: `PUT /api/delivery/orders/:id/cancel`

3. **Frontend Component:** `frontend/src/pages/delivery/AssignedOrders.js`
   - Added cancel button in delivery modal
   - Added cancel modal with reason input
   - Added `handleCancelOrder` function
   - Added state: `showCancelModal`, `cancelReason`

---

## Validation Rules

1. **Cancellation Reason Required:** Must be provided and non-empty
2. **Order Must Be Assigned:** Order must be assigned to the requesting agent
3. **Order Cannot Be Delivered:** Cannot cancel already delivered orders
4. **Order Cannot Be Already Cancelled:** Cannot cancel already cancelled orders

---

## Notes

- When delivery agent cancels, the order is automatically unassigned so admin can reassign
- Cancellation reason is visible to all parties (admin, buyer, seller)
- Status history maintains complete audit trail
- Delivery agent's assigned order count is decremented
- Order moves to Cancelled tab for all parties immediately

