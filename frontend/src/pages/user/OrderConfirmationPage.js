import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import orderService from '../../services/orderService';

const OrderConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get order from navigation state or fetch from API
    if (location.state?.order) {
      setOrder(location.state.order);
      setLoading(false);
    } else {
      // If no order in state, redirect to dashboard
      toast.info('No order information found');
      navigate('/user/dashboard');
    }
  }, [location.state, navigate]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'processing':
        return 'text-blue-600 bg-blue-100';
      case 'shipped':
        return 'text-indigo-600 bg-indigo-100';
      case 'delivered':
        return 'text-green-600 bg-green-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPaymentStatusColor = (isPaid) => {
    return isPaid 
      ? 'text-green-600 bg-green-100' 
      : 'text-orange-600 bg-orange-100';
  };

  const calculateSubtotal = () => {
    return order?.orderItems?.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0) || 0;
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
              <svg className="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-6">Unable to find order details.</p>
            <Link 
              to="/user/dashboard" 
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </UserLayout>
    );
  }

  const subtotal = calculateSubtotal();

  return (
    <UserLayout>
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Order Confirmed!</h1>
          <p className="text-gray-600 mb-4">
            Thank you for your order. We'll send you updates on your order status.
          </p>
          
          {/* Order Number */}
          <div className="bg-orange-50 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-orange-600 font-medium">Order Number</p>
            <p className="text-2xl font-bold text-orange-800">{order.orderNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Status</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Order Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(order.isPaid)}`}>
                    {order.isPaid ? 'Paid' : 'Pending'}
                  </span>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Order Date</p>
                  <p className="font-medium text-gray-800">
                    {new Date(order.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                  <p className="font-medium text-gray-800">{order.paymentMethod}</p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Order Items ({order.orderItems?.length || 0})
              </h2>
              
              <div className="divide-y divide-gray-200">
                {order.orderItems?.map((item, index) => (
                  <div key={index} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start space-x-4">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-800 line-clamp-2">{item.name}</h3>
                        
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          {item.size && <span>Size: {item.size}</span>}
                          {item.color && <span>Color: {item.color}</span>}
                          <span>Qty: {item.quantity}</span>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-lg font-bold text-gray-800">₹{item.price}</span>
                          <span className="text-sm text-gray-600">
                            Total: ₹{item.price * item.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Shipping Address</h2>
              
              <div className="text-gray-600">
                <p className="font-medium text-gray-800">{order.shippingAddress?.address}</p>
                <p>{order.shippingAddress?.city}, {order.shippingAddress?.postalCode}</p>
                <p>{order.shippingAddress?.country}</p>
                {order.shippingAddress?.phone && (
                  <p className="mt-2">Phone: {order.shippingAddress.phone}</p>
                )}
              </div>
            </div>

            {/* Seller Information */}
            {order.seller && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Seller Information</h2>
                
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {order.seller.shop?.name || `${order.seller.firstName}'s Shop`}
                    </p>
                    <p className="text-sm text-gray-600">Seller</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border sticky top-4">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-800">Order Summary</h2>
              </div>
              
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">₹{subtotal}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">₹{order.taxPrice || 0}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {order.shippingPrice === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      `₹${order.shippingPrice || 0}`
                    )}
                  </span>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-orange-600">₹{order.totalPrice}</span>
                  </div>
                </div>
              </div>
              
              {/* Order Actions */}
              <div className="p-4 border-t space-y-3">
                <Link
                  to="/user/myorders"
                  className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  View All Orders
                </Link>
                
                <Link
                  to="/user/dashboard"
                  className="block w-full text-center text-orange-600 hover:text-orange-700 py-2 font-medium"
                >
                  Continue Shopping
                </Link>
                
                {/* Share Order */}
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'My Zammer Order',
                        text: `I just placed an order on Zammer! Order #${order.orderNumber}`,
                        url: window.location.href
                      });
                    } else {
                      // Fallback: copy to clipboard
                      navigator.clipboard.writeText(
                        `I just placed an order on Zammer! Order #${order.orderNumber} - ${window.location.href}`
                      );
                      toast.success('Order details copied to clipboard!');
                    }
                  }}
                  className="block w-full text-center text-gray-600 hover:text-gray-700 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Share Order
                </button>
              </div>
            </div>

            {/* Estimated Delivery */}
            <div className="bg-blue-50 rounded-lg p-4 mt-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">Estimated Delivery</h3>
                  <p className="text-sm text-blue-800">
                    Your order will be delivered within 3-5 business days.
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    You'll receive tracking information once your order is shipped.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6 text-center">
          <h3 className="font-semibold text-gray-800 mb-2">Need Help?</h3>
          <p className="text-gray-600 text-sm mb-4">
            If you have any questions about your order, feel free to contact us.
          </p>
          <div className="flex justify-center space-x-4">
            <button className="text-orange-600 hover:text-orange-700 font-medium text-sm">
              Contact Support
            </button>
            <span className="text-gray-400">•</span>
            <Link to="/user/help" className="text-orange-600 hover:text-orange-700 font-medium text-sm">
              Help Center
            </Link>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default OrderConfirmationPage;