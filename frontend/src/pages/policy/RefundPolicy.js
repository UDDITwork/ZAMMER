import React from 'react';
import LandingNavbar from '../../components/LandingNavbar';

const RefundPolicy = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 py-12 flex flex-col items-center">
    <LandingNavbar />
    <div className="max-w-2xl w-full mt-8">
      {/* Hero Section */}
      <div className="flex flex-col items-center mb-8">
        <div className="bg-pink-100 rounded-full w-20 h-20 flex items-center justify-center mb-4 shadow">
          <span className="text-4xl text-pink-600">💸</span>
        </div>
        <h1 className="text-4xl font-extrabold text-pink-700 mb-2">Cancellations and Refunds</h1>
        <p className="text-lg text-gray-600 text-center max-w-md">
          We want you to be satisfied with your purchase. Please review our cancellation and refund policy below.
        </p>
      </div>
      {/* Card Section */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 className="text-2xl font-bold text-pink-700 mb-4">Refund & Cancellation Policy</h2>
        <ul className="space-y-4 text-gray-700 list-disc pl-6">
          <li>Orders can be cancelled within 24 hours of placement.</li>
          <li>Refunds are processed within 5-7 business days after approval.</li>
          <li>Products must be returned in original condition for a full refund.</li>
          <li>Shipping charges are non-refundable unless the product is defective.</li>
          <li>Contact our support team to initiate a cancellation or refund.</li>
        </ul>
        <div className="mt-6 text-gray-500 text-sm">
          <span className="inline-block bg-pink-50 text-pink-700 px-3 py-1 rounded-full">For more details, please reach out to our support team.</span>
        </div>
      </div>
      <div className="text-center mt-4">
        <a href="/" className="inline-block bg-pink-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-pink-700 transition">Back to Home</a>
      </div>
    </div>
  </div>
);

export default RefundPolicy; 