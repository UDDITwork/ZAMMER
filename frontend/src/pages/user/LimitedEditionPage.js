import React from 'react';
import UserLayout from '../../components/layouts/UserLayout';

const LimitedEditionPage = () => {
  return (
    <UserLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Limited Edition</h1>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600">Limited edition products will appear here soon.</p>
        </div>
      </div>
    </UserLayout>
  );
};

export default LimitedEditionPage; 