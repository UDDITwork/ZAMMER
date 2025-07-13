import React from 'react';
import LandingNavbar from '../../components/LandingNavbar';

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 py-12 flex flex-col items-center">
    <LandingNavbar />
    <div className="max-w-2xl w-full mt-8">
      {/* Hero Section */}
      <div className="flex flex-col items-center mb-8">
        <div className="bg-purple-100 rounded-full w-20 h-20 flex items-center justify-center mb-4 shadow">
          <span className="text-4xl text-purple-600">🔒</span>
        </div>
        <h1 className="text-4xl font-extrabold text-purple-700 mb-2">Privacy Policy</h1>
        <p className="text-lg text-gray-600 text-center max-w-md">
          Your privacy is important to us. Please review our privacy policy below.
        </p>
      </div>
      {/* Card Section */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 className="text-2xl font-bold text-purple-700 mb-4">Our Commitment</h2>
        <ul className="space-y-4 text-gray-700 list-disc pl-6">
          <li>We collect only necessary information to provide our services.</li>
          <li>Your data is stored securely and never shared without consent.</li>
          <li>We use cookies to enhance your experience on our platform.</li>
          <li>You can request deletion of your data at any time.</li>
          <li>For any privacy concerns, contact our support team.</li>
        </ul>
        <div className="mt-6 text-gray-500 text-sm">
          <span className="inline-block bg-purple-50 text-purple-700 px-3 py-1 rounded-full">For more information, please contact us directly.</span>
        </div>
      </div>
      <div className="text-center mt-4">
        <a href="/" className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition">Back to Home</a>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy; 