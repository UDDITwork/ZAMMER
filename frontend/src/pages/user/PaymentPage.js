import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import orderService from '../../services/orderService';
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
  
  // Card details state
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });
  
  // UPI details state
  const [upiId, setUpiId] = useState('');

  // 🎯 NEW: Test mode indicator
  const [isTestMode, setIsTestMode] = useState(orderService.isTestMode());

  // Enhanced terminal logging for payment flow
  const logPaymentFlow = (action, status, data = null) => {
    const timestamp = new Date().toISOString();
    const logLevel = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '🔄';
    
    console.log(`${logLevel} [PAYMENT-FLOW] ${timestamp} - ${action}`, data ? JSON.stringify(data, null, 2) : '');
  };

  useEffect(() => {
    logPaymentFlow('PAGE_LOAD', 'PROCESSING', { hasLocationState: !!location.state });
    
    // Get order data from navigation state
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
      itemCount: ci?.length,
      testMode: isTestMode
    });
  }, [location.state, navigate, isTestMode]);

  const handleCardInputChange = (field, value) => {
    let formattedValue = value;
    
    // Format card number
    if (field === 'cardNumber') {
      formattedValue = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
      if (formattedValue.length > 19) return; // Max 16 digits + 3 spaces
    }
    
    // Format expiry date
    if (field === 'expiryDate') {
      formattedValue = value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2');
      if (formattedValue.length > 5) return; // MM/YY format
    }
    
    // Format CVV
    if (field === 'cvv') {
      formattedValue = value.replace(/\D/g, '');
      if (formattedValue.length > 3) return; // Max 3 digits
    }
    
    setCardDetails(prev => ({
      ...prev,
      [field]: formattedValue
    }));
  };

  const validateCardDetails = () => {
    logPaymentFlow('CARD_VALIDATION', 'PROCESSING', { paymentMethod: orderData.paymentMethod });
    
    if (orderData.paymentMethod === 'Card') {
      if (!cardDetails.cardNumber.replace(/\s/g, '').match(/^\d{16}$/)) {
        logPaymentFlow('CARD_VALIDATION', 'ERROR', { reason: 'invalid_card_number' });
        toast.error('Please enter a valid 16-digit card number');
        return false;
      }
      if (!cardDetails.expiryDate.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) {
        logPaymentFlow('CARD_VALIDATION', 'ERROR', { reason: 'invalid_expiry_date' });
        toast.error('Please enter a valid expiry date (MM/YY)');
        return false;
      }
      if (!cardDetails.cvv.match(/^\d{3}$/)) {
        logPaymentFlow('CARD_VALIDATION', 'ERROR', { reason: 'invalid_cvv' });
        toast.error('Please enter a valid 3-digit CVV');
        return false;
      }
      if (!cardDetails.cardholderName.trim()) {
        logPaymentFlow('CARD_VALIDATION', 'ERROR', { reason: 'missing_cardholder_name' });
        toast.error('Please enter cardholder name');
        return false;
      }
    }
    
    if (orderData.paymentMethod === 'UPI') {
      if (!upiId.trim()) {
        logPaymentFlow('UPI_VALIDATION', 'ERROR', { reason: 'missing_upi_id' });
        toast.error('Please enter UPI ID');
        return false;
      }
      if (!upiId.includes('@')) {
        logPaymentFlow('UPI_VALIDATION', 'ERROR', { reason: 'invalid_upi_format' });
        toast.error('Please enter a valid UPI ID');
        return false;
      }
    }
    
    logPaymentFlow('VALIDATION', 'SUCCESS', { paymentMethod: orderData.paymentMethod });
    return true;
  };

  const processPayment = async () => {
    if (orderData.paymentMethod !== 'Cash on Delivery' && !validateCardDetails()) {
      return;
    }

    setProcessing(true);
    setPaymentStep('processing');

    logPaymentFlow('PAYMENT_START', 'PROCESSING', {
      paymentMethod: orderData.paymentMethod,
      totalPrice: totals.totalPrice,
      testMode: isTestMode,
      timestamp: new Date().toISOString()
    });

    try {
      let paymentResult = null;
      
      // 🎯 ENHANCED: Process payment with mock system
      if (orderData.paymentMethod !== 'Cash on Delivery') {
        const paymentData = {
          amount: totals.totalPrice,
          method: orderData.paymentMethod,
          cardDetails: orderData.paymentMethod === 'Card' ? {
            ...cardDetails,
            cardNumber: cardDetails.cardNumber.replace(/\s/g, '') // Remove spaces for processing
          } : null,
          upiId: orderData.paymentMethod === 'UPI' ? upiId : null
        };
        
        logPaymentFlow('PAYMENT_PROCESSING', 'PROCESSING', {
          method: paymentData.method,
          amount: paymentData.amount,
          testMode: isTestMode
        });
        
        // 🎯 Use mock payment service
        const paymentResponse = await orderService.processPayment(paymentData);
        
        if (!paymentResponse.success) {
          throw new Error(paymentResponse.message || 'Payment failed');
        }
        
        paymentResult = paymentResponse.data;
        logPaymentFlow('PAYMENT_PROCESSING', 'SUCCESS', {
          transactionId: paymentResult.transactionId,
          method: paymentResult.method,
          isTest: paymentResult.isTest
        });

        // 🎯 Show payment success details for testing
        if (paymentResult.isTest) {
          console.log(`
💳 ===============================
   MOCK PAYMENT SUCCESSFUL!
===============================
🔗 Transaction ID: ${paymentResult.transactionId}
💳 Method: ${paymentResult.method}
💰 Amount: ₹${paymentResult.amount}
🏦 Gateway: ${paymentResult.gateway}
⏱️ Processing Time: ${paymentResult.processingTime}ms
🧪 Test Mode: ${paymentResult.isTest}
📅 Time: ${new Date().toLocaleString()}
===============================`);
        }
        
      } else {
        logPaymentFlow('COD_PROCESSING', 'SUCCESS', { method: 'Cash on Delivery' });
      }

      // Create order
      logPaymentFlow('ORDER_CREATION', 'PROCESSING', {
        paymentMethod: orderData.paymentMethod,
        isPaid: orderData.paymentMethod !== 'Cash on Delivery'
      });

      const orderPayload = {
        ...orderData,
        paymentResult: paymentResult,
        isPaid: orderData.paymentMethod !== 'Cash on Delivery'
      };

      const orderResponse = await orderService.createOrder(orderPayload);
      
      if (!orderResponse.success) {
        throw new Error(orderResponse.message || 'Failed to create order');
      }

      logPaymentFlow('ORDER_CREATION', 'SUCCESS', {
        orderId: orderResponse.data._id,
        orderNumber: orderResponse.data.orderNumber,
        sellerId: orderResponse.data.seller
      });

      // Clear cart after successful order
      logPaymentFlow('CART_CLEANUP', 'PROCESSING');
      await cartService.clearCart();
      logPaymentFlow('CART_CLEANUP', 'SUCCESS');
      
      setCreatedOrder(orderResponse.data);
      setPaymentStep('success');
      
      // 🎯 Enhanced success notification with test mode indicator
      toast.success(
        <div className="flex items-center">
          <div className="bg-green-100 rounded-full p-2 mr-3">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-medium">Order placed successfully! {isTestMode && '🧪'}</p>
            <p className="text-sm text-gray-600">Order #{orderResponse.data.orderNumber}</p>
            {isTestMode && <p className="text-xs text-blue-600">Test Mode Payment</p>}
          </div>
        </div>,
        {
          position: "top-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
        }
      );
      
      logPaymentFlow('PAYMENT_COMPLETE', 'SUCCESS', {
        orderId: orderResponse.data._id,
        orderNumber: orderResponse.data.orderNumber,
        totalPrice: orderResponse.data.totalPrice,
        testMode: isTestMode,
        timestamp: new Date().toISOString()
      });

      // 🎯 Enhanced terminal success display
      console.log(`
🎉 ===============================
    PAYMENT SUCCESSFUL!
===============================
💳 Payment Method: ${orderData.paymentMethod}
💰 Amount: ₹${totals.totalPrice}
📦 Order ID: ${orderResponse.data._id}
🔢 Order Number: ${orderResponse.data.orderNumber}
🧪 Test Mode: ${isTestMode}
📅 Time: ${new Date().toLocaleString()}
===============================`);
      
      // Redirect to order confirmation after 3 seconds
      setTimeout(() => {
        navigate('/user/order-confirmation', {
          state: { order: orderResponse.data }
        });
      }, 3000);

    } catch (error) {
      console.error('Payment processing error:', error);
      logPaymentFlow('PAYMENT_ERROR', 'ERROR', {
        error: error.message,
        paymentMethod: orderData.paymentMethod,
        step: paymentStep,
        testMode: isTestMode
      });
      
      setPaymentStep('failed');
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const retryPayment = () => {
    logPaymentFlow('PAYMENT_RETRY', 'PROCESSING');
    setPaymentStep('form');
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
        {/* 🎯 NEW: Test Mode Indicator */}
        {isTestMode && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-800">🧪 Test Mode Active</p>
                <p className="text-xs text-blue-600">All payments are simulated for testing purposes</p>
              </div>
            </div>
          </div>
        )}

        {/* Processing State */}
        {paymentStep === 'processing' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 text-center max-w-md mx-4">
              <div className="mb-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Processing Payment... {isTestMode && '🧪'}
              </h3>
              <p className="text-gray-600">Please don't close this window</p>
              {orderData.paymentMethod === 'Card' && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    🔒 {isTestMode ? 'Simulating card verification...' : 'Verifying card details with bank...'}
                  </p>
                </div>
              )}
              {orderData.paymentMethod === 'UPI' && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    💚 {isTestMode ? 'Simulating UPI transaction...' : 'Confirming UPI transaction...'}
                  </p>
                </div>
              )}
              {orderData.paymentMethod === 'Cash on Delivery' && (
                <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-800">📦 Creating your order...</p>
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
                Payment Successful! 🎉 {isTestMode && '🧪'}
              </h2>
              <p className="text-gray-600 mb-4">Your order has been placed successfully.</p>
              {createdOrder && (
                <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-gray-600">Order Number</p>
                  <p className="text-lg font-bold text-gray-800">{createdOrder.orderNumber}</p>
                  <p className="text-sm text-green-600 mt-2">
                    ✅ Seller has been notified automatically
                  </p>
                  {isTestMode && (
                    <p className="text-xs text-blue-600 mt-1">
                      🧪 Test payment processed successfully
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

        {/* Failed State */}
        {paymentStep === 'failed' && (
          <div className="text-center py-12">
            <div className="mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Payment Failed ❌ {isTestMode && '🧪'}
              </h2>
              <p className="text-gray-600 mb-6">
                There was an issue processing your payment. Please try again.
              </p>
              {isTestMode && (
                <p className="text-sm text-blue-600 mb-4">
                  🧪 This is a simulated payment failure for testing
                </p>
              )}
              <div className="space-x-4">
                <button
                  onClick={retryPayment}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium"
                >
                  Try Again
                </button>
                <button
                  onClick={() => navigate('/user/checkout')}
                  className="text-orange-600 hover:text-orange-700 px-6 py-2 font-medium"
                >
                  Back to Checkout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Form - Rest of the component remains the same */}
        {paymentStep === 'form' && (
          <>
            {/* Header */}
            <div className="flex items-center mb-6">
              <button onClick={() => navigate('/user/checkout')} className="mr-4">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-800">
                Payment {isTestMode && '🧪'}
              </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Payment Form */}
              <div className="lg:col-span-2">
                {/* Payment Method Info */}
                <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Payment Method</h2>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    {orderData.paymentMethod === 'Card' && (
                      <svg className="w-6 h-6 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                      </svg>
                    )}
                    {orderData.paymentMethod === 'UPI' && (
                      <svg className="w-6 h-6 text-green-600 mr-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    )}
                    {orderData.paymentMethod === 'Cash on Delivery' && (
                      <svg className="w-6 h-6 text-orange-600 mr-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                      </svg>
                    )}
                    <span className="font-medium">{orderData.paymentMethod}</span>
                    {isTestMode && <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">TEST</span>}
                  </div>
                </div>

                {/* Card Payment Form */}
                {orderData.paymentMethod === 'Card' && (
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Card Details</h2>
                    
                    {isTestMode && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">🧪 Test Mode: Use any 16-digit number for testing</p>
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Card Number *
                        </label>
                        <input
                          type="text"
                          value={cardDetails.cardNumber}
                          onChange={(e) => handleCardInputChange('cardNumber', e.target.value)}
                          placeholder={isTestMode ? "4111 1111 1111 1111 (Test)" : "1234 5678 9012 3456"}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          maxLength="19"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expiry Date *
                          </label>
                          <input
                            type="text"
                            value={cardDetails.expiryDate}
                            onChange={(e) => handleCardInputChange('expiryDate', e.target.value)}
                            placeholder="12/25"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            maxLength="5"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            CVV *
                          </label>
                          <input
                            type="text"
                            value={cardDetails.cvv}
                            onChange={(e) => handleCardInputChange('cvv', e.target.value)}
                            placeholder="123"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            maxLength="3"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cardholder Name *
                        </label>
                        <input
                          type="text"
                          value={cardDetails.cardholderName}
                          onChange={(e) => handleCardInputChange('cardholderName', e.target.value)}
                          placeholder="Enter name as on card"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        🔒 Your card details are secure and encrypted
                        {isTestMode && " (Test Mode - No real charges)"}
                      </p>
                    </div>
                  </div>
                )}

                {/* UPI Payment Form */}
                {orderData.paymentMethod === 'UPI' && (
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">UPI Payment</h2>
                    
                    {isTestMode && (
                      <div className="mb-4 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-800">🧪 Test Mode: Use any UPI ID format for testing</p>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        UPI ID *
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder={isTestMode ? "test@paytm (Test)" : "yourname@paytm"}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    
                    <div className="mt-4 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-800">
                        💚 Quick and secure UPI payment
                        {isTestMode && " (Test Mode - No real transaction)"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Cash on Delivery Info */}
                {orderData.paymentMethod === 'Cash on Delivery' && (
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Cash on Delivery</h2>
                    
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <div className="flex items-start">
                        <svg className="w-6 h-6 text-orange-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h3 className="font-medium text-orange-800 mb-1">Payment Instructions</h3>
                          <ul className="text-sm text-orange-700 space-y-1">
                            <li>• Pay ₹{totals.totalPrice} to the delivery person</li>
                            <li>• Please keep exact change ready</li>
                            <li>• UPI payment to delivery person is also accepted</li>
                            {isTestMode && <li>• 🧪 Test Mode: Order will be created immediately</li>}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm border sticky top-4">
                  <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-800">Order Summary</h2>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">₹{totals.subtotal}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax (18% GST)</span>
                      <span className="font-medium">₹{totals.taxPrice}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipping</span>
                      <span className="font-medium">
                        {totals.shippingPrice === 0 ? (
                          <span className="text-green-600">FREE</span>
                        ) : (
                          `₹${totals.shippingPrice}`
                        )}
                      </span>
                    </div>
                    
                    <div className="border-t pt-3">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="text-orange-600">₹{totals.totalPrice}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border-t">
                    <button
                      onClick={processPayment}
                      disabled={processing}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
                    >
                      {processing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          {orderData.paymentMethod === 'Cash on Delivery' ? (
                            <>
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Place Order {isTestMode && '🧪'}
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              Pay ₹{totals.totalPrice} {isTestMode && '🧪'}
                            </>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </UserLayout>
  );
};

export default PaymentPage;