import React, { useState } from 'react';

const HelpPage = () => {
  const [activeTab, setActiveTab] = useState('buyers');

  const faqData = {
    buyers: [
      {
        question: "How do I create an account?",
        answer: "Click on 'User Login' from the homepage, then select 'Register' to create a new account. You'll need to provide your email, name, and create a password."
      },
      {
        question: "How do I place an order?",
        answer: "Browse products, add them to your cart, and proceed to checkout. You'll need to provide shipping and payment information to complete your order."
      },
      {
        question: "How can I track my order?",
        answer: "Once your order is placed, you can track it in real-time from your dashboard. You'll also receive email notifications about order status updates."
      },
      {
        question: "What payment methods are accepted?",
        answer: "We accept all major credit cards, debit cards, and digital wallets including PayPal, Apple Pay, and Google Pay."
      },
      {
        question: "How do I return a product?",
        answer: "Contact our customer support within 30 days of purchase. We'll guide you through the return process and provide a return shipping label if applicable."
      }
    ],
    sellers: [
      {
        question: "How do I become a seller?",
        answer: "Click on 'Seller Login' from the homepage and select 'Register'. You'll need to provide business information and complete the verification process."
      },
      {
        question: "How do I add products to my store?",
        answer: "Log into your seller dashboard and click 'Add Product'. Fill in all required information including images, description, and pricing."
      },
      {
        question: "How do I receive payments?",
        answer: "Payments are processed securely and transferred to your registered bank account within 3-5 business days after order completion."
      },
      {
        question: "Can I set my own shipping rates?",
        answer: "Yes, you can set custom shipping rates based on weight, location, and delivery speed. You can also offer free shipping for orders above a certain amount."
      },
      {
        question: "How do I handle customer inquiries?",
        answer: "You'll receive real-time notifications for customer messages. Respond promptly to maintain good ratings and customer satisfaction."
      }
    ],
    general: [
      {
        question: "Is my personal information secure?",
        answer: "Yes, we use industry-standard encryption and security measures to protect your personal and payment information."
      },
      {
        question: "What if I forget my password?",
        answer: "Click on 'Forgot Password' on the login page. You'll receive an email with instructions to reset your password."
      },
      {
        question: "How do I contact customer support?",
        answer: "You can reach us through our contact form, email at support@zammer.com, or call us at +1 (555) 123-4567 during business hours."
      },
      {
        question: "Do you ship internationally?",
        answer: "Currently, we ship to most countries. Shipping rates and delivery times vary by location. Check the shipping calculator during checkout."
      },
      {
        question: "What is your privacy policy?",
        answer: "We respect your privacy and never share your personal information with third parties without your consent. Read our full privacy policy for details."
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Help & FAQ</h1>
          <p className="text-xl text-gray-600">Find answers to common questions</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex flex-wrap justify-center space-x-4">
            <button
              onClick={() => setActiveTab('buyers')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                activeTab === 'buyers'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              For Buyers
            </button>
            <button
              onClick={() => setActiveTab('sellers')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                activeTab === 'sellers'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              For Sellers
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                activeTab === 'general'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              General
            </button>
          </div>
        </div>

        {/* FAQ Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="space-y-6">
            {faqData[activeTab].map((faq, index) => (
              <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {faq.question}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-blue-50 rounded-lg p-8 mt-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Still Need Help?
          </h2>
          <p className="text-gray-600 mb-6">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="space-x-4">
            <a
              href="/contact"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-block"
            >
              Contact Support
            </a>
            <a
              href="/"
              className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors inline-block"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage; 