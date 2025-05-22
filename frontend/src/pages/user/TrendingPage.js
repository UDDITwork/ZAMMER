import React from 'react';
import UserLayout from '../../components/layouts/UserLayout';

const TrendingPage = () => {
  return (
    <UserLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Trending Products</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Trending products will appear here soon.</p>
        </div>
      </div>
    </UserLayout>
  );
};

export default TrendingPage; 