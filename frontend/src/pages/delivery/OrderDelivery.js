// frontend/src/pages/delivery/OrderDelivery.js - Order Delivery with OTP Verification

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDelivery } from '../../contexts/DeliveryContext';
import DeliveryLayout from '../../components/layouts/DeliveryLayout';

const OrderDelivery = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { 
    assignedOrders, 
    completeDelivery, 
    deliveryService,
    getCurrentLocation,
    showNotification 
  } = useDelivery();

  const [order, setOrder] = useState(null);
  const [otp, setOtp] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [errors, setErrors] = useState({});
  const [codPayment, setCodPayment] = useState({
    amount: 0,
    collected: false
  });

  // Find the order
  useEffect(() => {
    const foundOrder = assignedOrders.find(o => o.id === orderId && o.status === 'picked');
    if (foundOrder) {
      setOrder(foundOrder);
      // Set COD amount if payment method is Cash on Delivery
      if (foundOrder.paymentMethod === 'cod') {
        setCodPayment(prev => ({
          ...prev,
          amount: foundOrder.totalAmount
        }));
      }
    } else {
      showNotification('Order not found or not ready for delivery', 'error');
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
    const { name, value, type, checked } = e.target;
    
    if (name === 'otp') {
      // Only allow numeric input for OTP
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 6) {
        setOtp(numericValue);
        // Clear error when user starts typing
        if (errors.otp) {
          setErrors(prev => ({ ...prev, otp: '' }));
        }
      }
    } else if (name === 'recipientName') {
      setRecipientName(value);
      if (errors.recipientName) {
        setErrors(prev => ({ ...prev, recipientName: '' }));
      }
    } else if (name === 'deliveryNotes') {
      setDeliveryNotes(value);
    } else if (name === 'codCollected') {
      setCodPayment(prev => ({
        ...prev,
        collected: checked
      }));
      if (errors.codPayment) {
        setErrors(prev => ({ ...prev, codPayment: '' }));
      }
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!otp.trim()) {
      newErrors.otp = 'OTP is required for delivery confirmation';
    } else if (otp.length < 4) {
      newErrors.otp = 'OTP must be at least 4 digits';
    }

    if (!recipientName.trim()) {
      newErrors.recipientName = 'Recipient name is required';
    }

    // Validate COD payment if applicable
    if (order?.paymentMethod === 'cod' && !codPayment.collected) {
      newErrors.codPayment = 'Please confirm COD payment collection';
    }

    if (!order) {
      newErrors.general = 'Order information not found';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle delivery confirmation
  const handleConfirmDelivery = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const deliveryData = {
        otp: otp.trim(),
        recipientName: recipientName.trim(),
        deliveryNotes: deliveryNotes.trim(),
        location: currentLocation ? {
          type: 'Point',
          coordinates: [currentLocation.longitude, currentLocation.latitude]
        } : null,
        codPayment: order.paymentMethod === 'cod' ? {
          amount: codPayment.amount,
          collected: codPayment.collected
        } : null
      };

      const result = await completeDelivery(orderId, deliveryData);

      if (result.success) {
        showNotification('Delivery completed successfully!', 'success');
        navigate('/delivery/orders/assigned');
      } else {
        setErrors({ general: result.message });
      }
    } catch (error) {
      setErrors({ general: 'Failed to complete delivery. Please try again.' });
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
                Complete Delivery
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Verify delivery with customer OTP
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
                <p className="mt-2 text-xs font-medium text-green-600">Pickup Complete</p>
              </li>
              <li className="relative">
                <div className="flex items-center">
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-orange-600">
                    <span className="text-sm font-medium text-white">3</span>
                  </div>
                </div>
                <p className="mt-2 text-xs font-medium text-orange-600">Delivery in Progress</p>
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
              <h2 className="text-lg font-medium text-gray-900">Delivery Information</h2>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Customer Details</h3>
                  <div className="bg-green-50 rounded-md p-3 border border-green-200">
                    <p className="text-sm font-medium text-gray-900">{order.customer.name}</p>
                    <p className="text-sm text-gray-600">📞 {order.customer.phone}</p>
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="font-medium">Delivery Address:</span><br />
                      {order.deliveryAddress.address}<br />
                      {order.deliveryAddress.city}, {order.deliveryAddress.postalCode}
                    </p>
                  </div>
                </div>

                {/* Seller Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Pickup From</h3>
                  <div className="bg-gray-50 rounded-md p-3">
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

              {/* Payment Information */}
              <div className="mt-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Order Value:</span>
                    <span className="font-medium text-gray-900">₹{order.totalAmount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className={`font-medium ${order.paymentMethod === 'cod' ? 'text-orange-600' : 'text-green-600'}`}>
                      {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Prepaid'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Your Delivery Fee:</span>
                    <span className="font-medium text-green-600">₹{order.deliveryFee}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COD Payment Section */}
          {order.paymentMethod === 'cod' && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Cash on Delivery</h2>
              </div>
              <div className="px-6 py-4">
                <div className="bg-orange-50 border border-orange-200 rounded-md p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-orange-800">Collect Payment</h3>
                      <p className="mt-1 text-sm text-orange-700">
                        Please collect ₹{codPayment.amount} from the customer before confirming delivery.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    id="codCollected"
                    name="codCollected"
                    type="checkbox"
                    checked={codPayment.collected}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <label htmlFor="codCollected" className="ml-2 block text-sm text-gray-900">
                    I have collected ₹{codPayment.amount} from the customer
                  </label>
                </div>
                {errors.codPayment && (
                  <p className="mt-1 text-sm text-red-600">{errors.codPayment}</p>
                )}
              </div>
            </div>
          )}

          {/* Delivery Confirmation Form */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Delivery Confirmation</h2>
            </div>

            <form onSubmit={handleConfirmDelivery} className="px-6 py-4 space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Delivery Instructions</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Contact the customer at the delivery address</li>
                        <li>Ask the customer for their delivery OTP</li>
                        <li>Enter the OTP and recipient details below</li>
                        <li>Confirm delivery to complete the order</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

              {/* OTP Input */}
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                  Delivery OTP (Ask customer for this) *
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="otp"
                    name="otp"
                    required
                    value={otp}
                    onChange={handleInputChange}
                    maxLength="6"
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm font-mono text-lg text-center ${
                      errors.otp ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter 4-6 digit OTP"
                  />
                  {errors.otp && (
                    <p className="mt-1 text-sm text-red-600">{errors.otp}</p>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  The customer will provide you with their unique delivery OTP
                </p>
              </div>

              {/* Recipient Name */}
              <div>
                <label htmlFor="recipientName" className="block text-sm font-medium text-gray-700">
                  Recipient Name *
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="recipientName"
                    name="recipientName"
                    required
                    value={recipientName}
                    onChange={handleInputChange}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                      errors.recipientName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Name of person who received the order"
                  />
                  {errors.recipientName && (
                    <p className="mt-1 text-sm text-red-600">{errors.recipientName}</p>
                  )}
                </div>
              </div>

              {/* Delivery Notes */}
              <div>
                <label htmlFor="deliveryNotes" className="block text-sm font-medium text-gray-700">
                  Delivery Notes (Optional)
                </label>
                <div className="mt-1">
                  <textarea
                    id="deliveryNotes"
                    name="deliveryNotes"
                    rows={3}
                    value={deliveryNotes}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                    placeholder="Any additional notes about the delivery (optional)"
                  />
                </div>
              </div>

              {/* Location Status */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Delivery Location
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
                      Confirming Delivery...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Complete Delivery
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

export default OrderDelivery; 