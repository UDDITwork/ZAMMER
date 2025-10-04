// frontend/src/pages/admin/AdminDashboard.js
// Complete admin dashboard with order management and real-time updates

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import adminService from '../../services/adminService';
import socketService from '../../services/socketService';
import returnService from '../../services/returnService';
import { checkAdminAuth, fixAdminAuth } from '../../utils/adminAuthFix';
import LogViewer from '../../components/admin/LogViewer';
import frontendLogger from '../../services/loggingService';
import { RotateCcw, Clock, User, Package, CheckCircle, AlertCircle } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  
  // 🎯 NEW: Order management state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [deliveryAgents, setDeliveryAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [assigning, setAssigning] = useState(false);
  
  // 🎯 NEW: Bulk assignment state
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSelectedAgent, setBulkSelectedAgent] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkNotes, setBulkNotes] = useState('');
  
  // 🎯 NEW: Tab management
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // 🎯 NEW: Return management state
  const [returnOrders, setReturnOrders] = useState([]);
  const [returnOrdersLoading, setReturnOrdersLoading] = useState(false);
  const [selectedReturnOrder, setSelectedReturnOrder] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnFilter, setReturnFilter] = useState('all'); // all, requested, approved, etc.

  // 🔒 SECURITY: Get auth context and navigation
  const { adminAuth } = useAuth();
  const navigate = useNavigate();

  // 🔒 CRITICAL: Authentication protection with auto-fix capability
  useEffect(() => {
    const handleAuthCheck = async () => {
      // Initialize frontend logging for admin
      if (adminAuth.admin) {
        frontendLogger.setUser(adminAuth.admin._id, 'admin');
        frontendLogger.logEvent('ADMIN_DASHBOARD_ACCESS', {
          adminId: adminAuth.admin._id,
          adminName: adminAuth.admin.name,
          adminEmail: adminAuth.admin.email
        }, 'info');
      }

      console.log('🔒 [ADMIN-DASHBOARD] Authentication check started...', {
        isAuthenticated: adminAuth.isAuthenticated,
        hasAdmin: !!adminAuth.admin,
        hasToken: !!adminAuth.token,
        adminName: adminAuth.admin?.name
      });

      // Check if AuthContext has valid authentication
      if (adminAuth.isAuthenticated && adminAuth.admin && adminAuth.token) {
        console.log('✅ [ADMIN-DASHBOARD] Authentication verified for admin:', adminAuth.admin.name);
        setAuthCheckComplete(true);
        return;
      }

      // If AuthContext doesn't have auth, check localStorage directly
      console.log('⚠️ [ADMIN-DASHBOARD] AuthContext missing auth, checking localStorage...');
      const authCheck = checkAdminAuth();
      
      if (authCheck.isValid) {
        console.log('✅ [ADMIN-DASHBOARD] Valid auth found in localStorage, AuthContext will sync');
        setAuthCheckComplete(true);
        return;
      }

      // Try to auto-fix authentication
      console.log('🔧 [ADMIN-DASHBOARD] Attempting to auto-fix authentication...');
      const fixResult = await fixAdminAuth();
      
      if (fixResult.success) {
        console.log('✅ [ADMIN-DASHBOARD] Authentication auto-fixed successfully');
        toast.success('Admin authentication restored');
        setAuthCheckComplete(true);
        return;
      }

      // If all else fails, redirect to login
      console.log('❌ [ADMIN-DASHBOARD] Authentication failed, redirecting to login...');
      toast.error('Please login to access admin dashboard');
      navigate('/admin/login', { replace: true });
    };

    handleAuthCheck();
  }, [adminAuth.isAuthenticated, adminAuth.admin, adminAuth.token, navigate]);

  // 🔒 ONLY fetch data AFTER authentication is verified
  useEffect(() => {
    if (authCheckComplete && adminAuth.isAuthenticated) {
      fetchDashboardStats();
      fetchRecentOrders();
      fetchDeliveryAgents();
      setupSocketConnection();
    }
  }, [authCheckComplete, adminAuth.isAuthenticated]);

  // 🎯 NEW: Fetch return orders when returns tab is active
  useEffect(() => {
    if (activeTab === 'returns' && adminAuth.isAuthenticated) {
      fetchReturnOrders(returnFilter === 'all' ? null : returnFilter);
    }
  }, [activeTab, adminAuth.isAuthenticated]);

  // 🎯 NEW: Setup socket connection for real-time order updates
  const setupSocketConnection = async () => {
    try {
      console.log('🔌 Setting up admin socket connection...');
      
      // Connect to socket server
      await socketService.connect();
      console.log('✅ Socket connection established');
      
      // 🎯 NEW: Join admin room for notifications
      if (adminAuth.admin?._id) {
        const joinSuccess = socketService.joinAdminRoom(adminAuth.admin._id);
        if (joinSuccess) {
          console.log('✅ Admin room joined:', adminAuth.admin._id);
        } else {
          console.warn('⚠️ Failed to join admin room');
        }
      } else {
        console.warn('⚠️ No admin ID available for room joining');
      }
      
      // 🎯 ENHANCED: Listen for admin notifications with comprehensive order data
      socketService.onAdminNotification((data) => {
        console.log('🔧 Admin notification received:', data);
        
        try {
          if (data.data?.orderNumber) {
            const eventType = data.message?.includes('payment') ? 'payment-completed' : 'new-order';
            const orderData = data.data;
            
            // Enhanced notification message with order details
            const notificationMessage = eventType === 'payment-completed' 
              ? `Payment completed for order: ${orderData.orderNumber} (₹${orderData.totalPrice})`
              : `New order received: ${orderData.orderNumber} from ${orderData.user?.name} (₹${orderData.totalPrice})`;
            
            toast.success(notificationMessage, {
              autoClose: 5000,
              position: "top-right"
            });
            
            // Log comprehensive order details
            console.log('📦 Order notification details:', {
              orderNumber: orderData.orderNumber,
              customer: orderData.user?.name,
              seller: orderData.seller?.firstName,
              totalPrice: orderData.totalPrice,
              itemCount: orderData.orderItems?.length,
              paymentStatus: orderData.isPaid ? 'Paid' : 'Pending',
              eventType
            });
            
            // Refresh data based on notification type
            if (eventType === 'payment-completed') {
              console.log('🔄 Refreshing data due to payment completion');
              fetchRecentOrders(); // Refresh orders
              fetchDashboardStats(); // Update stats
            } else if (eventType === 'new-order') {
              console.log('🔄 Refreshing data due to new order');
              fetchRecentOrders(); // Refresh orders
              fetchDashboardStats(); // Update stats
            }
          }
        } catch (error) {
          console.error('❌ Error handling admin notification:', error);
        }
      });

      // 🎯 NEW: Add fallback listener for new orders (legacy support)
      socketService.onNewOrder((data) => {
        console.log('📦 Legacy new order notification received:', data);
        toast.success(`New order received: ${data.data?.orderNumber || 'Unknown'}`);
        fetchRecentOrders();
        fetchDashboardStats();
      });

      console.log('✅ Admin socket connection and listeners established');
    } catch (error) {
      console.error('❌ Socket connection failed:', error);
      toast.error('Real-time notifications unavailable');
    }
  };

  // 🎯 ENHANCED: Fetch recent orders needing approval with comprehensive data
  const fetchRecentOrders = async () => {
    try {
      setOrdersLoading(true);
      console.log('📋 Fetching recent orders for admin approval...');
      
      const response = await adminService.getRecentOrders({
        // 🎯 FIXED: Remove status filter to show ALL orders needing admin attention
        // This will show both Pending (unpaid) and Processing (paid) orders
        limit: 20 // Increased limit to show more orders
      });

      if (response.success) {
        setOrders(response.data);
        console.log('✅ Recent orders loaded:', response.data.length);
        console.log('📦 Order details:', response.data.map(order => ({
          orderNumber: order.orderNumber,
          customer: order.user?.name,
          seller: order.seller?.firstName,
          totalPrice: order.totalPrice,
          itemCount: order.orderItems?.length,
          paymentStatus: order.isPaid ? 'Paid' : 'Pending'
        })));
      } else {
        throw new Error(response.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('❌ Failed to fetch orders:', error);
      toast.error('Failed to load recent orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  // 🎯 ENHANCED: Fetch available delivery agents with capacity information
  const fetchDeliveryAgents = async () => {
    try {
      console.log('🚚 Fetching available delivery agents with capacity...');
      
      const response = await adminService.getAvailableDeliveryAgents({
        isActive: true
      });

      if (response.success) {
        setDeliveryAgents(response.data.agents || []);
        console.log('✅ Available delivery agents loaded:', {
          totalAgents: response.data.agents?.length || 0,
          capacityInfo: response.data.capacity,
          availableAgents: response.data.agents?.filter(agent => agent.capacity?.isAvailable).length || 0
        });
      } else {
        throw new Error(response.message || 'Failed to fetch delivery agents');
      }
    } catch (error) {
      console.error('❌ Failed to fetch delivery agents:', error);
      toast.error('Failed to load delivery agents');
    }
  };

  // 🎯 NEW: Return management functions
  const fetchReturnOrders = async (status = null) => {
    setReturnOrdersLoading(true);
    try {
      const response = await returnService.getReturnOrders(status);
      if (response.success) {
        setReturnOrders(response.data);
        frontendLogger.logEvent('ADMIN_FETCHED_RETURNS', {
          returnCount: response.data.length,
          filter: status,
          adminId: adminAuth.admin._id
        });
      } else {
        throw new Error(response.message || 'Failed to fetch return orders');
      }
    } catch (error) {
      console.error('Error fetching return orders:', error);
      frontendLogger.logEvent('ADMIN_FETCH_RETURNS_ERROR', {
        error: error.message,
        adminId: adminAuth.admin._id
      });
      toast.error('Failed to fetch return orders');
    } finally {
      setReturnOrdersLoading(false);
    }
  };

  const handleAssignReturnAgent = async (returnId, agentId) => {
    try {
      const response = await returnService.assignReturnAgent(returnId, agentId);
      if (response.success) {
        toast.success('Return assigned to delivery agent successfully');
        fetchReturnOrders(returnFilter === 'all' ? null : returnFilter);
        frontendLogger.logEvent('ADMIN_ASSIGNED_RETURN_AGENT', {
          returnId,
          agentId,
          adminId: adminAuth.admin._id
        });
      } else {
        throw new Error(response.message || 'Failed to assign return agent');
      }
    } catch (error) {
      console.error('Error assigning return agent:', error);
      toast.error(error.message || 'Failed to assign return agent');
    }
  };

  const handleCompleteReturn = async (returnId) => {
    try {
      const response = await returnService.completeReturn(returnId);
      if (response.success) {
        toast.success('Return process completed successfully');
        fetchReturnOrders(returnFilter === 'all' ? null : returnFilter);
        frontendLogger.logEvent('ADMIN_COMPLETED_RETURN', {
          returnId,
          adminId: adminAuth.admin._id
        });
      } else {
        throw new Error(response.message || 'Failed to complete return');
      }
    } catch (error) {
      console.error('Error completing return:', error);
      toast.error(error.message || 'Failed to complete return');
    }
  };

  const getReturnStatusColor = (status) => {
    switch (status) {
      case 'requested':
        return 'text-blue-600 bg-blue-100';
      case 'approved':
        return 'text-purple-600 bg-purple-100';
      case 'assigned':
        return 'text-orange-600 bg-orange-100';
      case 'accepted':
        return 'text-green-600 bg-green-100';
      case 'picked_up':
        return 'text-blue-600 bg-blue-100';
      case 'pickup_failed':
        return 'text-red-600 bg-red-100';
      case 'returned_to_seller':
        return 'text-purple-600 bg-purple-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getReturnStatusIcon = (status) => {
    switch (status) {
      case 'requested':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'assigned':
        return <User className="w-4 h-4" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'picked_up':
        return <Package className="w-4 h-4" />;
      case 'pickup_failed':
        return <AlertCircle className="w-4 h-4" />;
      case 'returned_to_seller':
        return <Package className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      console.log('📊 [ADMIN-DASHBOARD] Fetching dashboard statistics for admin:', adminAuth.admin.name);
      
      const response = await adminService.getDashboardStats();
      
      if (response.success) {
        setStats(response.data);
        console.log('✅ [ADMIN-DASHBOARD] Dashboard stats loaded:', response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch dashboard stats');
      }
    } catch (error) {
      console.error('❌ [ADMIN-DASHBOARD] Dashboard stats error:', error);
      
      if (error.response?.status === 401) {
        console.log('🔒 [ADMIN-DASHBOARD] Authentication expired, redirecting to login...');
        toast.error('Session expired. Please login again.');
        navigate('/admin/login', { replace: true });
        return;
      }
      
      setError(error.message || 'Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // 🎯 NEW: Handle order selection and modal opening
  const handleOrderClick = (order) => {
    console.log('🔍 Opening order details:', order.orderNumber);
    setSelectedOrder(order);
    setShowOrderModal(true);
    setSelectedAgent(''); // Reset agent selection
  };

  // 🎯 NEW: Handle order approval and agent assignment
  const handleOrderApproval = async () => {
    if (!selectedOrder || !selectedAgent) {
      toast.error('Please select a delivery agent');
      return;
    }

    try {
      setAssigning(true);
      console.log('✅ Approving order and assigning to agent:', {
        orderId: selectedOrder._id,
        agentId: selectedAgent
      });

      const response = await adminService.approveAndAssignOrder({
        orderId: selectedOrder._id,
        deliveryAgentId: selectedAgent
      });

      if (response.success) {
        toast.success(`Order ${selectedOrder.orderNumber} approved and assigned!`);
        
        // Update order status locally
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === selectedOrder._id 
              ? { ...order, status: 'Pickup_Ready', assignedAgent: selectedAgent }
              : order
          )
        );

        // Close modal
        setShowOrderModal(false);
        setSelectedOrder(null);
        setSelectedAgent('');

        // Refresh data
        fetchRecentOrders();
        fetchDashboardStats();

        console.log('✅ Order approval and assignment completed');
      } else {
        throw new Error(response.message || 'Failed to approve order');
      }
    } catch (error) {
      console.error('❌ Order approval failed:', error);
      toast.error(error.message || 'Failed to approve and assign order');
    } finally {
      setAssigning(false);
    }
  };

  // 🎯 NEW: Handle bulk order assignment
  const handleBulkAssignment = async () => {
    if (!bulkSelectedAgent) {
      toast.error('Please select a delivery agent');
      return;
    }

    if (selectedOrders.length === 0) {
      toast.error('Please select at least one order');
      return;
    }

    try {
      setBulkAssigning(true);
      console.log('📦 Bulk assigning orders:', {
        orderIds: selectedOrders.map(order => order._id),
        agentId: bulkSelectedAgent,
        count: selectedOrders.length
      });

      const response = await adminService.bulkAssignOrders({
        orderIds: selectedOrders.map(order => order._id),
        deliveryAgentId: bulkSelectedAgent,
        notes: bulkNotes
      });

      if (response.success) {
        const { summary } = response.data;
        toast.success(`Bulk assignment completed! ${summary.successfullyAssigned} orders assigned successfully`);
        
        if (summary.failed > 0) {
          toast.warning(`${summary.failed} orders failed to assign`);
        }

        // Update order status locally
        setOrders(prevOrders => 
          prevOrders.map(order => {
            const assignedOrder = response.data.assignedOrders.find(ao => ao.orderId === order._id);
            if (assignedOrder) {
              return { ...order, status: 'Pickup_Ready', assignedAgent: bulkSelectedAgent };
            }
            return order;
          })
        );

        // Close modal and reset state
        setShowBulkModal(false);
        setSelectedOrders([]);
        setBulkSelectedAgent('');
        setBulkNotes('');

        // Refresh data
        fetchRecentOrders();
        fetchDashboardStats();
      } else {
        throw new Error(response.message || 'Failed to perform bulk assignment');
      }
    } catch (error) {
      console.error('❌ Bulk assignment error:', error);
      toast.error(error.message || 'Failed to perform bulk assignment');
    } finally {
      setBulkAssigning(false);
    }
  };

  // 🎯 NEW: Handle order selection for bulk assignment
  const handleOrderSelection = (order, isSelected) => {
    if (isSelected) {
      setSelectedOrders(prev => [...prev, order]);
    } else {
      setSelectedOrders(prev => prev.filter(o => o._id !== order._id));
    }
  };

  // 🎯 NEW: Handle select all orders
  const handleSelectAllOrders = () => {
    const assignableOrders = orders.filter(order => 
      ['Pending', 'Processing'].includes(order.status) && 
      !order.deliveryAgent?.agent
    );
    
    if (selectedOrders.length === assignableOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(assignableOrders);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const StatCard = ({ title, value, icon, color, link }) => (
    <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
              {icon}
            </div>
          </div>
          <div className="ml-4 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 truncate">
                  {title}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {value}
                </p>
              </div>
              {link && (
                <Link
                  to={link}
                  className="text-sm text-orange-600 hover:text-orange-500 font-medium"
                >
                  View All →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 🎯 ENHANCED: Order Card Component with comprehensive order details
  const OrderCard = ({ order }) => {
    const isAssignable = ['Pending', 'Processing'].includes(order.status) && !order.deliveryAgent?.agent;
    const isSelected = selectedOrders.some(selected => selected._id === order._id);
    
    return (
      <div 
        className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
          isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
        }`}
      >
        {/* 🎯 NEW: Bulk Selection Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {isAssignable && (
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
              <h3 className="font-semibold text-gray-900">Order #{order.orderNumber}</h3>
              <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
            </div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
            order.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
            order.status === 'Pickup_Ready' ? 'bg-orange-100 text-orange-800' :
            order.status === 'Out_for_Delivery' ? 'bg-indigo-100 text-indigo-800' :
            order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
            order.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {order.status?.toUpperCase()}
          </span>
        </div>
      
      <div className="space-y-2 mb-3">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Buyer:</span>
          <span className="text-sm font-medium">{order.user?.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Seller:</span>
          <span className="text-sm font-medium">{order.seller?.firstName} {order.seller?.lastName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Shop:</span>
          <span className="text-sm font-medium">{order.seller?.shop?.name || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Items:</span>
          <span className="text-sm font-medium">{order.orderItems?.length || 0} products</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Amount:</span>
          <span className="text-sm font-bold text-green-600">{formatCurrency(order.totalPrice)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Payment:</span>
          <span className={`text-sm font-medium ${
            order.isPaid ? 'text-green-600' : 'text-red-600'
          }`}>
            {order.isPaid ? '✅ Paid' : '❌ Pending'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Payment ID:</span>
          <span className="text-sm font-mono text-gray-500">
            {order.paymentDetails?.transactionId || order.paymentDetails?.paymentId || 'N/A'}
          </span>
        </div>
      </div>

      {/* 🎯 NEW: Product preview */}
      {order.orderItems && order.orderItems.length > 0 && (
        <div className="mb-3 p-2 bg-gray-50 rounded-md">
          <p className="text-xs text-gray-600 mb-1">Products:</p>
          <div className="flex flex-wrap gap-1">
            {order.orderItems.slice(0, 3).map((item, index) => (
              <span key={index} className="text-xs bg-white px-2 py-1 rounded border">
                {item.name} ({item.quantity})
              </span>
            ))}
            {order.orderItems.length > 3 && (
              <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                +{order.orderItems.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      <button 
        onClick={(e) => {
          e.stopPropagation();
          handleOrderClick(order);
        }}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
      >
        View Details & Assign
      </button>
    </div>
    );
  };

  // 🎯 NEW: Order Details Modal
  const OrderModal = () => {
    if (!selectedOrder) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Order Details - #{selectedOrder.orderNumber}
              </h2>
              <button
                onClick={() => setShowOrderModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Order Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Buyer Details */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-3">Buyer Details</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Name:</span> {selectedOrder.user?.name}</p>
                  <p><span className="font-medium">Email:</span> {selectedOrder.user?.email}</p>
                  <p><span className="font-medium">Phone:</span> {selectedOrder.user?.mobileNumber}</p>
                  <p><span className="font-medium">Address:</span> {selectedOrder.shippingAddress?.address}, {selectedOrder.shippingAddress?.city}</p>
                </div>
              </div>

              {/* Seller Details */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-3">Seller Details</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Name:</span> {selectedOrder.seller?.firstName} {selectedOrder.seller?.lastName}</p>
                  <p><span className="font-medium">Email:</span> {selectedOrder.seller?.email}</p>
                  <p><span className="font-medium">Shop:</span> {selectedOrder.seller?.shop?.name}</p>
                  <p><span className="font-medium">Address:</span> {selectedOrder.seller?.shop?.address}</p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Order Items ({selectedOrder.orderItems?.length || 0})</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {selectedOrder.orderItems?.map((item, index) => (
                  <div key={index} className="flex items-center p-4 border-b border-gray-200 last:border-b-0">
                    <img 
                      src={item.image || item.product?.images?.[0] || '/placeholder-product.jpg'} 
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="ml-4 flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                        <span>Qty: {item.quantity}</span>
                        {item.size && <span>Size: {item.size}</span>}
                        {item.color && <span>Color: {item.color}</span>}
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-sm font-medium text-green-600">
                          {formatCurrency(item.price)} each
                        </p>
                        <p className="text-sm font-bold text-gray-900">
                          Total: {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedOrder.totalPrice - (selectedOrder.taxPrice || 0) - (selectedOrder.shippingPrice || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(selectedOrder.taxPrice || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span>{formatCurrency(selectedOrder.shippingPrice || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedOrder.totalPrice)}</span>
                </div>
              </div>
            </div>

            {/* 🎯 NEW: Payment Details */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-blue-900 mb-3">Payment Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-blue-700">Payment Method:</span>
                  <span className="font-medium">{selectedOrder.paymentMethod || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Payment Status:</span>
                  <span className={`font-medium ${
                    selectedOrder.isPaid ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {selectedOrder.isPaid ? '✅ Paid' : '❌ Pending'}
                  </span>
                </div>
                {selectedOrder.paymentDetails?.transactionId && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">Transaction ID:</span>
                    <span className="font-mono text-sm">{selectedOrder.paymentDetails.transactionId}</span>
                  </div>
                )}
                {selectedOrder.paymentDetails?.paymentId && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">Payment ID:</span>
                    <span className="font-mono text-sm">{selectedOrder.paymentDetails.paymentId}</span>
                  </div>
                )}
                {selectedOrder.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">Paid At:</span>
                    <span className="text-sm">{formatDate(selectedOrder.paidAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 🔧 ENHANCED: Agent Assignment with Capacity Information */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Assign Delivery Agent</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Delivery Agent
                </label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Choose an agent...</option>
                  {deliveryAgents.map((agent) => (
                    <option key={agent._id} value={agent._id}>
                      {agent.name} - {agent.vehicleType} ({agent.area || 'All areas'})
                      {agent.capacity ? ` - ${agent.capacity.current}/${agent.capacity.max} orders` : ''}
                      {agent.capacity?.isAvailable ? ' ✅' : ' ❌'}
                    </option>
                  ))}
                </select>
                {deliveryAgents.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    💡 Only showing agents with available capacity for new orders
                  </div>
                )}
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-md font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOrderApproval}
                  disabled={!selectedAgent || assigning}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-md font-medium transition-colors"
                >
                  {assigning ? 'Assigning...' : 'Approve & Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 🎯 NEW: Bulk Assignment Modal
  const BulkAssignmentModal = () => {
    if (!showBulkModal) return null;

    const assignableOrders = orders.filter(order => 
      ['Pending', 'Processing'].includes(order.status) && 
      !order.deliveryAgent?.agent
    );

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Bulk Assign Orders</h2>
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setSelectedOrders([]);
                  setBulkSelectedAgent('');
                  setBulkNotes('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Order Selection Summary */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Selected Orders</h3>
                <button
                  onClick={handleSelectAllOrders}
                  className="text-sm text-orange-600 hover:text-orange-500 font-medium"
                >
                  {selectedOrders.length === assignableOrders.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <p className="text-sm text-gray-600">
                {selectedOrders.length} of {assignableOrders.length} assignable orders selected
              </p>
              {selectedOrders.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {selectedOrders.map(order => (
                      <span key={order._id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        #{order.orderNumber}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 🔧 ENHANCED: Delivery Agent Selection with Capacity Information */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Delivery Agent *
              </label>
              <select
                value={bulkSelectedAgent}
                onChange={(e) => setBulkSelectedAgent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              >
                <option value="">Choose a delivery agent...</option>
                {deliveryAgents.map(agent => (
                  <option key={agent._id} value={agent._id}>
                    {agent.name} - {agent.mobileNumber || agent.phone} 
                    {agent.capacity ? ` (${agent.capacity.current}/${agent.capacity.max} orders)` : ''}
                    {agent.capacity?.isAvailable ? ' ✅ Available' : ' ❌ At Capacity'}
                  </option>
                ))}
              </select>
              {deliveryAgents.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  💡 Showing agents with available capacity for new orders
                </div>
              )}
            </div>

            {/* Optional Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder="Add any special instructions or notes for the delivery agent..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setSelectedOrders([]);
                  setBulkSelectedAgent('');
                  setBulkNotes('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssignment}
                disabled={!bulkSelectedAgent || selectedOrders.length === 0 || bulkAssigning}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
              >
                {bulkAssigning ? 'Assigning...' : `Assign ${selectedOrders.length} Orders`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading and error states remain the same as before...
  if (!authCheckComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!adminAuth.isAuthenticated || !adminAuth.admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">You need admin privileges to access this page</p>
          <button
            onClick={() => navigate('/admin/login')}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardStats}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Header with Welcome Message */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">
              Welcome back, <span className="font-medium text-orange-600">{adminAuth.admin?.name}</span>! 
              Here's your Zammer platform overview.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600">System Active</span>
            </div>
            <button
              onClick={fetchRecentOrders}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Refresh Orders
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              View Logs
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('returns')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'returns'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Returns
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'logs'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              System Logs
            </button>
          </nav>
        </div>

        {/* Dashboard Content */}
        {activeTab === 'dashboard' && (
          <>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Sellers"
            value={stats?.overview?.totalSellers || 0}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            color="bg-blue-500"
            link="/admin/sellers"
          />
          
          <StatCard
            title="Total Users"
            value={stats?.overview?.totalUsers || 0}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            }
            color="bg-green-500"
            link="/admin/users"
          />
          
          <StatCard
            title="Pending Orders"
            value={orders.filter(order => ['Pending', 'Processing'].includes(order.status)).length}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            }
            color="bg-orange-500"
          />
          
          <StatCard
            title="Active Agents"
            value={deliveryAgents.filter(agent => agent.isActive).length}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="bg-emerald-500"
          />
        </div>

        {/* 🎯 NEW: Recent Orders Section - Main Feature */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Recent Orders Needing Approval</h2>
            <div className="flex items-center space-x-4">
              {/* 🎯 NEW: Bulk Assignment Button */}
              {orders.length > 0 && (
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Bulk Assign Orders
                </button>
              )}
              <span className="text-sm text-gray-500">
                {orders.length} orders pending
              </span>
              {ordersLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
              )}
            </div>
          </div>
          
          <div className="p-6">
            {ordersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <span className="ml-2 text-gray-600">Loading orders...</span>
              </div>
            ) : orders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orders.map((order) => (
                  <OrderCard key={order._id} order={order} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Pending</h3>
                <p className="text-gray-600">All recent orders have been processed</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions - keeping existing functionality */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/admin/sellers"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">View Registered Sellers</h3>
                  <p className="text-sm text-gray-500">Manage all seller accounts and shops</p>
                </div>
              </Link>

              <Link
                to="/admin/delivery-agents"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">Manage Delivery Agents</h3>
                  <p className="text-sm text-gray-500">View and manage delivery personnel</p>
                </div>
              </Link>

              <Link
                to="/admin/payouts"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">Vendor Payouts</h3>
                  <p className="text-sm text-gray-500">Manage seller payouts and Cashfree integration</p>
                </div>
              </Link>

              <button
                onClick={() => setActiveTab('logs')}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left w-full"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">System Logs</h3>
                  <p className="text-sm text-gray-500">Monitor system operations and events in real-time</p>
                </div>
              </button>
            </div>
          </div>
        </div>
          </>
        )}

        {/* 🎯 NEW: Returns Management Tab */}
        {activeTab === 'returns' && (
          <div className="mt-8">
            {/* Return Management Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Return Management</h2>
              <p className="text-gray-600">Manage order returns and track return process status</p>
            </div>

            {/* Return Filters */}
            <div className="mb-6 flex flex-wrap gap-4">
              <select
                value={returnFilter}
                onChange={(e) => {
                  setReturnFilter(e.target.value);
                  fetchReturnOrders(e.target.value === 'all' ? null : e.target.value);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">All Returns</option>
                <option value="requested">Requested</option>
                <option value="approved">Approved</option>
                <option value="assigned">Assigned</option>
                <option value="accepted">Accepted</option>
                <option value="picked_up">Picked Up</option>
                <option value="pickup_failed">Pickup Failed</option>
                <option value="returned_to_seller">Returned to Seller</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
              <button
                onClick={() => fetchReturnOrders(returnFilter === 'all' ? null : returnFilter)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                Refresh Returns
              </button>
            </div>

            {/* Returns List */}
            <div className="bg-white rounded-lg shadow">
              {returnOrdersLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading returns...</p>
                </div>
              ) : returnOrders.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No returns found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reason
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Agent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {returnOrders.map((returnOrder) => (
                        <tr key={returnOrder._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {returnOrder.orderNumber}
                              </div>
                              <div className="text-sm text-gray-500">
                                {returnOrder.returnDetails.returnRequestedAt && 
                                  new Date(returnOrder.returnDetails.returnRequestedAt).toLocaleDateString()
                                }
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{returnOrder.user?.name}</div>
                            <div className="text-sm text-gray-500">{returnOrder.user?.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate">
                              {returnOrder.returnDetails.returnReason}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getReturnStatusColor(returnOrder.returnDetails.returnStatus)}`}>
                              {getReturnStatusIcon(returnOrder.returnDetails.returnStatus)}
                              {returnOrder.returnDetails.returnStatus.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {returnOrder.returnDetails.returnAssignment.deliveryAgent ? (
                              <div className="text-sm text-gray-900">
                                {returnOrder.returnDetails.returnAssignment.deliveryAgent.name}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">Not assigned</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              {returnOrder.returnDetails.returnStatus === 'requested' && (
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAssignReturnAgent(returnOrder._id, e.target.value);
                                      e.target.value = '';
                                    }
                                  }}
                                  className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                                >
                                  <option value="">Assign Agent</option>
                                  {deliveryAgents
                                    .filter(agent => agent.capacity?.isAvailable)
                                    .map(agent => (
                                      <option key={agent._id} value={agent._id}>
                                        {agent.name}
                                      </option>
                                    ))}
                                </select>
                              )}
                              {returnOrder.returnDetails.returnStatus === 'returned_to_seller' && (
                                <button
                                  onClick={() => handleCompleteReturn(returnOrder._id)}
                                  className="text-green-600 hover:text-green-900 text-xs"
                                >
                                  Complete Return
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 🎯 NEW: Log Viewer Tab */}
        {activeTab === 'logs' && (
          <div className="mt-8">
            <LogViewer />
          </div>
        )}
      </div>

      {/* 🎯 NEW: Order Details Modal */}
      {showOrderModal && <OrderModal />}
      
      {/* 🎯 NEW: Bulk Assignment Modal */}
      <BulkAssignmentModal />
    </>
  );
};

export default AdminDashboard;