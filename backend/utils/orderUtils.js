// 🎯 Seller-Specific Status Mapping Helper
// Maps backend order statuses to seller-friendly statuses
// This mapping ONLY affects seller-facing responses, database remains unchanged
// Backend statuses: Pending, Processing, Shipped, Delivered, Cancelled, Pickup_Ready, Out_for_Delivery
// Seller statuses: Pending, Processing, Shipped, Delivered, Cancelled

function mapStatusForSeller(backendStatus) {
  const statusMap = {
    'Pending': 'Pending',                    // Keep as-is
    'Processing': 'Processing',              // Keep as-is
    'Pickup_Ready': 'Processing',            // When admin assigns agent → seller sees as Ready to Ship
    'Out_for_Delivery': 'Shipped',           // When agent picks up → seller sees as Shipped
    'Out for Delivery': 'Shipped',           // Handle both formats
    'Shipped': 'Shipped',                    // Keep as-is
    'Delivered': 'Delivered',                // Keep as-is
    'Cancelled': 'Cancelled'                 // Keep as-is
  };
  return statusMap[backendStatus] || backendStatus; // Fallback to original if not mapped
}

module.exports = {
  mapStatusForSeller
};
