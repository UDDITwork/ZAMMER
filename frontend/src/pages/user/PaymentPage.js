import React from 'react';
import { Link } from 'react-router-dom';
import UserLayout from '../../components/layouts/UserLayout';

const PaymentPage = () => {
  return (
    <UserLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Payment</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 mb-4">This payment page is under construction.</p>
          <div className="flex space-x-4">
            <Link to="/user/checkout" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md">
              Back to Checkout
            </Link>
            <Link to="/user/order-confirmation" className="bg-orange-500 text-white px-4 py-2 rounded-md">
              Complete Payment
            </Link>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default PaymentPage; 