// frontend/src/components/delivery/OrderCard.js - Order Display Component for Delivery Agents

import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const OrderCard = ({ 
  order, 
  type = 'available', // 'available', 'assigned', 'completed'
  onAccept,
  onReject,
  onPickup,
  onDeliver,
  onViewDetails,
  loading = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  // Handle order actions with loading states
  const handleAction = async (actionType, actionFunction, ...args) => {
    if (loading || actionLoading) return;
    
    setActionLoading(actionType);
    try {
      if (actionFunction) {
        await actionFunction(...args);
      }
    } catch (error) {
      console.error(`Error with ${actionType}:`, error);
    } finally {
      setActionLoading('');
    }
  };

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return 'Address not available';
    
    const parts = [
      address.address,
      address.city,
      address.postalCode
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  // Calculate distance (placeholder - would need actual calculation)
  const calculateDistance = () => {
    // This would calculate distance between agent and pickup/delivery location
    return '2.5 km'; // Placeholder
  };

  // Format time
  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Processing': 'bg-blue-100 text-blue-800',
      'Pickup_Ready': 'bg-orange-100 text-orange-800',
      'Out_for_Delivery': 'bg-purple-100 text-purple-800',
      'Delivered': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Get priority badge
  const getPriorityBadge = () => {
    if (!order.estimatedDelivery) return null;
    
    const timeLeft = new Date(order.estimatedDelivery) - new Date();
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    
    if (hoursLeft < 1) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Urgent
        </span>
      );
    } else if (hoursLeft < 2) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          High Priority
        </span>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Card Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Order Icon */}
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>

            {/* Order Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {type === 'available' ? 'New Order' : `Order #${order.orderNumber || 'Unknown'}`}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                  {order.status.replace('_', ' ')}
                </span>
                {getPriorityBadge()}
              </div>
            </div>
          </div>

          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-lg font-semibold text-gray-900">₹{order.totalAmount || order.totalPrice}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Delivery Fee</p>
            <p className="text-lg font-semibold text-green-600">₹{order.deliveryFee || order.deliveryFees?.agentEarning || 15}</p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-sm font-medium text-gray-900">Customer</span>
          </div>
          <p className="text-sm text-gray-700">{order.customer?.name || order.user?.name || 'Customer Name'}</p>
          {type !== 'available' && (
            <p className="text-sm text-gray-500">{order.customer?.phone || order.user?.phone || 'Phone not available'}</p>
          )}
        </div>

        {/* Delivery Address */}
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-900">Delivery Address</span>
            <span className="text-xs text-gray-500">({calculateDistance()} away)</span>
          </div>
          <p className="text-sm text-gray-700">{formatAddress(order.deliveryAddress || order.shippingAddress)}</p>
        </div>

        {/* Seller Info */}
        {isExpanded && (
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="text-sm font-medium text-gray-900">Pickup from</span>
            </div>
            <p className="text-sm text-gray-700">{order.seller?.name || order.seller?.shopName || 'Seller'}</p>
            <p className="text-sm text-gray-500">{formatAddress(order.seller?.address)}</p>
            {type !== 'available' && order.seller?.phone && (
              <p className="text-sm text-gray-500">{order.seller.phone}</p>
            )}
          </div>
        )}

        {/* Order Items */}
        {isExpanded && order.items && order.items.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-sm font-medium text-gray-900">Items ({order.items.length})</span>
            </div>
            <div className="space-y-2">
              {order.items.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-8 h-8 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  </div>
                </div>
              ))}
              {order.items.length > 3 && (
                <p className="text-xs text-gray-500 text-center">
                  +{order.items.length - 3} more items
                </p>
              )}
            </div>
          </div>
        )}

        {/* Timing Info */}
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Order Time</p>
              <p className="font-medium">{formatTime(order.createdAt)}</p>
            </div>
            {order.estimatedDelivery && (
              <div>
                <p className="text-gray-600">Expected Delivery</p>
                <p className="font-medium">{formatTime(order.estimatedDelivery)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
        {type === 'available' && (
          <div className="flex space-x-2">
            <button
              onClick={() => handleAction('accept', onAccept, order._id)}
              disabled={loading || actionLoading === 'accept'}
              className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading === 'accept' ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Accepting...
                </div>
              ) : (
                'Accept Order'
              )}
            </button>
            
            <button
              onClick={() => handleAction('reject', onReject, order._id)}
              disabled={loading || actionLoading === 'reject'}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Skip
            </button>
          </div>
        )}

        {type === 'assigned' && (
          <div className="space-y-2">
            {order.deliveryAgent?.status === 'assigned' && !order.pickup?.isCompleted && (
              <button
                onClick={() => handleAction('pickup', onPickup, order._id)}
                disabled={loading || actionLoading === 'pickup'}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === 'pickup' ? 'Processing...' : 'Complete Pickup'}
              </button>
            )}
            
            {order.pickup?.isCompleted && !order.delivery?.isCompleted && (
              <button
                onClick={() => handleAction('deliver', onDeliver, order._id)}
                disabled={loading || actionLoading === 'deliver'}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === 'deliver' ? 'Processing...' : 'Complete Delivery'}
              </button>
            )}
            
            <Link
              to={`/delivery/orders/${order._id}`}
              className="block w-full text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              View Details
            </Link>
          </div>
        )}

        {type === 'completed' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-green-600 font-medium">Completed</span>
            </div>
            
            <Link
              to={`/delivery/orders/${order._id}`}
              className="text-sm text-orange-600 hover:text-orange-500 font-medium"
            >
              View Details
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

// Compact Order Card for list views
export const CompactOrderCard = ({ order, onClick, className = '' }) => {
  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow cursor-pointer ${className}`}
      onClick={() => onClick?.(order)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Order #{order.orderNumber || 'New Order'}
            </p>
            <p className="text-xs text-gray-500">
              {order.customer?.name || order.user?.name} • ₹{order.totalAmount || order.totalPrice}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <span className="text-xs font-medium text-green-600">
            ₹{order.deliveryFee || order.deliveryFees?.agentEarning || 15}
          </span>
          <p className="text-xs text-gray-500">
            {order.deliveryAddress?.city || order.shippingAddress?.city || 'Unknown'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderCard;