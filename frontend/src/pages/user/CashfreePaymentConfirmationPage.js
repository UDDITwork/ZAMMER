// frontend/src/pages/user/CashfreePaymentConfirmationPage.js
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import orderService from '../../services/orderService';

const CashfreePaymentConfirmationPage = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading'); // loading | success | error
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    const loadConfirmation = async () => {
      if (!orderId) {
        setStatus('error');
        toast.error('Order ID missing in confirmation URL');
        return;
      }

      const response = await orderService.getOrderConfirmation(orderId);

      if (response.success) {
        setConfirmation(response.data);
        setStatus('success');
      } else {
        setStatus('error');
        toast.error(response.message || 'Unable to load order confirmation');
      }
    };

    loadConfirmation();
  }, [orderId]);

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const handleViewOrders = () => navigate('/user/orders');
  const handleViewOrderDetail = () => navigate(`/user/orders`, { state: { highlightOrderId: orderId } });

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
          <div className="animate-spin h-16 w-16 border-4 border-blue-100 border-t-blue-500 rounded-full mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Confirming Your Payment</h2>
          <p className="text-gray-600">Please wait while we fetch your order details...</p>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M10 4h4l1 2h4a1 1 0 011 1v2h-2v9a2 2 0 01-2 2H7a2 2 0 01-2-2v-9H3V7a1 1 0 011-1h4l1-2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-red-600 mb-2">Unable to Confirm Payment</h2>
          <p className="text-gray-600 mb-6">Please check your orders page for the latest status.</p>
          <button
            onClick={handleViewOrders}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to My Orders
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-gray-500">Order Number</p>
              <h2 className="text-3xl font-semibold text-gray-800">
                {confirmation.orderNumber || location.state?.orderNumber || '—'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">Placed on {formatDate(confirmation.createdAt)}</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-4 py-2 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                Payment {confirmation.paymentStatus === 'completed' ? 'Successful' : confirmation.paymentStatus}
              </span>
              <p className="text-sm text-gray-500 mt-2">Gateway: {confirmation.paymentGateway?.toUpperCase() || '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 border rounded-xl">
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-2xl font-semibold text-gray-900">₹{confirmation.totalPrice?.toFixed(2)}</p>
            </div>
            <div className="p-4 border rounded-xl">
              <p className="text-sm text-gray-500">Payment Method</p>
              <p className="text-lg font-medium text-gray-800">{confirmation.paymentMethod || confirmation.paymentGateway}</p>
              <p className="text-xs text-gray-500 mt-1">{confirmation.paymentResult?.transactionId}</p>
            </div>
            <div className="p-4 border rounded-xl">
              <p className="text-sm text-gray-500">Paid On</p>
              <p className="text-lg font-medium text-gray-800">{formatDate(confirmation.paidAt)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Items in this order</h3>
          <div className="space-y-4">
            {confirmation.orderItems?.map(item => (
              <div key={item._id} className="flex items-center justify-between border rounded-xl p-4">
                <div className="flex items-center gap-4">
                  {item.image && (
                    <img src={item.image} alt={item.name} className="w-14 h-14 object-cover rounded-lg border" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                </div>
                <p className="text-lg font-semibold text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Next Steps</h3>
          <div className="space-y-3">
            <p className="text-gray-600">
              Your payment has been received. The order is currently <span className="font-semibold">{confirmation.status}</span> and
              will move to processing soon. We’ll notify you once the seller confirms and prepares the order.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={handleViewOrderDetail}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Track this Order
              </button>
              <button
                onClick={handleViewOrders}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                View All Orders
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <UserLayout>
      <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {renderContent()}
        </div>
      </div>
    </UserLayout>
  );
};

export default CashfreePaymentConfirmationPage;

