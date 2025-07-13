import React from 'react';
import LandingNavbar from '../../components/LandingNavbar';

const ContactPolicy = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 py-12 flex flex-col items-center">
    <LandingNavbar />
    <div className="max-w-2xl w-full mt-8">
      {/* Hero Section */}
      <div className="flex flex-col items-center mb-8">
        <div className="bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center mb-4 shadow">
          <span className="text-4xl text-blue-600">📞</span>
        </div>
        <h1 className="text-4xl font-extrabold text-blue-700 mb-2">Contact Us</h1>
        <p className="text-lg text-gray-600 text-center max-w-md">
          We're here to help! Reach out to our support team for any questions, feedback, or assistance.
        </p>
      </div>
      {/* Card Section */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 className="text-2xl font-bold text-blue-700 mb-4">Get in Touch</h2>
        <ul className="space-y-4 text-gray-700">
          <li className="flex items-center gap-3"><span className="text-xl">✉️</span>Email: <a href="mailto:support@zammer.com" className="text-blue-600 underline">support@zammer.com</a></li>
          <li className="flex items-center gap-3"><span className="text-xl">📞</span>Phone:+91 95127 12841</li>
          <li className="flex items-center gap-3"><span className="text-xl">📍</span>Address: 123 Marketplace Street, Tech City, TC 12345</li>
        </ul>
        <div className="mt-6 text-gray-500 text-sm">
          <span className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full">Response Time: 24-48 hours</span>
        </div>
      </div>
      <div className="text-center mt-4">
        <a href="/" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">Back to Home</a>
      </div>
    </div>
  </div>
);

export default ContactPolicy; 