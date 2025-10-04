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
  const [agentStatus, setAgentStatus] = useState('available');
  
  // Modal states
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showReachedLocationModal, setShowReachedLocationModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
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
  const { deliveryAgentAuth, logoutDeliveryAgent } = useAuth();

  // API Base URL
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

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
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...getAuthHeaders(),
          ...options.headers
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          logoutDeliveryAgent();
          navigate('/delivery/login');
          return null;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
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
      // Set default stats on error
      setStats({
        totalDeliveries: 0,
        totalEarnings: 0,
        todayDeliveries: 0,
        todayEarnings: 0
      });
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
      }
    } catch (error) {
      console.error('❌ Failed to fetch assigned orders:', error);
      setAssignedOrders([]);
    }
  }, [makeApiCall]);

  // Initialize dashboard - FIXED with proper dependencies
  const initializeDashboard = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🚚 Initializing delivery dashboard...');

      // Run all API calls in parallel
      await Promise.all([
        fetchStats(),
        fetchAvailableOrders(),
        fetchAssignedOrders(),
        fetchReturnAssignments()
      ]);

      console.log('✅ Dashboard initialized successfully');
    } catch (error) {
      console.error('❌ Dashboard initialization failed:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [fetchStats, fetchAvailableOrders, fetchAssignedOrders]);

  // FIXED: Check authentication and initialize
  useEffect(() => {
    if (!deliveryAgentAuth.isAuthenticated || !deliveryAgentAuth.deliveryAgent) {
      console.log('🚚 Not authenticated, redirecting to login');
      navigate('/delivery/login');
      return;
    }

    initializeDashboard();
  }, [deliveryAgentAuth.isAuthenticated, deliveryAgentAuth.deliveryAgent, navigate, initializeDashboard]);

  // Handle order acceptance
  const handleAcceptOrder = async (orderId) => {
    try {
      setAccepting(true);
      console.log('🚚 Accepting order:', orderId);

      const response = await makeApiCall(`/delivery/orders/${orderId}/accept`, {
        method: 'PUT'
      });
      
      if (response && response.success) {
        toast.success('Order accepted successfully!');
        console.log('✅ Order accepted');
        
        // Refresh data
        await Promise.all([
          fetchAvailableOrders(),
          fetchAssignedOrders(),
          fetchStats()
        ]);
      } else {
        throw new Error(response?.message || 'Failed to accept order');
      }
    } catch (error) {
      console.error('❌ Failed to accept order:', error);
      toast.error(error.message || 'Failed to accept order');
    } finally {
      setAccepting(false);
    }
  };

  // Handle pickup completion
  const handlePickupComplete = async () => {
    if (!selectedOrder || !pickupData.orderId.trim()) {
      toast.error('Please enter order ID verification');
      return;
    }

    try {
      setProcessingPickup(true);
      console.log('🚚 Completing pickup for order:', selectedOrder._id);

      const response = await makeApiCall(`/delivery/orders/${selectedOrder._id}/pickup`, {
        method: 'PUT',
        body: JSON.stringify({
          orderIdVerification: pickupData.orderId,
          pickupNotes: pickupData.notes
        })
      });

      if (response && response.success) {
        toast.success('Pickup completed successfully!');
        console.log('✅ Pickup completed');
        
        // Reset form and close modal
        setPickupData({ orderId: '', notes: '' });
        setShowPickupModal(false);
        setSelectedOrder(null);
        
        // Refresh orders
        await Promise.all([
          fetchAssignedOrders(),
          fetchStats()
        ]);
      } else {
        throw new Error(response?.message || 'Failed to complete pickup');
      }
    } catch (error) {
      console.error('❌ Failed to complete pickup:', error);
      toast.error(error.message || 'Failed to complete pickup');
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

      const response = await makeApiCall(`/delivery/orders/${selectedOrder._id}/reached-location`, {
        method: 'PUT',
        body: JSON.stringify({
          locationNotes: reachedLocationData.notes
        })
      });

      if (response && response.success) {
        toast.success('Location marked as reached successfully!');
        console.log('✅ Location marked as reached');
        
        // Show payment information based on order type
        if (response.data.paymentData.type === 'COD') {
          toast.info(`QR code generated for ₹${response.data.paymentData.amount}. Customer can now scan and pay.`);
        } else {
          toast.info(`OTP sent to customer's phone for delivery verification.`);
        }
        
        // Reset form and close modal
        setReachedLocationData({ notes: '' });
        setShowReachedLocationModal(false);
        setSelectedOrder(null);
        
        // Refresh orders
        await Promise.all([
          fetchAssignedOrders(),
          fetchStats()
        ]);
      } else {
        throw new Error(response?.message || 'Failed to mark location as reached');
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
    if (!selectedOrder || !deliveryData.otp.trim()) {
      toast.error('Please enter OTP from customer');
      return;
    }

    try {
      setProcessingDelivery(true);
      console.log('🚚 Completing delivery for order:', selectedOrder._id);

      const response = await makeApiCall(`/delivery/orders/${selectedOrder._id}/deliver`, {
        method: 'PUT',
        body: JSON.stringify({
          otp: deliveryData.otp,
          deliveryNotes: deliveryData.notes
        })
      });

      if (response && response.success) {
        toast.success('Delivery completed successfully!');
        console.log('✅ Delivery completed');
        
        // Reset form and close modal
        setDeliveryData({ orderId: '', otp: '', notes: '' });
        setShowDeliveryModal(false);
        setSelectedOrder(null);
        
        // Refresh orders
        await Promise.all([
          fetchAssignedOrders(),
          fetchStats()
        ]);
      } else {
        throw new Error(response?.message || 'Failed to complete delivery');
      }
    } catch (error) {
      console.error('❌ Failed to complete delivery:', error);
      toast.error(error.message || 'Failed to complete delivery');
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
    if (selectedOrders.length === 0) {
      toast.error('Please select at least one order');
      return;
    }

    try {
      setBulkProcessing(true);
      console.log('🚚 Bulk accepting orders:', selectedOrders.map(o => o._id));

      const response = await makeApiCall('/delivery/orders/bulk-accept', {
        method: 'POST',
        body: JSON.stringify({
          orderIds: selectedOrders.map(order => order._id)
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
    if (selectedOrders.length === 0) {
      toast.error('Please select at least one order');
      return;
    }

    try {
      setBulkProcessing(true);
      console.log('🚚 Bulk rejecting orders:', selectedOrders.map(o => o._id));

      const response = await makeApiCall('/delivery/orders/bulk-reject', {
        method: 'POST',
        body: JSON.stringify({
          orderIds: selectedOrders.map(order => order._id),
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
    if (isSelected) {
      setSelectedOrders(prev => [...prev, order]);
    } else {
      setSelectedOrders(prev => prev.filter(o => o._id !== order._id));
    }
  };

  // 🎯 NEW: Handle select all orders
  const handleSelectAllOrders = () => {
    const assignableOrders = assignedOrders.filter(order => 
      order.deliveryStatus === 'assigned' || order.status === 'Pickup_Ready'
    );
    
    if (selectedOrders.length === assignableOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(assignableOrders);
    }
  };

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
  const OrderCard = ({ order, isAssigned = false }) => {
    const nextAction = isAssigned ? getNextAction(order) : null;
    const isSelectable = isAssigned && (order.deliveryStatus === 'assigned' || order.status === 'Pickup_Ready');
    const isSelected = selectedOrders.some(selected => selected._id === order._id);
    
    return (
      <div className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
        isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
      }`}>
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

        <div className="space-y-2">
          {!isAssigned ? (
            <button
              onClick={() => handleAcceptOrder(order._id)}
              disabled={accepting}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
            >
              {accepting ? 'Accepting...' : 'Accept Order'}
            </button>
          ) : (
            <div className="space-y-2">
              {nextAction === 'pickup' && (
                <button
                  onClick={() => openPickupModal(order)}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
                >
                  📦 Complete Pickup
                </button>
              )}
              
              {nextAction === 'reached-location' && (
                <button
                  onClick={() => openReachedLocationModal(order)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
                >
                  📍 I've Reached Location
                </button>
              )}
              
              {nextAction === 'delivery' && (
                <button
                  onClick={() => openDeliveryModal(order)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
                >
                  🚚 Complete Delivery
                </button>
              )}

              {!nextAction && (
                <div className="w-full bg-green-100 text-green-800 py-2 px-4 rounded-md text-sm font-medium text-center">
                  ✅ Order Completed
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 🎯 NEW: Return management functions
  const fetchReturnAssignments = useCallback(async () => {
    try {
      setReturnLoading(true);
      console.log('🚚 Fetching return assignments...');
      
      const response = await returnService.getReturnOrders();
      
      if (response && response.success) {
        // Filter returns assigned to this agent
        const myReturns = response.data.filter(returnOrder => 
          returnOrder.returnDetails?.returnAssignment?.deliveryAgent?._id === deliveryAgentAuth.deliveryAgent._id ||
          returnOrder.returnDetails?.returnAssignment?.deliveryAgent === deliveryAgentAuth.deliveryAgent._id
        );
        setReturnAssignments(myReturns);
        console.log('✅ Return assignments fetched:', myReturns.length);
      }
    } catch (error) {
      console.error('❌ Failed to fetch return assignments:', error);
      setReturnAssignments([]);
    } finally {
      setReturnLoading(false);
    }
  }, [deliveryAgentAuth.deliveryAgent._id]);

  const handleReturnAssignmentResponse = async (returnId, response, reason = '') => {
    try {
      setProcessingReturn(true);
      console.log('🚚 Responding to return assignment:', { returnId, response, reason });

      const apiResponse = await returnService.handleReturnAgentResponse(returnId, response, reason);
      
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

  const handleReturnPickupComplete = async () => {
    if (!selectedReturn || !returnPickupOTP.trim()) {
      toast.error('Please enter the pickup OTP');
      return;
    }

    try {
      setProcessingReturn(true);
      console.log('🚚 Completing return pickup for:', selectedReturn._id);

      const response = await returnService.completeReturnPickup(selectedReturn._id, {
        otp: returnPickupOTP,
        notes: `Return pickup completed by ${deliveryAgentAuth.deliveryAgent.name}`
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
        notes: `Return delivery completed by ${deliveryAgentAuth.deliveryAgent.name}`
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
      case 'picked_up':
        return 'text-blue-600 bg-blue-100';
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
      case 'picked_up':
        return <FiPackage className="w-4 h-4" />;
      case 'pickup_failed':
        return <FiAlertCircle className="w-4 h-4" />;
      case 'returned':
        return <FiPackage className="w-4 h-4" />;
      default:
        return <FiClock className="w-4 h-4" />;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
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

        {/* Recent Orders Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Assigned Orders Preview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">📋 My Assigned Orders</h2>
              <div className="flex items-center space-x-3">
                {/* 🎯 NEW: Bulk Action Buttons */}
                {assignedOrders.length > 0 && selectedOrders.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openBulkModal('accept')}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Accept ({selectedOrders.length})
                    </button>
                    <button
                      onClick={() => openBulkModal('reject')}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Reject ({selectedOrders.length})
                    </button>
                  </div>
                )}
                <Link to="/delivery/orders/assigned" className="text-sm text-blue-600 hover:text-blue-800">
                  View All →
                </Link>
              </div>
            </div>
            <div className="p-6">
              {assignedOrders.length > 0 ? (
                <div className="space-y-4">
                  {/* 🎯 NEW: Select All Button */}
                  {assignedOrders.filter(order => order.deliveryStatus === 'assigned' || order.status === 'Pickup_Ready').length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">
                        {selectedOrders.length} of {assignedOrders.filter(order => order.deliveryStatus === 'assigned' || order.status === 'Pickup_Ready').length} orders selected
                      </span>
                      <button
                        onClick={handleSelectAllOrders}
                        className="text-sm text-orange-600 hover:text-orange-500 font-medium"
                      >
                        {selectedOrders.length === assignedOrders.filter(order => order.deliveryStatus === 'assigned' || order.status === 'Pickup_Ready').length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  )}
                  {assignedOrders.slice(0, 2).map((order) => (
                    <OrderCard key={order._id} order={order} isAssigned={true} />
                  ))}
                  {assignedOrders.length > 2 && (
                    <div className="text-center pt-4">
                      <Link to="/delivery/orders/assigned" className="text-sm text-blue-600 hover:text-blue-800">
                        +{assignedOrders.length - 2} more orders
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Assigned Orders</h3>
                  <p className="text-gray-600 mb-4">You don't have any assigned orders yet</p>
                  <Link to="/delivery/orders/available" className="text-blue-600 hover:text-blue-800">
                    Browse Available Orders →
                  </Link>
                </div>
              )}
            </div>
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
                      {returnAssignments.filter(r => r.returnDetails?.returnAssignment?.status === 'accepted').length}
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
                      {returnAssignments.filter(r => r.returnDetails?.returnAssignment?.status === 'picked_up').length}
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
                        
                        <div className="ml-6 flex gap-2">
                          {returnOrder.returnDetails.returnAssignment.status === 'assigned' && (
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
                          
                          {returnOrder.returnDetails.returnAssignment.status === 'accepted' && (
                            <button
                              onClick={() => {
                                setSelectedReturn(returnOrder);
                                setShowReturnPickupModal(true);
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                            >
                              Complete Pickup
                            </button>
                          )}
                          
                          {returnOrder.returnDetails.returnAssignment.status === 'picked_up' && (
                            <button
                              onClick={() => {
                                setSelectedReturn(returnOrder);
                                setShowReturnDeliveryModal(true);
                              }}
                              className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700"
                            >
                              Complete Delivery
                            </button>
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
                  {selectedOrders.map(order => (
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
                  Pickup OTP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={returnPickupOTP}
                  onChange={(e) => setReturnPickupOTP(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter pickup OTP from customer"
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
                disabled={processingReturn || !returnPickupOTP.trim()}
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