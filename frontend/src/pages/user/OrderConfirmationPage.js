import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';

const OrderConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get order data from navigation state
    if (location.state?.order) {
      setOrder(location.state.order);
      setLoading(false);
    } else {
      // If no order data, redirect to dashboard
      toast.error('No order information found');
      navigate('/user/dashboard');
    }
  }, [location.state, navigate]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'Processing':
        return 'text-blue-600 bg-blue-100';
      case 'Shipped':
        return 'text-purple-600 bg-purple-100';
      case 'Delivered':
        return 'text-green-600 bg-green-100';
      case 'Cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="container mx-auto p-4">
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading order details...</p>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  if (!order) {
    return (
      <UserLayout>
        <div className="container mx-auto p-4">
          <div className="text-center py-12">
            <div className="mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Order Not Found</h2>
              <p className="text-gray-600 mb-6">We couldn't find the order information.</p>
              <Link
                to="/user/dashboard"
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Success Header */}
        <div className="text-center py-8">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Order Placed Successfully!</h1>
            <p className="text-gray-600">Thank you for your order. We'll send you updates about your delivery.</p>
          </div>
        </div>

        {/* Order Summary Card */}
        <div className="bg-white rounded-lg shadow-lg border p-6 mb-6">
          <div className="border-b pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Order Details</h2>
                <p className="text-gray-600">Order Number: <span className="font-medium text-gray-800">{order.orderNumber}</span></p>
                <p className="text-gray-600">Placed on: <span className="font-medium text-gray-800">{formatDate(order.createdAt)}</span></p>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Items ({order.orderItems?.length || 0})</h3>
            <div className="space-y-4">
              {order.orderItems?.map((item, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 line-clamp-2">{item.name}</h4>
                    <div className="mt-1 space-y-1 text-sm text-gray-500">
                      {item.size && <p>Size: {item.size}</p>}
                      {item.color && <p>Color: {item.color}</p>}
                      <p>Quantity: {item.quantity}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-medium text-gray-800">₹{item.price * item.quantity}</p>
                    <p className="text-sm text-gray-500">₹{item.price} each</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Shipping Address</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-800 font-medium">{order.shippingAddress?.address}</p>
              <p className="text-gray-600">{order.shippingAddress?.city}, {order.shippingAddress?.postalCode}</p>
              <p className="text-gray-600">{order.shippingAddress?.country}</p>
              <p className="text-gray-600">Phone: {order.shippingAddress?.phone}</p>
            </div>
          </div>

          {/* Payment Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Payment Information</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-medium text-gray-800">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Status:</span>
                <span className={`font-medium ${order.isPaid ? 'text-green-600' : 'text-yellow-600'}`}>
                  {order.isPaid ? 'Paid' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Order Total */}
          <div className="border-t pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">₹{(order.totalPrice - order.taxPrice - order.shippingPrice).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (18% GST):</span>
                <span className="font-medium">₹{order.taxPrice}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping:</span>
                <span className="font-medium">
                  {order.shippingPrice === 0 ? (
                    <span className="text-green-600">FREE</span>
                  ) : (
                    `₹${order.shippingPrice}`
                  )}
                </span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-orange-600">₹{order.totalPrice}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/user/dashboard"
              className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-lg font-medium text-center transition-colors"
            >
              Continue Shopping
            </Link>
            <Link
              to="/user/orders"
              className="bg-white border border-orange-500 text-orange-500 hover:bg-orange-50 py-3 px-6 rounded-lg font-medium text-center transition-colors"
            >
              View All Orders
            </Link>
          </div>
          
          {/* Help Section */}
          <div className="text-center py-6">
            <p className="text-gray-600 mb-4">Need help with your order?</p>
            <div className="space-x-4">
              <Link
                to="/user/support"
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                Contact Support
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                to="/user/faq"
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                FAQ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default OrderConfirmationPage;