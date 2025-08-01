// frontend/src/pages/delivery/OrderPickup.js - Order Pickup with ID Verification

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDelivery } from '../../contexts/DeliveryContext';
import DeliveryLayout from '../../components/layouts/DeliveryLayout';

const OrderPickup = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { 
    assignedOrders, 
    completePickup, 
    deliveryService,
    getCurrentLocation,
    showNotification 
  } = useDelivery();

  const [order, setOrder] = useState(null);
  const [orderIdVerification, setOrderIdVerification] = useState('');
  const [pickupNotes, setPickupNotes] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [errors, setErrors] = useState({});

  // Find the order
  useEffect(() => {
    const foundOrder = assignedOrders.find(o => o.id === orderId);
    if (foundOrder) {
      setOrder(foundOrder);
    } else {
      showNotification('Order not found', 'error');
      navigate('/delivery/orders/assigned');
    }
  }, [orderId, assignedOrders, navigate, showNotification]);

  // Get current location on component mount
  useEffect(() => {
    handleGetLocation();
  }, []);

  // Handle getting current location
  const handleGetLocation = async () => {
    setIsGettingLocation(true);
    try {
      const result = await deliveryService.getCurrentLocation();
      if (result.success) {
        setCurrentLocation(result.data);
        showNotification('Location obtained successfully', 'success');
      } else {
        showNotification(result.message || 'Failed to get location', 'warning');
      }
    } catch (error) {
      showNotification('Location access denied', 'warning');
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'orderIdVerification') {
      setOrderIdVerification(value);
      // Clear error when user starts typing
      if (errors.orderIdVerification) {
        setErrors(prev => ({ ...prev, orderIdVerification: '' }));
      }
    } else if (name === 'pickupNotes') {
      setPickupNotes(value);
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!orderIdVerification.trim()) {
      newErrors.orderIdVerification = 'Order ID is required for pickup verification';
    }

    if (!order) {
      newErrors.general = 'Order information not found';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle pickup confirmation
  const handleConfirmPickup = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Validate order ID matches (if order number is visible)
    if (order.orderNumber !== 'Hidden until pickup') {
      const validation = deliveryService.validateOrderId(orderIdVerification, order.orderNumber);
      if (!validation.isValid) {
        setErrors({ orderIdVerification: validation.message });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const pickupData = {
        orderIdVerification: orderIdVerification.trim(),
        pickupNotes: pickupNotes.trim(),
        location: currentLocation ? {
          type: 'Point',
          coordinates: [currentLocation.longitude, currentLocation.latitude]
        } : null
      };

      const result = await completePickup(orderId, pickupData);

      if (result.success) {
        showNotification('Pickup completed successfully!', 'success');
        navigate('/delivery/orders/assigned');
      } else {
        setErrors({ general: result.message });
      }
    } catch (error) {
      setErrors({ general: 'Failed to complete pickup. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!order) {
    return (
      <DeliveryLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
        </div>
      </DeliveryLayout>
    );
  }

  return (
    <DeliveryLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/delivery/orders/assigned')}
              className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Complete Pickup
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Verify order ID with seller and confirm pickup
              </p>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol className="flex items-center">
              <li className="relative">
                <div className="flex items-center">
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-green-600">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-4 h-0.5 w-16 bg-green-600" />
                </div>
                <p className="mt-2 text-xs font-medium text-green-600">Order Accepted</p>
              </li>
              <li className="relative">
                <div className="flex items-center">
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-orange-600">
                    <span className="text-sm font-medium text-white">2</span>
                  </div>
                  <div className="ml-4 h-0.5 w-16 bg-gray-300" />
                </div>
                <p className="mt-2 text-xs font-medium text-orange-600">Pickup in Progress</p>
              </li>
              <li className="relative">
                <div className="flex items-center">
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
                    <span className="text-sm font-medium text-gray-500">3</span>
                  </div>
                </div>
                <p className="mt-2 text-xs font-medium text-gray-500">Delivery</p>
              </li>
            </ol>
          </nav>
        </div>

        {/* Error Alert */}
        {errors.general && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{errors.general}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Order Information */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Order Information</h2>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Customer Details</h3>
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-sm font-medium text-gray-900">{order.customer.name}</p>
                    <p className="text-sm text-gray-600">📞 {order.customer.phone}</p>
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="font-medium">Delivery to:</span><br />
                      {order.deliveryAddress.address}<br />
                      {order.deliveryAddress.city}, {order.deliveryAddress.postalCode}
                    </p>
                  </div>
                </div>

                {/* Seller Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Pickup Location</h3>
                  <div className="bg-orange-50 rounded-md p-3 border border-orange-200">
                    <p className="text-sm font-medium text-gray-900">{order.seller.shopName || order.seller.name}</p>
                    <p className="text-sm text-gray-600">{order.seller.address}</p>
                    {order.seller.phone && (
                      <p className="text-sm text-gray-600 mt-2">📞 {order.seller.phone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Order Items ({order.items.length})</h3>
                <div className="bg-gray-50 rounded-md p-3">
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        {item.image && (
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-600">Total Order Value:</span>
                <span className="font-medium text-gray-900">₹{order.totalAmount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Your Delivery Fee:</span>
                <span className="font-medium text-green-600">₹{order.deliveryFee}</span>
              </div>
            </div>
          </div>

          {/* Pickup Verification Form */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Pickup Verification</h2>
            </div>

            <form onSubmit={handleConfirmPickup} className="px-6 py-4 space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Pickup Instructions</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Ask the seller for the order ID</li>
                        <li>Enter the order ID below to verify</li>
                        <li>Collect all items mentioned in the order</li>
                        <li>Confirm pickup to start delivery</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order ID Verification */}
              <div>
                <label htmlFor="orderIdVerification" className="block text-sm font-medium text-gray-700">
                  Order ID (Ask seller for this) *
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="orderIdVerification"
                    name="orderIdVerification"
                    required
                    value={orderIdVerification}
                    onChange={handleInputChange}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                      errors.orderIdVerification ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter the order ID provided by seller"
                  />
                  {errors.orderIdVerification && (
                    <p className="mt-1 text-sm text-red-600">{errors.orderIdVerification}</p>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  The seller will provide you with the unique order ID for verification
                </p>
              </div>

              {/* Pickup Notes */}
              <div>
                <label htmlFor="pickupNotes" className="block text-sm font-medium text-gray-700">
                  Pickup Notes (Optional)
                </label>
                <div className="mt-1">
                  <textarea
                    id="pickupNotes"
                    name="pickupNotes"
                    rows={3}
                    value={pickupNotes}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                    placeholder="Any additional notes about the pickup (optional)"
                  />
                </div>
              </div>

              {/* Location Status */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Pickup Location
                  </label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isGettingLocation}
                    className="text-sm text-orange-600 hover:text-orange-500 disabled:opacity-50"
                  >
                    {isGettingLocation ? 'Getting location...' : 'Update location'}
                  </button>
                </div>
                <div className="mt-1 flex items-center">
                  {currentLocation ? (
                    <div className="flex items-center text-sm text-green-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Location obtained (Accuracy: {Math.round(currentLocation.accuracy)}m)
                    </div>
                  ) : (
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L12.732 4.5c-.77-.833-2.186-.833-2.956 0L2.858 16.5C2.088 18.333 3.05 20 4.59 20z" />
                      </svg>
                      Location not available - tap to get location
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                    isSubmitting
                      ? 'bg-orange-400 cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Confirming Pickup...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Confirm Pickup
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DeliveryLayout>
  );
};

export default OrderPickup;