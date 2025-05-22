import React from 'react';
import { Link } from 'react-router-dom';
import UserLayout from '../../components/layouts/UserLayout';

const CartPage = () => {
  return (
    <UserLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Your Cart</h1>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 mb-4">Your cart is currently empty.</p>
          <Link to="/user/dashboard" className="bg-orange-500 text-white px-4 py-2 rounded-md">
            Continue Shopping
          </Link>
        </div>
      </div>
    </UserLayout>
  );
};

export default CartPage; 