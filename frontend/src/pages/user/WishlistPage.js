import React from 'react';
import UserLayout from '../../components/layouts/UserLayout';

const WishlistPage = () => {
  return (
    <UserLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Your Wishlist</h1>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600">Your wishlist is currently empty.</p>
        </div>
      </div>
    </UserLayout>
  );
};

export default WishlistPage; 