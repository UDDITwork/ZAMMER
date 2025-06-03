import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import { AuthContext } from '../../contexts/AuthContext';
import orderService from '../../services/orderService';
import socketService from '../../services/socketService';

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
        setOrders(response.data);
        setPagination({
          currentPage: response.pagination.currentPage,
          totalPages: response.pagination.totalPages,
          count: response.pagination.count
        });
        console.log('✅ Orders fetched successfully:', response.data.length);
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
      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Processing': 'bg-blue-100 text-blue-800 border-blue-200',
      'Shipped': 'bg-purple-100 text-purple-800 border-purple-200',
      'Delivered': 'bg-green-100 text-green-800 border-green-200',
      'Cancelled': 'bg-red-100 text-red-800 border-red-200'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getTabColor = (tabKey) => {
    const tab = statusTabs.find(t => t.key === tabKey);
    if (!tab) return 'border-gray-300 text-gray-600';
    
    const colorMap = {
      'gray': 'border-gray-500 text-gray-700 bg-gray-50',
      'yellow': 'border-yellow-500 text-yellow-700 bg-yellow-50',
      'blue': 'border-blue-500 text-blue-700 bg-blue-50',
      'purple': 'border-purple-500 text-purple-700 bg-purple-50',
      'green': 'border-green-500 text-green-700 bg-green-50',
      'red': 'border-red-500 text-red-700 bg-red-50'
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
        <div className="container mx-auto p-4">
          <div className="text-center py-12">
            <div className="mb-6">
              <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Login Required</h2>
            <p className="text-gray-600 mb-6">Please login to view your orders.</p>
            <Link
              to="/user/login"
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium"
            >
              Login to Continue
            </Link>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="my-orders-page pb-20">
        {/* Header Section */}
        <div className="bg-white border-b p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/user/dashboard')} 
                className="mr-4 p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">My Orders</h1>
                <p className="text-gray-600 text-sm">
                  Track and manage your orders
                  {socketConnected && (
                    <span className="ml-2 inline-flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></span>
                      <span className="text-xs text-green-600">Live updates</span>
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => fetchOrders(pagination.currentPage)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b">
          <div className="px-4">
            <nav className="flex space-x-1 overflow-x-auto">
              {statusTabs.map((tab) => {
                const count = tab.key === 'All' 
                  ? orders.length 
                  : orders.filter(order => order.status === tab.key).length;
                const isActive = activeTab === tab.key;
                
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-shrink-0 py-3 px-4 text-sm font-medium flex items-center space-x-2 border-b-2 transition-colors ${
                      isActive
                        ? 'border-orange-500 text-orange-600 bg-orange-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        isActive 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-gray-100 text-gray-600'
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

        {/* Orders List */}
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <span className="ml-3 text-gray-600">Loading your orders...</span>
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const progress = getOrderProgress(order.status);
                const cancellationInfo = getCancellationInfo(order);
                
                return (
                  <div key={order._id} className="bg-white rounded-lg shadow-sm border">
                    {/* Order Header */}
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              Order #{order.orderNumber}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Placed on {formatDate(order.createdAt)}
                            </p>
                            {/* 🎯 NEW: Show cancellation info */}
                            {cancellationInfo && (
                              <div className="mt-1">
                                <p className="text-xs text-red-600 font-medium">{cancellationInfo.text}</p>
                                <p className="text-xs text-gray-500">{cancellationInfo.timestamp}</p>
                                {cancellationInfo.reason !== 'No reason provided' && (
                                  <p className="text-xs text-gray-500">Reason: {cancellationInfo.reason}</p>
                                )}
                              </div>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                            {getStatusEmoji(order.status)} {order.status}
                          </span>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-bold text-gray-900">₹{order.totalPrice}</p>
                          <p className="text-sm text-gray-600">{order.paymentMethod}</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {order.status !== 'Cancelled' && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                            <span>Order Progress</span>
                            <span>{progress.step}/{progress.total} steps completed</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Order Items Preview */}
                    <div className="p-4 border-b">
                      <div className="flex items-center space-x-3">
                        <div className="flex -space-x-2">
                          {order.orderItems?.slice(0, 3).map((item, index) => (
                            <div key={index} className="w-10 h-10 bg-gray-200 rounded border-2 border-white overflow-hidden">
                              {item.image ? (
                                <img 
                                  src={item.image} 
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          ))}
                          {order.orderItems?.length > 3 && (
                            <div className="w-10 h-10 bg-gray-100 rounded border-2 border-white flex items-center justify-center">
                              <span className="text-xs text-gray-600">+{order.orderItems.length - 3}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {order.orderItems?.[0]?.name}
                            {order.orderItems?.length > 1 && ` and ${order.orderItems.length - 1} more item${order.orderItems.length > 2 ? 's' : ''}`}
                          </p>
                          <p className="text-sm text-gray-600">
                            From {order.seller?.shop?.name || order.seller?.firstName}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-4">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderDetails(true);
                          }}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg text-sm font-medium"
                        >
                          View Details
                        </button>
                        
                        {/* 🎯 NEW: Cancel order button */}
                        {['Pending', 'Processing'].includes(order.status) && (
                          <button
                            onClick={() => handleCancelOrder(order)}
                            className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Cancel
                          </button>
                        )}
                        
                        {order.status === 'Delivered' && (
                          <button
                            onClick={() => downloadInvoice(order.orderNumber)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Invoice
                          </button>
                        )}
                        
                        <Link
                          to={`/user/shop/${order.seller?._id}`}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium"
                        >
                          Visit Shop
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center space-x-4 py-6">
                  <button
                    onClick={() => fetchOrders(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <span className="text-sm text-gray-600">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => fetchOrders(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mb-6">
                <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {activeTab === 'All' ? '' : activeTab.toLowerCase()} orders found
              </h3>
              <p className="text-gray-600 mb-6">
                {activeTab === 'All' 
                  ? "You haven't placed any orders yet. Start shopping to see your orders here!"
                  : `No orders with ${activeTab.toLowerCase()} status at the moment.`
                }
              </p>
              {activeTab === 'All' && (
                <Link
                  to="/user/dashboard"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium"
                >
                  Start Shopping
                </Link>
              )}
            </div>
          )}
        </div>

        {/* 🎯 NEW: Order Cancellation Modal */}
        {showCancelModal && cancellingOrder && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowCancelModal(false)}></div>
            <div className="relative bg-white rounded-t-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold text-red-600">Cancel Order</h3>
                <button 
                  onClick={() => setShowCancelModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.856-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-red-800">Confirm Cancellation</h4>
                      <p className="text-sm text-red-700 mt-1">
                        Are you sure you want to cancel order #{cancellingOrder.orderNumber}?
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for cancellation (optional)
                  </label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mt-2"
                      rows="3"
                    />
                  )}
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowCancelModal(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium"
                  >
                    Keep Order
                  </button>
                  <button
                    onClick={confirmCancelOrder}
                    disabled={!socketConnected}
                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white py-2 px-4 rounded-lg font-medium"
                  >
                    {socketConnected ? 'Cancel Order' : 'Connecting...'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Details Modal - (keeping existing modal code) */}
        {showOrderDetails && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowOrderDetails(false)}></div>
            <div className="relative bg-white rounded-t-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold">Order Details</h3>
                <button 
                  onClick={() => setShowOrderDetails(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-4 space-y-6">
                {/* Order Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Order Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Number:</span>
                      <span className="font-medium">{selectedOrder.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusEmoji(selectedOrder.status)} {selectedOrder.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Date:</span>
                      <span className="font-medium">{formatDate(selectedOrder.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-bold text-orange-600">₹{selectedOrder.totalPrice}</span>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Items Ordered</h4>
                  <div className="space-y-3">
                    {selectedOrder.orderItems?.map((item, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden">
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                          <p className="text-xs text-gray-600">
                            Qty: {item.quantity} | Size: {item.size} | Color: {item.color}
                          </p>
                          <p className="text-sm font-medium text-gray-900">₹{item.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping Address */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Shipping Address</h4>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    <p className="font-medium">{selectedOrder.shippingAddress?.address}</p>
                    <p>{selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.postalCode}</p>
                    <p>{selectedOrder.shippingAddress?.country}</p>
                    <p className="mt-1 text-gray-600">Phone: {selectedOrder.shippingAddress?.phone}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default MyOrdersPage;