// frontend/src/pages/delivery/DeliveryDashboard.js - FIXED VERSION
// 🔧 FIXED: Removed service dependencies causing white screen
// 🔧 FIXED: Direct API calls to prevent infinite loops
// 🔧 FIXED: Proper error handling and loading states

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

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
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Form states
  const [pickupData, setPickupData] = useState({ orderId: '', notes: '' });
  const [deliveryData, setDeliveryData] = useState({ orderId: '', otp: '', notes: '' });
  
  // Processing states
  const [accepting, setAccepting] = useState(false);
  const [processingPickup, setProcessingPickup] = useState(false);
  const [processingDelivery, setProcessingDelivery] = useState(false);
  const [processingReject, setProcessingReject] = useState(false);
  
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
        fetchAssignedOrders()
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
    if (!order.delivery?.isCompleted) return 'delivery';
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
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">
              Order #{order.orderNumber || order._id?.slice(-6)}
            </h3>
            <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <Link to="/delivery/orders/assigned" className="text-sm text-blue-600 hover:text-blue-800">
                View All →
              </Link>
            </div>
            <div className="p-6">
              {assignedOrders.length > 0 ? (
                <div className="space-y-4">
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
    </div>
  );
};

export default DeliveryDashboard;