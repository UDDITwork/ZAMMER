import React from 'react';
import LandingNavbar from '../../components/LandingNavbar';

const TermsPolicy = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 py-12 flex flex-col items-center">
    <LandingNavbar />
    <div className="max-w-2xl w-full mt-8">
      {/* Hero Section */}
      <div className="flex flex-col items-center mb-8">
        <div className="bg-yellow-100 rounded-full w-20 h-20 flex items-center justify-center mb-4 shadow">
          <span className="text-4xl text-yellow-600">📜</span>
        </div>
        <h1 className="text-4xl font-extrabold text-yellow-700 mb-2">Terms and Conditions</h1>
        <p className="text-lg text-gray-600 text-center max-w-md">
          By using ZAMMER, you agree to the following terms and conditions. Please read carefully.
        </p>
      </div>
      {/* Card Section */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 className="text-2xl font-bold text-yellow-700 mb-4">User Agreement</h2>
        <ul className="space-y-4 text-gray-700 list-disc pl-6">
          <li>All users must provide accurate information during registration.</li>
          <li>Users are responsible for maintaining the confidentiality of their account.</li>
          <li>All transactions are subject to our review and approval.</li>
          <li>Any misuse of the platform may result in account suspension.</li>
          <li>We reserve the right to update these terms at any time.</li>
        </ul>
        <div className="mt-6 text-gray-500 text-sm">
          <span className="inline-block bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full">Please review our full terms before using the platform.</span>
        </div>
      </div>
      <div className="text-center mt-4">
        <a href="/" className="inline-block bg-yellow-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-yellow-700 transition">Back to Home</a>
      </div>
    </div>
  </div>
);

export default TermsPolicy; 