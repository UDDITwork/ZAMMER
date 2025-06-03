import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../../contexts/AuthContext';
import socketService from '../../services/socketService';
import orderService from '../../services/orderService';

const RealTimeOrderTracker = () => {
  const { userAuth } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Debug logging
  const debugLog = (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`%c[OrderTracker] ${message}`, 'color: #10b981; font-weight: bold;', data);
    }
  };

  useEffect(() => {
    debugLog('Component mounted', { userId: userAuth.user?._id });
    
    if (userAuth.isAuthenticated && userAuth.user) {
      initializeRealTimeTracking();
      fetchUserOrders();
    }

    // Cleanup on unmount
    return () => {
      debugLog('Component unmounting - cleaning up socket');
      socketService.removeListener('order-status-update');
      socketService.removeListener('order-created');
      socketService.removeListener('invoice-ready');
    };
  }, [userAuth.isAuthenticated, userAuth.user]);

  const initializeRealTimeTracking = async () => {
    if (!userAuth.user?._id) {
      debugLog('No user ID available for socket connection');
      return;
    }

    setConnecting(true);
    debugLog('Initializing real-time tracking', { userId: userAuth.user._id });

    try {
      // Connect to socket if not already connected
      if (!socketService.getConnectionStatus().isConnected) {
        debugLog('Connecting to socket server...');
        await socketService.connect();
      }

      // Wait a moment for connection to establish
      setTimeout(() => {
        const status = socketService.getConnectionStatus();
        debugLog('Socket connection status', status);

        if (status.isConnected) {
          // Join buyer room
          const joined = socketService.joinBuyerRoom(userAuth.user._id);
          debugLog('Joined buyer room', { success: joined, userId: userAuth.user._id });

          if (joined) {
            setupRealTimeListeners();
            setSocketConnected(true);
            
            toast.success(
              <div className="flex items-center">
                <div className="bg-green-100 rounded-full p-1 mr-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span>Connected to real-time order updates!</span>
              </div>,
              { position: "top-right", autoClose: 3000 }
            );
          }
        } else {
          debugLog('Failed to connect to socket');
          toast.warn('Unable to connect to real-time updates');
        }
      }, 1000);

    } catch (error) {
      debugLog('Error initializing real-time tracking', error);
      toast.error('Failed to connect to real-time updates');
    } finally {
      setConnecting(false);
    }
  };

  const setupRealTimeListeners = () => {
    debugLog('Setting up real-time listeners');

    // Listen for order status updates
    socketService.onOrderUpdate((data) => {
      debugLog('Received order status update', data);
      
      const { orderNumber, status, previousStatus } = data.data;
      
      // Update orders list
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.orderNumber === orderNumber 
            ? { ...order, status, updatedAt: new Date().toISOString() }
            : order
        )
      );

      // Add notification
      const notification = {
        id: Date.now(),
        type: 'status-update',
        message: `Order ${orderNumber} is now ${status}`,
        orderNumber,
        status,
        previousStatus,
        timestamp: new Date().toISOString()
      };

      setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep last 5

      // Show toast notification
      const statusEmoji = getStatusEmoji(status);
      toast.info(
        <div className="flex items-center">
          <span className="text-2xl mr-2">{statusEmoji}</span>
          <div>
            <p className="font-medium">Order Update</p>
            <p className="text-sm">Order {orderNumber} is now {status}</p>
          </div>
        </div>,
        { 
          position: "top-right", 
          autoClose: 5000,
          onClick: () => window.location.href = '/user/orders'
        }
      );

      debugLog('Order updated in state', { orderNumber, status });
    });

    // Listen for new order confirmations
    socketService.onOrderUpdate((data) => {
      if (data.data && data.type === 'order-created') {
        debugLog('Received order creation confirmation', data);
        
        toast.success(
          <div className="flex items-center">
            <span className="text-2xl mr-2">🎉</span>
            <div>
              <p className="font-medium">Order Confirmed!</p>
              <p className="text-sm">Order {data.data.orderNumber} has been placed</p>
            </div>
          </div>,
          { position: "top-right", autoClose: 5000 }
        );
      }
    });

    // Listen for invoice ready notifications
    socketService.onInvoiceReady((data) => {
      debugLog('Received invoice ready notification', data);
      
      toast.success(
        <div className="flex items-center">
          <span className="text-2xl mr-2">📄</span>
          <div>
            <p className="font-medium">Invoice Ready</p>
            <p className="text-sm">Invoice for order {data.data.orderNumber} is ready</p>
          </div>
        </div>,
        { 
          position: "top-right", 
          autoClose: 7000,
          onClick: () => downloadInvoice(data.data.orderNumber)
        }
      );
    });
  };

  const fetchUserOrders = async () => {
    setLoading(true);
    debugLog('Fetching user orders');

    try {
      const response = await orderService.getUserOrders(1, 10);
      
      if (response.success) {
        setOrders(response.data);
        debugLog('Orders fetched successfully', { count: response.data.length });
      } else {
        debugLog('Failed to fetch orders', response);
        toast.error(response.message || 'Failed to fetch orders');
      }
    } catch (error) {
      debugLog('Error fetching orders', error);
      toast.error('Something went wrong while fetching orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'Pending': return '⏳';
      case 'Processing': return '🔄';
      case 'Shipped': return '🚚';
      case 'Delivered': return '✅';
      case 'Cancelled': return '❌';
      default: return '📦';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'text-yellow-600 bg-yellow-100';
      case 'Processing': return 'text-blue-600 bg-blue-100';
      case 'Shipped': return 'text-purple-600 bg-purple-100';
      case 'Delivered': return 'text-green-600 bg-green-100';
      case 'Cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const clearNotifications = () => {
    setNotifications([]);
  };

  if (!userAuth.isAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Login Required</h3>
        <p className="text-gray-600 mb-4">Please login to track your orders in real-time</p>
        <Link
          to="/user/login"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
        >
          Login to Continue
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${socketConnected ? 'bg-green-400' : connecting ? 'bg-yellow-400' : 'bg-red-400'}`}>
              {connecting && <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                Real-time Tracking
              </h3>
              <p className="text-xs text-gray-500">
                {socketConnected ? 'Connected - You\'ll receive instant updates' : 
                 connecting ? 'Connecting...' : 
                 'Disconnected - Manual refresh required'}
              </p>
            </div>
          </div>
          
          {!socketConnected && !connecting && (
            <button
              onClick={initializeRealTimeTracking}
              className="text-xs bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Recent Updates</h3>
            <button
              onClick={clearNotifications}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div key={notification.id} className="flex items-start space-x-3 p-2 bg-gray-50 rounded">
                <span className="text-lg">{getStatusEmoji(notification.status)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{notification.message}</p>
                  <p className="text-xs text-gray-500">{formatDate(notification.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Your Orders</h3>
            <div className="flex items-center space-x-2">
              {socketConnected && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></span>
                  Live
                </span>
              )}
              <Link
                to="/user/orders"
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                View All
              </Link>
            </div>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Yet</h3>
              <p className="text-gray-600 mb-4">Start shopping to see your orders here</p>
              <Link
                to="/user/dashboard"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div key={order._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          Order #{order.orderNumber}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusEmoji(order.status)} {order.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                        <span>₹{order.totalPrice}</span>
                        <span>•</span>
                        <span>{order.orderItems?.length} item{order.orderItems?.length !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                      
                      {order.seller && (
                        <p className="text-xs text-gray-500">
                          from {order.seller.shop?.name || order.seller.firstName}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/user/orders/${order._id}`}
                        className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
                      >
                        View Details
                      </Link>
                      {order.status === 'Delivered' && (
                        <button
                          onClick={() => downloadInvoice(order.orderNumber)}
                          className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded hover:bg-orange-200"
                        >
                          📄 Invoice
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
    </div>
  );
};

export default RealTimeOrderTracker;