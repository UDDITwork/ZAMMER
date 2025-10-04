// frontend/src/components/return/ReturnRequestModal.js - Return Request Modal Component

import React, { useState, useEffect } from 'react';
import { X, Clock, AlertCircle, CheckCircle, Package, User, MapPin } from 'lucide-react';

const ReturnRequestModal = ({ 
  isOpen, 
  onClose, 
  order, 
  onReturnRequested,
  socket 
}) => {
  const [returnReason, setReturnReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const predefinedReasons = [
    'Product not as described',
    'Wrong size received',
    'Product damaged during delivery',
    'Changed my mind',
    'Quality issues',
    'Received wrong product',
    'Product defective',
    'Not satisfied with quality'
  ];

  useEffect(() => {
    if (isOpen && order) {
      checkReturnEligibility();
    }
  }, [isOpen, order]);

  const checkReturnEligibility = async () => {
    try {
      const response = await fetch(`/api/returns/eligibility/${order._id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setEligibility(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to check return eligibility');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!returnReason && !customReason) {
      setError('Please select or provide a return reason');
      return;
    }

    const reason = returnReason === 'Other' ? customReason : returnReason;
    
    setLoading(true);
    setError('');

    try {
      // Use socket for real-time request
      if (socket) {
        socket.emit('request-return', {
          orderId: order._id,
          reason
        });
      } else {
        // Fallback to REST API
        const response = await fetch(`/api/returns/request/${order._id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ reason })
        });

        const data = await response.json();
        
        if (data.success) {
          onReturnRequested(data.data);
          onClose();
        } else {
          setError(data.message);
        }
      }
    } catch (err) {
      setError('Failed to submit return request');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (hours) => {
    if (hours <= 0) return 'Expired';
    
    const hoursInt = Math.floor(hours);
    const minutes = Math.floor((hours - hoursInt) * 60);
    
    if (hoursInt > 0) {
      return `${hoursInt}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'eligible': return 'text-green-600 bg-green-100';
      case 'requested': return 'text-blue-600 bg-blue-100';
      case 'approved': return 'text-purple-600 bg-purple-100';
      case 'picked_up': return 'text-orange-600 bg-orange-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'eligible': return <CheckCircle className="w-4 h-4" />;
      case 'requested': return <Clock className="w-4 h-4" />;
      case 'approved': return <Package className="w-4 h-4" />;
      case 'picked_up': return <Package className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Request Return
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Order Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Order Number:</span>
                <span className="ml-2 font-medium">{order.orderNumber}</span>
              </div>
              <div>
                <span className="text-gray-500">Total Amount:</span>
                <span className="ml-2 font-medium">₹{order.totalPrice}</span>
              </div>
              <div>
                <span className="text-gray-500">Delivered On:</span>
                <span className="ml-2 font-medium">
                  {new Date(order.deliveredAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Items:</span>
                <span className="ml-2 font-medium">{order.orderItems.length}</span>
              </div>
            </div>
          </div>

          {/* Eligibility Status */}
          {eligibility && (
            <div className={`rounded-lg p-4 ${eligibility.eligible ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center space-x-3">
                {eligibility.eligible ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <h3 className={`font-medium ${eligibility.eligible ? 'text-green-900' : 'text-red-900'}`}>
                    {eligibility.eligible ? 'Eligible for Return' : 'Not Eligible for Return'}
                  </h3>
                  <p className={`text-sm ${eligibility.eligible ? 'text-green-700' : 'text-red-700'}`}>
                    {eligibility.reason}
                  </p>
                  {eligibility.eligible && eligibility.hoursRemaining > 0 && (
                    <p className="text-sm text-green-700 mt-1">
                      ⏰ {formatTimeRemaining(eligibility.hoursRemaining)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Current Return Status */}
          {order.returnDetails && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-3">
                <Package className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-medium text-blue-900">Current Return Status</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.returnDetails.returnStatus)}`}>
                      {getStatusIcon(order.returnDetails.returnStatus)}
                      <span className="ml-1 capitalize">{order.returnDetails.returnStatus.replace('_', ' ')}</span>
                    </span>
                  </div>
                  {order.returnDetails.returnRequestedAt && (
                    <p className="text-sm text-blue-700 mt-1">
                      Requested on: {new Date(order.returnDetails.returnRequestedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Return Request Form */}
          {eligibility?.eligible && (!order.returnDetails || order.returnDetails.returnStatus === 'eligible') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Return Reason *
                </label>
                <div className="space-y-2">
                  {predefinedReasons.map((reason) => (
                    <label key={reason} className="flex items-center">
                      <input
                        type="radio"
                        name="returnReason"
                        value={reason}
                        checked={returnReason === reason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">{reason}</span>
                    </label>
                  ))}
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="returnReason"
                      value="Other"
                      checked={returnReason === 'Other'}
                      onChange={(e) => setReturnReason(e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Other</span>
                  </label>
                </div>
              </div>

              {returnReason === 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Please specify the reason *
                  </label>
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Please provide details about why you want to return this order..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    required={returnReason === 'Other'}
                  />
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !returnReason || (returnReason === 'Other' && !customReason)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </div>
                  ) : (
                    'Submit Return Request'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Return Process Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Return Process</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">1</span>
                </div>
                <div>
                  <p className="font-medium">Submit Request</p>
                  <p>Submit your return request with a valid reason within 24 hours of delivery.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">2</span>
                </div>
                <div>
                  <p className="font-medium">Admin Approval</p>
                  <p>Our admin will review and approve your return request.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">3</span>
                </div>
                <div>
                  <p className="font-medium">Pickup Scheduled</p>
                  <p>A delivery agent will be assigned to pick up the items from your location.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">4</span>
                </div>
                <div>
                  <p className="font-medium">Return to Seller</p>
                  <p>The items will be returned to the seller and your refund will be processed.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnRequestModal;
