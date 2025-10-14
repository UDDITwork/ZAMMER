// frontend/src/pages/user/PaymentPage.js - COMPLETE Real SMEPay Integration
// 🎯 COMPLETED: Failed state section that was cut off in previous version
// 🎯 ADDED: Complete error handling and retry functionality

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import orderService from '../../services/orderService';
import paymentService from '../../services/paymentService';
import cartService from '../../services/cartService';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [processing, setProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState('form'); // 'form', 'processing', 'success', 'failed'
  const [orderData, setOrderData] = useState(null);
  const [totals, setTotals] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('SMEPay');
  
  // Real payment states
  const [smepayLoading, setSmepayLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  // Enhanced terminal logging for payment flow
  const logPaymentFlow = (action, status, data = null) => {
    const timestamp = new Date().toISOString();
    const logLevel = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '🔄';
    
    console.log(`${logLevel} [PAYMENT-FLOW] ${timestamp} - ${action}`, data ? JSON.stringify(data, null, 2) : '');
  };

  useEffect(() => {
    logPaymentFlow('PAGE_LOAD', 'PROCESSING', { hasLocationState: !!location.state });
    
    if (!location.state) {
      logPaymentFlow('PAGE_LOAD', 'ERROR', { reason: 'missing_navigation_state' });
      toast.error('Invalid payment request');
      navigate('/user/cart');
      return;
    }
    
    const { orderData: od, totals: t, cartItems: ci } = location.state;
    setOrderData(od);
    setTotals(t);
    setCartItems(ci);
    
    logPaymentFlow('PAGE_LOAD', 'SUCCESS', {
      paymentMethod: od?.paymentMethod,
      totalPrice: t?.totalPrice,
      itemCount: ci?.length
    });
  }, [location.state, navigate]);

  // Handle real SMEPay payment
  const processRealSMEPayPayment = async () => {
    setProcessing(true);
    setPaymentStep('processing');
    setSmepayLoading(true);

    try {
      logPaymentFlow('REAL_SMEPAY_START', 'PROCESSING', {
        totalPrice: totals.totalPrice,
        timestamp: new Date().toISOString()
      });

      // Step 1: Create order first
      const orderPayload = {
        ...orderData,
        paymentMethod: 'SMEPay',
        isPaid: false,
        paymentStatus: 'pending'
      };

      logPaymentFlow('ORDER_CREATION', 'PROCESSING', {
        paymentMethod: orderPayload.paymentMethod,
        isPaid: orderPayload.isPaid
      });

      const orderResponse = await orderService.createOrder(orderPayload);
      
      if (!orderResponse.success) {
        throw new Error(orderResponse.message || 'Failed to create order');
      }

      const createdOrderId = orderResponse.data._id;
      setCreatedOrder(orderResponse.data);

      logPaymentFlow('ORDER_CREATION', 'SUCCESS', {
        orderId: createdOrderId,
        orderNumber: orderResponse.data.orderNumber
      });

      // Step 2: Process real SMEPay payment
      logPaymentFlow('SMEPAY_PAYMENT_START', 'PROCESSING', { orderId: createdOrderId });

      // 🎯 FIXED: Handle SMEPay widget asynchronously
      const smepayResult = await paymentService.processRealSMEPayPayment(createdOrderId);

      if (!smepayResult.success) {
        throw new Error(smepayResult.message || 'SMEPay payment failed');
      }

      logPaymentFlow('SMEPAY_PAYMENT_SUCCESS', 'SUCCESS', {
        orderId: createdOrderId,
        orderNumber: orderResponse.data.orderNumber
      });

      // Step 3: Clear cart after successful payment
      logPaymentFlow('CART_CLEANUP', 'PROCESSING');
      await cartService.clearCart();
      logPaymentFlow('CART_CLEANUP', 'SUCCESS');
      
      // 🎯 FIXED: Set success state and redirect
      setPaymentStep('success');
      
      // 🚀 OPTIMIZED: Show immediate success feedback
      toast.success(
        <div className="flex items-center">
          <div className="bg-green-100 rounded-full p-2 mr-3">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-medium">Payment successful! 🎉</p>
            <p className="text-sm text-gray-600">Order #{orderResponse.data.orderNumber}</p>
            <p className="text-xs text-green-600">Real SMEPay Payment</p>
          </div>
        </div>,
        {
          position: "top-center",
          autoClose: 3000, // 🚀 OPTIMIZED: Reduced from 5s to 3s
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
        }
      );
      
      logPaymentFlow('PAYMENT_COMPLETE', 'SUCCESS', {
        orderId: createdOrderId,
        orderNumber: orderResponse.data.orderNumber,
        totalPrice: orderResponse.data.totalPrice,
        timestamp: new Date().toISOString()
      });

      console.log(`
🎉 ===============================
    REAL PAYMENT SUCCESSFUL!
===============================
💳 Payment Method: SMEPay
💰 Amount: ₹${totals.totalPrice}
📦 Order ID: ${createdOrderId}
🔢 Order Number: ${orderResponse.data.orderNumber}
💳 Gateway: SMEPay (Real)
📅 Time: ${new Date().toLocaleString()}
===============================`);
      
      // 🚀 OPTIMIZED: Faster redirect after successful payment
      setTimeout(() => {
        console.log('🔄 Redirecting to order confirmation page...');
        console.log('📦 Order data being passed:', orderResponse.data);
        
        navigate('/user/order-confirmation', {
          state: { order: orderResponse.data }
        });
      }, 2000); // 🚀 OPTIMIZED: Reduced from 3s to 2s

    } catch (error) {
      console.error('Real SMEPay payment error:', error);
      logPaymentFlow('REAL_SMEPAY_ERROR', 'ERROR', {
        error: error.message,
        paymentMethod: 'SMEPay',
        step: paymentStep
      });
      
      setPaymentStep('failed');
      setPaymentError(error.message);
      toast.error(`Payment failed: ${error.message}`);
    } finally {
      setProcessing(false);
      setSmepayLoading(false);
    }
  };

  // Handle Cashfree Payment Gateway
  const processCashfreePayment = async () => {
    console.log('🚀 Starting Cashfree Payment Process...');
    setProcessing(true);
    setPaymentStep('processing');

    try {
      logPaymentFlow('CASHFREE_PAYMENT_START', 'PROCESSING', {
        totalPrice: totals.totalPrice,
        timestamp: new Date().toISOString()
      });

      // Step 1: Create order first
      const orderPayload = {
        ...orderData,
        paymentMethod: 'Cashfree',
        isPaid: false,
        paymentStatus: 'pending'
      };

      console.log('📦 Creating order with payload:', orderPayload);
      logPaymentFlow('ORDER_CREATION_CASHFREE', 'PROCESSING', {
        paymentMethod: orderPayload.paymentMethod
      });

      const orderResponse = await orderService.createOrder(orderPayload);
      console.log('📦 Order creation response:', orderResponse);
      
      if (!orderResponse.success) {
        throw new Error(orderResponse.message || 'Failed to create order');
      }

      const createdOrderId = orderResponse.data._id;
      setCreatedOrder(orderResponse.data);

      logPaymentFlow('ORDER_CREATION_CASHFREE', 'SUCCESS', {
        orderId: createdOrderId,
        orderNumber: orderResponse.data.orderNumber
      });

      // Step 2: Create Cashfree payment order
      console.log('💳 Creating Cashfree order for:', { orderId: createdOrderId, amount: totals.totalPrice });
      logPaymentFlow('CASHFREE_CREATE_ORDER', 'PROCESSING', { orderId: createdOrderId });

      const cashfreeResult = await paymentService.createCashfreeOrder({
        orderId: createdOrderId,
        amount: totals.totalPrice
      });
      console.log('💳 Cashfree order creation response:', cashfreeResult);

      if (!cashfreeResult.success) {
        throw new Error(cashfreeResult.message || 'Failed to create Cashfree order');
      }

      const { paymentSessionId, cashfreeOrderId } = cashfreeResult.data;

      logPaymentFlow('CASHFREE_ORDER_CREATED', 'SUCCESS', {
        cashfreeOrderId,
        hasSessionId: !!paymentSessionId
      });

      // Step 3: Load Cashfree SDK and initiate payment
      await loadCashfreeSDK();

      logPaymentFlow('CASHFREE_SDK_LOADED', 'SUCCESS');

      // Step 4: Open Cashfree checkout
      const cashfree = window.Cashfree({
        mode: 'production' // Always production as per requirement
      });

      const checkoutOptions = {
        paymentSessionId: paymentSessionId,
        returnUrl: `${window.location.origin}/payment-return?orderId=${createdOrderId}&gateway=cashfree`
      };

      logPaymentFlow('CASHFREE_CHECKOUT_OPENING', 'PROCESSING', {
        orderId: createdOrderId,
        cashfreeOrderId
      });

      // Open Cashfree payment page
      // Note: User will be redirected to Cashfree hosted page, then back to /payment-return
      // The payment-return page handles all verification and polling
      cashfree.checkout(checkoutOptions).then((result) => {
        logPaymentFlow('CASHFREE_CHECKOUT_OPENED', 'SUCCESS', {
          orderId: createdOrderId,
          cashfreeOrderId
        });

        if (result.error) {
          // Payment initialization failed or user closed immediately
          logPaymentFlow('CASHFREE_CHECKOUT_ERROR', 'ERROR', {
            error: result.error
          });
          
          setPaymentError(result.error.message || 'Failed to open payment page');
          setPaymentStep('failed');
          setProcessing(false);
          return;
        }

        // If checkout opens successfully, user will be redirected to Cashfree
        // After payment, they'll return to /payment-return page
        logPaymentFlow('CASHFREE_REDIRECT', 'PROCESSING', {
          message: 'User redirected to Cashfree payment page'
        });
      }).catch((error) => {
        logPaymentFlow('CASHFREE_CHECKOUT_EXCEPTION', 'ERROR', {
          error: error.message
        });
        
        setPaymentError('Failed to initiate payment. Please try again.');
        setPaymentStep('failed');
        setProcessing(false);
      });

    } catch (error) {
      logPaymentFlow('CASHFREE_PAYMENT_ERROR', 'ERROR', {
        error: error.message,
        stack: error.stack
      });

      setPaymentError(error.message || 'Payment failed');
      setPaymentStep('failed');
      toast.error(error.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  // Load Cashfree SDK
  const loadCashfreeSDK = () => {
    return new Promise((resolve, reject) => {
      // Check if SDK already loaded
      if (window.Cashfree) {
        resolve();
        return;
      }

      // Load SDK script
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.onload = () => {
        logPaymentFlow('CASHFREE_SDK_SCRIPT_LOADED', 'SUCCESS');
        resolve();
      };
      script.onerror = () => {
        logPaymentFlow('CASHFREE_SDK_SCRIPT_ERROR', 'ERROR');
        reject(new Error('Failed to load Cashfree SDK'));
      };
      
      document.head.appendChild(script);
    });
  };

  // Handle Cash on Delivery
  const processCODPayment = async () => {
    setProcessing(true);
    setPaymentStep('processing');

    try {
      logPaymentFlow('COD_PAYMENT_START', 'PROCESSING', {
        totalPrice: totals.totalPrice
      });

      const orderPayload = {
        ...orderData,
        paymentMethod: 'Cash on Delivery',
        isPaid: false,
        paymentStatus: 'pending'
      };

      const orderResponse = await orderService.createOrder(orderPayload);
      
      if (!orderResponse.success) {
        throw new Error(orderResponse.message || 'Failed to create order');
      }

      logPaymentFlow('COD_ORDER_CREATED', 'SUCCESS', {
        orderId: orderResponse.data._id,
        orderNumber: orderResponse.data.orderNumber
      });

      await cartService.clearCart();
      
      setCreatedOrder(orderResponse.data);
      setPaymentStep('success');
      
      toast.success(`COD Order placed successfully! Order #${orderResponse.data.orderNumber}`);
      
      setTimeout(() => {
        navigate('/user/order-confirmation', {
          state: { order: orderResponse.data }
        });
      }, 3000);

    } catch (error) {
      logPaymentFlow('COD_PAYMENT_ERROR', 'ERROR', { error: error.message });
      setPaymentStep('failed');
      setPaymentError(error.message);
      toast.error(`Order creation failed: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Main payment processing router
  const processPayment = async () => {
    setPaymentError(null);

    if (paymentMethod === 'SMEPay') {
      await processRealSMEPayPayment();
    } else if (paymentMethod === 'Cashfree') {
      await processCashfreePayment();
    } else if (paymentMethod === 'Cash on Delivery') {
      await processCODPayment();
    } else {
      toast.error('Please select a valid payment method');
    }
  };

  const retryPayment = () => {
    logPaymentFlow('PAYMENT_RETRY', 'PROCESSING');
    setPaymentStep('form');
    setPaymentError(null);
  };

  // Enhanced loading check
  if (!orderData || !totals) {
    logPaymentFlow('PAGE_STATE', 'ERROR', { reason: 'missing_order_data' });
    return (
      <UserLayout>
        <div className="container mx-auto p-4">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payment details...</p>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Real Payment Processing State */}
        {paymentStep === 'processing' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 text-center max-w-md mx-4">
              <div className="mb-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {paymentMethod === 'SMEPay' ? 'Processing SMEPay Payment...' : 'Creating Order...'}
              </h3>
              <p className="text-gray-600 mb-4">Please don't close this window</p>
              
              {paymentMethod === 'SMEPay' && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    🔒 Complete your payment in the SMEPay window that will open
                  </p>
                </div>
              )}
              
              {paymentMethod === 'Cash on Delivery' && (
                <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-800">📦 Creating your COD order...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success State */}
        {paymentStep === 'success' && (
          <div className="text-center py-12">
            <div className="mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                {paymentMethod === 'SMEPay' ? 'Payment Successful! 🎉' : 'Order Placed Successfully! 📦'}
              </h2>
              <p className="text-gray-600 mb-4">
                {paymentMethod === 'SMEPay' 
                  ? 'Your payment has been processed successfully.'
                  : 'Your Cash on Delivery order has been placed.'
                }
              </p>
              {createdOrder && (
                <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-gray-600">Order Number</p>
                  <p className="text-lg font-bold text-gray-800">{createdOrder.orderNumber}</p>
                  <p className="text-sm text-green-600 mt-2">
                    ✅ Seller has been notified automatically
                  </p>
                  {paymentMethod === 'SMEPay' && (
                    <p className="text-xs text-blue-600 mt-1">
                      💳 Real SMEPay payment processed
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
              <p className="text-sm text-gray-500">Redirecting to order confirmation...</p>
            </div>
          </div>
        )}

        {/* 🎯 COMPLETED: Failed State Section */}
        {paymentStep === 'failed' && (
          <div className="text-center py-12">
            <div className="mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Payment Failed</h2>
              <p className="text-gray-600 mb-4">
                {paymentError || 'Something went wrong during payment processing.'}
              </p>
              
              {/* Error Details */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto mb-6">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-left">
                    <h3 className="text-sm font-medium text-red-800">What happened?</h3>
                    <p className="text-sm text-red-700 mt-1">
                      {paymentError?.includes('network') || paymentError?.includes('connection') 
                        ? 'There was a network issue. Please check your connection and try again.'
                        : paymentError?.includes('cancelled') || paymentError?.includes('closed')
                        ? 'Payment was cancelled or the payment window was closed.'
                        : paymentError?.includes('timeout')
                        ? 'Payment timed out. This might be due to slow network or server issues.'
                        : 'Payment processing failed. This could be due to insufficient funds, card issues, or technical problems.'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 max-w-md mx-auto">
                <button
                  onClick={retryPayment}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
                
                <button
                  onClick={() => {
                    setPaymentMethod('Cash on Delivery');
                    retryPayment();
                  }}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
                >
                  Switch to Cash on Delivery
                </button>
                
                <button
                  onClick={() => navigate('/user/cart')}
                  className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 px-6 rounded-lg font-medium transition-colors"
                >
                  Back to Cart
                </button>
              </div>

              {/* Help Section */}
              <div className="mt-8 p-4 bg-gray-50 rounded-lg max-w-md mx-auto">
                <h4 className="text-sm font-medium text-gray-800 mb-2">Need Help?</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• Check your internet connection</p>
                  <p>• Ensure sufficient balance in your account</p>
                  <p>• Try a different payment method</p>
                  <p>• Contact support if issue persists</p>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Support: <a href="mailto:support@zammer.com" className="text-orange-600 hover:text-orange-500">support@zammer.com</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Form */}
        {paymentStep === 'form' && (
          <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Payment</h1>
              <p className="text-gray-600">Choose your preferred payment method to complete the order</p>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-4">
                {cartItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <img 
                      src={item.product.images?.[0] || '/placeholder-product.jpg'} 
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.product.name}</h3>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">₹{(totals.totalPrice - totals.taxPrice - totals.shippingPrice).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-medium">₹{totals.taxPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping:</span>
                    <span className="font-medium">₹{totals.shippingPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>₹{totals.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
              
              <div className="space-y-4">
                {/* SMEPay Option */}
                <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="SMEPay"
                    checked={paymentMethod === 'SMEPay'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="w-12 h-8 bg-blue-100 rounded flex items-center justify-center mr-3">
                        <span className="text-blue-600 font-bold text-xs">PAY</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">SMEPay</h3>
                        <p className="text-sm text-gray-600">Secure UPI, Card & Net Banking</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-green-600 text-sm font-medium">Recommended</div>
                </label>

                {/* Cashfree Option */}
                <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Cashfree"
                    checked={paymentMethod === 'Cashfree'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="w-12 h-8 bg-purple-100 rounded flex items-center justify-center mr-3">
                        <span className="text-purple-600 font-bold text-xs">CF</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Cashfree</h3>
                        <p className="text-sm text-gray-600">UPI, Cards, Wallets, Net Banking</p>
                      </div>
                    </div>
                  </div>
                </label>

                {/* COD Option */}
                <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Cash on Delivery"
                    checked={paymentMethod === 'Cash on Delivery'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="w-12 h-8 bg-orange-100 rounded flex items-center justify-center mr-3">
                        <span className="text-orange-600 font-bold text-xs">COD</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Cash on Delivery</h3>
                        <p className="text-sm text-gray-600">Pay when you receive your order</p>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Proceed Button */}
            <div className="text-center">
              <button
                onClick={processPayment}
                disabled={processing}
                className="w-full max-w-md bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white py-4 px-8 rounded-lg font-semibold text-lg transition-colors"
              >
                {processing 
                  ? 'Processing...' 
                  : paymentMethod === 'SMEPay' 
                    ? `Pay ₹${totals.totalPrice.toFixed(2)} with SMEPay`
                    : paymentMethod === 'Cashfree'
                      ? `Pay ₹${totals.totalPrice.toFixed(2)} with Cashfree`
                      : `Place COD Order - ₹${totals.totalPrice.toFixed(2)}`
                }
              </button>
              
              <p className="text-sm text-gray-500 mt-4">
                By proceeding, you agree to our{' '}
                <a href="/terms" className="text-orange-600 hover:text-orange-500">Terms & Conditions</a>
                {' '}and{' '}
                <a href="/privacy" className="text-orange-600 hover:text-orange-500">Privacy Policy</a>
              </p>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default PaymentPage;