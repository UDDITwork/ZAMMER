// frontend/src/pages/delivery/AssignedOrders.js - Assigned Orders Management

import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../../contexts/AuthContext';

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
  const [selectedOrder, setSelectedOrder] = useState(null);
  
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
    qrCode: null
  });
  
  const navigate = useNavigate();
  const { deliveryAgentAuth, logoutDeliveryAgent } = useContext(AuthContext);
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

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
        setAssignedOrders(data.data || []);
        return data.data || [];
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

    const agentStatus = latestOrder.deliveryAgent?.status;
    const pickupVerified = agentStatus === 'pickup_completed' || agentStatus === 'location_reached' || agentStatus === 'delivery_completed';

    if (!pickupVerified) {
      toast.error('Complete pickup verification before heading to the buyer.');
      return false;
    }

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
          setSelectedOrder(updatedOrder);
          setDeliveryForm({ 
            otp: '', 
            deliveryNotes: '',
            codPaymentType: null,
            qrCode: data.data?.paymentData?.qrCode || data.paymentData?.qrCode || null
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
    if (!order) return;

    const latestOrder = await refreshOrderState(order._id);
    if (!latestOrder) {
      toast.error('Unable to load latest order status. Please refresh.');
      return;
    }

    const agentStatus = latestOrder.deliveryAgent?.status;
    const pickupVerified = agentStatus === 'pickup_completed' || agentStatus === 'location_reached' || agentStatus === 'delivery_completed';

    if (!pickupVerified) {
      toast.error('Complete pickup verification before finishing delivery.');
      setShowDeliveryModal(false);
      setSelectedOrder(null);
      return;
    }

    if (!latestOrder.delivery?.locationReachedAt && latestOrder.deliveryAgent?.status !== 'location_reached') {
      const success = await handleReachedDeliveryLocation(latestOrder);
      if (!success) {
        return;
      }
      return;
    }

    const isCOD = latestOrder.paymentMethod === 'COD' || !latestOrder.isPaid;
    setSelectedOrder(latestOrder);
    setDeliveryForm({
      otp: '',
      deliveryNotes: '',
      codPaymentType: null,
      qrCode: isCOD ? latestOrder.paymentData?.qrCode || null : null
    });
    setShowDeliveryModal(true);
  };


  // Handle OTP resend
  const handleResendOTP = async () => {
    if (!selectedOrder) return;
    
    setProcessingOrder(selectedOrder._id);
    
    try {
      const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
      
      // Resend OTP by calling reached location again
      const response = await fetch(`${API_BASE_URL}/delivery/orders/${selectedOrder._id}/reached-location`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locationNotes: 'OTP resend requested'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('OTP resent successfully!');
      } else {
        toast.error(data.message || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('❌ [ASSIGNED-ORDERS] Error resending OTP:', error);
      toast.error('Failed to resend OTP');
    } finally {
      setProcessingOrder(null);
    }
  };

  // Handle COD payment type selection
  const handleCODPaymentType = async (paymentType) => {
    if (!selectedOrder) return;
    
    if (paymentType === 'qr' && !deliveryForm.qrCode) {
      // Generate QR code
      try {
        const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
        // QR generation happens on backend when reached location is called
        toast.info('QR code should be available. Please check with admin if not shown.');
      } catch (error) {
        console.error('Error generating QR:', error);
      }
    }
    
    setDeliveryForm(prev => ({ ...prev, codPaymentType: paymentType }));
  };

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

    const agentStatus = latestOrder.deliveryAgent?.status;
    const pickupVerified = agentStatus === 'pickup_completed' || agentStatus === 'location_reached' || agentStatus === 'delivery_completed';

    if (!pickupVerified) {
      toast.error('Pickup verification not completed. Please complete pickup first.');
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
    const isCOD = latestOrder.paymentMethod === 'COD' || !latestOrder.isPaid;
    
    if (isCOD) {
      if (!deliveryForm.codPaymentType) {
        toast.error('Please select payment method (QR Code or Cash)');
        return;
      }
    } else {
      if (!deliveryForm.otp.trim()) {
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

      // Add OTP for prepaid orders
      if (!isCOD) {
        requestBody.otp = deliveryForm.otp;
      } else {
        // For COD, include payment confirmation
        requestBody.codPayment = {
          method: deliveryForm.codPaymentType,
          collected: true
        };
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
        toast.success('Delivery completed successfully!');
        console.log('✅ [ASSIGNED-ORDERS] Delivery completed:', selectedOrder._id);
        
        // Reset form and close modal
        setDeliveryForm({ otp: '', deliveryNotes: '', codPaymentType: null, qrCode: null });
        setShowDeliveryModal(false);
        setSelectedOrder(null);
        // Refresh orders
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

  // Determine current order step aligned with backend deliveryAgent.status
  const getOrderStep = (order) => {
    const agentStatus = order.deliveryAgent?.status || order.deliveryStatus || 'assigned';
    const sellerReached = Boolean(order.pickup?.sellerLocationReachedAt);
    const deliveryReached = Boolean(order.delivery?.locationReachedAt) || agentStatus === 'location_reached';

    if (agentStatus === 'assigned' || agentStatus === 'unassigned') {
      return 'accept';
    }

    if (agentStatus === 'accepted') {
      return sellerReached ? 'pickup' : 'reached-seller';
    }

    if (agentStatus === 'pickup_completed') {
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
                          onClick={() => openSellerCheckpoint(order)}
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
                          📍 Reached Delivery Location
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

      {/* Reached Seller Location Confirmation Modal */}
      {showReachedSellerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📍 Confirm Seller Location</h2>
            <p className="text-sm text-gray-600 mb-4">
              Have you reached the seller location?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Seller: <strong>{selectedOrder?.seller?.name || selectedOrder?.seller?.shopName}</strong><br/>
              Address: {selectedOrder?.seller?.address || selectedOrder?.seller?.shop?.address}
            </p>
            
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowReachedSellerModal(false);
                  setSelectedOrder(null);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReachedSellerLocation(selectedOrder)}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Yes, I'm Here
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Reached Delivery Location Confirmation Modal */}
      {showReachedDeliveryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📍 Confirm Delivery Location</h2>
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
              const isCOD = selectedOrder.paymentMethod === 'COD' || !selectedOrder.isPaid;
              
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
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Method <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-2">
                          <button
                            onClick={() => handleCODPaymentType('qr')}
                            className={`w-full border-2 rounded-md p-3 text-left transition-colors ${
                              deliveryForm.codPaymentType === 'qr'
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-300 hover:border-orange-300'
                            }`}
                          >
                            <div className="flex items-center">
                              <input
                                type="radio"
                                checked={deliveryForm.codPaymentType === 'qr'}
                                onChange={() => handleCODPaymentType('qr')}
                                className="mr-2"
                              />
                              <span className="font-medium">Generate SMEPay QR Code</span>
                            </div>
                            {deliveryForm.codPaymentType === 'qr' && deliveryForm.qrCode && (
                              <div className="mt-2 p-2 bg-white rounded border">
                                <img src={deliveryForm.qrCode} alt="QR Code" className="w-32 h-32 mx-auto" />
                              </div>
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleCODPaymentType('cash')}
                            className={`w-full border-2 rounded-md p-3 text-left transition-colors ${
                              deliveryForm.codPaymentType === 'cash'
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-300 hover:border-orange-300'
                            }`}
                          >
                            <div className="flex items-center">
                              <input
                                type="radio"
                                checked={deliveryForm.codPaymentType === 'cash'}
                                onChange={() => handleCODPaymentType('cash')}
                                className="mr-2"
                              />
                              <span className="font-medium">Payment Collected in Cash</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  
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
                  setShowDeliveryModal(false);
                  setSelectedOrder(null);
                  setDeliveryForm({ otp: '', deliveryNotes: '', codPaymentType: null, qrCode: null });
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeliveryComplete}
                disabled={processingOrder === selectedOrder._id}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                {processingOrder === selectedOrder._id && actionType === 'delivery' ? 'Processing...' : 'Complete Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignedOrders;