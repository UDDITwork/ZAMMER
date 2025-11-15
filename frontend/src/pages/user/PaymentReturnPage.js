// frontend/src/pages/user/PaymentReturnPage.js - Payment Return Handler (Cashfree Only)
// 🎯 PURPOSE: Handle return from Cashfree hosted checkout and verify payment
// ⚠️ NOTE: This page is ONLY for Cashfree. SMEPay code is completely separate and untouched.

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import paymentService from '../../services/paymentService';
import cartService from '../../services/cartService';

const PaymentReturnPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verificationStatus, setVerificationStatus] = useState('verifying'); // 'verifying', 'success', 'failed'
  const [message, setMessage] = useState('Verifying your payment...');
  const [orderDetails, setOrderDetails] = useState(null);

  // Enhanced logging
  const logReturn = (action, status, data = null) => {
    const timestamp = new Date().toISOString();
    const logLevel = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '🔄';
    console.log(`${logLevel} [PAYMENT-RETURN] ${timestamp} - ${action}`, data ? JSON.stringify(data, null, 2) : '');
  };

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    const gateway = searchParams.get('gateway');

    logReturn('PAGE_LOADED', 'PROCESSING', { orderId, gateway });

    // Validate parameters
    if (!orderId || gateway !== 'cashfree') {
      logReturn('INVALID_PARAMETERS', 'ERROR', { orderId, gateway });
      setVerificationStatus('failed');
      setMessage('Invalid payment return. Missing order information.');
      toast.error('Invalid payment return');
      
      setTimeout(() => {
        navigate('/user/orders');
      }, 3000);
      return;
    }

    // Start payment verification
    verifyPayment(orderId);
  }, [searchParams]);

  const verifyPayment = async (orderId) => {
    try {
      logReturn('VERIFICATION_START', 'PROCESSING', { orderId });
      setMessage('Confirming payment with Cashfree...');

      // Poll for payment confirmation (max 20 attempts, 2 seconds each = 40 seconds)
      const maxAttempts = 20;
      const pollInterval = 2000;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        logReturn('POLL_ATTEMPT', 'PROCESSING', { attempt, maxAttempts, orderId });
        setMessage(`Verifying payment... (${attempt}/${maxAttempts})`);

        try {
          // Check payment status using official Cashfree endpoint
          const statusResult = await paymentService.checkCashfreeStatus(orderId);

          if (!statusResult.success) {
            throw new Error(statusResult.message || 'Payment status check failed');
          }

          logReturn('POLL_RESPONSE', 'PROCESSING', {
            attempt,
            success: statusResult.success,
            isPaymentSuccessful: statusResult.data?.isPaymentSuccessful,
            cashfreeOrderStatus: statusResult.data?.cashfreeOrderStatus,
            orderNumber: statusResult.data?.orderNumber
          });

          const isAlreadyPaid = statusResult.data?.isPaid;

          if (statusResult.success && (statusResult.data?.isPaymentSuccessful || isAlreadyPaid)) {
            // Payment confirmed!
            logReturn('PAYMENT_CONFIRMED', 'SUCCESS', {
              orderId,
              orderNumber: statusResult.data.orderNumber,
              attempts: attempt
            });

            setOrderDetails(statusResult.data);
            setVerificationStatus('success');
            setMessage('Payment successful! Redirecting...');
            toast.success('Payment confirmed successfully!');

            // Clear cart
            try {
              await cartService.clearCart();
              logReturn('CART_CLEARED', 'SUCCESS', { orderId });
            } catch (cartError) {
              logReturn('CART_CLEAR_FAILED', 'ERROR', { error: cartError.message });
              // Don't fail if cart clear fails
            }

            // Redirect to orders page after 2 seconds
            setTimeout(() => {
              navigate(`/payment/cashfree/confirmation/${orderId}`, { 
                state: { 
                  paymentSuccess: true,
                  orderNumber: statusResult.data.orderNumber 
                }
              });
            }, 2000);
            return;
          }

          // Check if payment failed/expired
          const cashfreeStatus = statusResult.data?.cashfreeOrderStatus;
          if (cashfreeStatus === 'EXPIRED' || cashfreeStatus === 'TERMINATED') {
            throw new Error(`Payment ${cashfreeStatus.toLowerCase()}`);
          }

          // Wait before next attempt (faster for first few attempts)
          if (attempt < maxAttempts) {
            const waitTime = attempt <= 3 ? 1500 : pollInterval;
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }

        } catch (pollError) {
          logReturn('POLL_ATTEMPT_ERROR', 'ERROR', {
            attempt,
            error: pollError.message
          });

          // If it's the last attempt or a definitive failure, throw error
          if (attempt === maxAttempts || 
              pollError.message.includes('EXPIRED') || 
              pollError.message.includes('TERMINATED')) {
            throw pollError;
          }
        }
      }

      // Polling timed out
      throw new Error('Payment verification timed out. Please check your orders page or contact support.');

    } catch (error) {
      logReturn('VERIFICATION_FAILED', 'ERROR', {
        orderId,
        error: error.message
      });

      setVerificationStatus('failed');
      setMessage(error.message || 'Payment verification failed');
      toast.error(error.message || 'Payment verification failed');

      // Redirect to orders page after 5 seconds so user can check manually
      setTimeout(() => {
        navigate('/user/orders');
      }, 5000);
    }
  };

  return (
    <UserLayout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          {/* Verifying State */}
          {verificationStatus === 'verifying' && (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="mb-6">
                <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-500 mx-auto"></div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                Verifying Payment
              </h2>
              <p className="text-gray-600 mb-2">{message}</p>
              <p className="text-sm text-gray-500">
                Please wait while we confirm your payment with Cashfree...
              </p>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  ⏳ This may take up to 30 seconds
                </p>
              </div>
            </div>
          )}

          {/* Success State */}
          {verificationStatus === 'success' && (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="mb-6">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100">
                  <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-3">
                Payment Successful!
              </h2>
              <p className="text-gray-600 mb-4">{message}</p>
              
              {orderDetails && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Order Number:</span>
                    <br />
                    <span className="text-lg font-bold text-green-700">
                      {orderDetails.orderNumber}
                    </span>
                  </p>
                </div>
              )}

              <div className="mt-6">
                <p className="text-sm text-gray-500">
                  ✅ Payment confirmed with Cashfree
                  <br />
                  🚀 Redirecting to your orders...
                </p>
              </div>
            </div>
          )}

          {/* Failed State */}
          {verificationStatus === 'failed' && (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="mb-6">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100">
                  <svg className="h-12 w-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-red-600 mb-3">
                Verification Failed
              </h2>
              <p className="text-gray-600 mb-4">{message}</p>
              
              <div className="mt-6 p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  Please check your orders page to see if the payment was processed.
                  <br />
                  If you were charged but don't see your order, please contact support.
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={() => navigate('/user/orders')}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  View My Orders
                </button>
                <button
                  onClick={() => navigate('/user/cart')}
                  className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Back to Cart
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default PaymentReturnPage;

