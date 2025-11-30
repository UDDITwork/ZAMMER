// frontend/src/pages/delivery/DeliveryDashboard.js - FIXED VERSION
// 🔧 FIXED: Removed service dependencies causing white screen
// 🔧 FIXED: Direct API calls to prevent infinite loops
// 🔧 FIXED: Proper error handling and loading states

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FiPackage, 
  FiMapPin, 
  FiClock, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiRotateCcw,
  FiUser,
  FiPhone,
  FiMail
} from 'react-icons/fi';
import returnService from '../../services/returnService';
import paymentService from '../../services/paymentService';

// 🎯 HELPER: Format QR code as base64 data URL for image display (EXACT MATCH with AssignedOrders.js)
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

const DeliveryDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    totalEarnings: 0,
    todayDeliveries: 0,
    todayEarnings: 0
  });
  const [availableOrders, setAvailableOrders] = useState([]);
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [cancelledOrders, setCancelledOrders] = useState([]);
  const [cancelledOrdersLoading, setCancelledOrdersLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState('available');
  
  // Modal states
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showReachedLocationModal, setShowReachedLocationModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeOrderFlow, setActiveOrderFlow] = useState(null);
  const [showOrderFlowModal, setShowOrderFlowModal] = useState(false);
  const [flowSellerVerificationOpen, setFlowSellerVerificationOpen] = useState(false);
  const [flowSellerOrderId, setFlowSellerOrderId] = useState('');
  const [flowSellerOrderIdError, setFlowSellerOrderIdError] = useState('');
  const [flowSellerVerificationStatus, setFlowSellerVerificationStatus] = useState('');
  const [flowSellerNotes, setFlowSellerNotes] = useState('');
  const [flowBuyerOTP, setFlowBuyerOTP] = useState('');
  const [flowBuyerNotes, setFlowBuyerNotes] = useState('');
  const [flowPaymentData, setFlowPaymentData] = useState(null);
  const [flowProcessing, setFlowProcessing] = useState({
    reachSeller: false,
    pickup: false,
    reachBuyer: false,
    delivery: false,
    qr: false
  });
  const [flowModalLoading, setFlowModalLoading] = useState(false);
  // 🎯 EXACT MATCH: Payment status tracking (like AssignedOrders.js)
  const [flowPaymentCompleted, setFlowPaymentCompleted] = useState(false);
  const [flowPaymentStatus, setFlowPaymentStatus] = useState(null); // 'pending', 'completed', 'failed'
  const [flowPaymentPolling, setFlowPaymentPolling] = useState(null);
  const [flowPaymentId, setFlowPaymentId] = useState(null);
  const mergeActiveOrderFlow = useCallback((orderId, updater) => {
    setActiveOrderFlow(prev => {
      if (!prev || prev._id !== orderId) return prev;
      return updater(prev);
    });
  }, []);
  
  // Form states
  const [pickupData, setPickupData] = useState({ orderId: '', notes: '' });
  const [deliveryData, setDeliveryData] = useState({ orderId: '', otp: '', notes: '' });
  const [reachedLocationData, setReachedLocationData] = useState({ notes: '' });
  
  // Processing states
  const [accepting, setAccepting] = useState(false);
  const [processingPickup, setProcessingPickup] = useState(false);
  const [processingReachedLocation, setProcessingReachedLocation] = useState(false);
  const [processingDelivery, setProcessingDelivery] = useState(false);
  const [processingReject, setProcessingReject] = useState(false);
  
  // 🎯 NEW: Bulk operations state
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState(''); // 'accept' or 'reject'
  const [bulkReason, setBulkReason] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // 🎯 NEW: Return management state
  const [returnAssignments, setReturnAssignments] = useState([]);
  const [returnLoading, setReturnLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'returns'
  const [showReturnPickupModal, setShowReturnPickupModal] = useState(false);
  const [showReturnDeliveryModal, setShowReturnDeliveryModal] = useState(false);
  const [showReturnPickupFailedModal, setShowReturnPickupFailedModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [returnPickupOTP, setReturnPickupOTP] = useState('');
  const [returnDeliveryOTP, setReturnDeliveryOTP] = useState('');
  const [pickupFailureReason, setPickupFailureReason] = useState('');
  const [processingReturn, setProcessingReturn] = useState(false);
  
  const navigate = useNavigate();
  const { deliveryAgentAuth, logoutDeliveryAgent, loading: authLoading } = useAuth();

  // API Base URL
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  // 🎯 EXACT MATCH: Socket.io listener for payment completion (like AssignedOrders.js lines 78-205)
  useEffect(() => {
    if (!deliveryAgentAuth.isAuthenticated || !deliveryAgentAuth.deliveryAgent) return;

    const initializeSocket = () => {
      try {
        const socketConnection = window.io();
        
        socketConnection.on('connect', () => {
          console.log('🚚 [DELIVERY-DASHBOARD] Socket connected for delivery agent');
          const deliveryAgentId = deliveryAgentAuth.deliveryAgent?._id || localStorage.getItem('deliveryAgentId');
          if (deliveryAgentId) {
            socketConnection.emit('delivery-agent-join', deliveryAgentId);
          }
        });

        // 🎯 CRITICAL: Listen for payment completion events (exactly like AssignedOrders.js)
        socketConnection.on('payment-completed', (data) => {
          console.log('💳 [DELIVERY-DASHBOARD] Payment completed event received:', data);
          
          // Update payment status if this order is currently active in flow
          if (activeOrderFlow && data.data && data.data._id === activeOrderFlow._id) {
            console.log('✅ [DELIVERY-DASHBOARD] Updating payment status in real-time');
            
            // Update order flow state
            setActiveOrderFlow(prevOrder => ({
              ...prevOrder,
              isPaid: true,
              paymentStatus: 'completed',
              status: data.data.status || prevOrder.status
            }));
            
            // 🎯 CRITICAL: Clear QR code and mark payment as completed
            setFlowPaymentData(prev => ({
              ...(prev || {}),
              qrCode: null // Hide QR code after payment
            }));
            setFlowPaymentCompleted(true);
            setFlowPaymentStatus('completed');
            
            // Stop polling
            stopFlowPaymentPolling();
            
            toast.success('Payment completed! Please enter OTP from buyer to complete delivery.');
          }
        });

        socketConnection.on('disconnect', () => {
          console.log('🚚 [DELIVERY-DASHBOARD] Socket disconnected');
        });

        socketConnection.on('error', (error) => {
          console.error('🚚 [DELIVERY-DASHBOARD] Socket error:', error);
        });

        return socketConnection;
      } catch (error) {
        console.error('🚚 [DELIVERY-DASHBOARD] Error initializing socket:', error);
        return null;
      }
    };

    const socket = initializeSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [deliveryAgentAuth.isAuthenticated, deliveryAgentAuth.deliveryAgent, activeOrderFlow?._id]);

  // Get auth headers
  const getAuthHeaders = useCallback(() => {
    const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, [deliveryAgentAuth.token]);

  // Make API call utility
  const makeApiCall = useCallback(async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
          ...getAuthHeaders(),
          ...options.headers
    };

    // Stringify body if it's an object
    const body = options.body && typeof options.body === 'object' 
      ? JSON.stringify(options.body) 
      : options.body;

    try {
      console.log(`🌐 API Call: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, {
        ...options,
        method: options.method || 'GET',
        headers,
        body
      });

      if (!response.ok) {
        if (response.status === 401) {
          logoutDeliveryAgent();
          navigate('/delivery/login');
          return null;
        }
        
        // Try to get error message from response
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      // Enhanced error logging
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        console.error(`❌ Network Error (${endpoint}):`, {
          url,
          message: 'Failed to connect to API server. Please check:',
          checks: [
            '1. Is the backend server running?',
            `2. Is the API URL correct? (${API_BASE_URL})`,
            '3. Are there any CORS issues?',
            '4. Is the network connection working?'
          ]
        });
        throw new Error('Failed to connect to server. Please check if the backend is running.');
      }
      
      console.error(`❌ API Error (${endpoint}):`, error);
      throw error;
    }
  }, [API_BASE_URL, getAuthHeaders, logoutDeliveryAgent, navigate]);

  // Fetch delivery stats
  const fetchStats = useCallback(async () => {
    try {
      console.log('🚚 Fetching delivery stats...');
      const response = await makeApiCall('/delivery/stats');
      
      if (response && response.success) {
        setStats({
          totalDeliveries: response.data.total?.deliveries || 0,
          totalEarnings: response.data.total?.earnings || 0,
          todayDeliveries: response.data.today?.deliveries || 0,
          todayEarnings: response.data.today?.earnings || 0
        });
        console.log('✅ Stats fetched successfully');
      }
    } catch (error) {
      console.error('❌ Failed to fetch stats:', error);
      // Set default stats on error - don't show toast for initialization errors
      setStats({
        totalDeliveries: 0,
        totalEarnings: 0,
        todayDeliveries: 0,
        todayEarnings: 0
      });
      // Only show error if it's a network error (not during initial load)
      if (error.message && error.message.includes('Failed to connect')) {
        console.warn('⚠️ Backend server may not be running. Stats will be unavailable.');
      }
    }
  }, [makeApiCall]);

  // Fetch available orders
  const fetchAvailableOrders = useCallback(async () => {
    try {
      console.log('🚚 Fetching available orders...');
      const response = await makeApiCall('/delivery/orders/available');
      
      if (response && response.success) {
        setAvailableOrders(response.data || []);
        console.log('✅ Available orders fetched:', response.data?.length || 0);
      }
    } catch (error) {
      console.error('❌ Failed to fetch available orders:', error);
      setAvailableOrders([]);
      // Only show error if it's a network error (not during initial load)
      if (error.message && error.message.includes('Failed to connect')) {
        console.warn('⚠️ Backend server may not be running. Available orders will be unavailable.');
      }
    }
  }, [makeApiCall]);

  // Fetch assigned orders
  const fetchAssignedOrders = useCallback(async () => {
    try {
      console.log('🚚 Fetching assigned orders...');
      const response = await makeApiCall('/delivery/orders/assigned');
      
      if (response && response.success) {
        setAssignedOrders(response.data || []);
        console.log('✅ Assigned orders fetched:', response.data?.length || 0);
        return response.data || [];
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to fetch assigned orders:', error);
      setAssignedOrders([]);
      // Only show error if it's a network error (not during initial load)
      if (error.message && error.message.includes('Failed to connect')) {
        console.warn('⚠️ Backend server may not be running. Assigned orders will be unavailable.');
      }
      return [];
    }
  }, [makeApiCall]);

  // Fetch cancelled orders
  const fetchCancelledOrders = useCallback(async () => {
    try {
      setCancelledOrdersLoading(true);
      console.log('🚚 Fetching cancelled orders...');
      const response = await makeApiCall('/delivery/orders/cancelled');
      
      if (response && response.success) {
        setCancelledOrders(response.data || []);
        console.log('✅ Cancelled orders fetched:', response.data?.length || 0);
        return response.data || [];
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to fetch cancelled orders:', error);
      setCancelledOrders([]);
      return [];
    } finally {
      setCancelledOrdersLoading(false);
    }
  }, [makeApiCall]);

  // 🎯 NEW: Return management functions - MOVED UP to avoid "before initialization" error
  const fetchReturnAssignments = useCallback(async () => {
    try {
      setReturnLoading(true);
      console.log('🚚 Fetching return assignments for delivery agent...');
      
      const response = await returnService.getDeliveryAgentReturns();
      
      if (response && response.success) {
        const assignments = Array.isArray(response.data) ? response.data : [];
        setReturnAssignments(assignments);
        console.log('✅ Return assignments fetched:', assignments.length);
      } else {
        setReturnAssignments([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch return assignments:', error);
      setReturnAssignments([]);
    } finally {
      setReturnLoading(false);
    }
  }, []);

  const markSellerLocationReached = useCallback(async (order) => {
    if (!order) {
      toast.error('No order selected');
      return false;
    }

    try {
      const response = await makeApiCall(`/delivery/orders/${order._id}/reached-seller-location`, {
        method: 'PUT'
      });

      if (response && response.success) {
        toast.success('Seller location marked as reached');
        mergeActiveOrderFlow(order._id, (prev) => ({
          ...prev,
          pickup: {
            ...(prev.pickup || {}),
            sellerLocationReachedAt: response.data?.sellerLocationReachedAt || new Date().toISOString()
          }
        }));
        const [updatedOrders] = await Promise.all([
          fetchAssignedOrders(),
          fetchStats()
        ]);

        if (Array.isArray(updatedOrders)) {
          const updated = updatedOrders.find(item => item._id === order._id);
          if (updated) {
            setActiveOrderFlow(updated);
          }
        }
        return true;
      }

      throw new Error(response?.message || 'Failed to mark seller location as reached');
    } catch (error) {
      console.error('❌ Failed to mark seller location as reached:', error);
      toast.error(error.message || 'Failed to mark seller location as reached');
      return false;
    }
  }, [fetchAssignedOrders, fetchStats, makeApiCall, mergeActiveOrderFlow]);

  const completePickupFlow = useCallback(async (order, orderIdValue, notes = '', { silent = false } = {}) => {
    if (!order) {
      if (!silent) toast.error('No order selected');
      return false;
    }

    if (!orderIdValue?.trim()) {
      if (!silent) toast.error('Please enter order ID verification');
      return false;
    }

    try {
      const response = await makeApiCall(`/delivery/orders/${order._id}/pickup`, {
        method: 'PUT',
        body: JSON.stringify({
          orderIdVerification: orderIdValue,
          pickupNotes: notes
        })
      });

      if (response && response.success) {
        if (!silent) {
          toast.success('Pickup completed successfully!');
        }
        mergeActiveOrderFlow(order._id, (prev) => ({
          ...prev,
          pickup: {
            ...(prev.pickup || {}),
            isCompleted: true,
            completedAt: response.data?.pickup?.completedAt || new Date().toISOString(),
            sellerLocationReachedAt: prev.pickup?.sellerLocationReachedAt || response.data?.pickup?.sellerLocationReachedAt || new Date().toISOString()
          },
          deliveryAgent: {
            ...(prev.deliveryAgent || {}),
            status: 'pickup_completed'
          }
        }));

        const [updatedOrders] = await Promise.all([
          fetchAssignedOrders(),
          fetchStats()
        ]);

        if (Array.isArray(updatedOrders)) {
          const updated = updatedOrders.find(item => item._id === order._id);
          if (updated) {
            setActiveOrderFlow(updated);
          }
        }

        return true;
      }

      throw new Error(response?.message || 'Failed to complete pickup');
    } catch (error) {
      console.error('❌ Failed to complete pickup:', error);
      if (!silent) {
        toast.error(error.message || 'Failed to complete pickup');
      }
      return false;
    }
  }, [fetchAssignedOrders, fetchStats, makeApiCall, mergeActiveOrderFlow]);

  const markCustomerLocationReached = useCallback(async (order, notes = '', { silent = false } = {}) => {
    if (!order) {
      if (!silent) toast.error('No order selected');
      return null;
    }

    try {
      const response = await makeApiCall(`/delivery/orders/${order._id}/reached-location`, {
        method: 'PUT',
        body: JSON.stringify({
          locationNotes: notes
        })
      });

      if (response && response.success) {
        if (!silent) {
          toast.success('Location marked as reached successfully!');
          if (response.data?.paymentData?.type === 'COD') {
            toast.info(`QR code generated for ₹${response.data.paymentData.amount}. Customer can now scan and pay.`);
          } else {
            toast.info('OTP sent to customer for delivery verification.');
          }
        }
        mergeActiveOrderFlow(order._id, (prev) => ({
          ...prev,
          deliveryAgent: {
            ...(prev.deliveryAgent || {}),
            status: 'location_reached'
          },
          delivery: {
            ...(prev.delivery || {}),
            locationReachedAt: response.data?.reachedTime || new Date().toISOString()
          }
        }));

        const [updatedOrders] = await Promise.all([
          fetchAssignedOrders(),
          fetchStats()
        ]);

        if (Array.isArray(updatedOrders)) {
          const updated = updatedOrders.find(item => item._id === order._id);
          if (updated) {
            setActiveOrderFlow(updated);
          }
        }

        return response.data;
      }

      throw new Error(response?.message || 'Failed to mark location as reached');
    } catch (error) {
      console.error('❌ Failed to mark location as reached:', error);
      if (!silent) {
        toast.error(error.message || 'Failed to mark location as reached');
      }
      return null;
    }
  }, [fetchAssignedOrders, fetchStats, makeApiCall, mergeActiveOrderFlow]);

  const completeDeliveryFlow = useCallback(async (order, { otpValue = '', notes = '', codPayment = null } = {}) => {
    if (!order) {
      toast.error('No order selected');
      return false;
    }

    // 🎯 FIX: Check pickup.isCompleted flag explicitly before allowing delivery
    const pickupCompleted = Boolean(order.pickup?.isCompleted);
    if (!pickupCompleted) {
      toast.error('Pickup verification not completed. Please complete pickup first by entering the Order ID.');
      return false;
    }

    const requiresOTP = !isCODOrder(order);

    if (requiresOTP && !otpValue?.trim()) {
      toast.error('Please enter OTP from customer');
      return false;
    }

    try {
      const payload = {
        deliveryNotes: notes
      };

      if (otpValue?.trim()) {
        payload.otp = otpValue.trim();
      }

      if (codPayment) {
        payload.codPayment = codPayment;
      }

      const response = await makeApiCall(`/delivery/orders/${order._id}/delivery`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (response && response.success) {
        toast.success('Order delivery completed successfully!');
        mergeActiveOrderFlow(order._id, (prev) => ({
          ...prev,
          deliveryAgent: {
            ...(prev.deliveryAgent || {}),
            status: 'delivery_completed'
          },
          delivery: {
            ...(prev.delivery || {}),
            isCompleted: true,
            completedAt: response.data?.delivery?.completedAt || new Date().toISOString()
          }
        }));

        const [updatedOrders] = await Promise.all([
          fetchAssignedOrders(),
          fetchStats()
        ]);

        if (Array.isArray(updatedOrders)) {
          const updated = updatedOrders.find(item => item._id === order._id);
          if (updated) {
            setActiveOrderFlow(updated);
          }
        }

        return true;
      }

      throw new Error(response?.message || 'Failed to complete delivery');
    } catch (error) {
      console.error('❌ Failed to complete delivery:', error);
      toast.error(error.message || 'Failed to complete delivery');
      return false;
    }
  }, [fetchAssignedOrders, fetchStats, makeApiCall, mergeActiveOrderFlow]);

  // Initialize dashboard - FIXED with proper dependencies
  const initializeDashboard = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🚚 Initializing delivery dashboard...');
      console.log('🌐 API Base URL:', API_BASE_URL);

      // Run all API calls in parallel - use Promise.allSettled to handle individual failures
      const results = await Promise.allSettled([
        fetchStats(),
        fetchAvailableOrders(),
        fetchAssignedOrders()
      ]);

      // Check if any requests failed
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.warn('⚠️ Some dashboard data failed to load:', failures);
        // Check if it's a network error
        const networkErrors = failures.filter(f => 
          f.reason?.message?.includes('Failed to connect') || 
          f.reason?.message === 'Failed to fetch'
        );
        if (networkErrors.length > 0) {
          toast.error('Cannot connect to backend server. Please ensure the backend is running on port 5001.', {
            autoClose: 5000
          });
        }
      } else {
      console.log('✅ Dashboard initialized successfully');
      }
    } catch (error) {
      console.error('❌ Dashboard initialization failed:', error);
      if (error.message && (error.message.includes('Failed to connect') || error.message === 'Failed to fetch')) {
        toast.error('Cannot connect to backend server. Please ensure the backend is running.', {
          autoClose: 5000
        });
      } else {
      toast.error('Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, [fetchStats, fetchAvailableOrders, fetchAssignedOrders, API_BASE_URL]);

  // FIXED: Check authentication and initialize
  useEffect(() => {
    // 🔧 CRITICAL FIX: Don't redirect if AuthContext is still loading
    if (authLoading) {
      console.log('🚚 AuthContext still loading, waiting...');
      return;
    }

    console.log('🚚 Authentication check:', {
      isAuthenticated: deliveryAgentAuth.isAuthenticated,
      hasDeliveryAgent: !!deliveryAgentAuth.deliveryAgent,
      hasToken: !!deliveryAgentAuth.token,
      authLoading: authLoading
    });

    if (!deliveryAgentAuth.isAuthenticated || !deliveryAgentAuth.deliveryAgent) {
      console.log('🚚 Not authenticated, redirecting to login');
      navigate('/delivery/login');
      return;
    }

    console.log('🚚 Authentication verified, initializing dashboard...');
    
    // 🔧 ADDITIONAL SAFETY CHECK: Ensure delivery agent data is complete
    if (!deliveryAgentAuth.deliveryAgent._id || !deliveryAgentAuth.deliveryAgent.name) {
      console.error('🚚 Incomplete delivery agent data:', deliveryAgentAuth.deliveryAgent);
      toast.error('Authentication data incomplete. Please login again.');
      logoutDeliveryAgent();
      navigate('/delivery/login');
      return;
    }
    
    initializeDashboard();
  }, [deliveryAgentAuth.isAuthenticated, deliveryAgentAuth.deliveryAgent, authLoading, navigate, initializeDashboard, logoutDeliveryAgent]);

  // Fetch cancelled orders when cancelled tab is active
  useEffect(() => {
    if (activeTab === 'cancelled' && deliveryAgentAuth.isAuthenticated) {
      fetchCancelledOrders();
    }
  }, [activeTab, deliveryAgentAuth.isAuthenticated, fetchCancelledOrders]);

  // Fetch return assignments when returns tab is active
  useEffect(() => {
    if (activeTab === 'returns' && deliveryAgentAuth.isAuthenticated) {
      fetchReturnAssignments();
    }
  }, [activeTab, deliveryAgentAuth.isAuthenticated, fetchReturnAssignments]);

  // Handle order acceptance
  const handleAcceptOrder = async (orderId) => {
    try {
      setAccepting(true);
      console.log('🚚 Accepting order:', orderId);
      console.log('🌐 API Base URL:', API_BASE_URL);

      const response = await makeApiCall(`/delivery/orders/${orderId}/accept`, {
        method: 'PUT'
      });
      
      if (response && response.success) {
        toast.success('Order accepted successfully!');
        console.log('✅ Order accepted');
        
        // Navigate to assigned orders page
        navigate('/delivery/orders/assigned');
      } else {
        throw new Error(response?.message || 'Failed to accept order');
      }
    } catch (error) {
      console.error('❌ Failed to accept order:', error);
      const errorMessage = error.message || 'Failed to accept order';
      toast.error(errorMessage);
      
      // If it's a network error, provide additional guidance
      if (errorMessage.includes('Failed to connect')) {
        console.error('💡 Troubleshooting tips:');
        console.error('   1. Ensure backend server is running on port 5001');
        console.error(`   2. Check API URL: ${API_BASE_URL}`);
        console.error('   3. Verify CORS is configured correctly');
        console.error('   4. Check browser console for CORS errors');
      }
    } finally {
      setAccepting(false);
    }
  };

  // Handle pickup completion
  const handlePickupComplete = async () => {
    if (!selectedOrder) {
      toast.error('No order selected');
      return;
    }

    try {
      setProcessingPickup(true);
      console.log('🚚 Completing pickup for order:', selectedOrder._id);

      const success = await completePickupFlow(
        selectedOrder,
        pickupData.orderId,
        pickupData.notes
      );

      if (success) {
        setPickupData({ orderId: '', notes: '' });
        setShowPickupModal(false);
        setSelectedOrder(null);
      }
    } finally {
      setProcessingPickup(false);
    }
  };

  // Handle reached location completion
  const handleReachedLocationComplete = async () => {
    if (!selectedOrder) {
      toast.error('No order selected');
      return;
    }

    try {
      setProcessingReachedLocation(true);
      console.log('📍 Marking location as reached for order:', selectedOrder._id);

      const responseData = await markCustomerLocationReached(
        selectedOrder,
        reachedLocationData.notes
      );

      if (responseData) {
        setReachedLocationData({ notes: '' });
        setShowReachedLocationModal(false);
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error('❌ Failed to mark location as reached:', error);
      toast.error(error.message || 'Failed to mark location as reached');
    } finally {
      setProcessingReachedLocation(false);
    }
  };

  // Handle delivery completion
  const handleDeliveryComplete = async () => {
    if (!selectedOrder) {
      toast.error('No order selected');
      return;
    }

    try {
      setProcessingDelivery(true);
      console.log('🚚 Completing delivery for order:', selectedOrder._id);

      const success = await completeDeliveryFlow(selectedOrder, {
        otpValue: deliveryData.otp,
        notes: deliveryData.notes
      });

      if (success) {
        setDeliveryData({ orderId: '', otp: '', notes: '' });
        setShowDeliveryModal(false);
        setSelectedOrder(null);
      }
    } finally {
      setProcessingDelivery(false);
    }
  };

  // Toggle availability
  const toggleAvailability = async () => {
    try {
      const response = await makeApiCall('/delivery/availability', {
        method: 'PUT'
      });
      
      if (response && response.success) {
        setAgentStatus(response.data.isAvailable ? 'available' : 'offline');
        toast.success(`Status changed to ${response.data.isAvailable ? 'Available' : 'Offline'}`);
      }
    } catch (error) {
      console.error('❌ Failed to toggle availability:', error);
      toast.error('Failed to update availability');
    }
  };

  // 🎯 NEW: Handle bulk order acceptance
  const handleBulkAcceptOrders = async () => {
    const validOrders = selectedOrders.filter(order => order && order._id);
    
    if (validOrders.length === 0) {
      toast.error('Please select at least one valid order');
      return;
    }

    try {
      setBulkProcessing(true);
      
      // 🔧 DEBUG: Log the data being sent
      const orderIds = validOrders.map(order => order._id);
      console.log('🚚 Bulk accepting orders - DEBUG INFO:');
      console.log('  selectedOrders:', selectedOrders);
      console.log('  validOrders:', validOrders);
      console.log('  orderIds array:', orderIds);
      console.log('  orderIds type:', typeof orderIds);
      console.log('  orderIds length:', orderIds.length);

      const response = await makeApiCall('/delivery/orders/bulk-accept', {
        method: 'POST',
        body: JSON.stringify({
          orderIds: orderIds
        })
      });

      if (response && response.success) {
        const { summary } = response.data;
        toast.success(`Bulk acceptance completed! ${summary.successfullyAccepted} orders accepted successfully`);
        
        if (summary.failed > 0) {
          toast.warning(`${summary.failed} orders failed to accept`);
        }

        // Close modal and reset state
        setShowBulkModal(false);
        setSelectedOrders([]);
        setBulkAction('');
        setBulkReason('');

        // Refresh data
        await Promise.all([
          fetchAssignedOrders(),
          fetchAvailableOrders(),
          fetchStats()
        ]);
      } else {
        throw new Error(response?.message || 'Failed to perform bulk acceptance');
      }
    } catch (error) {
      console.error('❌ Bulk acceptance error:', error);
      toast.error(error.message || 'Failed to perform bulk acceptance');
    } finally {
      setBulkProcessing(false);
    }
  };

  // 🎯 NEW: Handle bulk order rejection
  const handleBulkRejectOrders = async () => {
    const validOrders = selectedOrders.filter(order => order && order._id);
    
    if (validOrders.length === 0) {
      toast.error('Please select at least one valid order');
      return;
    }

    try {
      setBulkProcessing(true);
      console.log('🚚 Bulk rejecting orders:', selectedOrders.map(o => o?._id));

      const response = await makeApiCall('/delivery/orders/bulk-reject', {
        method: 'POST',
        body: JSON.stringify({
          orderIds: validOrders.map(order => order._id),
          reason: bulkReason || 'No reason provided'
        })
      });

      if (response && response.success) {
        const { summary } = response.data;
        toast.success(`Bulk rejection completed! ${summary.successfullyRejected} orders rejected successfully`);
        
        if (summary.failed > 0) {
          toast.warning(`${summary.failed} orders failed to reject`);
        }

        // Close modal and reset state
        setShowBulkModal(false);
        setSelectedOrders([]);
        setBulkAction('');
        setBulkReason('');

        // Refresh data
        await Promise.all([
          fetchAssignedOrders(),
          fetchAvailableOrders(),
          fetchStats()
        ]);
      } else {
        throw new Error(response?.message || 'Failed to perform bulk rejection');
      }
    } catch (error) {
      console.error('❌ Bulk rejection error:', error);
      toast.error(error.message || 'Failed to perform bulk rejection');
    } finally {
      setBulkProcessing(false);
    }
  };

  // 🎯 NEW: Handle order selection for bulk operations
  const handleOrderSelection = (order, isSelected) => {
    if (!order || !order._id) {
      console.warn('Invalid order provided to handleOrderSelection:', order);
      return;
    }
    
    console.log('🔧 DEBUG: handleOrderSelection called:', {
      order: order,
      orderId: order._id,
      isSelected: isSelected
    });
    
    if (isSelected) {
      setSelectedOrders(prev => {
        const newSelection = [...prev, order];
        console.log('🔧 DEBUG: Adding order to selection:', newSelection);
        return newSelection;
      });
    } else {
      setSelectedOrders(prev => {
        const newSelection = prev.filter(o => o && o._id && o._id !== order._id);
        console.log('🔧 DEBUG: Removing order from selection:', newSelection);
        return newSelection;
      });
    }
  };

  // 🎯 NEW: Handle select all orders
  const handleSelectAllOrders = () => {
    const assignableOrders = assignedOrders.filter(order => 
      order && order._id && order.deliveryStatus === 'assigned'
    );
    
    console.log('🔧 DEBUG: handleSelectAllOrders called:', {
      assignedOrders: assignedOrders,
      assignableOrders: assignableOrders,
      selectedOrdersLength: selectedOrders.length,
      assignableOrdersLength: assignableOrders.length
    });
    
    if (selectedOrders.length === assignableOrders.length) {
      console.log('🔧 DEBUG: Deselecting all orders');
      setSelectedOrders([]);
    } else {
      console.log('🔧 DEBUG: Selecting all assignable orders:', assignableOrders);
      setSelectedOrders(assignableOrders);
    }
  };

  // 🎯 NEW: Clean up selectedOrders to remove any null/invalid entries
  useEffect(() => {
    setSelectedOrders(prev => prev.filter(order => order && order._id));
  }, [assignedOrders]);

  // 🎯 NEW: Open bulk action modal
  const openBulkModal = (action) => {
    setBulkAction(action);
    setShowBulkModal(true);
  };

  // Handle logout
  const handleLogout = () => {
    logoutDeliveryAgent();
    navigate('/delivery/login');
    toast.success('Logged out successfully');
  };

  // Open pickup modal
  const openPickupModal = (order) => {
    setSelectedOrder(order);
    setPickupData({ 
      orderId: order.orderNumber || '',
      notes: '' 
    });
    setShowPickupModal(true);
  };

  // Open delivery modal
  const openDeliveryModal = (order) => {
    setSelectedOrder(order);
    setDeliveryData({ 
      orderId: order.orderNumber || '',
      otp: '',
      notes: '' 
    });
    setShowDeliveryModal(true);
  };

  // Open reached location modal
  const openReachedLocationModal = (order) => {
    setSelectedOrder(order);
    setReachedLocationData({ notes: '' });
    setShowReachedLocationModal(true);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodLabel = (order) => {
    return (
      order?.paymentMethod ||
      order?.paymentGateway ||
      order?.paymentDetails?.paymentMethod ||
      ''
    ).toLowerCase();
  };

  // COD orders are those that are NOT prepaid (isPaid === false)
  // Prepaid orders (SMEPay, Cashfree) have isPaid === true
  const isCODOrder = (order) => {
    return !order.isPaid;
  };

  const getBuyerAddress = (order) => {
    return (
      order?.shippingAddress?.address ||
      order?.deliveryAddress?.address ||
      'Delivery address unavailable'
    );
  };

  const getBuyerCity = (order) => {
    return order?.shippingAddress?.city || order?.deliveryAddress?.city || '';
  };

  const getBuyerPhone = (order) => {
    return (
      order?.user?.mobileNumber ||
      order?.user?.phone ||
      order?.shippingAddress?.phone ||
      ''
    );
  };

  const getSellerAddress = (order) => {
    return order?.seller?.shop?.address || 'Seller address unavailable';
  };

  const getSellerPhone = (order) => {
    return (
      order?.seller?.phoneNumber ||
      order?.seller?.shop?.contactNumber ||
      ''
    );
  };

  const resetOrderFlowState = useCallback(() => {
    setFlowSellerVerificationOpen(false);
    setFlowSellerOrderId('');
    setFlowSellerOrderIdError('');
    setFlowSellerVerificationStatus('');
    setFlowSellerNotes('');
    setFlowBuyerOTP('');
    setFlowBuyerNotes('');
    setFlowPaymentData(null);
    setFlowProcessing({
      reachSeller: false,
      pickup: false,
      reachBuyer: false,
      delivery: false,
      qr: false
    });
  }, []);

  const openOrderFlowModal = async (order) => {
    if (!order) return;
    resetOrderFlowState();
    setActiveOrderFlow(order);
    setShowOrderFlowModal(true);
    setFlowModalLoading(true);
    try {
      const refreshedOrders = await fetchAssignedOrders();
      const latestOrder = Array.isArray(refreshedOrders)
        ? refreshedOrders.find(item => item && item._id === order._id) || order
        : order;
      setActiveOrderFlow(latestOrder);
      if (latestOrder.pickup?.sellerLocationReachedAt && !latestOrder.pickup?.isCompleted) {
        setFlowSellerVerificationOpen(true);
      }
    } catch (error) {
      console.error('Failed to refresh order before opening modal:', error);
    } finally {
      setFlowModalLoading(false);
    }
  };

  const closeOrderFlowModal = () => {
    setShowOrderFlowModal(false);
    setActiveOrderFlow(null);
    resetOrderFlowState();
    setFlowModalLoading(false);
  };

  const handleFlowReachSeller = async () => {
    if (!activeOrderFlow) return;

    if (activeOrderFlow.pickup?.sellerLocationReachedAt) {
      toast.info('Seller location already marked as reached.');
      return;
    }

    setFlowProcessing(prev => ({ ...prev, reachSeller: true }));
    const success = await markSellerLocationReached(activeOrderFlow);
    if (success) {
      setFlowSellerVerificationOpen(true);
      setFlowSellerOrderIdError('');
      setFlowSellerVerificationStatus('');
    }
    setFlowProcessing(prev => ({ ...prev, reachSeller: false }));
  };

  const handleFlowVerifyPickup = async () => {
    if (!activeOrderFlow) return;

    if (activeOrderFlow.pickup?.isCompleted) {
      toast.info('Pickup has already been completed for this order.');
      return;
    }

    if (!activeOrderFlow.pickup?.sellerLocationReachedAt) {
      toast.error('Please mark the seller location as reached first');
      return;
    }

    if (!flowSellerOrderId.trim()) {
      setFlowSellerOrderIdError('Order ID is required');
      return;
    }

    if (flowSellerOrderId.trim() !== (activeOrderFlow.orderNumber || '').trim()) {
      const message = 'Order ID does not match this assignment. Please re-confirm with the seller.';
      setFlowSellerOrderIdError(message);
      toast.error(message);
      return;
    }

    setFlowSellerOrderIdError('');
    setFlowProcessing(prev => ({ ...prev, pickup: true }));
    const success = await completePickupFlow(
      activeOrderFlow,
      flowSellerOrderId,
      flowSellerNotes
    );
    if (success) {
      setFlowSellerVerificationOpen(false);
      setFlowSellerOrderId('');
      setFlowSellerVerificationStatus('Seller order ID verified. Pickup completed.');
      setFlowSellerNotes('');
    }
    setFlowProcessing(prev => ({ ...prev, pickup: false }));
  };

  const handleFlowReachBuyer = async () => {
    if (!activeOrderFlow) return;

    if (!activeOrderFlow.pickup?.isCompleted) {
      toast.error('Please verify the seller order ID and complete pickup first.');
      return;
    }

    if (activeOrderFlow.deliveryAgent?.status === 'location_reached') {
      toast.info('Buyer location has already been marked as reached.');
      return;
    }

    if (activeOrderFlow.delivery?.isCompleted) {
      toast.info('Order is already delivered.');
      return;
    }

    setFlowProcessing(prev => ({ ...prev, reachBuyer: true }));
    const responseData = await markCustomerLocationReached(
      activeOrderFlow,
      flowBuyerNotes
    );

    if (responseData?.paymentData) {
      // 🎯 EXACT MATCH: Format QR code if present (like AssignedOrders.js)
      const paymentData = responseData.paymentData;
      if (paymentData.qrCode) {
        paymentData.qrCode = formatQRCodeAsDataURL(paymentData.qrCode);
      }
      setFlowPaymentData(paymentData);
      
      // 🎯 EXACT MATCH: Start polling if QR code is present (like AssignedOrders.js)
      if (paymentData.qrCode && paymentData.paymentId) {
        startFlowPaymentPolling(activeOrderFlow._id, paymentData.paymentId);
      }
    }

    setFlowProcessing(prev => ({ ...prev, reachBuyer: false }));
  };

  // 🎯 EXACT MATCH: Handle COD payment type selection (like AssignedOrders.js handleCODPaymentType)
  const handleFlowCODPaymentType = async (paymentType) => {
    if (!activeOrderFlow) return;
    
    // 🎯 VALIDATION: COD orders are those that are NOT prepaid (isPaid === false)
    const isCOD = !activeOrderFlow.isPaid;
    
    if (!isCOD) {
      toast.error('QR code generation is only available for COD orders (unpaid orders)');
      return;
    }
    
    if (paymentType === 'qr' && !flowPaymentData?.qrCode) {
      // Generate QR code via API (EXACT MATCH with AssignedOrders.js)
      try {
        setFlowProcessing(prev => ({ ...prev, qr: true }));
        
        const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
        const response = await fetch(`${API_BASE_URL}/delivery/orders/${activeOrderFlow._id}/generate-qr`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        // 🎯 ERROR HANDLING: Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(`Invalid response format: ${text.substring(0, 100)}`);
        }

        const data = await response.json();
        
        // 🎯 ERROR HANDLING: Check HTTP status
        if (!response.ok) {
          throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        if (data.success) {
          // 🎯 CRITICAL FIX: Format QR code as base64 data URL for image display
          const formattedQRCode = formatQRCodeAsDataURL(data.data.qrCode);
          
          setFlowPaymentData(prev => ({
            ...(prev || {}),
            type: 'COD',
            qrCode: formattedQRCode,
            amount: data.data.amount || activeOrderFlow.totalPrice,
            paymentId: data.data.paymentId
          }));
          setFlowPaymentId(data.data.paymentId);
          setFlowPaymentStatus('pending');
          toast.success('QR code generated successfully');
          
          // 🎯 EXACT MATCH: Start payment status polling immediately (like AssignedOrders.js)
          startFlowPaymentPolling(activeOrderFlow._id, data.data.paymentId);
        } else {
          toast.error(data.message || 'Failed to generate QR code');
        }
      } catch (error) {
        console.error('Error generating QR:', error);
        toast.error('Failed to generate QR code. Please try again.');
      } finally {
        setFlowProcessing(prev => ({ ...prev, qr: false }));
      }
    } else {
      // For cash payment, just set the type
      setFlowPaymentData(prev => ({
        ...(prev || {}),
        type: 'COD',
        method: paymentType
      }));
    }
  };

  // 🎯 EXACT MATCH: Start payment status polling (like AssignedOrders.js startPaymentPolling)
  const startFlowPaymentPolling = (orderId, paymentId) => {
    // Clear any existing polling
    if (flowPaymentPolling) {
      clearInterval(flowPaymentPolling);
    }

    let pollAttempts = 0;
    const MAX_POLL_ATTEMPTS = 120; // 5 minutes max (120 * 2.5 seconds = 300 seconds)
    
    const pollInterval = setInterval(async () => {
      pollAttempts++;
      
      // 🎯 STOP POLLING: Maximum attempts reached
      if (pollAttempts > MAX_POLL_ATTEMPTS) {
        clearInterval(pollInterval);
        setFlowPaymentPolling(null);
        setFlowPaymentStatus('timeout');
        toast.warning('Payment status check timeout. Please refresh or try again.');
        return;
      }
      
      try {
        const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
        const response = await fetch(`${API_BASE_URL}/delivery/orders/${orderId}/check-payment-status`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        // 🎯 ERROR HANDLING: Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response format from server');
        }

        const data = await response.json();

        if (data.success) {
          // 🎯 HANDLE AUTO-GENERATED QR: If backend auto-generated QR, update frontend state
          if (data.data.qrAutoGenerated && data.data.qrCode) {
            // 🎯 CRITICAL FIX: Format QR code as base64 data URL for image display
            const formattedQRCode = formatQRCodeAsDataURL(data.data.qrCode);
            
            setFlowPaymentData(prev => ({
              ...(prev || {}),
              type: 'COD',
              qrCode: formattedQRCode,
              paymentId: data.data.paymentId
            }));
            setFlowPaymentId(data.data.paymentId);
            setFlowPaymentStatus('pending');
            toast.info('QR code has been generated. Please scan to make payment.');
          }
          
          const isPaymentCompleted = data.data.isPaymentCompleted || data.data.isPaymentSuccessful;
          
          if (isPaymentCompleted) {
            // Payment completed - stop polling
            clearInterval(pollInterval);
            setFlowPaymentPolling(null);
            setFlowPaymentCompleted(true);
            setFlowPaymentStatus('completed');
            
            // 🎯 CRITICAL: Clear QR code from form when payment is completed
            setFlowPaymentData(prev => ({
              ...(prev || {}),
              qrCode: null // Hide QR code after payment
            }));
            
            if (data.data.otpGenerated) {
              toast.success('Payment completed! OTP has been sent to buyer.');
            } else {
              toast.success('Payment completed! QR code payment successful.');
            }
          } else {
            // Still pending - continue polling
            setFlowPaymentStatus('pending');
          }
        } else {
          // API returned error - stop polling to prevent infinite attempts
          console.error('Payment status check failed:', data.message);
          if (pollAttempts >= 5) {
            clearInterval(pollInterval);
            setFlowPaymentPolling(null);
            toast.error(data.message || 'Failed to check payment status');
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        // Stop polling after multiple consecutive errors
        if (pollAttempts >= 10) {
          clearInterval(pollInterval);
          setFlowPaymentPolling(null);
          toast.error('Failed to check payment status. Please try again.');
        }
        // Continue polling for first few errors (network issues might be temporary)
      }
    }, 2500); // Poll every 2.5 seconds

    setFlowPaymentPolling(pollInterval);
  };

  // 🎯 EXACT MATCH: Stop payment polling (like AssignedOrders.js stopPaymentPolling)
  const stopFlowPaymentPolling = () => {
    if (flowPaymentPolling) {
      clearInterval(flowPaymentPolling);
      setFlowPaymentPolling(null);
    }
  };

  // 🎯 EXACT MATCH: Cleanup polling on unmount (like AssignedOrders.js)
  useEffect(() => {
    return () => {
      stopFlowPaymentPolling();
    };
  }, []); // Empty dependency array - cleanup only on unmount

  // 🎯 EXACT MATCH: Cleanup polling when modal closes
  useEffect(() => {
    if (!showOrderFlowModal) {
      stopFlowPaymentPolling();
      setFlowPaymentCompleted(false);
      setFlowPaymentStatus(null);
      setFlowPaymentId(null);
    }
  }, [showOrderFlowModal]);

  const handleFlowRegenerateQr = async () => {
    // 🎯 EXACT MATCH: Use same function as payment type selection
    await handleFlowCODPaymentType('qr');
  };

  // 🎯 EXACT MATCH: Handle delivery completion (like AssignedOrders.js handleDeliveryComplete)
  const handleFlowCompleteDelivery = async () => {
    if (!activeOrderFlow) {
      toast.error('No order selected');
      return;
    }

    // Validate based on payment type
    const isCOD = !activeOrderFlow.isPaid;
    
    if (isCOD) {
      // For COD orders, check if payment method is selected
      if (!flowPaymentData?.method && !flowPaymentData?.qrCode) {
        toast.error('Please select payment method (QR Code or Cash)');
        return;
      }
      // For COD QR payments, check if payment is completed and OTP is required
      if (flowPaymentData?.qrCode && flowPaymentCompleted && !flowBuyerOTP?.trim()) {
        toast.error('Please enter OTP from buyer to complete delivery');
        return;
      }
    } else {
      // For prepaid orders, OTP is required
      if (!flowBuyerOTP?.trim()) {
        toast.error('Please enter OTP from customer');
        return;
      }
    }

    // 🎯 FIX: Check pickup.isCompleted flag explicitly before allowing delivery
    const pickupCompleted = Boolean(activeOrderFlow.pickup?.isCompleted);
    if (!pickupCompleted) {
      toast.error('Pickup verification not completed. Please complete pickup first by entering the Order ID.');
      return;
    }

    if (activeOrderFlow.deliveryAgent?.status !== 'location_reached') {
      toast.error('Reach the buyer location before confirming payment.');
      return;
    }

    setFlowProcessing(prev => ({ ...prev, delivery: true }));
    
    try {
      const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
      
      const requestBody = {
        deliveryNotes: flowBuyerNotes,
      };

      // Add OTP for prepaid orders or COD QR payments
      if (!isCOD) {
        requestBody.otp = flowBuyerOTP;
      } else {
        // For COD, include payment confirmation
        requestBody.codPayment = {
          method: flowPaymentData?.qrCode ? 'qr' : 'cash',
          collected: true
        };
        
        // For COD QR payments, include OTP if payment completed
        if (flowPaymentData?.qrCode && flowPaymentCompleted && flowBuyerOTP) {
          requestBody.otp = flowBuyerOTP;
        }
      }
      
      const response = await fetch(`${API_BASE_URL}/delivery/orders/${activeOrderFlow._id}/deliver`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (data.success) {
        // Stop polling
        stopFlowPaymentPolling();
        toast.success('Delivery completed successfully!');
        closeOrderFlowModal();
        // Refresh orders
        fetchAssignedOrders();
      } else {
        toast.error(data.message || 'Failed to complete delivery');
      }
    } catch (error) {
      console.error('Error completing delivery:', error);
      toast.error('Failed to complete delivery. Please try again.');
    } finally {
      setFlowProcessing(prev => ({ ...prev, delivery: false }));
    }
  };

  const handleFlowCollectCash = async (method = 'cash') => {
    // 🎯 EXACT MATCH: Set payment method and proceed (like AssignedOrders.js)
    setFlowPaymentData(prev => ({
      ...(prev || {}),
      type: 'COD',
      method: method
    }));
    // Note: Don't complete delivery here - user should click "Complete Delivery" button
    toast.info('Payment method selected. Click "Complete Delivery" to finish.');
  };

  // 🎯 REMOVED: handleFlowVerifyOtp - Now using handleFlowCompleteDelivery for all cases (EXACT MATCH with AssignedOrders.js)

  // Get next action for order
  const getNextAction = (order) => {
    if (!order.pickup?.isCompleted) return 'pickup';
    if (order.pickup?.isCompleted && order.deliveryAgent?.status !== 'location_reached') return 'reached-location';
    if (order.deliveryAgent?.status === 'location_reached' && !order.delivery?.isCompleted) return 'delivery';
    return null;
  };

  // Stats Card Component
  const StatsCard = ({ title, value, icon, color, linkTo }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
      {linkTo && (
        <div className="mt-4">
          <Link to={linkTo} className="text-sm text-blue-600 hover:text-blue-800">
            View Details →
          </Link>
        </div>
      )}
    </div>
  );

  // Order Card Component
  const OrderCard = ({ order, isAssigned = false, onOpenFlow }) => {
    const nextAction = isAssigned ? getNextAction(order) : null;
    const isSelectable = isAssigned && order.deliveryStatus === 'assigned';
    const isSelected = selectedOrders.some(selected => selected && selected._id === order._id);
    const nextActionCopy = nextAction === 'pickup'
      ? 'Complete pickup at seller location'
      : nextAction === 'reached-location'
        ? 'Mark arrival at buyer location'
        : nextAction === 'delivery'
          ? 'Finish delivery confirmation'
          : 'All steps completed';

    const handleCardClick = () => {
      if (isAssigned && typeof onOpenFlow === 'function') {
        onOpenFlow(order);
      }
    };
    
    return (
      <div
        className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
        isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
      } ${isAssigned ? 'cursor-pointer' : ''}`}
        onClick={isAssigned ? handleCardClick : undefined}
      >
        {/* 🎯 NEW: Bulk Selection Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {isSelectable && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  handleOrderSelection(order, e.target.checked);
                }}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
            )}
            <div>
              <h3 className="font-semibold text-gray-900">
                Order #{order.orderNumber || order._id?.slice(-6)}
              </h3>
              <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
            </div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            order.deliveryStatus === 'assigned' ? 'bg-blue-100 text-blue-800' :
            order.deliveryStatus === 'pickup_completed' ? 'bg-purple-100 text-purple-800' :
            order.status === 'approved' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {order.deliveryStatus || order.status || 'PENDING'}
          </span>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Customer:</span>
            <span className="text-sm font-medium">{order.user?.name || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Amount:</span>
            <span className="text-sm font-bold text-green-600">{formatCurrency(order.totalPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Items:</span>
            <span className="text-sm">{order.orderItems?.length || 0} items</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Earnings:</span>
            <span className="text-sm font-bold text-orange-600">
              {formatCurrency(order.deliveryFees?.agentEarning || 50)}
            </span>
          </div>
        </div>

        {isAssigned && (
          <p className="text-xs text-gray-500 mb-4">
            Next step: {nextActionCopy}
          </p>
        )}

        <div className="space-y-2">
          {!isAssigned ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAcceptOrder(order._id);
              }}
              disabled={accepting}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
            >
              {accepting ? 'Accepting...' : 'Accept Order'}
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
            >
              View Order Details
            </button>
          )}
        </div>
      </div>
    );
  };

  // 🎯 NOTE: fetchReturnAssignments is defined earlier (line ~227) to avoid "before initialization" error

  const handleReturnAssignmentResponse = async (returnId, response, reason = '') => {
    try {
      setProcessingReturn(true);
      console.log('🚚 Responding to return assignment:', { returnId, response, reason });

      const apiResponse = await returnService.handleReturnAssignmentResponse(returnId, response, reason);
      
      if (apiResponse && apiResponse.success) {
        toast.success(response === 'accepted' ? 'Return assignment accepted!' : 'Return assignment rejected');
        console.log('✅ Return assignment response sent');
        
        // Refresh return assignments
        await fetchReturnAssignments();
      } else {
        throw new Error(apiResponse?.message || 'Failed to respond to return assignment');
      }
    } catch (error) {
      console.error('❌ Failed to respond to return assignment:', error);
      toast.error(error.message || 'Failed to respond to return assignment');
    } finally {
      setProcessingReturn(false);
    }
  };

  const handleReturnBuyerArrival = async (returnOrder) => {
    if (!returnOrder?._id) {
      toast.error('Invalid return order selected');
      return;
    }

    try {
      setProcessingReturn(true);
      console.log('🚚 Marking buyer arrival for return:', returnOrder._id);

      const apiResponse = await returnService.markReturnBuyerArrival(returnOrder._id, {
        notes: `Agent ${deliveryAgentAuth.deliveryAgent?.name || 'N/A'} reached buyer location`,
        location: {
          type: 'Point',
          coordinates: [0, 0],
          address: returnOrder.shippingAddress?.address || ''
        }
      });

      if (apiResponse && apiResponse.success) {
        toast.success('Buyer location confirmed. Proceed to pickup.');
        await fetchReturnAssignments();
      } else {
        throw new Error(apiResponse?.message || 'Failed to mark buyer arrival');
      }
    } catch (error) {
      console.error('❌ Failed to mark buyer arrival:', error);
      toast.error(error.message || 'Failed to mark buyer arrival');
    } finally {
      setProcessingReturn(false);
    }
  };

  const handleReturnSellerArrival = async (returnOrder) => {
    if (!returnOrder?._id) {
      toast.error('Invalid return order selected');
      return;
    }

    try {
      setProcessingReturn(true);
      console.log('🚚 Marking seller arrival for return:', returnOrder._id);

      const apiResponse = await returnService.markReturnSellerArrival(returnOrder._id, {
        notes: `Agent ${deliveryAgentAuth.deliveryAgent?.name || 'N/A'} reached seller location`,
        location: {
          type: 'Point',
          coordinates: [0, 0],
          address: returnOrder.seller?.shop?.address || ''
        }
      });

      if (apiResponse && apiResponse.success) {
        toast.success('Seller OTP sent. Please ask seller for the OTP to complete return.');
        await fetchReturnAssignments();
        setSelectedReturn(returnOrder);
        setShowReturnDeliveryModal(true);
      } else {
        throw new Error(apiResponse?.message || 'Failed to mark seller arrival');
      }
    } catch (error) {
      console.error('❌ Failed to mark seller arrival:', error);
      toast.error(error.message || 'Failed to mark seller arrival');
    } finally {
      setProcessingReturn(false);
    }
  };

  const handleReturnPickupComplete = async () => {
    if (!selectedReturn) {
      toast.error('Select a return assignment first');
      return;
    }

    try {
      setProcessingReturn(true);
      console.log('🚚 Completing return pickup for:', selectedReturn._id);

      const response = await returnService.completeReturnPickup(selectedReturn._id, {
        otp: returnPickupOTP?.trim() || undefined,
        notes: `Return pickup completed by ${deliveryAgentAuth.deliveryAgent?.name || 'Unknown Agent'}`
      });
      
      if (response && response.success) {
        toast.success('Return pickup completed successfully!');
        console.log('✅ Return pickup completed');
        
        // Refresh data
        await fetchReturnAssignments();
        setShowReturnPickupModal(false);
        setReturnPickupOTP('');
        setSelectedReturn(null);
      } else {
        throw new Error(response?.message || 'Failed to complete return pickup');
      }
    } catch (error) {
      console.error('❌ Failed to complete return pickup:', error);
      toast.error(error.message || 'Failed to complete return pickup');
    } finally {
      setProcessingReturn(false);
    }
  };

  const handleReturnDeliveryComplete = async () => {
    if (!selectedReturn || !returnDeliveryOTP.trim()) {
      toast.error('Please enter the delivery OTP');
      return;
    }

    try {
      setProcessingReturn(true);
      console.log('🚚 Completing return delivery for:', selectedReturn._id);

      const response = await returnService.completeReturnDelivery(selectedReturn._id, {
        otp: returnDeliveryOTP,
        notes: `Return delivery completed by ${deliveryAgentAuth.deliveryAgent?.name || 'Unknown Agent'}`
      });
      
      if (response && response.success) {
        toast.success('Return delivery completed successfully!');
        console.log('✅ Return delivery completed');
        
        // Refresh data
        await fetchReturnAssignments();
        setShowReturnDeliveryModal(false);
        setReturnDeliveryOTP('');
        setSelectedReturn(null);
      } else {
        throw new Error(response?.message || 'Failed to complete return delivery');
      }
    } catch (error) {
      console.error('❌ Failed to complete return delivery:', error);
      toast.error(error.message || 'Failed to complete return delivery');
    } finally {
      setProcessingReturn(false);
    }
  };

  const handleReturnPickupFailed = async () => {
    if (!selectedReturn || !pickupFailureReason.trim()) {
      toast.error('Please provide a reason for the failed pickup');
      return;
    }

    try {
      setProcessingReturn(true);
      console.log('🚚 Marking return pickup as failed for:', selectedReturn._id);

      const response = await returnService.markReturnPickupFailed(selectedReturn._id, pickupFailureReason);
      
      if (response && response.success) {
        toast.success('Return pickup marked as failed. Admin has been notified.');
        console.log('✅ Return pickup marked as failed');
        
        // Refresh data
        await fetchReturnAssignments();
        setShowReturnPickupFailedModal(false);
        setPickupFailureReason('');
        setSelectedReturn(null);
      } else {
        throw new Error(response?.message || 'Failed to mark pickup as failed');
      }
    } catch (error) {
      console.error('❌ Failed to mark pickup as failed:', error);
      toast.error(error.message || 'Failed to mark pickup as failed');
    } finally {
      setProcessingReturn(false);
    }
  };

  const getReturnStatusColor = (status) => {
    switch (status) {
      case 'assigned':
        return 'text-orange-600 bg-orange-100';
      case 'accepted':
        return 'text-green-600 bg-green-100';
      case 'agent_reached_buyer':
        return 'text-indigo-600 bg-indigo-100';
      case 'picked_up':
        return 'text-blue-600 bg-blue-100';
      case 'agent_reached_seller':
        return 'text-purple-600 bg-purple-100';
      case 'pickup_failed':
        return 'text-red-600 bg-red-100';
      case 'returned':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getReturnStatusIcon = (status) => {
    switch (status) {
      case 'assigned':
        return <FiClock className="w-4 h-4" />;
      case 'accepted':
        return <FiCheckCircle className="w-4 h-4" />;
      case 'agent_reached_buyer':
        return <FiMapPin className="w-4 h-4" />;
      case 'picked_up':
        return <FiPackage className="w-4 h-4" />;
      case 'agent_reached_seller':
        return <FiMapPin className="w-4 h-4" />;
      case 'pickup_failed':
        return <FiAlertCircle className="w-4 h-4" />;
      case 'returned':
        return <FiPackage className="w-4 h-4" />;
      default:
        return <FiClock className="w-4 h-4" />;
    }
  };

  // 🔧 CRITICAL FIX: Show loading while AuthContext is initializing OR dashboard is loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">{authLoading ? 'Initializing authentication...' : 'Loading dashboard...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">🚚 Delivery Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Status Toggle */}
              <button
                onClick={toggleAvailability}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  agentStatus === 'available' 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
              >
                {agentStatus === 'available' ? '🟢 Available' : '🔴 Offline'}
              </button>
              
              {/* Agent Info */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {deliveryAgentAuth.deliveryAgent?.name?.charAt(0)?.toUpperCase() || 'D'}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {deliveryAgentAuth.deliveryAgent?.name || 'Agent'}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 🎯 NEW: Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📦 Orders
            </button>
            <button
              onClick={() => setActiveTab('returns')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'returns'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiRotateCcw className="w-4 h-4 inline mr-1" />
              Returns
            </button>
            <button
              onClick={() => {
                setActiveTab('cancelled');
                fetchCancelledOrders();
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'cancelled'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiAlertCircle className="w-4 h-4 inline mr-1" />
              Cancelled
              {cancelledOrders.length > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                  {cancelledOrders.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Orders Tab Content */}
        {activeTab === 'orders' && (
          <>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Deliveries"
            value={stats.totalDeliveries}
            icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>}
            color="bg-blue-500"
            linkTo="/delivery/history"
          />
          
          <StatsCard
            title="Total Earnings"
            value={formatCurrency(stats.totalEarnings)}
            icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>}
            color="bg-green-500"
            linkTo="/delivery/earnings"
          />
          
          <StatsCard
            title="My Assigned Orders"
            value={assignedOrders.length}
            icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            color="bg-orange-500"
            linkTo="/delivery/orders/assigned"
          />
          
          <StatsCard
            title="Available Orders"
            value={availableOrders.length}
            icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            color="bg-purple-500"
            linkTo="/delivery/orders/available"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link to="/delivery/orders/available" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Browse Available Orders</h3>
                <p className="text-sm text-gray-500">Find new delivery opportunities</p>
              </div>
            </div>
          </Link>

          <Link to="/delivery/orders/assigned" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-orange-100">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">My Assigned Orders</h3>
                <p className="text-sm text-gray-500">Manage pickup & delivery</p>
              </div>
            </div>
          </Link>

          <Link to="/delivery/profile" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">My Profile</h3>
                <p className="text-sm text-gray-500">Update profile & settings</p>
              </div>
            </div>
          </Link>
          </div>

          {/* Available Orders Preview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">🆕 Available Orders</h2>
              <Link to="/delivery/orders/available" className="text-sm text-blue-600 hover:text-blue-800">
                View All →
              </Link>
            </div>
            <div className="p-6">
              {availableOrders.length > 0 ? (
                <div className="space-y-4">
                  {availableOrders.slice(0, 2).map((order) => (
                    <OrderCard key={order._id} order={order} isAssigned={false} />
                  ))}
                  {availableOrders.length > 2 && (
                    <div className="text-center pt-4">
                      <Link to="/delivery/orders/available" className="text-sm text-blue-600 hover:text-blue-800">
                        +{availableOrders.length - 2} more orders
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Orders</h3>
                  <p className="text-gray-600">Check back later for new delivery opportunities</p>
                </div>
              )}
          </div>
        </div>
          </>
        )}

        {/* Returns Tab Content */}
        {activeTab === 'returns' && (
          <div>
            {/* Return Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-orange-100">
                    <FiRotateCcw className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Return Assignments</h3>
                    <p className="text-2xl font-bold text-orange-600">{returnAssignments.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-blue-100">
                    <FiPackage className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Pending Pickups</h3>
                    <p className="text-2xl font-bold text-blue-600">
                      {returnAssignments.filter(r => ['accepted', 'agent_reached_buyer'].includes(r.returnDetails?.returnAssignment?.status)).length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-purple-100">
                    <FiPackage className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Pending Deliveries</h3>
                    <p className="text-2xl font-bold text-purple-600">
                      {returnAssignments.filter(r => ['picked_up', 'agent_reached_seller'].includes(r.returnDetails?.returnAssignment?.status)).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Return Assignments List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">My Return Assignments</h2>
              </div>
              
              {returnLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading return assignments...</p>
                </div>
              ) : returnAssignments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FiRotateCcw className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No return assignments found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {returnAssignments.map((returnOrder) => (
                    <div key={returnOrder._id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              {returnOrder.orderNumber}
                            </h3>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getReturnStatusColor(returnOrder.returnDetails.returnAssignment.status)}`}>
                              {getReturnStatusIcon(returnOrder.returnDetails.returnAssignment.status)}
                              {returnOrder.returnDetails.returnAssignment.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <p><strong>Customer:</strong> {returnOrder.user?.name}</p>
                              <p><strong>Reason:</strong> {returnOrder.returnDetails.returnReason}</p>
                            </div>
                            <div>
                              <p><strong>Requested:</strong> {new Date(returnOrder.returnDetails.returnRequestedAt).toLocaleDateString()}</p>
                              <p><strong>Assigned:</strong> {new Date(returnOrder.returnDetails.returnAssignment.assignedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                        
                        {(() => {
                          const assignmentStatus = returnOrder.returnDetails?.returnAssignment?.status;
                          const buyerReached = Boolean(returnOrder.returnDetails?.returnAssignment?.buyerLocationReachedAt);
                          const sellerReached = Boolean(returnOrder.returnDetails?.returnAssignment?.sellerLocationReachedAt);

                          return (
                            <div className="ml-6 flex flex-wrap gap-2">
                              {assignmentStatus === 'assigned' && (
                                <>
                                  <button
                                    onClick={() => handleReturnAssignmentResponse(returnOrder._id, 'accepted')}
                                    disabled={processingReturn}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleReturnAssignmentResponse(returnOrder._id, 'rejected', 'Not available')}
                                    disabled={processingReturn}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              {assignmentStatus === 'accepted' && !buyerReached && (
                                <button
                                  onClick={() => handleReturnBuyerArrival(returnOrder)}
                                  disabled={processingReturn}
                                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                                >
                                  Reached Buyer
                                </button>
                              )}

                              {['accepted', 'agent_reached_buyer'].includes(assignmentStatus) && (
                                <button
                                  onClick={() => {
                                    setSelectedReturn(returnOrder);
                                    setShowReturnPickupModal(true);
                                    setReturnPickupOTP('');
                                  }}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                                >
                                  Complete Pickup
                                </button>
                              )}

                              {assignmentStatus === 'picked_up' && (
                                <button
                                  onClick={() => handleReturnSellerArrival(returnOrder)}
                                  disabled={processingReturn}
                                  className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                                >
                                  Reached Seller
                                </button>
                              )}

                              {assignmentStatus === 'agent_reached_seller' && (
                                <button
                                  onClick={() => {
                                    setSelectedReturn(returnOrder);
                                    setShowReturnDeliveryModal(true);
                                    setReturnDeliveryOTP('');
                                  }}
                                  disabled={processingReturn}
                                  className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                                >
                                  Enter Seller OTP
                                </button>
                              )}

                              {['accepted', 'agent_reached_buyer'].includes(assignmentStatus) && (
                                <button
                                  onClick={() => {
                                    setSelectedReturn(returnOrder);
                                    setShowReturnPickupFailedModal(true);
                                  }}
                                  disabled={processingReturn}
                                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                                >
                                  Buyer Not Responding
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cancelled Orders Tab Content */}
        {activeTab === 'cancelled' && (
          <div>
            {/* Cancelled Orders Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-red-100">
                    <FiAlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Cancelled Orders</h3>
                    <p className="text-2xl font-bold text-red-600">{cancelledOrders.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cancelled Orders List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">My Cancelled Orders</h2>
              </div>
              
              {cancelledOrdersLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading cancelled orders...</p>
                </div>
              ) : cancelledOrders.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FiAlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No cancelled orders found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {cancelledOrders.map((order) => (
                    <div key={order._id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              Order #{order.orderNumber}
                            </h3>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <FiAlertCircle className="w-3 h-3" />
                              Cancelled
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                            <div>
                              <p><strong>Customer:</strong> {order.user?.name}</p>
                              <p><strong>Phone:</strong> {order.user?.phone}</p>
                              <p><strong>Amount:</strong> ₹{order.totalPrice?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div>
                              <p><strong>Cancelled At:</strong> {order.cancellationDetails?.cancelledAt ? new Date(order.cancellationDetails.cancelledAt).toLocaleString() : 'N/A'}</p>
                              <p><strong>Cancelled By:</strong> {order.cancellationDetails?.cancelledByName || 'Delivery Agent'}</p>
                              <p><strong>Payment Method:</strong> {order.paymentMethod || 'N/A'}</p>
                            </div>
                          </div>

                          {order.cancellationDetails?.cancellationReason && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                              <p className="text-sm font-medium text-red-800 mb-1">Cancellation Reason:</p>
                              <p className="text-sm text-red-700">{order.cancellationDetails.cancellationReason}</p>
                            </div>
                          )}

                          {/* Order Items */}
                          {order.orderItems && order.orderItems.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-gray-700 mb-2">Order Items:</p>
                              <div className="space-y-2">
                                {order.orderItems.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-3 text-sm text-gray-600">
                                    {item.image && (
                                      <img 
                                        src={item.image} 
                                        alt={item.name} 
                                        className="w-12 h-12 object-cover rounded"
                                      />
                                    )}
                                    <div>
                                      <p className="font-medium">{item.name}</p>
                                      <p className="text-xs text-gray-500">
                                        Qty: {item.quantity}
                                        {item.size && ` | Size: ${item.size}`}
                                        {item.color && ` | Color: ${item.color}`}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Shipping Address */}
                          {order.shippingAddress && (
                            <div className="mt-4 text-sm text-gray-600">
                              <p className="font-medium text-gray-700 mb-1">Delivery Address:</p>
                              <p>{order.shippingAddress.address}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {showOrderFlowModal && activeOrderFlow && (() => {
        const sellerReached = Boolean(activeOrderFlow.pickup?.sellerLocationReachedAt);
        const pickupCompleted = Boolean(activeOrderFlow.pickup?.isCompleted);
        const buyerLocationReached = ['location_reached', 'delivery_completed'].includes(activeOrderFlow.deliveryAgent?.status);
        const deliveryCompleted = activeOrderFlow.deliveryAgent?.status === 'delivery_completed' || activeOrderFlow.delivery?.isCompleted;
        const codOrder = isCODOrder(activeOrderFlow);
        const buyerPhone = getBuyerPhone(activeOrderFlow);
        const sellerPhone = getSellerPhone(activeOrderFlow);

        if (flowModalLoading) {
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-10 text-center">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-sm text-gray-600">Refreshing order status…</p>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400">Assigned Order Flow</p>
                  <h2 className="text-2xl font-semibold text-gray-900 mt-1">
                    {activeOrderFlow.user?.name || 'Buyer'}'s delivery
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Phone: {buyerPhone || 'Not shared'} • Payment: {activeOrderFlow.paymentMethod || 'N/A'} • Status: {activeOrderFlow.deliveryAgent?.status || 'pending'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Complete each checkpoint sequentially to deliver the order.
                  </p>
                </div>
                <button
                  onClick={closeOrderFlowModal}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  ← Back to Assigned Orders
                </button>
              </div>

              <div className="mt-6 space-y-6">
                <section className="border border-gray-200 rounded-xl p-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">1. Seller checkpoint</h3>
                      <p className="text-sm text-gray-500">
                        Reach the seller, enter the order ID they verbally share, and complete pickup.
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      pickupCompleted
                        ? 'bg-green-100 text-green-800'
                        : sellerReached
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-orange-100 text-orange-800'
                    }`}>
                      {pickupCompleted ? 'Pickup Completed' : sellerReached ? 'Waiting for Seller Order ID' : 'Awaiting Arrival'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 uppercase">Seller Location</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{activeOrderFlow.seller?.firstName || 'Seller'}</p>
                      <p className="text-sm text-gray-700 mt-1">{getSellerAddress(activeOrderFlow)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 uppercase">Seller Contact</p>
                      <p className="text-sm text-gray-900 mt-1">{sellerPhone || 'Phone not shared'}</p>
                    </div>
                  </div>

                  {!sellerReached && (
                    <button
                      onClick={handleFlowReachSeller}
                      disabled={flowProcessing.reachSeller}
                      className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                    >
                      {flowProcessing.reachSeller ? 'Updating...' : 'Reached Seller Location'}
                    </button>
                  )}

                  {(flowSellerVerificationOpen || (sellerReached && !pickupCompleted)) && (
                    <div className="mt-4 space-y-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Enter the order ID told by Seller <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={flowSellerOrderId}
                        onChange={(e) => {
                          setFlowSellerOrderId(e.target.value);
                          setFlowSellerOrderIdError('');
                          setFlowSellerVerificationStatus('');
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Enter order id here"
                      />
                      {flowSellerOrderIdError && (
                        <p className="text-sm text-red-600">{flowSellerOrderIdError}</p>
                      )}
                      {flowSellerVerificationStatus && (
                        <p className="text-sm text-green-700">{flowSellerVerificationStatus}</p>
                      )}
                      <label className="block text-sm font-medium text-gray-700">
                        Seller notes (optional)
                      </label>
                      <textarea
                        value={flowSellerNotes}
                        onChange={(e) => setFlowSellerNotes(e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Any remarks about the pickup..."
                      />
                      <div className="flex gap-3 flex-wrap">
                        <button
                          onClick={handleFlowVerifyPickup}
                          disabled={flowProcessing.pickup || !flowSellerOrderId.trim()}
                          className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-60"
                        >
                          {flowProcessing.pickup ? 'Verifying...' : 'Verify & Move to Buyer'}
                        </button>
                      </div>
                    </div>
                  )}

                  {pickupCompleted && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
                        ✅ Pickup verified. Proceed to the buyer section below.
                    </div>
                  )}
                  </section>

                {pickupCompleted ? (
                <section className="border border-gray-200 rounded-xl p-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">2. Buyer checkpoint</h3>
                      <p className="text-sm text-gray-500">
                        After pickup, reach the buyer, follow the correct payment flow, and complete the delivery confirmation.
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      deliveryCompleted
                        ? 'bg-green-100 text-green-800'
                        : buyerLocationReached
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-orange-100 text-orange-800'
                    }`}>
                      {deliveryCompleted ? 'Delivered' : buyerLocationReached ? 'At Buyer Location' : 'En Route to Buyer'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 uppercase">Delivery Address</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{activeOrderFlow.user?.name || 'Buyer'}</p>
                      <p className="text-sm text-gray-700 mt-1">{getBuyerAddress(activeOrderFlow)}</p>
                      {getBuyerCity(activeOrderFlow) && (
                        <p className="text-sm text-gray-700">{getBuyerCity(activeOrderFlow)}</p>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 uppercase">Buyer Contact</p>
                      <p className="text-sm text-gray-900 mt-1">{buyerPhone || 'Phone not shared'}</p>
                    </div>
                  </div>

                  {pickupCompleted && !buyerLocationReached && (
                    <div className="mt-4 space-y-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Notes while reaching buyer (optional)
                      </label>
                      <textarea
                        value={flowBuyerNotes}
                        onChange={(e) => setFlowBuyerNotes(e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Mention landmark, gate info, etc."
                      />
                      <button
                        onClick={handleFlowReachBuyer}
                        disabled={flowProcessing.reachBuyer}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                      >
                        {flowProcessing.reachBuyer ? 'Updating...' : 'Reached Buyer Location'}
                      </button>
                    </div>
                  )}

                  {buyerLocationReached && !deliveryCompleted && (
                    <div className="mt-4 space-y-4">
                      {codOrder ? (
                        <>
                          {/* 🎯 EXACT MATCH: Payment status indicator (like AssignedOrders.js lines 1390-1399) */}
                          {flowPaymentStatus && (
                            <div className={`p-3 rounded-md ${
                              flowPaymentStatus === 'completed' 
                                ? 'bg-green-50 border border-green-200' 
                                : 'bg-yellow-50 border border-yellow-200'
                            }`}>
                              <p className={`text-sm ${
                                flowPaymentStatus === 'completed' ? 'text-green-800' : 'text-yellow-800'
                              }`}>
                                {flowPaymentStatus === 'completed' 
                                  ? '✅ Payment completed! Enter OTP from buyer.' 
                                  : '⏳ Waiting for payment...'}
                              </p>
                            </div>
                          )}

                          {/* 🎯 EXACT MATCH: Payment Method Selection (like AssignedOrders.js lines 1401-1457) */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Payment Method <span className="text-red-500">*</span>
                            </label>
                            <div className="space-y-2">
                              <button
                                onClick={() => handleFlowCODPaymentType('qr')}
                                disabled={flowProcessing.qr || flowPaymentCompleted}
                                className={`w-full border-2 rounded-md p-3 text-left transition-colors ${
                                  flowPaymentData?.qrCode
                                    ? 'border-orange-500 bg-orange-50'
                                    : 'border-gray-300 hover:border-orange-300'
                                } ${(flowProcessing.qr || flowPaymentCompleted) ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <div className="flex items-center">
                                  <input
                                    type="radio"
                                    checked={!!flowPaymentData?.qrCode}
                                    onChange={() => handleFlowCODPaymentType('qr')}
                                    disabled={flowProcessing.qr || flowPaymentCompleted}
                                    className="mr-2"
                                  />
                                  <span className="font-medium">
                                    {flowProcessing.qr 
                                      ? 'Generating QR Code...' 
                                      : 'Generate SMEPay QR Code'}
                                  </span>
                                </div>
                                {flowPaymentData?.qrCode && !flowPaymentCompleted && (
                                  <div className="mt-2 p-2 bg-white rounded border">
                                    <img src={flowPaymentData.qrCode} alt="QR Code" className="w-32 h-32 mx-auto" />
                                    <p className="text-xs text-center text-gray-600 mt-2">Scan this QR code to pay</p>
                                  </div>
                                )}
                              </button>
                              
                              <button
                                onClick={() => handleFlowCODPaymentType('cash')}
                                disabled={flowPaymentCompleted}
                                className={`w-full border-2 rounded-md p-3 text-left transition-colors ${
                                  flowPaymentData?.method === 'cash'
                                    ? 'border-orange-500 bg-orange-50'
                                    : 'border-gray-300 hover:border-orange-300'
                                } ${flowPaymentCompleted ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <div className="flex items-center">
                                  <input
                                    type="radio"
                                    checked={flowPaymentData?.method === 'cash'}
                                    onChange={() => handleFlowCODPaymentType('cash')}
                                    disabled={flowPaymentCompleted}
                                    className="mr-2"
                                  />
                                  <span className="font-medium">Payment Collected in Cash</span>
                                </div>
                              </button>
                            </div>
                          </div>

                          {/* 🎯 EXACT MATCH: OTP Input after QR payment completion (like AssignedOrders.js lines 1508-1510) */}
                          {flowPaymentCompleted && flowPaymentData?.qrCode && !flowBuyerOTP?.trim() && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Enter OTP from Buyer <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={flowBuyerOTP}
                                onChange={(e) => setFlowBuyerOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="Enter OTP from buyer"
                                maxLength={6}
                              />
                              <p className="text-xs text-red-600 mt-1">Please enter OTP from buyer to complete delivery</p>
                            </div>
                          )}

                          {/* 🎯 EXACT MATCH: Complete Delivery Button (like AssignedOrders.js lines 1500-1510) */}
                          <div className="mt-4">
                            <button
                              onClick={handleFlowCompleteDelivery}
                              disabled={flowProcessing.delivery || (flowPaymentData?.qrCode && flowPaymentCompleted && !flowBuyerOTP?.trim())}
                              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md font-medium transition-colors"
                            >
                              {flowProcessing.delivery 
                                ? 'Processing...' 
                                : (flowPaymentData?.qrCode && flowPaymentCompleted && !flowBuyerOTP?.trim())
                                  ? 'Enter OTP First'
                                  : 'Complete Delivery'}
                            </button>
                            {flowPaymentData?.qrCode && flowPaymentCompleted && !flowBuyerOTP?.trim() && (
                              <p className="text-xs text-red-600 mt-1 text-center w-full">Please enter OTP from buyer to complete delivery</p>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                          <p className="text-sm font-medium text-blue-900">
                            Payment was prepaid. Ask the buyer for the OTP SMS from SME Pay / MSG91.
                          </p>
                          <label className="block text-sm font-medium text-blue-900">
                            Enter OTP sent to buyer phone number
                          </label>
                          <input
                            type="text"
                            value={flowBuyerOTP}
                            maxLength={6}
                            onChange={(e) => setFlowBuyerOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full border border-blue-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter OTP here"
                          />
                          <button
                            onClick={handleFlowCompleteDelivery}
                            disabled={flowProcessing.delivery || !flowBuyerOTP.trim()}
                            className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                          >
                            {flowProcessing.delivery ? 'Verifying...' : 'Verify OTP & Complete Delivery'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {deliveryCompleted && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm space-y-2">
                      <p>✅ Order delivered successfully.</p>
                      <p>Payment status: {activeOrderFlow.paymentStatus || 'N/A'}</p>
                      <p>Agent earnings: ₹{activeOrderFlow.deliveryFees?.agentEarning || 0}</p>
                    </div>
                  )}
                </section>
                ) : (
                <section className="border border-gray-200 rounded-xl p-5 bg-gray-50 text-gray-500">
                  <h3 className="text-lg font-semibold text-gray-400">2. Buyer checkpoint</h3>
                  <p className="text-sm mt-2">
                    This step unlocks after you verify the seller order ID and finish pickup.
                  </p>
                </section>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pickup Modal */}
      {showPickupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📦 Complete Pickup</h2>
            <p className="text-sm text-gray-600 mb-4">
              Order: <strong>#{selectedOrder?.orderNumber || selectedOrder?._id?.slice(-6)}</strong>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order ID Verification <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={pickupData.orderId}
                  onChange={(e) => setPickupData(prev => ({ ...prev, orderId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter order ID from seller"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Notes (optional)
                </label>
                <textarea
                  value={pickupData.notes}
                  onChange={(e) => setPickupData(prev => ({ ...prev, notes: e.target.value }))}
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
                  setPickupData({ orderId: '', notes: '' });
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePickupComplete}
                disabled={processingPickup}
                className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                {processingPickup ? 'Processing...' : 'Complete Pickup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reached Location Modal */}
      {showReachedLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📍 Reached Customer Location</h2>
            <p className="text-sm text-gray-600 mb-4">
              Order: <strong>#{selectedOrder?.orderNumber || selectedOrder?._id?.slice(-6)}</strong>
            </p>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">What happens next?</h3>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• For COD orders: QR code will be generated for payment</li>
                  <li>• For prepaid orders: OTP will be sent to customer</li>
                  <li>• Customer will be notified that you've arrived</li>
                </ul>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Notes (optional)
                </label>
                <textarea
                  value={reachedLocationData.notes}
                  onChange={(e) => setReachedLocationData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Any notes about reaching the location..."
                />
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowReachedLocationModal(false);
                  setSelectedOrder(null);
                  setReachedLocationData({ notes: '' });
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReachedLocationComplete}
                disabled={processingReachedLocation}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                {processingReachedLocation ? 'Processing...' : 'Mark as Reached'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🚚 Complete Delivery</h2>
            <p className="text-sm text-gray-600 mb-4">
              Order: <strong>#{selectedOrder?.orderNumber || selectedOrder?._id?.slice(-6)}</strong>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OTP from Customer <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={deliveryData.otp}
                  onChange={(e) => setDeliveryData(prev => ({ ...prev, otp: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter 4-6 digit OTP"
                  maxLength="6"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Notes (optional)
                </label>
                <textarea
                  value={deliveryData.notes}
                  onChange={(e) => setDeliveryData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows="3"
                  placeholder="Any notes about the delivery..."
                />
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowDeliveryModal(false);
                  setSelectedOrder(null);
                  setDeliveryData({ orderId: '', otp: '', notes: '' });
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeliveryComplete}
                disabled={processingDelivery}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                {processingDelivery ? 'Processing...' : 'Complete Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎯 NEW: Bulk Action Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {bulkAction === 'accept' ? '✅ Bulk Accept Orders' : '❌ Bulk Reject Orders'}
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                You are about to {bulkAction} {selectedOrders.length} order(s):
              </p>
              <div className="mt-2 max-h-32 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {selectedOrders.filter(order => order && order._id).map(order => (
                    <span key={order._id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      #{order.orderNumber || order._id?.slice(-6)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {bulkAction === 'reject' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason (Optional)
                </label>
                <textarea
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows="3"
                  placeholder="Why are you rejecting these orders?"
                />
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkAction('');
                  setBulkReason('');
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={bulkAction === 'accept' ? handleBulkAcceptOrders : handleBulkRejectOrders}
                disabled={bulkProcessing}
                className={`flex-1 text-white py-2 px-4 rounded-md font-medium transition-colors ${
                  bulkAction === 'accept' 
                    ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
                    : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                }`}
              >
                {bulkProcessing ? 'Processing...' : `${bulkAction === 'accept' ? 'Accept' : 'Reject'} ${selectedOrders.length} Orders`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Pickup Modal */}
      {showReturnPickupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📦 Return Pickup</h2>
            <p className="text-sm text-gray-600 mb-4">
              Order: <strong>#{selectedReturn?.orderNumber}</strong>
            </p>
            
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-orange-900 mb-2">Return Details</h3>
                <ul className="text-xs text-orange-800 space-y-1">
                  <li>• Customer: {selectedReturn?.user?.name}</li>
                  <li>• Reason: {selectedReturn?.returnDetails?.returnReason}</li>
                  <li>• Requested: {selectedReturn?.returnDetails?.returnRequestedAt && new Date(selectedReturn.returnDetails.returnRequestedAt).toLocaleDateString()}</li>
                </ul>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buyer PIN / Verification Code <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  value={returnPickupOTP}
                  onChange={(e) => setReturnPickupOTP(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter buyer provided PIN if any"
                />
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowReturnPickupModal(false);
                  setSelectedReturn(null);
                  setReturnPickupOTP('');
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowReturnPickupModal(false);
                  setShowReturnPickupFailedModal(true);
                }}
                disabled={processingReturn}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Buyer Not Responding
              </button>
              <button
                onClick={handleReturnPickupComplete}
                disabled={processingReturn}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                {processingReturn ? 'Processing...' : 'Complete Pickup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Delivery Modal */}
      {showReturnDeliveryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🏪 Return to Seller</h2>
            <p className="text-sm text-gray-600 mb-4">
              Order: <strong>#{selectedReturn?.orderNumber}</strong>
            </p>
            
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-purple-900 mb-2">Return Details</h3>
                <ul className="text-xs text-purple-800 space-y-1">
                  <li>• Customer: {selectedReturn?.user?.name}</li>
                  <li>• Reason: {selectedReturn?.returnDetails?.returnReason}</li>
                  <li>• Seller: {selectedReturn?.seller?.firstName}</li>
                </ul>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seller OTP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={returnDeliveryOTP}
                  onChange={(e) => setReturnDeliveryOTP(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter seller OTP"
                />
                <p className="text-xs text-gray-500 mt-1">
                  An OTP has been sent to the seller&apos;s registered mobile number via MSG91.
                </p>
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowReturnDeliveryModal(false);
                  setSelectedReturn(null);
                  setReturnDeliveryOTP('');
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReturnDeliveryComplete}
                disabled={processingReturn || !returnDeliveryOTP.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                {processingReturn ? 'Processing...' : 'Complete Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Pickup Failed Modal */}
      {showReturnPickupFailedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">❌ Buyer Not Responding</h2>
            <p className="text-sm text-gray-600 mb-4">
              Order: <strong>#{selectedReturn?.orderNumber}</strong>
            </p>
            
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-red-900 mb-2">Return Details</h3>
                <ul className="text-xs text-red-800 space-y-1">
                  <li>• Customer: {selectedReturn?.user?.name}</li>
                  <li>• Reason: {selectedReturn?.returnDetails?.returnReason}</li>
                  <li>• Requested: {selectedReturn?.returnDetails?.returnRequestedAt && new Date(selectedReturn.returnDetails.returnRequestedAt).toLocaleDateString()}</li>
                </ul>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Failed Pickup <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={pickupFailureReason}
                  onChange={(e) => setPickupFailureReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows="3"
                  placeholder="Please describe why the pickup failed (e.g., customer not available, wrong address, etc.)"
                />
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> This information will be sent to the admin dashboard for review and further action.
                </p>
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowReturnPickupFailedModal(false);
                  setSelectedReturn(null);
                  setPickupFailureReason('');
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReturnPickupFailed}
                disabled={processingReturn || !pickupFailureReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                {processingReturn ? 'Processing...' : 'Mark as Failed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryDashboard;