import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import { AuthContext } from '../../contexts/AuthContext';
import orderService from '../../services/orderService';
import socketService from '../../services/socketService';
import returnService from '../../services/returnService';
import ReturnRequestModal from '../../components/return/ReturnRequestModal';

const MyOrdersPage = () => {
  const { userAuth } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [socketConnected, setSocketConnected] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnOrder, setReturnOrder] = useState(null);
  const [returnEligibility, setReturnEligibility] = useState({});
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    count: 0
  });

  // Order status tabs for buyers
  const statusTabs = [
    { key: 'All', label: 'All Orders', icon: '📦', color: 'gray' },
    { key: 'Pending', label: 'Pending', icon: '⏳', color: 'yellow' },
    { key: 'Processing', label: 'Processing', icon: '🔄', color: 'blue' },
    { key: 'Shipped', label: 'Shipped', icon: '🚚', color: 'purple' },
    { key: 'Delivered', label: 'Delivered', icon: '✅', color: 'green' },
    { key: 'Cancelled', label: 'Cancelled', icon: '❌', color: 'red' }
  ];

  // 🎯 NEW: Cancellation reasons
  const cancellationReasons = [
    'Changed my mind',
    'Found a better price elsewhere',
    'Ordered by mistake',
    'Delivery taking too long',
    'Product no longer needed',
    'Financial reasons',
    'Other'
  ];

  // Setup Socket.io connection and listeners
  useEffect(() => {
    if (userAuth?.user?._id) {
      console.log('🔌 Setting up socket connection for buyer:', userAuth.user._id);
      
      // Connect to socket
      const socket = socketService.connect();
      
      if (socket) {
        // Join buyer room
        socketService.joinBuyerRoom(userAuth.user._id);
        
        // Listen for order status updates
        socketService.onOrderUpdate((data) => {
          console.log('🔄 Order status update received via socket:', data);
          
          toast.info(
            <div className="flex items-center">
              <span className="text-2xl mr-2">{getStatusEmoji(data.data.status)}</span>
              <div>
                <p className="font-medium">Order Update</p>
                <p className="text-sm">Order #{data.data.orderNumber} is now {data.data.status}</p>
              </div>
            </div>,
            {
              position: "top-right",
              autoClose: 5000,
              onClick: () => {
                setSelectedOrder(data.data);
                setShowOrderDetails(true);
              }
            }
          );
          
          // Refresh orders
          fetchOrders();
        });

        // 🎯 NEW: Listen for order cancellation confirmations
        socketService.socket?.on('order-cancelled', (data) => {
          console.log('❌ Order cancellation confirmed:', data);
          toast.success(`Order ${data.orderNumber} cancelled successfully`);
          fetchOrders();
          setShowCancelModal(false);
          setCancellingOrder(null);
        });

        // Check connection status
        const checkConnection = () => {
          const status = socketService.getConnectionStatus();
          setSocketConnected(status.isConnected);
        };

        const connectionInterval = setInterval(checkConnection, 5000);
        checkConnection();

        // Cleanup
        return () => {
          clearInterval(connectionInterval);
          socketService.removeListener('order-status-update');
          socketService.socket?.off('order-cancelled');
        };
      }
    }
  }, [userAuth?.user?._id]);

  // Fetch orders
  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      const response = await orderService.getUserOrders(page, 10);
      
      if (response.success) {
        const ordersData = response.data || [];
        setOrders(ordersData);
        setPagination({
          currentPage: response.currentPage || 1,
          totalPages: response.totalPages || 1,
          count: response.count || 0
        });
        console.log('✅ Orders fetched successfully:', ordersData.length);
        
        // Check return eligibility for delivered orders
        checkReturnEligibilityForOrders(ordersData);
      } else {
        console.error('❌ Failed to fetch orders:', response.message);
        
        if (response.requiresAuth) {
          toast.error('Please login to view your orders');
          navigate('/user/login');
          return;
        }
        
        toast.error(response.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      toast.error('Error fetching orders');
    } finally {
      setLoading(false);
    }
  };

  // Check return eligibility for orders
  const checkReturnEligibilityForOrders = async (ordersList) => {
    const eligibilityMap = {};
    
    for (const order of ordersList) {
      if (order.status === 'Delivered' && order.isDelivered) {
        try {
          const eligibility = returnService.canRequestReturn(order);
          eligibilityMap[order._id] = eligibility;
        } catch (error) {
          console.error(`Error checking return eligibility for order ${order._id}:`, error);
          eligibilityMap[order._id] = { canRequest: false, reason: 'Unable to check eligibility' };
        }
      }
    }
    
    setReturnEligibility(eligibilityMap);
  };

  // Check return eligibility for a specific order
  const checkReturnEligibility = async (orderId) => {
    try {
      const response = await returnService.checkReturnEligibility(orderId);
      if (response.success) {
        setReturnEligibility(prev => ({
          ...prev,
          [orderId]: response.data
        }));
        return response.data;
      }
    } catch (error) {
      console.error('Error checking return eligibility:', error);
      return null;
    }
  };

  // Handle return button click
  const handleReturnClick = async (order) => {
    if (!order) return;
    
    // Check eligibility first
    const eligibility = await checkReturnEligibility(order._id);
    
    if (!eligibility || !eligibility.eligible) {
      toast.error(eligibility?.reason || 'This order is not eligible for return');
      return;
    }
    
    setReturnOrder(order);
    setShowReturnModal(true);
  };

  // Handle return request success
  const handleReturnRequested = async (returnData) => {
    console.log('Return requested successfully:', returnData);
    toast.success('Return request submitted successfully!');
    setShowReturnModal(false);
    setReturnOrder(null);
    
    // Refresh orders to show updated return status
    await fetchOrders(pagination.currentPage);
  };

  // Filter orders based on active tab
  useEffect(() => {
    if (orders.length > 0) {
      const filtered = activeTab === 'All' 
        ? orders 
        : orders.filter(order => order.status === activeTab);
      setFilteredOrders(filtered);
      console.log(`📊 Filtered orders for ${activeTab}:`, filtered.length);
    } else {
      setFilteredOrders([]);
    }
  }, [orders, activeTab]);

  // Initial data fetch
  useEffect(() => {
    if (userAuth.isAuthenticated) {
      fetchOrders();
    } else {
      navigate('/user/login');
    }
  }, [userAuth.isAuthenticated, navigate]);

  // 🎯 NEW: Handle order cancellation by buyer
  const handleCancelOrder = (order) => {
    // Check if order can be cancelled
    if (!['Pending', 'Processing'].includes(order.status)) {
      toast.error(`Cannot cancel order with status: ${order.status}`);
      return;
    }
    
    setCancellingOrder(order);
    setShowCancelModal(true);
  };

  // 🎯 NEW: Confirm order cancellation
  const confirmCancelOrder = () => {
    if (!cancellingOrder || !socketConnected) {
      toast.error('Unable to cancel order. Please try again.');
      return;
    }

    console.log('🎯 Sending cancel order request:', {
      orderId: cancellingOrder._id,
      reason: cancelReason
    });

    // Send cancellation request via socket
    socketService.socket?.emit('cancel-order', {
      orderId: cancellingOrder._id,
      reason: cancelReason || 'No reason provided'
    });

    // Show loading state
    toast.info('Cancelling order...');
  };

  // Helper functions
  const getStatusEmoji = (status) => {
    const statusMap = {
      'Pending': '⏳',
      'Processing': '🔄',
      'Shipped': '🚚',
      'Delivered': '✅',
      'Cancelled': '❌'
    };
    return statusMap[status] || '📦';
  };

  const getStatusColor = (status) => {
    const statusMap = {
      'Pending': 'bg-gradient-to-r from-amber-50 to-yellow-100 text-amber-800 border border-amber-200 shadow-sm',
      'Processing': 'bg-gradient-to-r from-blue-50 to-indigo-100 text-blue-800 border border-blue-200 shadow-sm',
      'Shipped': 'bg-gradient-to-r from-purple-50 to-violet-100 text-purple-800 border border-purple-200 shadow-sm',
      'Delivered': 'bg-gradient-to-r from-emerald-50 to-green-100 text-emerald-800 border border-emerald-200 shadow-sm',
      'Cancelled': 'bg-gradient-to-r from-red-50 to-rose-100 text-red-800 border border-red-200 shadow-sm'
    };
    return statusMap[status] || 'bg-gradient-to-r from-gray-50 to-slate-100 text-gray-800 border border-gray-200 shadow-sm';
  };

  const getTabColor = (tabKey) => {
    const tab = statusTabs.find(t => t.key === tabKey);
    if (!tab) return 'border-gray-300 text-gray-600';
    
    const colorMap = {
      'gray': 'border-slate-500 text-slate-700 bg-gradient-to-r from-slate-50 to-gray-100',
      'yellow': 'border-amber-500 text-amber-700 bg-gradient-to-r from-amber-50 to-yellow-100',
      'blue': 'border-blue-500 text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-100',
      'purple': 'border-purple-500 text-purple-700 bg-gradient-to-r from-purple-50 to-violet-100',
      'green': 'border-emerald-500 text-emerald-700 bg-gradient-to-r from-emerald-50 to-green-100',
      'red': 'border-red-500 text-red-700 bg-gradient-to-r from-red-50 to-rose-100'
    };
    
    return colorMap[tab.color] || 'border-gray-300 text-gray-600';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOrderProgress = (status) => {
    const statusOrder = ['Pending', 'Processing', 'Shipped', 'Delivered'];
    const currentIndex = statusOrder.indexOf(status);
    
    if (status === 'Cancelled') {
      return { percentage: 0, step: 0, total: 4 };
    }
    
    const percentage = ((currentIndex + 1) / statusOrder.length) * 100;
    return { percentage, step: currentIndex + 1, total: statusOrder.length };
  };

  // 🎯 NEW: Get cancellation display info
  const getCancellationInfo = (order) => {
    if (order.status !== 'Cancelled') return null;
    
    // Check if we have enhanced cancellation details
    if (order.cancellationDetails?.cancelledBy) {
      const cancelledBy = order.cancellationDetails.cancelledBy;
      const cancelledAt = order.cancellationDetails.cancelledAt;
      const reason = order.cancellationDetails.cancellationReason;
      
      return {
        text: `Cancelled by ${cancelledBy}`,
        timestamp: cancelledAt ? formatDate(cancelledAt) : 'Unknown',
        reason: reason || 'No reason provided'
      };
    }
    
    // Fallback to notes field for backward compatibility
    if (order.notes && order.notes.includes('Cancelled by')) {
      return {
        text: order.notes,
        timestamp: formatDate(order.updatedAt),
        reason: 'See notes'
      };
    }
    
    return {
      text: 'Cancelled',
      timestamp: formatDate(order.updatedAt),
      reason: 'No details available'
    };
  };

  const downloadInvoice = async (orderNumber) => {
    try {
      const result = await orderService.downloadInvoice(orderNumber);
      if (result.success) {
        toast.success('Invoice downloaded successfully!');
      } else {
        toast.error(result.message || 'Failed to download invoice');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  if (!userAuth.isAuthenticated) {
    return (
      <UserLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
          <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="text-center py-16 sm:py-20">
              <div className="mb-8">
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-gradient-to-br from-orange-100 via-orange-200 to-amber-200 rounded-full flex items-center justify-center shadow-xl border-4 border-white">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent mb-4">
                Authentication Required
              </h2>
              <p className="text-slate-600 mb-8 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                Please sign in to access your order history and track your purchases.
              </p>
              <Link
                to="/user/login"
                className="inline-flex items-center justify-center bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:via-orange-700 hover:to-amber-600 text-white px-8 py-3 sm:px-10 sm:py-4 rounded-xl font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign In to Continue
              </Link>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 sm:pb-8">
        {/* 🎯 PREMIUM: Enhanced Header Section */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-lg">
          <div className="px-4 sm:px-6 py-4 sm:py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button 
                  onClick={() => navigate('/user/dashboard')} 
                  className="group p-2 sm:p-2.5 hover:bg-slate-100 rounded-xl transition-all duration-300 active:scale-95"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 group-hover:text-slate-800 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">
                    My Orders
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 flex items-center flex-wrap gap-2">
                    <span>Track and manage your orders</span>
                    {socketConnected && (
                      <span className="inline-flex items-center">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-pulse mr-1"></span>
                        <span className="text-xs text-emerald-600 font-medium">Live updates</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => fetchOrders(pagination.currentPage)}
                className="group bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">↻</span>
              </button>
            </div>
          </div>
        </div>

        {/* 🎯 PREMIUM: Enhanced Tab Navigation */}
        <div className="sticky top-[73px] sm:top-[81px] z-30 bg-white/90 backdrop-blur-xl border-b border-white/30">
          <div className="px-2 sm:px-4">
            <nav className="flex space-x-1 overflow-x-auto scrollbar-hide py-2">
              {statusTabs.map((tab) => {
                const count = tab.key === 'All' 
                  ? orders.length 
                  : orders.filter(order => order.status === tab.key).length;
                const isActive = activeTab === tab.key;
                
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`group flex-shrink-0 py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold flex items-center space-x-1.5 sm:space-x-2 rounded-xl transition-all duration-300 border-2 ${
                      isActive
                        ? 'border-orange-300 text-orange-700 bg-gradient-to-r from-orange-50 via-orange-100 to-amber-50 shadow-lg transform scale-105'
                        : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-white/70 hover:border-slate-200 hover:shadow-md'
                    }`}
                  >
                    <span className="text-sm sm:text-base">{tab.icon}</span>
                    <span className="whitespace-nowrap">{tab.label}</span>
                    {count > 0 && (
                      <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs rounded-full font-bold transition-all duration-300 ${
                        isActive 
                          ? 'bg-orange-200 text-orange-800 shadow-sm' 
                          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* 🎯 PREMIUM: Enhanced Orders List */}
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-16 sm:py-20">
              <div className="relative mb-6">
                <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-orange-200 border-t-orange-500 shadow-lg"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 opacity-20 animate-pulse"></div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-slate-700 font-semibold text-sm sm:text-base">Loading your orders...</p>
                <p className="text-slate-500 text-xs sm:text-sm">Please wait while we fetch your order history</p>
              </div>
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="space-y-4 sm:space-y-6">
              {filteredOrders.map((order) => {
                const progress = getOrderProgress(order.status);
                const cancellationInfo = getCancellationInfo(order);
                
                return (
                  <div key={order._id} className="group bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-lg hover:shadow-xl border border-white/50 hover:border-white/80 transition-all duration-500 overflow-hidden">
                    {/* 🎯 PREMIUM: Order Header */}
                    <div className="p-4 sm:p-6 border-b border-slate-100/50">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                        <div className="flex items-start space-x-3 sm:space-x-4">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md border border-white/50 flex-shrink-0">
                            <span className="text-lg sm:text-xl">{getStatusEmoji(order.status)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base lg:text-lg truncate">
                              Order #{order.orderNumber}
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                              Placed on {formatDate(order.createdAt)}
                            </p>
                            {/* 🎯 PREMIUM: Cancellation info */}
                            {cancellationInfo && (
                              <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-100">
                                <p className="text-xs font-medium text-red-700">{cancellationInfo.text}</p>
                                <p className="text-xs text-red-600">{cancellationInfo.timestamp}</p>
                                {cancellationInfo.reason !== 'No reason provided' && (
                                  <p className="text-xs text-red-600">Reason: {cancellationInfo.reason}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-start gap-2 sm:gap-1">
                          <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 ${getStatusColor(order.status)}`}>
                            {getStatusEmoji(order.status)} {order.status}
                          </span>
                          <div className="text-right">
                            <p className="font-bold text-slate-900 text-sm sm:text-base lg:text-lg">₹{order.totalPrice}</p>
                            <p className="text-xs sm:text-sm text-slate-600">{order.paymentMethod}</p>
                          </div>
                        </div>
                      </div>

                      {/* 🎯 PREMIUM: Progress Bar */}
                      {order.status !== 'Cancelled' && (
                        <div className="mt-4 sm:mt-6">
                          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600 mb-3">
                            <span className="font-medium">Order Progress</span>
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded-full">
                              {progress.step}/{progress.total} steps completed
                            </span>
                          </div>
                          <div className="relative w-full bg-slate-200 rounded-full h-2 sm:h-3 overflow-hidden">
                            <div 
                              className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 rounded-full transition-all duration-1000 ease-out shadow-sm"
                              style={{ width: `${progress.percentage}%` }}
                            >
                              <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 🎯 PREMIUM: Order Items Preview */}
                    <div className="p-4 sm:p-6 border-b border-slate-100/50">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="flex -space-x-2 sm:-space-x-3">
                          {order.orderItems?.slice(0, 3).map((item, index) => (
                            <div key={index} className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg sm:rounded-xl border-2 sm:border-3 border-white overflow-hidden shadow-md">
                              {item.image ? (
                                <img 
                                  src={item.image} 
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          ))}
                          {order.orderItems?.length > 3 && (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg sm:rounded-xl border-2 sm:border-3 border-white flex items-center justify-center shadow-md">
                              <span className="text-xs sm:text-sm text-slate-700 font-bold">+{order.orderItems.length - 3}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                            {order.orderItems?.[0]?.name}
                            {order.orderItems?.length > 1 && ` and ${order.orderItems.length - 1} more item${order.orderItems.length > 2 ? 's' : ''}`}
                          </p>
                          <p className="text-xs sm:text-sm text-slate-600 truncate">
                            From {order.seller?.shop?.name || order.seller?.firstName}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 🎯 PREMIUM: Return Eligibility Notice for Delivered Orders */}
                    {order.status === 'Delivered' && returnEligibility[order._id]?.canRequest && !order.returnDetails?.returnStatus && (
                      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 sm:p-4 border border-amber-200">
                          <div className="flex items-start gap-2 sm:gap-3">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.856-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm text-amber-800 font-medium">
                                24-Hour Return Window: You can request a return for this order
                                {returnEligibility[order._id]?.hoursRemaining && (
                                  <span className="font-bold"> (within {Math.floor(returnEligibility[order._id].hoursRemaining)}h {Math.floor((returnEligibility[order._id].hoursRemaining % 1) * 60)}m)</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 🎯 PREMIUM: Action Buttons */}
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-wrap gap-2 sm:gap-3 sm:justify-start">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderDetails(true);
                          }}
                          className="bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:via-orange-700 hover:to-amber-600 text-white py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
                        >
                          View Details
                        </button>
                        
                        {/* 🎯 PREMIUM: Cancel order button */}
                        {['Pending', 'Processing'].includes(order.status) && (
                          <button
                            onClick={() => handleCancelOrder(order)}
                            className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Cancel
                          </button>
                        )}
                        
                        {order.status === 'Delivered' && (
                          <>
                            {/* Return Button - Show if eligible within 24 hours */}
                            {returnEligibility[order._id]?.canRequest && !order.returnDetails?.returnStatus && (
                              <button
                                onClick={() => handleReturnClick(order)}
                                className="bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:via-orange-700 hover:to-amber-600 text-white py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
                              >
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="hidden sm:inline">Return</span>
                                <span className="sm:hidden">Return</span>
                              </button>
                            )}
                            
                            {/* Invoice Button */}
                            <button
                              onClick={() => downloadInvoice(order.orderNumber)}
                              className="bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold flex items-center justify-center shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
                            >
                              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="hidden sm:inline">Invoice</span>
                              <span className="sm:hidden">PDF</span>
                            </button>
                          </>
                        )}
                        
                        <Link
                          to={`/user/shop/${order.seller?._id}`}
                          className="bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold text-center shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
                        >
                          <span className="hidden sm:inline">Visit Shop</span>
                          <span className="sm:hidden">Shop</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* 🎯 PREMIUM: Enhanced Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 py-8 sm:py-12">
                  <button
                    onClick={() => fetchOrders(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="sm:w-auto bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 disabled:from-slate-50 disabled:to-slate-100 text-slate-700 disabled:text-slate-400 px-6 py-3 rounded-xl text-sm sm:text-base font-semibold shadow-md hover:shadow-lg disabled:shadow-sm transform hover:-translate-y-0.5 disabled:transform-none transition-all duration-300 disabled:cursor-not-allowed active:scale-95"
                  >
                    ← Previous
                  </button>
                  
                  <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl shadow-md border border-white/50">
                    <span className="text-sm sm:text-base text-slate-700 font-semibold">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => fetchOrders(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="sm:w-auto bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 disabled:from-slate-50 disabled:to-slate-100 text-slate-700 disabled:text-slate-400 px-6 py-3 rounded-xl text-sm sm:text-base font-semibold shadow-md hover:shadow-lg disabled:shadow-sm transform hover:-translate-y-0.5 disabled:transform-none transition-all duration-300 disabled:cursor-not-allowed active:scale-95"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 sm:py-24">
              <div className="mb-8">
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 rounded-full flex items-center justify-center shadow-xl border-4 border-white">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mb-3">
                No {activeTab === 'All' ? '' : activeTab.toLowerCase()} orders found
              </h3>
              <p className="text-slate-600 mb-8 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                {activeTab === 'All' 
                  ? "You haven't placed any orders yet. Start shopping to see your orders here!"
                  : `No orders with ${activeTab.toLowerCase()} status at the moment.`
                }
              </p>
              {activeTab === 'All' && (
                <Link
                  to="/user/dashboard"
                  className="inline-flex items-center justify-center bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:via-orange-700 hover:to-amber-600 text-white px-8 py-3 sm:px-10 sm:py-4 rounded-xl font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Start Shopping
                </Link>
              )}
            </div>
          )}
        </div>

        {/* 🎯 PREMIUM: Enhanced Order Cancellation Modal */}
        {showCancelModal && cancellingOrder && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCancelModal(false)}></div>
            <div className="relative bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-white/50">
              <div className="sticky top-0 bg-gradient-to-r from-red-50 to-rose-50 p-4 sm:p-6 border-b border-red-100 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-rose-200 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-red-700">Cancel Order</h3>
                  </div>
                  <button 
                    onClick={() => setShowCancelModal(false)}
                    className="p-2 hover:bg-red-100 rounded-xl transition-all duration-300 active:scale-95"
                  >
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-4 sm:p-6 space-y-6">
                <div className="bg-gradient-to-r from-red-50 via-red-100 to-rose-50 border border-red-200 rounded-2xl p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-red-200 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.856-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-red-800 text-sm sm:text-base">Confirm Cancellation</h4>
                      <p className="text-sm text-red-700 mt-1 leading-relaxed">
                        Are you sure you want to cancel order #{cancellingOrder.orderNumber}? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-semibold text-slate-700 mb-3">
                    Reason for cancellation (optional)
                  </label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base transition-all duration-300"
                  >
                    <option value="">Select a reason...</option>
                    {cancellationReasons.map((reason, index) => (
                      <option key={index} value={reason}>{reason}</option>
                    ))}
                  </select>
                  
                  {cancelReason === 'Other' && (
                    <textarea
                      placeholder="Please specify your reason..."
                      value={cancelReason === 'Other' ? '' : cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 mt-3 text-sm sm:text-base transition-all duration-300"
                      rows="3"
                    />
                  )}
                </div>

                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    onClick={() => setShowCancelModal(false)}
                    className="flex-1 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 py-3 sm:py-3.5 px-6 rounded-xl font-semibold text-sm sm:text-base shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
                  >
                    Keep Order
                  </button>
                  <button
                    onClick={confirmCancelOrder}
                    disabled={!socketConnected}
                    className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 disabled:from-red-300 disabled:to-rose-300 text-white py-3 sm:py-3.5 px-6 rounded-xl font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl disabled:shadow-md transform hover:-translate-y-0.5 disabled:transform-none transition-all duration-300 disabled:cursor-not-allowed active:scale-95"
                  >
                    {socketConnected ? 'Cancel Order' : 'Connecting...'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🎯 PREMIUM: Enhanced Order Details Modal */}
        {showOrderDetails && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowOrderDetails(false)}></div>
            <div className="relative bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-white/50">
              <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-amber-50 p-4 sm:p-6 border-b border-orange-100 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-200 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-orange-700">Order Details</h3>
                  </div>
                  <button 
                    onClick={() => setShowOrderDetails(false)}
                    className="p-2 hover:bg-orange-100 rounded-xl transition-all duration-300 active:scale-95"
                  >
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-4 sm:p-6 space-y-6">
                {/* Order Info */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-4">
                  <h4 className="font-bold text-slate-900 mb-3 text-sm sm:text-base">Order Information</h4>
                  <div className="space-y-3 text-xs sm:text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Order Number:</span>
                      <span className="font-bold text-slate-900 bg-white px-2 py-1 rounded-lg shadow-sm">{selectedOrder.orderNumber}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Status:</span>
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusEmoji(selectedOrder.status)} {selectedOrder.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Order Date:</span>
                      <span className="font-semibold text-slate-900">{formatDate(selectedOrder.createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Total Amount:</span>
                      <span className="font-bold text-orange-600 text-sm sm:text-base">₹{selectedOrder.totalPrice}</span>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="font-bold text-slate-900 mb-4 text-sm sm:text-base">Items Ordered</h4>
                  <div className="space-y-3">
                    {selectedOrder.orderItems?.map((item, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-white/50">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-slate-200 to-slate-300 rounded-xl overflow-hidden shadow-md border border-white/50 flex-shrink-0">
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">{item.name}</p>
                          <p className="text-xs text-slate-600">
                            Qty: {item.quantity} | Size: {item.size} | Color: {item.color}
                          </p>
                          <p className="text-sm font-bold text-slate-900">₹{item.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping Address */}
                <div>
                  <h4 className="font-bold text-slate-900 mb-3 text-sm sm:text-base">Shipping Address</h4>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 text-xs sm:text-sm">
                    <p className="font-semibold text-slate-900">{selectedOrder.shippingAddress?.address}</p>
                    <p className="text-slate-700">{selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.postalCode}</p>
                    <p className="text-slate-700">{selectedOrder.shippingAddress?.country}</p>
                    <p className="mt-2 text-slate-600 font-medium">Phone: {selectedOrder.shippingAddress?.phone}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Return Request Modal */}
        {showReturnModal && returnOrder && (
          <ReturnRequestModal
            isOpen={showReturnModal}
            onClose={() => {
              setShowReturnModal(false);
              setReturnOrder(null);
            }}
            order={returnOrder}
            onReturnRequested={handleReturnRequested}
            socket={socketService.socket}
          />
        )}
      </div>
    </UserLayout>
  );
};

export default MyOrdersPage;