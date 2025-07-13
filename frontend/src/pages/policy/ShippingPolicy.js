import React from 'react';
import LandingNavbar from '../../components/LandingNavbar';

const ShippingPolicy = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 py-12 flex flex-col items-center">
    <LandingNavbar />
    <div className="max-w-2xl w-full mt-8">
      {/* Hero Section */}
      <div className="flex flex-col items-center mb-8">
        <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mb-4 shadow">
          <span className="text-4xl text-green-600">🚚</span>
        </div>
        <h1 className="text-4xl font-extrabold text-green-700 mb-2">Shipping Policy</h1>
        <p className="text-lg text-gray-600 text-center max-w-md">
          We strive to deliver your orders as quickly and efficiently as possible. Please review our shipping policy below.
        </p>
      </div>
      {/* Card Section */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 className="text-2xl font-bold text-green-700 mb-4">Shipping Details</h2>
        <ul className="space-y-4 text-gray-700 list-disc pl-6">
          <li>Orders are processed within 1-2 business days.</li>
          <li>Standard shipping typically takes 3-7 business days.</li>
          <li>Express shipping options are available at checkout.</li>
          <li>Shipping rates are calculated based on location and order value.</li>
          <li>Tracking information will be provided once your order is shipped.</li>
        </ul>
        <div className="mt-6 text-gray-500 text-sm">
          <span className="inline-block bg-green-50 text-green-700 px-3 py-1 rounded-full">For any shipping-related queries, please contact our support team.</span>
        </div>
      </div>
      <div className="text-center mt-4">
        <a href="/" className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition">Back to Home</a>
      </div>
    </div>
  </div>
);

export default ShippingPolicy; 