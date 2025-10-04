// frontend/src/pages/user/OrderConfirmationPage.js
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import orderService from '../../services/orderService';
import returnService from '../../services/returnService';
import ReturnRequestModal from '../../components/return/ReturnRequestModal';
import { FiArrowLeft, FiRotateCcw, FiClock, FiAlertCircle } from 'react-icons/fi';

const OrderConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnEligibility, setReturnEligibility] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isPollingPayment, setIsPollingPayment] = useState(false);

  useEffect(() => {
    const fetchOrderData = async () => {
      // Get order data from navigation state
      if (location.state?.order) {
        const orderFromState = location.state.order;
        console.log('✅ Order data received from navigation state:', orderFromState);
        
        // 🎯 CRITICAL FIX: Always fetch fresh data to ensure payment status is current
        try {
          console.log('🔄 Fetching fresh order data to verify payment status...');
          const freshOrderResponse = await orderService.getOrderById(orderFromState._id);
          
          if (freshOrderResponse.success) {
            const freshOrder = freshOrderResponse.data;
            setOrder(freshOrder);
            
            // Log payment status comparison
            console.log('📊 Payment Status Comparison:');
            console.log('  - State Data:', {
              isPaid: orderFromState.isPaid,
              paymentStatus: orderFromState.paymentStatus
            });
            console.log('  - Fresh Data:', {
              isPaid: freshOrder.isPaid,
              paymentStatus: freshOrder.paymentStatus
            });
            
            // Show notification if payment status changed
            if (!orderFromState.isPaid && freshOrder.isPaid) {
              console.log('🎉 Payment status updated from pending to completed!');
              toast.success(
                <div className="flex items-center">
                  <div className="bg-green-100 rounded-full p-2 mr-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Payment Confirmed! 🎉</p>
                    <p className="text-sm text-gray-600">Order #{freshOrder.orderNumber}</p>
                    <p className="text-xs text-blue-600">Status updated on page load</p>
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
            }
            
            console.log('✅ Fresh order data loaded:', freshOrder);
          } else {
            // Fallback to state data if fresh fetch fails
            setOrder(orderFromState);
            console.log('⚠️ Using state data as fallback due to API error');
          }
        } catch (error) {
          console.error('❌ Error fetching fresh order data:', error);
          // Fallback to state data
          setOrder(orderFromState);
          console.log('⚠️ Using state data as fallback due to network error');
        }
        
        setLoading(false);
      } else {
        // 🎯 FIXED: Fallback - try to get order from URL params or redirect to dashboard
        console.log('⚠️ No order data in navigation state, checking URL params...');
        
        // Check if we have order ID in URL params
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('orderId');
        
        if (orderId) {
          console.log('🔍 Found order ID in URL params:', orderId);
          try {
            const orderResponse = await orderService.getOrderById(orderId);
            if (orderResponse.success) {
              setOrder(orderResponse.data);
              setLoading(false);
              return;
            }
          } catch (error) {
            console.error('❌ Error fetching order by ID:', error);
          }
          
          toast.error('Order information incomplete. Please check your order history.');
          navigate('/user/dashboard');
        } else {
          // If no order data, redirect to dashboard
          toast.error('No order information found');
          navigate('/user/dashboard');
        }
      }
    };

    fetchOrderData();
  }, [location.state, navigate]);

  // Socket connection for real-time updates
  useEffect(() => {
    const initializeSocket = () => {
      try {
        const socketConnection = window.io();
        
        socketConnection.on('connect', () => {
          console.log('Socket connected for order confirmation');
          const userId = localStorage.getItem('userId');
          if (userId) {
            socketConnection.emit('buyer-join', userId);
          }
        });

        // 🎯 CRITICAL FIX: Listen for payment completion events
        socketConnection.on('payment-completed', (data) => {
          console.log('💳 Payment completed event received:', data);
          
          // Update order state with payment completion data
          if (order && data.data && data.data._id === order._id) {
            console.log('✅ Updating order payment status in real-time');
            
            setOrder(prevOrder => ({
              ...prevOrder,
              isPaid: true,
              paymentStatus: 'completed',
              status: data.data.status || prevOrder.status,
              paidAt: new Date(),
              paymentResult: {
                gateway: 'smepay',
                transactionId: data.data.transactionId || 'smepay_transaction',
                paidAt: new Date(),
                paymentMethod: 'SMEPay'
              }
            }));

            // Show success notification
            toast.success(
              <div className="flex items-center">
                <div className="bg-green-100 rounded-full p-2 mr-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Payment Confirmed! 🎉</p>
                  <p className="text-sm text-gray-600">Order #{data.data.orderNumber}</p>
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
          }
        });

        // Listen for order status updates (including payment status changes)
        socketConnection.on('order-status-update', (data) => {
          console.log('📦 Order status update received:', data);
          
          if (order && data.data && data.data._id === order._id) {
            console.log('🔄 Updating order status in real-time');
            
            setOrder(prevOrder => ({
              ...prevOrder,
              status: data.data.status || prevOrder.status,
              paymentStatus: data.data.paymentStatus || prevOrder.paymentStatus,
              isPaid: data.data.isPaid !== undefined ? data.data.isPaid : prevOrder.isPaid
            }));

            // Show status update notification
            toast.info(`Order ${data.data.orderNumber} status updated to ${data.data.status}`);
          }
        });

        // Listen for return-related events
        socketConnection.on('return-requested', (data) => {
          console.log('Return requested:', data);
          toast.success('Return request submitted successfully!');
          setShowReturnModal(false);
          // Refresh order data to show updated return status
          if (order) {
            fetchOrderData();
          }
        });

        socketConnection.on('return-approved', (data) => {
          console.log('Return approved:', data);
          toast.success('Your return request has been approved!');
          if (order) {
            fetchOrderData();
          }
        });

        socketConnection.on('return-agent-accepted', (data) => {
          console.log('Return agent accepted:', data);
          toast.info('Delivery agent has accepted your return assignment');
          if (order) {
            fetchOrderData();
          }
        });

        socketConnection.on('return-picked-up', (data) => {
          console.log('Return picked up:', data);
          toast.success('Your return has been picked up successfully!');
          if (order) {
            fetchOrderData();
          }
        });

        socketConnection.on('return-delivered-to-seller', (data) => {
          console.log('Return delivered to seller:', data);
          toast.success('Return has been delivered to seller');
          if (order) {
            fetchOrderData();
          }
        });

        socketConnection.on('return-completed', (data) => {
          console.log('Return completed:', data);
          toast.success('Return process completed successfully!');
          if (order) {
            fetchOrderData();
          }
        });

        setSocket(socketConnection);

        return () => {
          socketConnection.disconnect();
        };
      } catch (error) {
        console.error('Socket connection error:', error);
      }
    };

    initializeSocket();
  }, [order]); // 🎯 FIX: Add order dependency to ensure socket events work with current order

  // 🎯 CRITICAL FIX: Add polling mechanism for payment status updates
  useEffect(() => {
    if (!order || order.isPaid) {
      setIsPollingPayment(false);
      return; // Don't poll if already paid
    }

    console.log('🔄 Starting payment status polling for order:', order.orderNumber);
    setIsPollingPayment(true);
    
    const pollPaymentStatus = async () => {
      try {
        console.log('🔍 Polling payment status...');
        const response = await orderService.getOrderById(order._id);
        
        if (response.success && response.data) {
          const updatedOrder = response.data;
          
          // Check if payment status has changed
          if (updatedOrder.isPaid && !order.isPaid) {
            console.log('✅ Payment status updated via polling!');
            
            setOrder(updatedOrder);
            setIsPollingPayment(false); // Stop polling once payment is confirmed
            
            // Show success notification
            toast.success(
              <div className="flex items-center">
                <div className="bg-green-100 rounded-full p-2 mr-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Payment Confirmed! 🎉</p>
                  <p className="text-sm text-gray-600">Order #{updatedOrder.orderNumber}</p>
                  <p className="text-xs text-blue-600">Updated via polling</p>
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
          }
        }
      } catch (error) {
        console.error('❌ Error polling payment status:', error);
      }
    };

    // Poll every 3 seconds for the first 30 seconds, then every 10 seconds
    const initialPolling = setInterval(pollPaymentStatus, 3000);
    const extendedPolling = setTimeout(() => {
      clearInterval(initialPolling);
      const longPolling = setInterval(pollPaymentStatus, 10000);
      
      // Stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(longPolling);
        setIsPollingPayment(false);
        console.log('⏹️ Stopped payment status polling after 5 minutes');
      }, 300000); // 5 minutes
    }, 30000); // 30 seconds

    return () => {
      clearInterval(initialPolling);
      clearTimeout(extendedPolling);
      setIsPollingPayment(false);
    };
  }, [order]);

  // Check return eligibility when order is loaded
  useEffect(() => {
    const checkEligibility = async () => {
      if (order && order.isDelivered) {
        try {
          const eligibility = await returnService.checkReturnEligibility(order._id);
          setReturnEligibility(eligibility.data);
        } catch (error) {
          console.error('Error checking return eligibility:', error);
        }
      }
    };

    checkEligibility();
  }, [order]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'text-amber-700 bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200';
      case 'Processing':
        return 'text-blue-700 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200';
      case 'Shipped':
        return 'text-purple-700 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200';
      case 'Delivered':
        return 'text-emerald-700 bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200';
      case 'Cancelled':
        return 'text-red-700 bg-gradient-to-r from-red-50 to-red-100 border border-red-200';
      default:
        return 'text-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200';
    }
  };

  // Return functionality helpers
  const canRequestReturn = () => {
    if (!order || !order.isDelivered) return false;
    return returnEligibility?.eligible || false;
  };

  const getReturnStatusInfo = () => {
    if (!order?.returnDetails) return null;
    
    const status = order.returnDetails.returnStatus;
    const progress = returnService.getReturnProgress(status);
    const nextStep = returnService.getNextStep(status);
    
    return {
      status,
      progress,
      nextStep,
      formattedStatus: returnService.formatReturnStatus(status)
    };
  };

  const handleReturnRequested = (returnData) => {
    console.log('Return requested:', returnData);
    // Update order with return details
    setOrder(prevOrder => ({
      ...prevOrder,
      returnDetails: returnData
    }));
  };

  const fetchOrderData = async () => {
    if (order?._id) {
      try {
        const orderResponse = await orderService.getOrderById(order._id);
        if (orderResponse.success) {
          setOrder(orderResponse.data);
        }
      } catch (error) {
        console.error('Error refreshing order data:', error);
      }
    }
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
          <div className="container mx-auto px-4 py-8 sm:py-12">
            <div className="flex justify-center items-center min-h-[60vh]">
              <div className="text-center">
                <div className="relative mb-8">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-500 mx-auto"></div>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 opacity-20 animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <p className="text-slate-700 font-medium text-lg">Loading order details...</p>
                  <p className="text-slate-500 text-sm">Please wait while we fetch your information</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  if (!order) {
    return (
      <UserLayout>
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50">
          <div className="container mx-auto px-4 py-8 sm:py-12">
            <div className="flex justify-center items-center min-h-[60vh]">
              <div className="text-center max-w-md mx-auto">
                <div className="mb-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg border border-red-200">
                    <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">Order Not Found</h2>
                  <p className="text-slate-600 mb-8 leading-relaxed">We couldn't find the order information. This might be due to a technical issue or the order may not exist.</p>
                  <Link
                    to="/user/dashboard"
                    className="inline-flex items-center justify-center bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Return to Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="container mx-auto px-4 py-6 sm:py-8 lg:py-12 max-w-5xl">
          
          {/* Success Header with Animation */}
          <div className="text-center py-8 sm:py-12">
            <div className="mb-8">
              <div className="relative mb-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto shadow-2xl border-4 border-white">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="absolute inset-0 w-20 h-20 sm:w-24 sm:h-24 bg-emerald-400 rounded-full mx-auto animate-ping opacity-20"></div>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-3">
                Order Placed Successfully!
              </h1>
              <p className="text-slate-600 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
                Thank you for your order. We'll send you real-time updates about your delivery.
              </p>
            </div>
          </div>

          {/* Main Order Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl border border-white/50 overflow-hidden mb-8">
            
            {/* Order Header */}
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 sm:px-8 py-6 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Order Details</h2>
                  <div className="space-y-1 text-sm sm:text-base">
                    <p className="text-slate-600">
                      Order Number: <span className="font-semibold text-slate-800 font-mono bg-slate-100 px-2 py-1 rounded">{order.orderNumber}</span>
                    </p>
                    <p className="text-slate-600">
                      Placed on: <span className="font-semibold text-slate-800">{formatDate(order.createdAt)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex justify-start sm:justify-end">
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${getStatusColor(order.status)}`}>
                    <div className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse"></div>
                    {order.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              
              {/* Return Status Section */}
              {order?.returnDetails && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <FiRotateCcw className="w-5 h-5 text-blue-600" />
                      Return Status
                    </h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getReturnStatusInfo()?.formattedStatus.color === 'green' ? 'text-green-700 bg-green-100' : getReturnStatusInfo()?.formattedStatus.color === 'red' ? 'text-red-700 bg-red-100' : 'text-blue-700 bg-blue-100'}`}>
                      {getReturnStatusInfo()?.formattedStatus.label}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-slate-600 mb-2">
                      <span>Progress</span>
                      <span>{getReturnStatusInfo()?.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getReturnStatusInfo()?.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Next Step */}
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <FiClock className="w-4 h-4 text-slate-500" />
                    <span>Next: {getReturnStatusInfo()?.nextStep}</span>
                  </div>

                  {/* Return Timeline */}
                  {order.returnDetails.returnHistory && order.returnDetails.returnHistory.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Return Timeline</h4>
                      <div className="space-y-2">
                        {order.returnDetails.returnHistory.slice(0, 3).map((entry, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs text-slate-600">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <span className="capitalize">{entry.status.replace('_', ' ')}</span>
                            <span className="text-slate-400">•</span>
                            <span>{new Date(entry.changedAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Return Eligibility Notice */}
              {order?.isDelivered && !order?.returnDetails && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-start gap-3">
                    <FiAlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium text-amber-800 mb-1">24-Hour Return Window</h4>
                      <p className="text-sm text-amber-700">
                        You have {returnEligibility?.hoursRemaining ? 
                          `${Math.floor(returnEligibility.hoursRemaining)}h ${Math.floor((returnEligibility.hoursRemaining % 1) * 60)}m` : 
                          'limited time'
                        } remaining to request a return for this order.
                      </p>
                      {returnEligibility?.eligible && (
                        <button
                          onClick={() => setShowReturnModal(true)}
                          className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <FiRotateCcw className="w-4 h-4" />
                          Request Return
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Order Items */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-800">Order Items</h3>
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium">
                    {order.orderItems?.length || 0} items
                  </span>
                </div>
                <div className="space-y-4">
                  {order.orderItems?.map((item, index) => (
                    <div key={index} className="group bg-gradient-to-r from-slate-50 to-gray-50 hover:from-orange-50 hover:to-amber-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 hover:border-orange-200 transition-all duration-300 hover:shadow-md">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        
                        {/* Product Image */}
                        <div className="w-full sm:w-20 h-48 sm:h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg sm:rounded-xl overflow-hidden flex-shrink-0 shadow-inner">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        {/* Product Details */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <h4 className="font-semibold text-slate-800 text-base sm:text-lg line-clamp-2 group-hover:text-orange-700 transition-colors">
                            {item.name}
                          </h4>
                          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                            {item.size && (
                              <span className="bg-white/70 px-2 py-1 rounded-md border">
                                Size: <span className="font-medium">{item.size}</span>
                              </span>
                            )}
                            {item.color && (
                              <span className="bg-white/70 px-2 py-1 rounded-md border">
                                Color: <span className="font-medium">{item.color}</span>
                              </span>
                            )}
                            <span className="bg-white/70 px-2 py-1 rounded-md border">
                              Qty: <span className="font-medium">{item.quantity}</span>
                            </span>
                          </div>
                        </div>
                        
                        {/* Price */}
                        <div className="text-right sm:text-left space-y-1">
                          <p className="font-bold text-lg sm:text-xl text-slate-800">₹{(item.price * item.quantity).toLocaleString()}</p>
                          <p className="text-sm text-slate-500">₹{item.price.toLocaleString()} each</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid Layout for Address and Payment */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                
                {/* Shipping Address */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h3 className="text-lg font-bold text-slate-800">Shipping Address</h3>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-5 border border-blue-100">
                    <div className="space-y-2 text-sm sm:text-base">
                      <p className="text-slate-800 font-semibold">{order.shippingAddress?.address}</p>
                      <p className="text-slate-700">{order.shippingAddress?.city}, {order.shippingAddress?.postalCode}</p>
                      <p className="text-slate-700">{order.shippingAddress?.country}</p>
                      <div className="flex items-center gap-2 pt-2 border-t border-blue-200">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="text-slate-700 font-medium">{order.shippingAddress?.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <h3 className="text-lg font-bold text-slate-800">Payment Information</h3>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 sm:p-5 border border-purple-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-medium">Payment Method:</span>
                      <span className="font-semibold text-slate-800 bg-white/70 px-3 py-1 rounded-lg">{order.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-medium">Payment Status:</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold px-3 py-1 rounded-lg ${
                          order.isPaid 
                            ? 'text-emerald-700 bg-emerald-100' 
                            : 'text-amber-700 bg-amber-100'
                        }`}>
                          {order.isPaid ? (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Paid
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Pending
                            </span>
                          )}
                        </span>
                        {/* 🎯 CRITICAL FIX: Show polling indicator when actively checking payment status */}
                        {isPollingPayment && !order.isPaid && (
                          <div className="flex items-center gap-1 text-blue-600 text-xs">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                            <span>Checking...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Total */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-white">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Order Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Subtotal:</span>
                    <span className="font-semibold">₹{((order.totalPrice - order.taxPrice - order.shippingPrice).toFixed(2) * 1).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Tax (18% GST):</span>
                    <span className="font-semibold">₹{(order.taxPrice * 1).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Shipping:</span>
                    <span className="font-semibold">
                      {order.shippingPrice === 0 ? (
                        <span className="text-emerald-400 font-bold">FREE</span>
                      ) : (
                        `₹${(order.shippingPrice * 1).toLocaleString()}`
                      )}
                    </span>
                  </div>
                  <div className="border-t border-slate-600 pt-4">
                    <div className="flex justify-between items-center text-xl sm:text-2xl font-bold">
                      <span>Total:</span>
                      <span className="text-orange-400">₹{(order.totalPrice * 1).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                to="/user/dashboard"
                className="group bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-4 px-6 rounded-xl font-semibold text-center transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Continue Shopping
              </Link>
              <Link
                to="/user/orders"
                className="group bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50 hover:border-orange-600 py-4 px-6 rounded-xl font-semibold text-center transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View All Orders
              </Link>
            </div>
            
            {/* Help Section */}
            <div className="text-center py-8 sm:py-12">
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white/50 max-w-md mx-auto">
                <div className="mb-4">
                  <svg className="w-8 h-8 text-orange-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-slate-700 font-medium mb-6">Need help with your order?</p>
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
                  <Link
                    to="/user/support"
                    className="text-orange-600 hover:text-orange-700 font-semibold transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25A9.75 9.75 0 002.25 12 9.75 9.75 0 0012 21.75 9.75 9.75 0 0021.75 12 9.75 9.75 0 0012 2.25z" />
                    </svg>
                    Contact Support
                  </Link>
                  <div className="hidden sm:block w-px h-4 bg-slate-300"></div>
                  <div className="block sm:hidden w-full h-px bg-slate-300"></div>
                  <Link
                    to="/user/faq"
                    className="text-orange-600 hover:text-orange-700 font-semibold transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    FAQ
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Return Request Modal */}
      <ReturnRequestModal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        order={order}
        onReturnRequested={handleReturnRequested}
        socket={socket}
      />
    </UserLayout>
  );
};

export default OrderConfirmationPage;