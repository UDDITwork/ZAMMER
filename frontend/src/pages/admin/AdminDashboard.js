// frontend/src/pages/admin/AdminDashboard.js - COMPLETE Order Management Dashboard
// 🎯 ADDED: Complete order management with assignment functionality
// 🎯 ADDED: Real-time order updates and delivery agent assignment
// 🎯 ADDED: Order approval and tracking system

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import adminService from '../../services/adminService';
import socketService from '../../services/socketService';

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

  // 🔒 SECURITY: Get auth context and navigation
  const { adminAuth } = useAuth();
  const navigate = useNavigate();

  // 🔒 CRITICAL: Authentication protection - Check FIRST before anything else
  useEffect(() => {
    console.log('🔒 [ADMIN-DASHBOARD] Authentication check started...', {
      isAuthenticated: adminAuth.isAuthenticated,
      hasAdmin: !!adminAuth.admin,
      hasToken: !!adminAuth.token,
      adminName: adminAuth.admin?.name
    });

    if (!adminAuth.isAuthenticated || !adminAuth.admin || !adminAuth.token) {
      console.log('❌ [ADMIN-DASHBOARD] Unauthorized access detected! Redirecting to login...');
      toast.error('Please login to access admin dashboard');
      navigate('/admin/login', { replace: true });
      return;
    }

    console.log('✅ [ADMIN-DASHBOARD] Authentication verified for admin:', adminAuth.admin.name);
    setAuthCheckComplete(true);
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

  // 🎯 NEW: Setup socket connection for real-time order updates
  const setupSocketConnection = async () => {
    try {
      console.log('🔌 Setting up admin socket connection...');
      await socketService.connect();
      
      // Listen for new orders
      socketService.onNewOrder((data) => {
        console.log('📦 New order received:', data);
        toast.success(`New order received: ${data.data.orderNumber}`);
        fetchRecentOrders(); // Refresh orders
        fetchDashboardStats(); // Update stats
      });

      console.log('✅ Admin socket connection established');
    } catch (error) {
      console.error('❌ Socket connection failed:', error);
    }
  };

  // 🎯 NEW: Fetch recent orders needing approval
  const fetchRecentOrders = async () => {
    try {
      setOrdersLoading(true);
      console.log('📋 Fetching recent orders for admin approval...');
      
      // This would be a new endpoint - we'll need to add this to adminService
      const response = await adminService.getRecentOrders({
        status: 'pending',
        needsApproval: true,
        limit: 10
      });

      if (response.success) {
        setOrders(response.data);
        console.log('✅ Recent orders loaded:', response.data.length);
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

  // 🎯 NEW: Fetch available delivery agents
  const fetchDeliveryAgents = async () => {
    try {
      console.log('🚚 Fetching delivery agents...');
      
      const response = await adminService.getDeliveryAgents({
        status: 'available',
        isActive: true
      });

      if (response.success) {
        setDeliveryAgents(response.data);
        console.log('✅ Delivery agents loaded:', response.data.length);
      } else {
        throw new Error(response.message || 'Failed to fetch delivery agents');
      }
    } catch (error) {
      console.error('❌ Failed to fetch delivery agents:', error);
      toast.error('Failed to load delivery agents');
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
              ? { ...order, status: 'approved', assignedAgent: selectedAgent }
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

  // 🎯 NEW: Order Card Component
  const OrderCard = ({ order }) => (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => handleOrderClick(order)}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">Order #{order.orderNumber}</h3>
          <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          order.status === 'approved' ? 'bg-green-100 text-green-800' :
          order.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
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
      </div>

      <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors">
        View Details & Assign
      </button>
    </div>
  );

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
              <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {selectedOrder.orderItems?.map((item, index) => (
                  <div key={index} className="flex items-center p-4 border-b border-gray-200 last:border-b-0">
                    <img 
                      src={item.image || '/placeholder-product.jpg'} 
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="ml-4 flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      <p className="text-sm font-medium text-green-600">{formatCurrency(item.price)}</p>
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
                  <span>{formatCurrency(selectedOrder.totalPrice - selectedOrder.taxPrice - selectedOrder.shippingPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(selectedOrder.taxPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span>{formatCurrency(selectedOrder.shippingPrice)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedOrder.totalPrice)}</span>
                </div>
              </div>
            </div>

            {/* Agent Assignment */}
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
                    </option>
                  ))}
                </select>
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
          </div>
        </div>

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
            value={orders.filter(order => order.status === 'pending').length}
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
            <div className="flex items-center space-x-2">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </div>
        </div>
      </div>

      {/* 🎯 NEW: Order Details Modal */}
      {showOrderModal && <OrderModal />}
    </>
  );
};

export default AdminDashboard;