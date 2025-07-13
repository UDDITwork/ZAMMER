import React from 'react';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About ZAMMER</h1>
          <p className="text-xl text-gray-600">Your Complete Online Marketplace Solution</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Our Mission</h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            ZAMMER is dedicated to creating a seamless marketplace experience that connects buyers and sellers 
            in a secure, efficient, and user-friendly environment. We believe in empowering local businesses 
            and providing consumers with access to quality products and services.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Our platform combines cutting-edge technology with intuitive design to deliver an exceptional 
            e-commerce experience for everyone involved.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">For Buyers</h3>
            <ul className="text-gray-700 space-y-2">
              <li>• Discover local and online products</li>
              <li>• Secure payment processing</li>
              <li>• Real-time order tracking</li>
              <li>• Customer reviews and ratings</li>
              <li>• 24/7 customer support</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">For Sellers</h3>
            <ul className="text-gray-700 space-y-2">
              <li>• Easy product management</li>
              <li>• Real-time order notifications</li>
              <li>• Analytics and insights</li>
              <li>• Secure payment processing</li>
              <li>• Marketing tools and promotions</li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Our Technology</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Real-time Updates</h3>
              <p className="text-gray-600 text-sm">Live order tracking and notifications</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure Platform</h3>
              <p className="text-gray-600 text-sm">Advanced security and data protection</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Mobile First</h3>
              <p className="text-gray-600 text-sm">Optimized for all devices</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <a 
            href="/" 
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-block"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default AboutPage; 