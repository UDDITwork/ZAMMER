// frontend/src/pages/delivery/AssignedOrders.js - Assigned Orders Management

import React, { useEffect, useState, useContext, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../../contexts/AuthContext';
import deliveryService from '../../services/deliveryService';
import paymentService from '../../services/paymentService'; // 🎯 EXACT MATCH: Import paymentService like buyer side

// 🎯 HELPER: Format QR code as base64 data URL for image display
const formatQRCodeAsDataURL = (qrCode) => {
  if (!qrCode) return null;
  
  // If already a data URL, return as is
  if (qrCode.startsWith('data:image')) {
    return qrCode;
  }
  
  // If it's a base64 string, format it as a data URL
  // SMEPay typically returns PNG format QR codes
  if (qrCode.startsWith('/9j/') || qrCode.match(/^[A-Za-z0-9+/=]+$/)) {
    return `data:image/png;base64,${qrCode}`;
  }
  
  // Return as is if format is unknown
  return qrCode;
};

const AssignedOrders = () => {
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingOrder, setProcessingOrder] = useState(null);
  const [actionType, setActionType] = useState(null); // 'accept', 'reached-seller', 'pickup', 'reached-delivery', 'delivery'
  
  // Modal states
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showReachedSellerModal, setShowReachedSellerModal] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showReachedDeliveryModal, setShowReachedDeliveryModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showDeliverySuccessModal, setShowDeliverySuccessModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [deliverySuccessData, setDeliverySuccessData] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  
  // Order state tracking
  
  // Form states
  const [pickupForm, setPickupForm] = useState({
    orderIdVerification: '',
    pickupNotes: ''
  });
  const [deliveryForm, setDeliveryForm] = useState({
    otp: '',
    deliveryNotes: '',
    codPaymentType: null, // 'qr' or 'cash'
    qrCode: null,
    paymentId: null
  });
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'pending', 'completed', 'failed'
  const [isPollingPayment, setIsPollingPayment] = useState(false);
  // 🎯 REMOVED: paymentPolling state - using useEffect-based polling (exactly like buyer side)
  const [socket, setSocket] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null); // Store payment transaction details
  
  // 🎯 FIX: Track if payment notification was already shown to prevent duplicates
  const paymentNotificationShownRef = useRef(false);
  const pollingIntervalRef = useRef(null);
  const pollingTimeoutRef = useRef(null);
  
  const navigate = useNavigate();
  const { deliveryAgentAuth, logoutDeliveryAgent } = useContext(AuthContext);
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  // Socket connection for real-time payment updates (exactly like buyer side)
  useEffect(() => {
    const initializeSocket = () => {
      try {
        const socketConnection = window.io();
        
        socketConnection.on('connect', () => {
          console.log('🚚 [ASSIGNED-ORDERS] Socket connected for delivery agent');
          const deliveryAgentId = deliveryAgentAuth.deliveryAgent?._id || localStorage.getItem('deliveryAgentId');
          if (deliveryAgentId) {
            socketConnection.emit('delivery-agent-join', deliveryAgentId);
          }
        });

        // 🎯 CRITICAL: Listen for payment completion events (exactly like buyer side OrderConfirmationPage.js line 137-179)
        socketConnection.on('payment-completed', (data) => {
          console.log('💳 [ASSIGNED-ORDERS] Payment completed event received:', data);
          
          // Update payment status if this order is currently selected
          if (selectedOrder && data.data && data.data._id === selectedOrder._id) {
            // 🎯 FIX: Check if notification was already shown to prevent duplicates
            if (paymentNotificationShownRef.current) {
              console.log('⏹️ Payment notification already shown via polling, skipping socket notification');
              return;
            }
            
            console.log('✅ [ASSIGNED-ORDERS] Updating payment status in real-time');
            
            // 🎯 FIX: Mark notification as shown to prevent duplicates
            paymentNotificationShownRef.current = true;
            
            // 🎯 EXACT MATCH: Update order state like buyer side (setOrder(prevOrder => ({...})))
            setSelectedOrder(prevOrder => ({
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
            
            setPaymentCompleted(true);
            setPaymentStatus('completed');
            setIsPollingPayment(false);
            
            // 🎯 CRITICAL FIX: Clear QR code from form state when payment completes (exactly like buyer side)
            setDeliveryForm(prev => ({
              ...prev,
              qrCode: null, // Remove QR code from display
              paymentId: prev.paymentId // Keep paymentId for reference
            }));
            
            // Update payment details
            setPaymentDetails({
              transactionId: data.data.transactionId || data.data.smepayOrderSlug || 'N/A',
              paidAt: data.data.paidAt || new Date(),
              paymentMethod: data.data.paymentMethod || 'SMEPay',
              paymentStatus: 'completed',
              isPaid: true
            });

            // 🎯 FIX: Show success notification ONLY ONCE (limit to 1 notification)
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
                toastId: `payment-confirmed-${data.data._id}`, // 🎯 FIX: Prevent duplicate toasts with same ID
              }
            );
          }
        });

        // Listen for order status updates (including payment status changes)
        socketConnection.on('order-status-update', (data) => {
          console.log('📦 [ASSIGNED-ORDERS] Order status update received:', data);
          
          if (selectedOrder && data.data && data.data._id === selectedOrder._id) {
            console.log('🔄 [ASSIGNED-ORDERS] Updating order status in real-time');
            
            // Update payment status if changed
            if (data.data.isPaid !== undefined && data.data.isPaid) {
              setPaymentCompleted(true);
              setPaymentStatus('completed');
              setIsPollingPayment(false);
              
              // 🎯 CRITICAL FIX: Clear QR code when payment status updates to paid
              setDeliveryForm(prev => ({
                ...prev,
                qrCode: null // Remove QR code from display
              }));
            }
            
            // Update selected order state
            setSelectedOrder(prevOrder => ({
              ...prevOrder,
              ...data.data
            }));
          }
        });

        setSocket(socketConnection);

        return () => {
          socketConnection.disconnect();
        };
      } catch (error) {
        console.error('❌ [ASSIGNED-ORDERS] Socket connection error:', error);
      }
    };

    if (deliveryAgentAuth.isAuthenticated && deliveryAgentAuth.deliveryAgent) {
      initializeSocket();
    }
  }, [deliveryAgentAuth, selectedOrder]);

  // 🎯 EXACT MATCH: Payment status polling mechanism (exactly like buyer side OrderConfirmationPage.js line 265-338)
  useEffect(() => {
    // 🎯 FIX: Reset notification flag when order changes
    paymentNotificationShownRef.current = false;
    
    // Clear any existing polling intervals
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    
    // 🎯 EXACT MATCH: Simple condition like buyer side (if (!order || order.isPaid))
    if (!selectedOrder || selectedOrder.isPaid) {
      setIsPollingPayment(false);
      return; // Don't poll if already paid
    }

    console.log('🔄 Starting payment status polling for order:', selectedOrder.orderNumber);
    setIsPollingPayment(true);
    
    const pollPaymentStatus = async () => {
      try {
        // 🎯 FIX: Stop polling if notification was already shown
        if (paymentNotificationShownRef.current) {
          console.log('⏹️ Payment notification already shown, stopping polling');
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setIsPollingPayment(false);
          return;
        }
        
        console.log('🔍 Polling payment status...');
        // 🎯 EXACT MATCH: Use service method like buyer side (orderService.getOrderById)
        const response = await deliveryService.getOrderById(selectedOrder._id);
        
        // 🎯 DEBUG: Log response structure to match buyer side exactly
        console.log('📊 [DELIVERY-POLL] Response structure:', {
          hasSuccess: !!response.success,
          hasData: !!response.data,
          responseKeys: Object.keys(response),
          dataKeys: response.data ? Object.keys(response.data) : null
        });
        
        if (response.success && response.data) {
          const updatedOrder = response.data;
          
          // 🎯 DEBUG: Log exact values being compared (EXACTLY like buyer side checks)
          console.log('📊 [DELIVERY-POLL] Payment status comparison:', {
            'updatedOrder.isPaid': updatedOrder.isPaid,
            'updatedOrder.paymentStatus': updatedOrder.paymentStatus,
            'selectedOrder.isPaid': selectedOrder.isPaid,
            'selectedOrder.paymentStatus': selectedOrder.paymentStatus,
            'willTriggerUpdate': updatedOrder.isPaid && !selectedOrder.isPaid,
            'notificationAlreadyShown': paymentNotificationShownRef.current
          });
          
          // 🎯 EXACT MATCH: Simple check like buyer side (if updatedOrder.isPaid && !order.isPaid)
          // 🎯 FIX: Also check if notification was already shown to prevent duplicates
          if (updatedOrder.isPaid && !selectedOrder.isPaid && !paymentNotificationShownRef.current) {
            console.log('✅ Payment status updated via polling!');
            
            // 🎯 FIX: Mark notification as shown IMMEDIATELY to prevent duplicates
            paymentNotificationShownRef.current = true;
            
            // 🎯 FIX: Stop polling IMMEDIATELY to prevent multiple notifications
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            if (pollingTimeoutRef.current) {
              clearTimeout(pollingTimeoutRef.current);
              pollingTimeoutRef.current = null;
            }
            setIsPollingPayment(false);
            
            // 🎯 CRITICAL: Trigger OTP generation by calling checkCODPaymentStatus endpoint
            // This will validate payment with SMEPay and auto-generate OTP if payment is confirmed
            try {
              console.log('📞 Triggering OTP generation for completed payment...');
              const otpResponse = await deliveryService.checkCODPaymentStatus(selectedOrder._id);
              console.log('📞 OTP generation response:', otpResponse);
              
              if (otpResponse.success && otpResponse.data?.otpGenerated) {
                console.log('✅ OTP generated successfully!');
                toast.info('OTP has been sent to buyer\'s registered phone number');
              }
            } catch (otpError) {
              console.error('❌ Error generating OTP:', otpError);
              // Don't block payment confirmation if OTP generation fails
            }
            
            // 🎯 EXACT MATCH: Update order state like buyer side (setOrder(updatedOrder))
            setSelectedOrder(updatedOrder);
            
            // 🎯 CRITICAL FIX: Clear QR code from form state IMMEDIATELY when payment completes
            setDeliveryForm(prev => ({
              ...prev,
              qrCode: null, // Remove QR code from display - exactly like buyer side
              paymentId: prev.paymentId // Keep paymentId for reference
            }));
            
            // Update payment status states
            setPaymentCompleted(true);
            setPaymentStatus('completed');
            
            // Update payment details
            setPaymentDetails({
              transactionId: updatedOrder.paymentResult?.transactionId || deliveryForm.paymentId || 'N/A',
              paidAt: updatedOrder.paidAt || new Date(),
              paymentMethod: 'SMEPay QR',
              paymentStatus: 'completed',
              isPaid: true
            });
            
            // 🎯 FIX: Show success notification ONLY ONCE (limit to 1 notification)
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
                toastId: `payment-confirmed-${updatedOrder._id}`, // 🎯 FIX: Prevent duplicate toasts with same ID
              }
            );
          }
        }
      } catch (error) {
        console.error('❌ Error polling payment status:', error);
      }
    };

    // 🎯 EXACT MATCH: Poll every 3 seconds for the first 30 seconds, then every 10 seconds
    pollingIntervalRef.current = setInterval(pollPaymentStatus, 3000);
    pollingTimeoutRef.current = setTimeout(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      const longPolling = setInterval(() => {
        // 🎯 FIX: Check notification flag before polling
        if (paymentNotificationShownRef.current) {
          clearInterval(longPolling);
          setIsPollingPayment(false);
          return;
        }
        pollPaymentStatus();
      }, 10000);
      
      // Store long polling interval reference
      pollingIntervalRef.current = longPolling;
      
      // Stop polling after 5 minutes
      pollingTimeoutRef.current = setTimeout(() => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsPollingPayment(false);
        console.log('⏹️ Stopped payment status polling after 5 minutes');
      }, 300000); // 5 minutes
    }, 30000); // 30 seconds

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
      setIsPollingPayment(false);
    };
  }, [selectedOrder]); // 🎯 EXACT MATCH: Only depend on selectedOrder like buyer side depends on order

  // Check authentication
  useEffect(() => {
    if (!deliveryAgentAuth.isAuthenticated || !deliveryAgentAuth.deliveryAgent) {
      console.log('🚚 [ASSIGNED-ORDERS] Not authenticated, redirecting to login');
      navigate('/delivery/login');
      return;
    }

    loadAssignedOrders();
  }, [navigate, deliveryAgentAuth]);

  // Load assigned orders
  const loadAssignedOrders = async (options = {}) => {
    const { silent = false } = options;
    try {
      if (!silent) {
        setLoading(true);
      }
      const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
      
      if (!token) {
        console.error('🚚 [ASSIGNED-ORDERS] No token available');
        navigate('/delivery/login');
        return;
      }

      console.log('🚚 [ASSIGNED-ORDERS] Fetching assigned orders...');

      const response = await fetch(`${API_BASE_URL}/delivery/orders/assigned`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [ASSIGNED-ORDERS] Orders fetched successfully:', data.count || 0);
        
        // 🎯 SORT: Newly accepted orders first, then by assignedAt (newest first)
        const sortedOrders = (data.data || []).sort((a, b) => {
          // Prioritize accepted orders
          const aAccepted = a.acceptedAt ? new Date(a.acceptedAt).getTime() : 0;
          const bAccepted = b.acceptedAt ? new Date(b.acceptedAt).getTime() : 0;
          
          // If both are accepted, sort by acceptedAt (newest first)
          if (aAccepted && bAccepted) {
            return bAccepted - aAccepted;
          }
          
          // If only one is accepted, prioritize it
          if (aAccepted && !bAccepted) return -1;
          if (!aAccepted && bAccepted) return 1;
          
          // If neither is accepted, sort by assignedAt (newest first)
          const aAssigned = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
          const bAssigned = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
          return bAssigned - aAssigned;
        });
        
        setAssignedOrders(sortedOrders);
        return sortedOrders;
      } else {
        console.error('❌ [ASSIGNED-ORDERS] Failed to fetch orders:', response.status);
        if (response.status === 401) {
          logoutDeliveryAgent();
          navigate('/delivery/login');
        } else {
          toast.error('Failed to load assigned orders');
        }
      }
    } catch (error) {
      console.error('❌ [ASSIGNED-ORDERS] Error fetching orders:', error);
      toast.error('Failed to load assigned orders');
      return null;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const refreshOrderState = async (orderId) => {
    const latestOrders = await loadAssignedOrders({ silent: true });
    if (!latestOrders) return null;
    return latestOrders.find((ord) => ord._id === orderId) || null;
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAssignedOrders();
    setRefreshing(false);
  };

  // Handle order acceptance
  const handleAcceptOrder = async (order) => {
    setProcessingOrder(order._id);
    setActionType('accept');

    try {
      const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
      
      console.log('🚚 [ASSIGNED-ORDERS] Accepting order:', order._id);
      
      const response = await fetch(`${API_BASE_URL}/delivery/orders/${order._id}/accept`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Order accepted successfully!');
        console.log('✅ [ASSIGNED-ORDERS] Order accepted:', order._id);
        loadAssignedOrders();
      } else {
        console.error('❌ [ASSIGNED-ORDERS] Failed to accept order:', data.message);
        toast.error(data.message || 'Failed to accept order');
      }
    } catch (error) {
      console.error('❌ [ASSIGNED-ORDERS] Error accepting order:', error);
      toast.error('Failed to accept order');
    } finally {
      setProcessingOrder(null);
      setActionType(null);
    }
  };

  const openSellerCheckpoint = (order) => {
    if (!order) return;
    
    if (order.pickup?.sellerLocationReachedAt) {
      toast.info('Seller location already confirmed. Please enter the seller order ID to verify pickup.');
      setSelectedOrder(order);
      setPickupForm({ orderIdVerification: '', pickupNotes: '' });
      setShowPickupModal(true);
      return;
    }
    
    setSelectedOrder(order);
    setShowReachedSellerModal(true);
  };

  // Handle reached seller location
  const handleReachedSellerLocation = async (order) => {
    if (!order) {
      toast.error('No order selected');
      return;
    }

    if (order.pickup?.sellerLocationReachedAt) {
      toast.info('Seller location was already marked for this order.');
      setShowReachedSellerModal(false);
      setSelectedOrder(null);
      return true;
    }

    setProcessingOrder(order._id);
    setActionType('reached-seller');

    try {
      const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
      
      console.log('🚚 [ASSIGNED-ORDERS] Marking reached seller location for order:', order._id);
      
      const response = await fetch(`${API_BASE_URL}/delivery/orders/${order._id}/reached-seller-location`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Seller location confirmed! Please enter order ID from seller.');
        console.log('✅ [ASSIGNED-ORDERS] Seller location marked as reached:', order._id);
        
        // Open pickup modal with order ID input
        setSelectedOrder(order);
        setPickupForm({ orderIdVerification: '', pickupNotes: '' });
        setShowReachedSellerModal(false);
        setShowPickupModal(true);
        
        // Refresh orders to get updated data
        loadAssignedOrders();
      } else {
        console.error('❌ [ASSIGNED-ORDERS] Failed to mark seller location:', data.message);
        toast.error(data.message || 'Failed to confirm seller location');
      }
    } catch (error) {
      console.error('❌ [ASSIGNED-ORDERS] Error marking seller location:', error);
      toast.error('Failed to confirm seller location');
    } finally {
      setProcessingOrder(null);
      setActionType(null);
    }
  };

  // Handle pickup completion
  const handlePickupComplete = async () => {
    if (!selectedOrder || !pickupForm.orderIdVerification.trim()) {
      toast.error('Please enter order ID verification');
      return;
    }

    setProcessingOrder(selectedOrder._id);
    setActionType('pickup');

    try {
      const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
      
      console.log('🚚 [ASSIGNED-ORDERS] Completing pickup for order:', selectedOrder._id);
      
      const response = await fetch(`${API_BASE_URL}/delivery/orders/${selectedOrder._id}/pickup`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderIdVerification: pickupForm.orderIdVerification,
          pickupNotes: pickupForm.pickupNotes
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Pickup completed successfully! Order status updated for buyer.');
        console.log('✅ [ASSIGNED-ORDERS] Pickup completed:', selectedOrder._id);
        
        // Reset form and close modal
        setPickupForm({ orderIdVerification: '', pickupNotes: '' });
        setShowPickupModal(false);
        setSelectedOrder(null);
        
        // Refresh orders
        loadAssignedOrders();
      } else {
        console.error('❌ [ASSIGNED-ORDERS] Failed to complete pickup:', data.message);
        toast.error(data.message || 'Failed to complete pickup');
      }
    } catch (error) {
      console.error('❌ [ASSIGNED-ORDERS] Error completing pickup:', error);
      toast.error('Failed to complete pickup');
    } finally {
      setProcessingOrder(null);
      setActionType(null);
    }
  };

  // Handle reached delivery location
  const handleReachedDeliveryLocation = async (order) => {
    if (!order) return false;

    const latestOrder = await refreshOrderState(order._id);
    if (!latestOrder) {
      toast.error('Unable to load latest order status. Please refresh.');
      return false;
    }

    // ✅ SIMPLIFIED: If button is showing, it means order ID was verified → allow action
    const pickupCompleted = Boolean(latestOrder.pickup?.isCompleted);
    if (!pickupCompleted) {
      toast.error('Order ID verification required. Please complete pickup first.');
      return false;
    }

    // Already reached location - show delivery modal
    if (latestOrder.delivery?.locationReachedAt || latestOrder.deliveryAgent?.status === 'location_reached') {
      toast.info('Buyer location already marked. Complete payment / OTP verification to finish delivery.');
      setSelectedOrder(latestOrder);
      setDeliveryForm({ otp: '', deliveryNotes: '', codPaymentType: null, qrCode: null });
      setShowReachedDeliveryModal(false);
      setShowDeliveryModal(true);
      return true;
    }

    setProcessingOrder(latestOrder._id);
    setActionType('reached-delivery');
    let success = false;

    try {
      const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
      
      console.log('🚚 [ASSIGNED-ORDERS] Marking reached delivery location for order:', latestOrder._id);
      
      const response = await fetch(`${API_BASE_URL}/delivery/orders/${latestOrder._id}/reached-location`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locationNotes: ''
        })
      });

      const data = await response.json();

      if (data.success) {
        const updatedOrder = data.data || latestOrder;
        if (updatedOrder.paymentMethod === 'COD' || !updatedOrder.isPaid) {
          // 🎯 CRITICAL FIX: Format QR code as base64 data URL if present
          const qrCode = formatQRCodeAsDataURL(
            data.data?.paymentData?.qrCode || data.paymentData?.qrCode || null
          );
          
          setSelectedOrder(updatedOrder);
          setDeliveryForm({ 
            otp: '', 
            deliveryNotes: '',
            codPaymentType: null,
            qrCode: qrCode
          });
          toast.success('Please collect payment from customer');
        } else {
          setSelectedOrder(updatedOrder);
          setDeliveryForm({ 
            otp: '', 
            deliveryNotes: '',
            codPaymentType: null,
            qrCode: null
          });
          toast.success('OTP sent to customer! Please ask the customer for the OTP.');
        }

        setShowReachedDeliveryModal(false);
        setShowDeliveryModal(true);
        success = true;
      } else {
        console.error('❌ [ASSIGNED-ORDERS] Failed to mark reached location:', data.message);
        toast.error(data.message || 'Failed to mark reached location');
      }
    } catch (error) {
      console.error('❌ [ASSIGNED-ORDERS] Error marking reached location:', error);
      toast.error('Failed to mark reached location');
    } finally {
      setProcessingOrder(null);
      setActionType(null);
    }

    return success;
  };

  const openDeliveryModal = async (order) => {
    // 🎯 CRITICAL: Fetch fresh order data to ensure payment status is current (exactly like buyer side)
    try {
      console.log('🔄 [ASSIGNED-ORDERS] Fetching fresh order data to verify payment status...');
    const latestOrder = await refreshOrderState(order._id);
      
      if (latestOrder) {
        // Initialize payment details from fresh order data
        if (latestOrder.isPaid || latestOrder.paymentStatus === 'completed') {
          setPaymentCompleted(true);
          setPaymentStatus('completed');
          setPaymentDetails({
            transactionId: latestOrder.paymentResult?.transactionId || latestOrder.smepayOrderSlug || 'N/A',
            paidAt: latestOrder.paidAt || latestOrder.paymentResult?.paidAt || new Date(),
            paymentMethod: latestOrder.paymentMethod || 'SMEPay',
            paymentStatus: 'completed',
            isPaid: true
          });
        } else {
          // Reset payment states for pending payments
          setPaymentCompleted(false);
          setPaymentStatus(null);
          setPaymentDetails(null);
        }
        
        setSelectedOrder(latestOrder);

    // ✅ SIMPLIFIED: If delivery button is showing, it means order ID was verified → allow action
        const finalOrder = latestOrder;
        const pickupCompleted = Boolean(finalOrder.pickup?.isCompleted);
    if (!pickupCompleted) {
      toast.error('Order ID verification required. Please complete pickup first.');
      setShowDeliveryModal(false);
      setSelectedOrder(null);
      return;
    }

        if (!finalOrder.delivery?.locationReachedAt && finalOrder.deliveryAgent?.status !== 'location_reached') {
          const success = await handleReachedDeliveryLocation(finalOrder);
      if (!success) {
        return;
      }
      return;
    }

    // COD orders are those that are NOT prepaid (isPaid === false)
    // Prepaid orders (SMEPay, Cashfree) have isPaid === true
        const isCOD = !finalOrder.isPaid;
    
    // 🎯 CRITICAL FIX: Format QR code as base64 data URL if present
    const qrCode = isCOD 
          ? formatQRCodeAsDataURL(finalOrder.paymentData?.qrCode || null)
      : null;
    
    setDeliveryForm({
      otp: '',
      deliveryNotes: '',
      codPaymentType: null,
      qrCode: qrCode
    });
    setShowDeliveryModal(true);
      } else {
        setSelectedOrder(order);
      }
    } catch (error) {
      console.error('❌ [ASSIGNED-ORDERS] Error fetching fresh order data:', error);
      setSelectedOrder(order);
    }
  };


  // Handle manual OTP send
  const handleSendOTP = async () => {
    if (!selectedOrder) return;
    
    setProcessingOrder(selectedOrder._id);
    setActionType('send-otp');
    
    try {
      console.log('📞 Sending OTP manually for order:', selectedOrder.orderNumber);
      const response = await deliveryService.sendDeliveryOTP(selectedOrder._id);
      
      if (response.success) {
        toast.success('OTP has been sent to buyer\'s registered phone number');
        // Refresh order to get updated OTP status
        const orderResponse = await deliveryService.getOrderById(selectedOrder._id);
        if (orderResponse.success && orderResponse.data) {
          setSelectedOrder(orderResponse.data);
        }
      } else {
        toast.error(response.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('❌ Error sending OTP:', error);
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setProcessingOrder(null);
      setActionType(null);
    }
  };

  // Handle OTP verification
  const handleVerifyOTP = async () => {
    if (!selectedOrder || !deliveryForm.otp || deliveryForm.otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    
    // 🎯 CRITICAL: Trim OTP before sending
    const cleanedOTP = deliveryForm.otp.trim();
    
    if (cleanedOTP.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP (no spaces)');
      return;
    }
    
    setProcessingOrder(selectedOrder._id);
    setActionType('verify-otp');
    
    try {
      console.log('🔐 Verifying OTP for order:', selectedOrder.orderNumber);
      console.log('🔑 OTP entered:', cleanedOTP, 'Length:', cleanedOTP.length);
      const response = await deliveryService.verifyDeliveryOTP(selectedOrder._id, cleanedOTP);
      
      if (response.success) {
        toast.success('OTP verified successfully! ✅');
        // Refresh order to get updated verification status
        const orderResponse = await deliveryService.getOrderById(selectedOrder._id);
        if (orderResponse.success && orderResponse.data) {
          setSelectedOrder(orderResponse.data);
        }
      } else {
        toast.error(response.message || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error verifying OTP:', error);
      toast.error('Failed to verify OTP. Please try again.');
    } finally {
      setProcessingOrder(null);
      setActionType(null);
    }
  };

  // Handle OTP resend
  const handleResendOTP = async () => {
    if (!selectedOrder) return;
    
    setProcessingOrder(selectedOrder._id);
    setActionType('resend-otp');
    
    try {
      console.log('🔄 Resending OTP for order:', selectedOrder.orderNumber);
      const response = await deliveryService.resendDeliveryOTP(selectedOrder._id);
      
      if (response.success) {
        toast.success('OTP has been resent to buyer\'s registered phone number');
        // Refresh order to get updated OTP status
        const orderResponse = await deliveryService.getOrderById(selectedOrder._id);
        if (orderResponse.success && orderResponse.data) {
          setSelectedOrder(orderResponse.data);
        }
      } else {
        toast.error(response.message || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('❌ Error resending OTP:', error);
      toast.error('Failed to resend OTP. Please try again.');
    } finally {
      setProcessingOrder(null);
      setActionType(null);
    }
  };

    // Handle COD payment type selection
  const handleCODPaymentType = async (paymentType) => {
    if (!selectedOrder) return;
    
    // 🎯 VALIDATION: COD orders are those that are NOT prepaid (isPaid === false)
    // Prepaid orders (SMEPay, Cashfree) have isPaid === true
    const isCOD = !selectedOrder.isPaid;
    
    if (!isCOD) {
      toast.error('QR code generation is only available for COD orders (unpaid orders)');
      return;
    }
    
    // 🎯 CASH PAYMENT: Mark as collected and send OTP when cash payment is selected
    if (paymentType === 'cash') {
      setDeliveryForm(prev => ({ ...prev, codPaymentType: 'cash' }));
      
      setProcessingOrder(selectedOrder._id);
      setActionType('mark-cash-collected');
      
      try {
        console.log('💰 Cash payment selected - marking as collected for order:', selectedOrder.orderNumber);
        
        // 🎯 STEP 1: Mark cash payment as collected in database
        const markCollectedResponse = await deliveryService.markCashPaymentCollected(selectedOrder._id);
        
        if (!markCollectedResponse.success) {
          throw new Error(markCollectedResponse.message || 'Failed to mark cash payment as collected');
        }
        
        console.log('✅ Cash payment marked as collected:', {
          isCollected: markCollectedResponse.data?.codPayment?.isCollected,
          paymentMethod: markCollectedResponse.data?.codPayment?.paymentMethod,
          isPaid: markCollectedResponse.data?.isPaid
        });
        
        // 🎯 STEP 2: Auto-send OTP when cash payment is selected
        if (!selectedOrder.otpVerification?.isRequired || !selectedOrder.otpVerification?.isVerified) {
          setActionType('send-otp-cash');
          
          try {
            console.log('📞 Sending OTP automatically for cash payment...');
            const otpResponse = await deliveryService.sendDeliveryOTP(selectedOrder._id);
            
            if (otpResponse.success) {
              toast.success('Cash payment collected! OTP has been sent to buyer\'s registered phone number.');
            } else {
              toast.warning('Cash payment collected, but failed to send OTP. You can send it manually.');
            }
          } catch (otpError) {
            console.error('❌ Error sending OTP for cash payment:', otpError);
            toast.warning('Cash payment collected, but failed to send OTP. You can send it manually.');
          }
        } else {
          toast.success('Cash payment collected successfully!');
        }
        
        // 🎯 STEP 3: Refresh order to get updated payment status
        const orderResponse = await deliveryService.getOrderById(selectedOrder._id);
        if (orderResponse.success && orderResponse.data) {
          setSelectedOrder(orderResponse.data);
          // Update payment status in UI
          setPaymentCompleted(true);
          setPaymentStatus('completed');
        }
        
      } catch (error) {
        console.error('❌ Error marking cash payment as collected:', error);
        toast.error(error.message || 'Failed to mark cash payment as collected. Please try again.');
      } finally {
        setProcessingOrder(null);
        setActionType(null);
      }
      
      return; // Don't proceed with QR code logic for cash
    }
    
    if (paymentType === 'qr' && !deliveryForm.qrCode) {
      // 🎯 EXACT MATCH: Use deliveryService.processRealSMEPayPayment() exactly like buyer side uses paymentService.processRealSMEPayPayment() (PaymentPage.js line 102)
      try {
        setProcessingOrder(selectedOrder._id);
        setActionType('generate-qr');
        
        console.log('🎯 [DELIVERY] Starting SMEPay payment flow for order:', selectedOrder._id);
        
        // 🎯 EXACT MATCH: Single method call - same as buyer side (PaymentPage.js line 102)
        // Buyer side: const smepayResult = await paymentService.processRealSMEPayPayment(createdOrderId);
        // Delivery side: const smepayResult = await deliveryService.processRealSMEPayPayment(selectedOrder._id);
        const smepayResult = await deliveryService.processRealSMEPayPayment(selectedOrder._id);
        
        if (!smepayResult.success) {
          throw new Error(smepayResult.message || 'SMEPay payment failed');
        }
        
        // 🎯 EXACT MATCH: Log success same way as buyer side (PaymentPage.js line 108-111)
        console.log('✅ [DELIVERY] SMEPay payment completed via widget');
        console.log('🎯 [DELIVERY] SMEPAY_PAYMENT_SUCCESS', {
          orderId: selectedOrder._id,
          orderNumber: selectedOrder.orderNumber
        });
        
        // 🎯 EXACT MATCH: Update payment status states (like buyer side does after successful payment)
        // Note: Buyer side redirects, so doesn't update local state. Delivery side stays on page, so updates state.
        setPaymentCompleted(true);
        setPaymentStatus('completed');
        setPaymentDetails({
          transactionId: smepayResult.data?.transactionId || smepayResult.data?.paymentId || 'N/A',
          paidAt: new Date(),
          paymentMethod: 'SMEPay QR',
          paymentStatus: 'completed',
          isPaid: true
        });
        
        // 🎯 CRITICAL: Clear QR code from form state (payment completed)
            setDeliveryForm(prev => ({
              ...prev,
              codPaymentType: 'qr',
          qrCode: null, // Clear QR code - widget handled payment
          paymentId: smepayResult.data?.paymentId || smepayResult.data?.orderSlug || null
        }));
        
        // 🎯 CRITICAL: After widget payment, validate and update order in database
        // This ensures isPaid is set to true in the database (not just frontend state)
        try {
          console.log('🔄 Validating payment and updating order in database...');
          const validateResponse = await deliveryService.checkCODPaymentStatus(selectedOrder._id);
          console.log('✅ Payment validation response:', validateResponse);
          
          if (validateResponse.success && validateResponse.data?.isPaymentSuccessful) {
            console.log('✅ Payment confirmed in database - isPaid should be true now');
          }
        } catch (validateError) {
          console.error('❌ Error validating payment:', validateError);
          // Continue anyway - payment widget was successful
        }
        
        // 🎯 EXACT MATCH: Refresh order state to get latest payment status
        // Buyer side doesn't refresh (redirects with order data), but delivery side needs to refresh (stays on page)
        try {
          const orderResponse = await deliveryService.getOrderById(selectedOrder._id);
          if (orderResponse.success && orderResponse.data) {
            console.log('📊 Refreshed order data:', {
              isPaid: orderResponse.data.isPaid,
              paymentStatus: orderResponse.data.paymentStatus
            });
            setSelectedOrder(orderResponse.data);
          }
        } catch (refreshError) {
          console.error('Error refreshing order state:', refreshError);
          // Continue anyway - payment was successful (same as buyer side approach)
        }
        
        // 🎯 EXACT MATCH: Show success toast (same style as buyer side PaymentPage.js line 122-142)
        toast.success('Payment completed successfully! 🎉');
        
      } catch (error) {
        // 🎯 EXACT MATCH: Error handling same as buyer side (PaymentPage.js line 173-183)
        console.error('❌ [DELIVERY] SMEPay payment error:', error);
        console.error('❌ [DELIVERY] REAL_SMEPAY_ERROR', {
          error: error.message,
          paymentMethod: 'SMEPay',
          orderId: selectedOrder._id
        });
        
        // 🎯 EXACT MATCH: Set error states (buyer side sets paymentStep='failed', paymentError)
        // Note: Delivery side uses paymentStatus instead of paymentError state
        setDeliveryForm(prev => ({ ...prev, codPaymentType: null, qrCode: null, paymentId: null }));
        setPaymentStatus('failed');
        
        // 🎯 EXACT MATCH: Show error toast (same as buyer side line 183)
        toast.error(`Payment failed: ${error.message || 'Please try again'}`);
      } finally {
        // 🎯 EXACT MATCH: Cleanup same as buyer side (PaymentPage.js line 184-187)
        setProcessingOrder(null);
        setActionType(null);
      }
            } else {
      setDeliveryForm(prev => ({ ...prev, codPaymentType: paymentType }));
    }
  };

  // 🎯 REMOVED: Old complex polling function - now using useEffect-based polling (exactly like buyer side)
  // The useEffect hook (lines 179-283) handles all polling automatically

  // Handle delivery completion
  const handleDeliveryComplete = async () => {
    if (!selectedOrder) {
      toast.error('No order selected');
      return;
    }

    const latestOrder = await refreshOrderState(selectedOrder._id);
    if (!latestOrder) {
      toast.error('Unable to load latest order status. Please refresh.');
      return;
    }

    // ✅ SIMPLIFIED: If delivery button is showing, it means order ID was verified → allow action
    const pickupCompleted = Boolean(latestOrder.pickup?.isCompleted);
    if (!pickupCompleted) {
      toast.error('Order ID verification required. Please complete pickup first.');
      setShowDeliveryModal(false);
      setSelectedOrder(null);
      return;
    }

    if (!latestOrder.delivery?.locationReachedAt && latestOrder.deliveryAgent?.status !== 'location_reached') {
      toast.error('Please mark buyer location as reached before completing delivery.');
      setShowDeliveryModal(false);
      setSelectedOrder(null);
      return;
    }

    setSelectedOrder(latestOrder);

    // Validate based on payment type
    // COD orders are those that are NOT prepaid (isPaid === false)
    const isCOD = !latestOrder.isPaid;
    
    if (isCOD) {
      if (!deliveryForm.codPaymentType) {
        toast.error('Please select payment method (QR Code or Cash)');
        return;
      }
      // For COD QR payments, check if OTP is required and entered
      if (deliveryForm.codPaymentType === 'qr' && paymentCompleted && !deliveryForm.otp?.trim()) {
        toast.error('Please enter OTP from buyer to complete delivery');
        return;
      }
    } else {
      // 🎯 NULL CHECK: Use optional chaining to prevent errors if otp is null/undefined
      if (!deliveryForm.otp?.trim()) {
        toast.error('Please enter OTP from customer');
        return;
      }
    }

    setProcessingOrder(latestOrder._id);
    setActionType('delivery');

    try {
      const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
      
      console.log('🚚 [ASSIGNED-ORDERS] Completing delivery for order:', latestOrder._id);
      
      const requestBody = {
        deliveryNotes: deliveryForm.deliveryNotes,
      };

      // Add OTP for prepaid orders or COD QR payments
      if (!isCOD) {
        requestBody.otp = deliveryForm.otp;
      } else {
        // For COD, include payment confirmation
        requestBody.codPayment = {
          method: deliveryForm.codPaymentType,
          collected: true
        };
        
        // For COD QR payments, include OTP if payment completed
        if (deliveryForm.codPaymentType === 'qr' && paymentCompleted && deliveryForm.otp) {
          requestBody.otp = deliveryForm.otp;
        }
        
        // For COD Cash payments, include OTP if OTP is required and entered
        if (deliveryForm.codPaymentType === 'cash' && deliveryForm.otp) {
          requestBody.otp = deliveryForm.otp;
        }
      }
      
      const response = await fetch(`${API_BASE_URL}/delivery/orders/${latestOrder._id}/deliver`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (data.success) {
        // 🎯 REMOVED: stopPaymentPolling() - useEffect handles cleanup automatically (exactly like buyer side)
        
        // Prepare success data for confirmation modal
        // COD orders are those that are NOT prepaid (isPaid === false)
        const isCOD = !latestOrder.isPaid;
        const paymentMethod = deliveryForm.codPaymentType === 'qr' ? 'QR Code' : 'Cash';
        
        setDeliverySuccessData({
          orderNumber: latestOrder.orderNumber || data.data?.orderNumber,
          paymentMethod: isCOD ? paymentMethod : 'Prepaid',
          paymentCollected: isCOD,
          deliveryCompleted: true,
          orderStatus: data.data?.status || 'Delivered',
          earnings: data.data?.earnings || latestOrder.deliveryFees?.agentEarning || 0
        });
        
        console.log('✅ [ASSIGNED-ORDERS] Delivery completed:', selectedOrder._id);
        console.log('💰 Payment Status:', data.data?.codPayment || 'N/A');
        console.log('📦 Order Status:', data.data?.status || 'Delivered');
        
        // Reset form states
        setDeliveryForm({ otp: '', deliveryNotes: '', codPaymentType: null, qrCode: null, paymentId: null });
        setPaymentCompleted(false);
        setPaymentStatus(null);
        setShowDeliveryModal(false);
        setSelectedOrder(null);
        
        // Show success confirmation modal
        setShowDeliverySuccessModal(true);
        
        // Refresh orders after showing modal
        loadAssignedOrders();
      } else {
        console.error('❌ [ASSIGNED-ORDERS] Failed to complete delivery:', data.message);
        toast.error(data.message || 'Failed to complete delivery');
      }
    } catch (error) {
      console.error('❌ [ASSIGNED-ORDERS] Error completing delivery:', error);
      toast.error('Failed to complete delivery');
    } finally {
      setProcessingOrder(null);
      setActionType(null);
    }
  };

  // Handle order cancellation
  const handleCancelOrder = async () => {
    if (!selectedOrder) {
      toast.error('No order selected');
      return;
    }

    if (!cancelReason || cancelReason.trim().length === 0) {
      toast.error('Please provide a cancellation reason');
      return;
    }

    try {
      setProcessingOrder(selectedOrder._id);
      setActionType('cancel');

      const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
      const response = await fetch(`${API_BASE_URL}/delivery/orders/${selectedOrder._id}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cancellationReason: cancelReason.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Order cancelled successfully');
        console.log('✅ [ASSIGNED-ORDERS] Order cancelled:', selectedOrder._id);
        
        // Close modals and reset state
        setShowCancelModal(false);
        setShowDeliveryModal(false);
        setSelectedOrder(null);
        setCancelReason('');
        
        // Refresh orders list
        loadAssignedOrders();
      } else {
        console.error('❌ [ASSIGNED-ORDERS] Failed to cancel order:', data.message);
        toast.error(data.message || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('❌ [ASSIGNED-ORDERS] Error cancelling order:', error);
      toast.error('Failed to cancel order. Please try again.');
    } finally {
      setProcessingOrder(null);
      setActionType(null);
    }
  };

  // Determine current order step aligned with backend deliveryAgent.status
  const getOrderStep = (order) => {
    const agentStatus = order.deliveryAgent?.status || order.deliveryStatus || 'assigned';
    const sellerReached = Boolean(order.pickup?.sellerLocationReachedAt);
    const pickupCompleted = Boolean(order.pickup?.isCompleted); // ✅ Order ID verified = pickup completed
    const deliveryReached = Boolean(order.delivery?.locationReachedAt) || agentStatus === 'location_reached';

    if (agentStatus === 'assigned' || agentStatus === 'unassigned') {
      return 'accept';
    }

    if (agentStatus === 'accepted') {
      return sellerReached ? 'pickup' : 'reached-seller';
    }

    // ✅ SIMPLIFIED: If order ID was verified (pickup completed), show "Reached Buyer Location" button
    if (pickupCompleted || agentStatus === 'pickup_completed') {
      return deliveryReached ? 'delivery' : 'reached-delivery';
    }

    if (agentStatus === 'location_reached') {
      return 'delivery';
    }

    if (agentStatus === 'delivery_completed') {
      return 'completed';
    }

    return null;
  };

  const handleLogout = () => {
    logoutDeliveryAgent();
    navigate('/delivery/login');
    toast.success('Logged out successfully');
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-orange-100 text-orange-800';
      case 'pickup_completed': return 'bg-purple-100 text-purple-800';
      case 'delivery_completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get next action for order - DEPRECATED, use getOrderStep instead
  const getNextAction = (order) => {
    const step = getOrderStep(order);
    switch (step) {
      case 'accept':
        return 'accept';
      case 'reached-seller':
        return 'reached-seller';
      case 'pickup':
        return 'pickup';
      case 'reached-delivery':
        return 'reached-delivery';
      case 'delivery':
        return 'delivery';
      default:
        return null;
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <Link to="/delivery/dashboard" className="text-blue-600 hover:text-blue-500 mr-4">
                  ← Back to Dashboard
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">📋 My Assigned Orders</h1>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading assigned orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link to="/delivery/dashboard" className="text-blue-600 hover:text-blue-500 mr-4">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">📋 My Assigned Orders</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Welcome, {deliveryAgentAuth.deliveryAgent?.name}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                My Assigned Orders
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {assignedOrders.length} orders in progress
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {refreshing ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Refreshing...
                  </div>
                ) : (
                  'Refresh'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {assignedOrders.length > 0 ? (
          <div className="space-y-6">
            {assignedOrders.map((order) => {
              const nextAction = getNextAction(order);
              const isProcessing = processingOrder === order._id;
              
              return (
                <div key={order._id} className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="px-6 py-4">
                    {/* Order Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900">
                            Order Details
                          </h3>
                          <p className="text-sm text-gray-500">
                            Customer: {order.user?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-green-600">₹{order.deliveryFees?.agentEarning || '50'}</p>
                          <p className="text-sm text-gray-500">Your earnings</p>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(order.deliveryStatus)}`}>
                          {order.deliveryStatus?.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Progress Indicator */}
                    <div className="mb-6">
                      <div className="flex items-center">
                        <div className={`flex items-center ${order.deliveryStatus === 'assigned' || order.deliveryStatus === 'accepted' ? 'text-blue-600' : 'text-green-500'}`}>
                          <div className={`w-4 h-4 rounded-full border-2 ${order.deliveryStatus === 'assigned' || order.deliveryStatus === 'accepted' ? 'border-blue-600 bg-blue-600' : 'border-green-500 bg-green-500'}`}></div>
                          <span className="ml-2 text-sm font-medium">Assigned</span>
                        </div>
                        <div className={`flex-1 h-0.5 mx-4 ${order.pickup?.isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <div className={`flex items-center ${order.pickup?.isCompleted ? 'text-green-500' : 'text-gray-400'}`}>
                          <div className={`w-4 h-4 rounded-full border-2 ${order.pickup?.isCompleted ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}></div>
                          <span className="ml-2 text-sm font-medium">Picked Up</span>
                        </div>
                        <div className={`flex-1 h-0.5 mx-4 ${order.delivery?.isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <div className={`flex items-center ${order.delivery?.isCompleted ? 'text-green-500' : 'text-gray-400'}`}>
                          <div className={`w-4 h-4 rounded-full border-2 ${order.delivery?.isCompleted ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}></div>
                          <span className="ml-2 text-sm font-medium">Delivered</span>
                        </div>
                      </div>
                    </div>

                    {/* Order Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      {/* Pickup Location */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">📍 Pickup from Seller</h4>
                        <div className="bg-orange-50 rounded-md p-3">
                          <p className="text-sm font-medium text-gray-900">{order.seller?.name}</p>
                          <p className="text-sm text-gray-600">{order.seller?.shopName}</p>
                          <p className="text-sm text-gray-600">{order.seller?.address}</p>
                          {order.seller?.phone && (
                            <p className="text-sm text-orange-600 mt-1">📞 {order.seller.phone}</p>
                          )}
                        </div>
                      </div>

                      {/* Delivery Location */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">🏠 Deliver to Customer</h4>
                        <div className="bg-blue-50 rounded-md p-3">
                          <p className="text-sm font-medium text-gray-900">{order.user?.name}</p>
                          <p className="text-sm text-gray-600">
                            {order.shippingAddress?.address}
                          </p>
                          <p className="text-sm text-gray-600">{order.shippingAddress?.city}</p>
                          {order.user?.phone && (
                            <p className="text-sm text-blue-600 mt-1">📞 {order.user.phone}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">📦 Order Items ({order.orderItems?.length || 0})</h4>
                      <div className="bg-gray-50 rounded-md p-3">
                        <div className="space-y-2">
                          {(order.orderItems || []).slice(0, 3).map((item, index) => (
                            <div key={index} className="flex items-center space-x-3">
                              {item.image && (
                                <img 
                                  src={item.image} 
                                  alt={item.name}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              )}
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                              </div>
                            </div>
                          ))}
                          {(order.orderItems?.length || 0) > 3 && (
                            <p className="text-sm text-gray-500 mt-2">
                              +{(order.orderItems?.length || 0) - 3} more items
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <div className="flex items-center space-x-4">
                        <span>Total: ₹{order.totalPrice}</span>
                        <span>•</span>
                        <span>Assigned: {new Date(order.assignedAt).toLocaleDateString()}</span>
                        {order.estimatedDelivery && (
                          <>
                            <span>•</span>
                            <span>Est. delivery: {new Date(order.estimatedDelivery).toLocaleTimeString()}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3">
                      {nextAction === 'accept' && (
                        <button
                          onClick={() => handleAcceptOrder(order)}
                          disabled={isProcessing && processingOrder === order._id}
                          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            isProcessing && processingOrder === order._id && actionType === 'accept'
                              ? 'bg-blue-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                          }`}
                        >
                          {isProcessing && processingOrder === order._id && actionType === 'accept' ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Accepting...
                            </>
                          ) : (
                            '✓ Accept Order'
                          )}
                        </button>
                      )}
                      
                      {nextAction === 'reached-seller' && (
                        <button
                          onClick={() => handleReachedSellerLocation(order)}
                          disabled={isProcessing && processingOrder === order._id}
                          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            isProcessing && processingOrder === order._id && actionType === 'reached-seller'
                              ? 'bg-orange-400 cursor-not-allowed'
                              : 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                          }`}
                        >
                          📍 Reached Seller Location
                        </button>
                      )}
                      
                      {nextAction === 'pickup' && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setPickupForm({ orderIdVerification: '', pickupNotes: '' });
                            setShowPickupModal(true);
                          }}
                          disabled={isProcessing && processingOrder === order._id}
                          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            isProcessing && processingOrder === order._id && actionType === 'pickup'
                              ? 'bg-orange-400 cursor-not-allowed'
                              : 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                          }`}
                        >
                          📦 Enter Order ID & Complete Pickup
                        </button>
                      )}
                      
                      {nextAction === 'reached-delivery' && (
                        <button
                          onClick={() => handleReachedDeliveryLocation(order)}
                          disabled={isProcessing && processingOrder === order._id}
                          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            isProcessing && processingOrder === order._id && actionType === 'reached-delivery'
                              ? 'bg-green-400 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                          }`}
                        >
                          📍 Reached Buyer Location
                        </button>
                      )}
                      
                      {nextAction === 'delivery' && (
                        <button
                          onClick={() => openDeliveryModal(order)}
                          disabled={isProcessing && processingOrder === order._id}
                          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            isProcessing && processingOrder === order._id && actionType === 'delivery'
                              ? 'bg-green-400 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                          }`}
                        >
                          ✓ Complete Delivery
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No assigned orders</h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have any orders assigned to you right now. Check the available orders to accept new deliveries.
            </p>
            <div className="mt-6">
              <Link
                to="/delivery/orders/available"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                View Available Orders
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Pickup Completion Modal */}
      {showPickupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📦 Complete Pickup</h2>
            <p className="text-sm text-gray-600 mb-4">
              Please ask the seller for the order ID and enter it below.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order ID from Seller <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={pickupForm.orderIdVerification}
                  onChange={(e) => setPickupForm(prev => ({ ...prev, orderIdVerification: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter order ID provided by seller"
                />
                <p className="text-xs text-gray-500 mt-1">The seller should provide you with the order ID</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Notes (optional)
                </label>
                <textarea
                  value={pickupForm.pickupNotes}
                  onChange={(e) => setPickupForm(prev => ({ ...prev, pickupNotes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows="3"
                  placeholder="Any notes about the pickup..."
                />
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowPickupModal(false);
                  setSelectedOrder(null);
                  setPickupForm({ orderIdVerification: '', pickupNotes: '' });
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePickupComplete}
                disabled={processingOrder === selectedOrder?._id || !pickupForm.orderIdVerification.trim()}
                className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                {processingOrder === selectedOrder?._id && actionType === 'pickup' ? 'Verifying...' : 'Confirm Pickup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reached Buyer Location Confirmation Modal */}
      {showReachedDeliveryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📍 Confirm Buyer Location</h2>
            <p className="text-sm text-gray-600 mb-4">
              Have you reached the customer's delivery address?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Customer: <strong>{selectedOrder?.user?.name}</strong><br/>
              Address: {selectedOrder?.shippingAddress?.address || 'N/A'}
            </p>
            
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowReachedDeliveryModal(false);
                  setSelectedOrder(null);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReachedDeliveryLocation(selectedOrder)}
                disabled={processingOrder === selectedOrder?._id}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                {processingOrder === selectedOrder?._id && actionType === 'reached-delivery' ? 'Processing...' : 'Yes, I\'m Here'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Completion Modal */}
      {showDeliveryModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🚚 Complete Delivery</h2>
            
            {(() => {
              // 🎯 COD DETECTION: COD orders are those that are NOT prepaid (isPaid === false)
              // Prepaid orders (SMEPay, Cashfree) have isPaid === true
              // This ensures consistent logic - both SMEPay and Cashfree set isPaid = true when payment completes
              const isCOD = !selectedOrder.isPaid;
              
              return (
                <div className="space-y-4">
                  {/* OTP Section for Prepaid Orders */}
                  {!isCOD && (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                        <p className="text-sm text-blue-800">
                          <strong>OTP Sent!</strong> An OTP has been sent to the customer's registered phone number. Please ask the customer for the OTP.
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          OTP from Customer <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={deliveryForm.otp}
                          onChange={(e) => setDeliveryForm(prev => ({ ...prev, otp: e.target.value.replace(/\D/g, '') }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Enter 4-6 digit OTP"
                          maxLength="6"
                        />
                        <button
                          onClick={handleResendOTP}
                          disabled={processingOrder === selectedOrder._id}
                          className="text-sm text-blue-600 hover:text-blue-800 mt-1"
                        >
                          Resend OTP
                        </button>
                      </div>
                    </>
                  )}
                  
                  {/* COD Payment Section */}
                  {isCOD && (
                    <>
                      <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-4">
                        <p className="text-sm text-orange-800">
                          <strong>Cash on Delivery</strong> Please collect payment from the customer.
                        </p>
                      </div>
                      
                      {/* OTP Entry for COD Cash Payment */}
                      {deliveryForm.codPaymentType === 'cash' && (
                        <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-orange-800">
                              <strong>💰 Cash Payment Selected!</strong> {selectedOrder.otpVerification?.isRequired && !selectedOrder.otpVerification?.isVerified ? 'OTP has been sent to buyer\'s registered phone number.' : 'OTP will be sent when you select this option.'}
                            </p>
                            {/* Manual Send OTP Button */}
                            <button
                              onClick={handleSendOTP}
                              disabled={processingOrder === selectedOrder._id && actionType === 'send-otp'}
                              className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processingOrder === selectedOrder._id && actionType === 'send-otp' ? 'Sending...' : 'Send OTP'}
                            </button>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Enter OTP from Buyer <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={deliveryForm.otp}
                                onChange={(e) => setDeliveryForm(prev => ({ ...prev, otp: e.target.value.replace(/\D/g, '') }))}
                                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="Enter 6-digit OTP"
                                maxLength="6"
                                disabled={selectedOrder.otpVerification?.isVerified}
                              />
                              <button
                                onClick={handleVerifyOTP}
                                disabled={!deliveryForm.otp || deliveryForm.otp.length !== 6 || (processingOrder === selectedOrder._id && actionType === 'verify-otp') || selectedOrder.otpVerification?.isVerified}
                                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                              >
                                {processingOrder === selectedOrder._id && actionType === 'verify-otp' ? 'Verifying...' : selectedOrder.otpVerification?.isVerified ? 'Verified ✓' : 'Verify'}
                              </button>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-500">Ask the buyer for the OTP sent to their phone</p>
                              <button
                                onClick={handleResendOTP}
                                disabled={processingOrder === selectedOrder._id && actionType === 'resend-otp'}
                                className="text-xs text-orange-600 hover:text-orange-700 underline disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {processingOrder === selectedOrder._id && actionType === 'resend-otp' ? 'Resending...' : 'Resend OTP'}
                              </button>
                            </div>
                            {selectedOrder.otpVerification?.isVerified && (
                              <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded text-sm text-green-800">
                                ✅ OTP Verified Successfully! You can now complete the delivery.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* OTP Entry for COD QR Payment after payment completion */}
                      {(paymentCompleted || selectedOrder.isPaid || paymentStatus === 'completed') && deliveryForm.codPaymentType === 'qr' && (
                        <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-green-800">
                              <strong>✅ Payment Completed!</strong> {selectedOrder.otpVerification?.isRequired && !selectedOrder.otpVerification?.isVerified ? 'OTP has been sent to buyer\'s registered phone number.' : 'Enter OTP to complete delivery.'}
                            </p>
                            {/* Manual Send OTP Button */}
                            <button
                              onClick={handleSendOTP}
                              disabled={processingOrder === selectedOrder._id && actionType === 'send-otp'}
                              className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processingOrder === selectedOrder._id && actionType === 'send-otp' ? 'Sending...' : 'Send OTP'}
                            </button>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Enter OTP from Buyer <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                            <input
                              type="text"
                              value={deliveryForm.otp}
                              onChange={(e) => setDeliveryForm(prev => ({ ...prev, otp: e.target.value.replace(/\D/g, '') }))}
                                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                              placeholder="Enter 6-digit OTP"
                              maxLength="6"
                                disabled={selectedOrder.otpVerification?.isVerified}
                              />
                              <button
                                onClick={handleVerifyOTP}
                                disabled={!deliveryForm.otp || deliveryForm.otp.length !== 6 || (processingOrder === selectedOrder._id && actionType === 'verify-otp') || selectedOrder.otpVerification?.isVerified}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                              >
                                {processingOrder === selectedOrder._id && actionType === 'verify-otp' ? 'Verifying...' : selectedOrder.otpVerification?.isVerified ? 'Verified ✓' : 'Verify'}
                              </button>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-500">Ask the buyer for the OTP sent to their phone</p>
                              <button
                                onClick={handleResendOTP}
                                disabled={processingOrder === selectedOrder._id && actionType === 'resend-otp'}
                                className="text-xs text-orange-600 hover:text-orange-700 underline disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {processingOrder === selectedOrder._id && actionType === 'resend-otp' ? 'Resending...' : 'Resend OTP'}
                              </button>
                            </div>
                            {selectedOrder.otpVerification?.isVerified && (
                              <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded text-sm text-green-800">
                                ✅ OTP Verified Successfully!
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Payment Status Indicator */}
                      {deliveryForm.codPaymentType === 'qr' && paymentStatus && (
                        <div className={`mb-4 p-3 rounded-md ${
                          paymentStatus === 'completed' 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-yellow-50 border border-yellow-200'
                        }`}>
                          <p className={`text-sm ${
                            paymentStatus === 'completed' ? 'text-green-800' : 'text-yellow-800'
                          }`}>
                            {paymentStatus === 'completed' 
                              ? '✅ Payment completed! Enter OTP from buyer.' 
                              : '⏳ Waiting for payment...'}
                          </p>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Method <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-2">
                          <button
                            onClick={() => handleCODPaymentType('qr')}
                            disabled={processingOrder === selectedOrder._id && actionType === 'generate-qr' || paymentCompleted}
                            className={`w-full border-2 rounded-md p-3 text-left transition-colors ${
                              deliveryForm.codPaymentType === 'qr'
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-300 hover:border-orange-300'
                            } ${(processingOrder === selectedOrder._id && actionType === 'generate-qr') || paymentCompleted ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div className="flex items-center">
                              <input
                                type="radio"
                                checked={deliveryForm.codPaymentType === 'qr'}
                                onChange={() => handleCODPaymentType('qr')}
                                disabled={processingOrder === selectedOrder._id && actionType === 'generate-qr' || paymentCompleted}
                                className="mr-2"
                              />
                              <span className="font-medium">
                                {processingOrder === selectedOrder._id && actionType === 'generate-qr' 
                                  ? 'Opening SMEPay...' 
                                  : `Pay ₹${(selectedOrder.totalAmount || selectedOrder.totalPrice || 0).toFixed(2)} with SMEPay`}
                              </span>
                            </div>
                            {/* 🎯 CRITICAL FIX: Show QR code ONLY when payment is NOT completed (exactly like buyer side) */}
                            {/* 🎯 EXACT MATCH: Check selectedOrder.isPaid like buyer side checks order.isPaid */}
                            {deliveryForm.codPaymentType === 'qr' && deliveryForm.qrCode && !selectedOrder.isPaid && !paymentCompleted && paymentStatus !== 'completed' && (
                              <div className="mt-2 p-2 bg-white rounded border">
                                <img src={deliveryForm.qrCode} alt="QR Code" className="w-32 h-32 mx-auto" />
                                <p className="text-xs text-center text-gray-600 mt-2">Scan this QR code to pay</p>
                                {(isPollingPayment || paymentStatus === 'pending') && (
                                  <div className="flex items-center justify-center gap-2 mt-2 text-xs text-blue-600">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                    <span>Waiting for payment...</span>
                                  </div>
                                )}
                              </div>
                            )}
                            {/* 🎯 CRITICAL FIX: Show payment completed message INSTEAD of QR code (exactly like buyer side redirects) */}
                            {/* 🎯 EXACT MATCH: Check selectedOrder.isPaid like buyer side checks order.isPaid */}
                            {deliveryForm.codPaymentType === 'qr' && (selectedOrder.isPaid || paymentCompleted || paymentStatus === 'completed') && (
                              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                                <div className="flex items-center gap-2 text-green-800 mb-2">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span className="font-medium">Payment Completed Successfully! ✅</span>
                                </div>
                                {paymentDetails?.transactionId && (
                                  <p className="text-xs text-green-700">
                                    Transaction ID: <span className="font-mono bg-white px-1 py-0.5 rounded">{paymentDetails.transactionId}</span>
                                  </p>
                                )}
                                <p className="text-xs text-green-600 mt-2">
                                  Please enter the OTP sent to buyer's phone to complete delivery.
                                </p>
                              </div>
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleCODPaymentType('cash')}
                            disabled={paymentCompleted || (processingOrder === selectedOrder._id && actionType === 'send-otp-cash')}
                            className={`w-full border-2 rounded-md p-3 text-left transition-colors ${
                              deliveryForm.codPaymentType === 'cash'
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-300 hover:border-orange-300'
                            } ${paymentCompleted || (processingOrder === selectedOrder._id && actionType === 'send-otp-cash') ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div className="flex items-center">
                              <input
                                type="radio"
                                checked={deliveryForm.codPaymentType === 'cash'}
                                onChange={() => handleCODPaymentType('cash')}
                                disabled={paymentCompleted || (processingOrder === selectedOrder._id && actionType === 'send-otp-cash')}
                                className="mr-2"
                              />
                              <span className="font-medium">
                                {processingOrder === selectedOrder._id && actionType === 'send-otp-cash'
                                  ? 'Sending OTP...'
                                  : 'Payment Collected in Cash'}
                              </span>
                            </div>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* 🎯 NEW: Payment Confirmation Section (exactly like buyer side) */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 sm:p-5 border border-purple-100 space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <h3 className="text-lg font-bold text-slate-800">Payment Information</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">Order Amount:</span>
                        <span className="font-semibold text-slate-800 text-lg">₹{(selectedOrder.totalAmount || selectedOrder.totalPrice || 0).toLocaleString()}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">Payment Method:</span>
                        <span className="font-semibold text-slate-800 bg-white/70 px-3 py-1 rounded-lg">
                          {(() => {
                            const isCOD = !selectedOrder.isPaid;
                            if (isCOD) {
                              return deliveryForm.codPaymentType === 'qr' ? 'SMEPay QR' : deliveryForm.codPaymentType === 'cash' ? 'Cash' : 'COD';
                            }
                            return selectedOrder.paymentMethod || 'Prepaid';
                          })()}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">Payment Status:</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold px-3 py-1 rounded-lg ${
                            (paymentCompleted || selectedOrder.isPaid || paymentStatus === 'completed')
                              ? 'text-emerald-700 bg-emerald-100' 
                              : 'text-amber-700 bg-amber-100'
                          }`}>
                            {(paymentCompleted || selectedOrder.isPaid || paymentStatus === 'completed') ? (
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
                          {/* 🎯 CRITICAL: Show polling indicator when actively checking payment status (exactly like buyer side) */}
                          {isPollingPayment && !paymentCompleted && !selectedOrder.isPaid && (
                            <div className="flex items-center gap-1 text-blue-600 text-xs">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                              <span>Checking...</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Transaction Details (show when payment is completed) */}
                      {(paymentCompleted || selectedOrder.isPaid || paymentStatus === 'completed') && (
                        <div className="md:col-span-2 pt-2 border-t border-purple-200">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-600">Transaction ID:</span>
                              <span className="font-mono text-slate-800 bg-white/70 px-2 py-1 rounded">
                                {paymentDetails?.transactionId || selectedOrder.paymentResult?.transactionId || selectedOrder.smepayOrderSlug || 'N/A'}
                              </span>
                            </div>
                            {(paymentDetails?.paidAt || selectedOrder.paidAt || selectedOrder.paymentResult?.paidAt) && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-600">Paid On:</span>
                                <span className="text-slate-800">
                                  {new Date(paymentDetails?.paidAt || selectedOrder.paidAt || selectedOrder.paymentResult?.paidAt).toLocaleString('en-IN', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short'
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Delivery Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Notes (optional)
                    </label>
                    <textarea
                      value={deliveryForm.deliveryNotes}
                      onChange={(e) => setDeliveryForm(prev => ({ ...prev, deliveryNotes: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      rows="3"
                      placeholder="Any notes about the delivery..."
                    />
                  </div>
                </div>
              );
            })()}

            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => {
                  // 🎯 REMOVED: stopPaymentPolling() - useEffect handles cleanup automatically when selectedOrder changes (exactly like buyer side)
                  setShowDeliveryModal(false);
                  setSelectedOrder(null);
                  setDeliveryForm({ otp: '', deliveryNotes: '', codPaymentType: null, qrCode: null, paymentId: null });
                  setPaymentCompleted(false);
                  setPaymentStatus(null);
                  setPaymentDetails(null);
                  setIsPollingPayment(false);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={processingOrder === selectedOrder._id}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Cancel Order
              </button>
              <button
                onClick={handleDeliveryComplete}
                disabled={
                  processingOrder === selectedOrder._id || 
                  (paymentCompleted && deliveryForm.codPaymentType === 'qr' && !deliveryForm.otp?.trim())
                }
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                {processingOrder === selectedOrder._id && actionType === 'delivery' 
                  ? 'Processing...' 
                  : (paymentCompleted && deliveryForm.codPaymentType === 'qr' && !deliveryForm.otp?.trim())
                    ? 'Enter OTP First'
                    : 'Complete Delivery'}
              </button>
              {paymentCompleted && deliveryForm.codPaymentType === 'qr' && !deliveryForm.otp?.trim() && (
                <p className="text-xs text-red-600 mt-1 text-center w-full">Please enter OTP from buyer to complete delivery</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">❌ Cancel Order</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to cancel this order? Please provide a valid reason for cancellation.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cancellation Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows="4"
                  placeholder="e.g., Customer unavailable, Wrong address, Other valid reason..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Please provide a clear reason for cancelling this order. This will be visible to admin, buyer, and seller.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Once cancelled, this order will be moved to the Cancelled tab and can be reassigned by admin if needed.
                </p>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                disabled={processingOrder === selectedOrder._id && actionType === 'cancel'}
                className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={
                  (processingOrder === selectedOrder._id && actionType === 'cancel') ||
                  !cancelReason || cancelReason.trim().length === 0
                }
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                {processingOrder === selectedOrder._id && actionType === 'cancel'
                  ? 'Cancelling...'
                  : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Success Confirmation Modal */}
      {showDeliverySuccessModal && deliverySuccessData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Delivery Completed!</h2>
              <p className="text-gray-600">Order has been successfully delivered</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Order Number:</span>
                <span className="text-sm font-semibold text-gray-900">{deliverySuccessData.orderNumber}</span>
              </div>
              
              {deliverySuccessData.paymentCollected && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Payment Method:</span>
                  <span className="text-sm font-semibold text-green-700">
                    {deliverySuccessData.paymentMethod}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Payment Status:</span>
                <span className="text-sm font-semibold text-green-700">
                  {deliverySuccessData.paymentCollected ? '✅ Collected' : '✅ Confirmed'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Delivery Status:</span>
                <span className="text-sm font-semibold text-green-700">
                  ✅ Completed
                </span>
              </div>
              
              {deliverySuccessData.earnings > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Your Earnings:</span>
                  <span className="text-lg font-bold text-orange-600">
                    ₹{deliverySuccessData.earnings.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-6">
              <p className="text-sm text-green-800 text-center">
                <strong>✅ Success!</strong> The order has been marked as delivered and payment has been confirmed.
              </p>
            </div>

            <button
              onClick={() => {
                setShowDeliverySuccessModal(false);
                setDeliverySuccessData(null);
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md font-medium transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignedOrders;