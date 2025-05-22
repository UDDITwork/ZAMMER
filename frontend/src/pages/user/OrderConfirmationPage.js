import React from 'react';
import { Link } from 'react-router-dom';
import UserLayout from '../../components/layouts/UserLayout';

const OrderConfirmationPage = () => {
  return (
    <UserLayout>
      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-gray-600 mb-6">Your order has been placed successfully.</p>
          <p className="text-gray-600 mb-4">Order #: 123456789</p>
          <Link to="/user/dashboard" className="bg-orange-500 text-white px-6 py-2 rounded-md inline-block">
            Continue Shopping
          </Link>
        </div>
      </div>
    </UserLayout>
  );
};

export default OrderConfirmationPage; 