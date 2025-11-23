# Fix Return Orders Error and Implement Buyer Cancellation via REST API

## Issues Identified

1. **Return Orders API Error**: The `getReturnOrders` controller uses `req.user?.id` but should use `req.admin?._id` since it's an admin-protected route
2. **Buyer Cancellation Not Working**: Currently uses socket.io, but user wants REST API endpoint similar to delivery agent cancellation
3. **Order Status Update**: Need to ensure cancellation properly updates order status to "Cancelled" and appears in Cancelled tab

## Database Schema Analysis

From `backend/models/Order.js`:
- `status`: Enum ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Pickup_Ready', 'Out_for_Delivery']
- `cancellationDetails`: Object with:
  - `cancelledBy`: Enum ['buyer', 'seller', 'admin', 'delivery_agent']
  - `cancelledAt`: Date
  - `cancellationReason`: String
  - `cancelledByName`: String
- `updateStatus(newStatus, changedBy, notes, location)`: Method that handles status updates and cancellation details
- `statusHistory[]`: Array tracking all status changes

## Implementation Plan

### 1. Fix Return Orders API Endpoint

**File**: `backend/controllers/returnController.js`

**Issue**: Line 241 uses `req.user?.id` but should use `req.admin?._id`

**Fix**:
- Change `const adminId = req.user?.id;` to `const adminId = req.admin?._id;`
- Update logging to use `req.admin?._id`

### 2. Create Buyer Cancellation REST API Endpoint

**File**: `backend/controllers/orderController.js`

**New Function**: `cancelOrderByBuyer`
- Similar structure to delivery agent cancellation
- Route: `PUT /api/orders/:orderId/cancel-by-buyer`
- Access: Private (User only)
- Validations:
  - Order must belong to the requesting user
  - Order status must be 'Pending' or 'Processing'
  - Cannot cancel if delivery agent has reached buyer location
  - Cannot cancel if already delivered or cancelled
- Request Body: `{ cancellationReason: string }`
- Implementation:
  - Use `order.updateStatus('Cancelled', 'buyer', cancellationReason)`
  - Set `order._cancelledByName = req.user.name` before calling updateStatus
  - Add status history entry
  - Notify seller and admin via socket.io (keep existing notification logic)
  - Return success response with cancellation details

### 3. Add Route for Buyer Cancellation

**File**: `backend/routes/orderRoutes.js`

**New Route**:
```javascript
router.put('/:id/cancel-by-buyer', 
  protectUser,
  [
    body('cancellationReason')
      .notEmpty()
      .withMessage('Cancellation reason is required')
      .isLength({ min: 5, max: 500 })
      .withMessage('Cancellation reason must be between 5 and 500 characters')
  ],
  cancelOrderByBuyer
);
```

### 4. Create Frontend Service Method

**File**: `frontend/src/services/orderService.js` (or create if doesn't exist)

**New Method**: `cancelOrderByBuyer(orderId, cancellationReason)`
- Make PUT request to `/api/orders/:orderId/cancel-by-buyer`
- Include cancellation reason in request body
- Handle errors appropriately
- Return response data

### 5. Update Frontend MyOrdersPage Component

**File**: `frontend/src/pages/user/MyOrdersPage.js`

**Changes**:
- Replace socket.io cancellation logic with REST API call
- Update `confirmCancelOrder` function to:
  - Call `orderService.cancelOrderByBuyer(orderId, cancelReason)`
  - Handle success/error responses
  - Refresh orders list on success
  - Show appropriate toast messages
- Keep the `canCancelOrder` validation logic (already checks location_reached)
- Remove socket.io cancellation listeners (keep for other socket events if needed)

### 6. Verify Cancelled Orders Appear in Cancelled Tab

**File**: `frontend/src/pages/user/MyOrdersPage.js`

**Check**:
- Ensure `fetchOrders` includes orders with status 'Cancelled'
- Verify filtering logic includes 'Cancelled' status in the Cancelled tab
- Test that cancelled orders appear immediately after cancellation

## Files to Modify

1. `backend/controllers/returnController.js` - Fix admin ID reference
2. `backend/controllers/orderController.js` - Add `cancelOrderByBuyer` function
3. `backend/routes/orderRoutes.js` - Add buyer cancellation route
4. `frontend/src/services/orderService.js` - Add cancellation service method
5. `frontend/src/pages/user/MyOrdersPage.js` - Update to use REST API instead of socket.io

## Testing Checklist

- [ ] Admin can fetch return orders without errors
- [ ] Buyer can cancel order via REST API
- [ ] Cancellation reason is required and validated
- [ ] Cannot cancel if delivery agent reached buyer location
- [ ] Cannot cancel already delivered/cancelled orders
- [ ] Order status changes to 'Cancelled'
- [ ] Cancellation details are properly saved (cancelledBy: 'buyer')
- [ ] Cancelled orders appear in Cancelled tab
- [ ] Seller and admin are notified of cancellation
- [ ] Status history is updated correctly

