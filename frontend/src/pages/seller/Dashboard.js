import React, { useContext, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import SellerLayout from '../../components/layouts/SellerLayout';
import { getSellerProducts } from '../../services/productService';
import orderService from '../../services/orderService';
import socketService from '../../services/socketService';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const { sellerAuth } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [orderStats, setOrderStats] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [todayOrders, setTodayOrders] = useState([]);
  const [connectionRetrying, setConnectionRetrying] = useState(false);

  // 🎯 FIX: Enhanced Socket.io setup with better connection handling
  const setupSocketConnection = useCallback(() => {
    if (!sellerAuth?.seller?._id) {
      console.log('⚠️ No seller ID available for socket connection');
      return;
    }

    console.log('🔌 Dashboard: Setting up socket connection for seller:', sellerAuth.seller._id);
    setConnectionRetrying(true);
    
    // Connect to socket if not already connected
    if (!socketService.getConnectionStatus().isConnected) {
      socketService.connect().then(() => {
        console.log('✅ Socket connected successfully');
        socketService.joinSellerRoom(sellerAuth.seller._id);
        setSocketConnected(true);
        setConnectionRetrying(false);
      }).catch(error => {
        console.error('❌ Socket connection failed:', error);
        setSocketConnected(false);
        setConnectionRetrying(false);
        
        // Retry connection after 5 seconds
        setTimeout(() => setupSocketConnection(), 5000);
      });
    } else {
      // Already connected, just join room
      socketService.joinSellerRoom(sellerAuth.seller._id);
      setSocketConnected(true);
      setConnectionRetrying(false);
    }
    
    // 🎯 FIX: Enhanced new order listener with detailed notifications
    socketService.onNewOrder((data) => {
      console.log('📦 Dashboard: New order received via socket:', data);
      
      const orderData = data.data;
      
      // Show enhanced notification
      toast.success(
        <div className="flex items-center">
          <div className="bg-green-100 rounded-full p-2 mr-3">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-gray-800">🎉 New Order Received!</p>
            <p className="text-sm text-gray-600">Order #{orderData.orderNumber}</p>
            <p className="text-sm text-gray-600">Amount: ₹{orderData.totalPrice}</p>
            <p className="text-xs text-gray-500">Customer: {orderData.user?.name}</p>
          </div>
        </div>,
        {
          position: "top-right",
          autoClose: 10000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          className: "new-order-toast"
        }
      );
      
      // 🎯 FIX: Add to recent notifications with timestamp
      const notification = {
        id: orderData._id,
        type: 'new-order',
        title: 'New Order Received',
        message: `Order #${orderData.orderNumber} from ${orderData.user?.name}`,
        amount: orderData.totalPrice,
        timestamp: new Date().toISOString(),
        data: orderData,
        isRead: false
      };
      
      setRecentNotifications(prev => [notification, ...prev.slice(0, 4)]);
      
      // Add to today's orders if it's from today
      const orderDate = new Date(orderData.createdAt);
      const today = new Date();
      if (orderDate.toDateString() === today.toDateString()) {
        setTodayOrders(prev => [orderData, ...prev]);
      }
      
      // Refresh data
      fetchSellerOrders();
      fetchOrderStats();
    });

    // 🎯 FIX: Enhanced order status update listener
    socketService.onOrderStatusUpdate((data) => {
      console.log('🔄 Dashboard: Order status updated via socket:', data);
      
      const orderData = data.data;
      
      toast.info(
        <div className="flex items-center">
          <div className="bg-blue-100 rounded-full p-2 mr-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-gray-800">Order Status Updated</p>
            <p className="text-sm text-gray-600">Order #{orderData.orderNumber}</p>
            <p className="text-sm text-gray-600">Status: {orderData.status}</p>
          </div>
        </div>,
        {
          position: "top-right",
          autoClose: 5000,
        }
      );
      
      // Add to notifications
      const notification = {
        id: orderData._id + '-status',
        type: 'status-update',
        title: 'Order Status Updated',
        message: `Order #${orderData.orderNumber} is now ${orderData.status}`,
        timestamp: new Date().toISOString(),
        data: orderData,
        isRead: false
      };
      
      setRecentNotifications(prev => [notification, ...prev.slice(0, 4)]);
      
      // Refresh data
      fetchSellerOrders();
    });

    // 🎯 NEW: Listen for order cancellations by buyers
    socketService.socket?.on('order-cancelled-by-buyer', (data) => {
      console.log('❌ Dashboard: Order cancelled by buyer:', data);
      
      const orderData = data.data;
      
      toast.warning(
        <div className="flex items-center">
          <div className="bg-yellow-100 rounded-full p-2 mr-3">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.856-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-gray-800">Order Cancelled by Customer</p>
            <p className="text-sm text-gray-600">Order #{orderData.orderNumber}</p>
            <p className="text-sm text-gray-600">Customer: {orderData.user?.name}</p>
            {orderData.reason && (
              <p className="text-xs text-gray-500">Reason: {orderData.reason}</p>
            )}
          </div>
        </div>,
        {
          position: "top-right",
          autoClose: 8000,
        }
      );
      
      // Add to notifications
      const notification = {
        id: orderData._id + '-cancelled',
        type: 'order-cancelled',
        title: 'Order Cancelled by Customer',
        message: `Order #${orderData.orderNumber} cancelled by ${orderData.user?.name}`,
        timestamp: new Date().toISOString(),
        data: orderData,
        isRead: false
      };
      
      setRecentNotifications(prev => [notification, ...prev.slice(0, 4)]);
      
      // Refresh data
      fetchSellerOrders();
      fetchOrderStats();
    });

    // Check connection status periodically
    const checkConnection = () => {
      const status = socketService.getConnectionStatus();
      setSocketConnected(status.isConnected);
    };

    const connectionInterval = setInterval(checkConnection, 10000);
    checkConnection();

    // Cleanup function
    return () => {
      clearInterval(connectionInterval);
      socketService.removeListener('new-order');
      socketService.removeListener('order-status-updated');
      socketService.socket?.off('order-cancelled-by-buyer');
    };
  }, [sellerAuth?.seller?._id]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getSellerProducts();
      if (response.success) {
        setProducts(response.data);
        console.log('✅ Products fetched:', response.data.length);
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 🎯 FIX: Enhanced order fetching with better error handling
  const fetchSellerOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      console.log('📦 Fetching seller orders...');
      const ordersResponse = await orderService.getSellerOrders(1, 10);
      
      if (ordersResponse.success) {
        setOrders(ordersResponse.data);
        
        // Filter today's orders
        const today = new Date();
        const todaysOrders = ordersResponse.data.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate.toDateString() === today.toDateString();
        });
        setTodayOrders(todaysOrders);
        
        console.log('✅ Orders fetched:', ordersResponse.data.length);
        console.log('📅 Today\'s orders:', todaysOrders.length);
      } else {
        console.error('❌ Failed to fetch orders:', ordersResponse.message);
      }
    } catch (error) {
      console.error('❌ Error fetching seller orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // Fetch order statistics
  const fetchOrderStats = useCallback(async () => {
    try {
      console.log('📊 Fetching order statistics...');
      const statsResponse = await orderService.getSellerOrderStats();
      if (statsResponse.success) {
        setOrderStats(statsResponse.data);
        console.log('✅ Order stats fetched:', statsResponse.data);
      }
    } catch (error) {
      console.error('❌ Error fetching order stats:', error);
    }
  }, []);

  // 🎯 FIX: Enhanced initialization
  useEffect(() => {
    if (sellerAuth?.seller?._id) {
      console.log('🚀 Dashboard: Initializing for seller:', sellerAuth.seller.firstName);
      
      // Fetch data
      fetchProducts();
      fetchSellerOrders();
      fetchOrderStats();
      
      // Setup socket connection
      setupSocketConnection();
    }
  }, [sellerAuth?.seller?._id, fetchProducts, fetchSellerOrders, fetchOrderStats, setupSocketConnection]);

  // 🎯 NEW: Manual refresh function
  const handleRefresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered');
    fetchProducts();
    fetchSellerOrders();
    fetchOrderStats();
    
    // Reconnect socket if disconnected
    if (!socketConnected) {
      setupSocketConnection();
    }
  }, [fetchProducts, fetchSellerOrders, fetchOrderStats, socketConnected, setupSocketConnection]);

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      console.log('🔄 Updating order status:', { orderId, newStatus });
      const response = await orderService.updateOrderStatus(orderId, newStatus);
      if (response.success) {
        fetchSellerOrders();
        toast.success(`Order status updated to ${newStatus}`);
      } else {
        toast.error('Failed to update order status');
      }
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      toast.error('Error updating order status');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 🎯 NEW: Get shop main image
  const getShopMainImage = () => {
    const shop = sellerAuth.seller?.shop;
    if (shop?.mainImage) {
      return shop.mainImage;
    }
    if (shop?.images && shop.images.length > 0) {
      return shop.images[0];
    }
    return null;
  };

  // 🎯 NEW: Format time for notifications
  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // 🎯 NEW: Mark notification as read
  const markNotificationAsRead = (notificationId) => {
    setRecentNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  // 🎯 NEW: Clear all notifications
  const clearAllNotifications = () => {
    setRecentNotifications([]);
  };

  return (
    <SellerLayout>
      <div className="dashboard-container">
        {/* 🎯 FIX: Enhanced Real-time Connection Status */}
        <div className="mb-4">
          <div className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
            socketConnected 
              ? 'bg-green-50 border-green-200' 
              : connectionRetrying 
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                socketConnected 
                  ? 'bg-green-500 animate-pulse' 
                  : connectionRetrying
                    ? 'bg-yellow-500 animate-spin'
                    : 'bg-red-500'
              }`}></div>
              <span className={`text-sm font-medium ${
                socketConnected 
                  ? 'text-green-700' 
                  : connectionRetrying
                    ? 'text-yellow-700'
                    : 'text-red-700'
              }`}>
                {socketConnected 
                  ? '✅ Real-time notifications active'
                  : connectionRetrying
                    ? '🔄 Connecting to notifications...'
                    : '❌ Notifications disconnected'
                }
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {orderStats?.unreadOrdersCount > 0 && (
                <Link
                  to="/seller/orders"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center transition-colors"
                >
                  <span className="mr-1">{orderStats.unreadOrdersCount}</span>
                  New Orders
                </Link>
              )}
              
              {!socketConnected && (
                <button
                  onClick={setupSocketConnection}
                  disabled={connectionRetrying}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-3 py-1 rounded-full text-xs font-medium transition-colors"
                >
                  {connectionRetrying ? 'Connecting...' : 'Reconnect'}
                </button>
              )}
              
              <button
                onClick={handleRefresh}
                className="text-gray-500 hover:text-gray-700 p-1 rounded transition-colors"
                title="Refresh data"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Shop Banner Section */}
        <div className="shop-banner-section mb-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg overflow-hidden shadow-lg">
          <div className="relative h-48 md:h-64">
            {getShopMainImage() ? (
              <div className="absolute inset-0">
                <img 
                  src={getShopMainImage()} 
                  alt={sellerAuth.seller?.shop?.name || 'Shop'} 
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/60 to-orange-600/60"></div>
              </div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600"></div>
            )}
            
            <div className="relative z-10 p-6 h-full flex flex-col justify-between text-white">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  {sellerAuth.seller?.shop?.name || 'Your Shop'}
                </h1>
                <p className="text-orange-100 mb-1">
                  {sellerAuth.seller?.shop?.category || 'Fashion'} Store
                </p>
                {sellerAuth.seller?.shop?.description && (
                  <p className="text-orange-100 text-sm max-w-md">
                    {sellerAuth.seller.shop.description}
                  </p>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                  <p className="text-sm text-orange-100">Total Products</p>
                  <p className="text-2xl font-bold">
                    {loading ? '...' : products.length}
                  </p>
                </div>
                
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                  <p className="text-sm text-orange-100">Today's Orders</p>
                  <p className="text-2xl font-bold">
                    {todayOrders.length}
                  </p>
                </div>
                
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                  <p className="text-sm text-orange-100">Shop Status</p>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                    <p className="text-lg font-semibold text-green-200">Active</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="welcome-section mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome back, {sellerAuth.seller?.firstName || 'Seller'}! 👋
          </h2>
          <p className="text-gray-600">
            Manage your shop and products from your dashboard. 
            {socketConnected && <span className="text-green-600 font-medium"> Real-time updates are active.</span>}
          </p>
        </div>

        {/* 🎯 FIX: Enhanced Stats Cards with live data */}
        <div className="stats-cards grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="stat-card bg-blue-50 p-6 rounded-lg shadow-sm border border-blue-100">
            <h3 className="text-lg font-semibold text-blue-700">Total Products</h3>
            <p className="text-3xl font-bold text-blue-900 mt-2">
              {loading ? (
                <div className="animate-pulse bg-blue-200 h-8 w-16 rounded"></div>
              ) : (
                products.length
              )}
            </p>
            <Link 
              to="/seller/view-products" 
              className="text-blue-600 hover:underline text-sm inline-block mt-2 transition-colors"
            >
              View all products
            </Link>
          </div>
          
          <div className="stat-card bg-green-50 p-6 rounded-lg shadow-sm border border-green-100">
            <h3 className="text-lg font-semibold text-green-700">Total Orders</h3>
            <p className="text-3xl font-bold text-green-900 mt-2">
              {Object.values(orderStats?.statusCounts || {}).reduce((a, b) => a + b, 0)}
            </p>
            <Link 
              to="/seller/orders" 
              className="text-green-600 hover:underline text-sm inline-block mt-2 transition-colors"
            >
              View all orders
            </Link>
          </div>
          
          <div className="stat-card bg-yellow-50 p-6 rounded-lg shadow-sm border border-yellow-100">
            <h3 className="text-lg font-semibold text-yellow-700">Pending Orders</h3>
            <p className="text-3xl font-bold text-yellow-900 mt-2">
              {orderStats?.statusCounts?.Pending || 0}
            </p>
            <Link 
              to="/seller/orders" 
              className="text-yellow-600 hover:underline text-sm inline-block mt-2 transition-colors"
            >
              Manage orders
            </Link>
          </div>
          
          <div className="stat-card bg-purple-50 p-6 rounded-lg shadow-sm border border-purple-100">
            <h3 className="text-lg font-semibold text-purple-700">Revenue</h3>
            <p className="text-3xl font-bold text-purple-900 mt-2">
              ₹{orderStats?.totalRevenue?.toLocaleString() || 0}
            </p>
            <p className="text-purple-600 text-sm mt-1">
              Total earnings
            </p>
          </div>
        </div>

        {/* 🎯 NEW: Enhanced Recent Notifications Section */}
        {recentNotifications.length > 0 && (
          <div className="recent-notifications mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                Recent Notifications
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={clearAllNotifications}
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                >
                  Clear All
                </button>
                <Link 
                  to="/seller/orders" 
                  className="text-orange-600 hover:text-orange-700 text-sm font-medium transition-colors"
                >
                  View All Orders →
                </Link>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border">
              {recentNotifications.map((notification, index) => (
                <div 
                  key={notification.id} 
                  className={`p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${
                    index !== recentNotifications.length - 1 ? 'border-b border-gray-100' : ''
                  } ${!notification.isRead ? 'bg-blue-50' : ''}`}
                  onClick={() => markNotificationAsRead(notification.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      notification.type === 'new-order' ? 'bg-green-500' : 
                      notification.type === 'status-update' ? 'bg-blue-500' : 'bg-yellow-500'
                    } ${!notification.isRead ? 'animate-pulse' : ''}`}></div>
                    <div>
                      <p className={`font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600">{notification.message}</p>
                      <p className="text-xs text-gray-500">{formatNotificationTime(notification.timestamp)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {notification.amount && (
                      <span className="text-lg font-bold text-green-600">₹{notification.amount}</span>
                    )}
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🎯 NEW: Today's Orders Section */}
        {todayOrders.length > 0 && (
          <div className="todays-orders mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">📅 Today's Orders</h2>
              <Link 
                to="/seller/orders" 
                className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md text-sm transition-colors"
              >
                View All Orders
              </Link>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-200">
                {todayOrders.slice(0, 3).map(order => (
                  <div key={order._id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="font-medium text-gray-900">Order #{order.orderNumber}</p>
                          <p className="text-sm text-gray-600">{order.user?.name}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">₹{order.totalPrice}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Orders Section */}
        <div className="recent-orders mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Recent Orders</h2>
            <Link 
              to="/seller/orders" 
              className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md text-sm transition-colors"
            >
              View All Orders
            </Link>
          </div>
          
          {loadingOrders ? (
            <div className="flex justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                <span className="text-gray-600">Loading orders...</span>
              </div>
            </div>
          ) : orders.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-200">
                {orders.slice(0, 5).map(order => (
                  <div key={order._id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="font-medium text-gray-900">Order #{order.orderNumber}</p>
                          <p className="text-sm text-gray-600">{order.user?.name}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">₹{order.totalPrice}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-600 text-lg mb-4">No orders yet.</p>
              <p className="text-gray-500 text-sm mb-6">Orders will appear here when customers make purchases.</p>
              {!socketConnected && (
                <button
                  onClick={setupSocketConnection}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Connect for Real-time Orders
                </button>
              )}
            </div>
          )}
        </div>

        {/* Recent Products Section */}
        <div className="recent-products mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Recent Products</h2>
            <Link 
              to="/seller/add-product" 
              className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md text-sm transition-colors"
            >
              Add New Product
            </Link>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                <span className="text-gray-600">Loading products...</span>
              </div>
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.slice(0, 3).map(product => (
                <div key={product._id} className="product-card border rounded-lg overflow-hidden shadow-sm bg-white hover:shadow-md transition-shadow">
                  <div className="h-40 bg-gray-200 flex items-center justify-center relative">
                    {product.images && product.images.length > 0 ? (
                      <img 
                        src={product.images[0]} 
                        alt={product.name} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-gray-400 text-center">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm">No image</span>
                      </div>
                    )}
                    
                    {/* Product badges */}
                    <div className="absolute top-2 left-2 space-y-1">
                      {product.isTrending && (
                        <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          Trending
                        </span>
                      )}
                      {product.isLimitedEdition && (
                        <span className="bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          Limited
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg text-gray-800 mb-2 truncate">{product.name}</h3>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-orange-600 font-bold text-lg">₹{product.zammerPrice}</span>
                        {product.mrp > product.zammerPrice && (
                          <span className="text-gray-500 text-sm line-through">₹{product.mrp}</span>
                        )}
                      </div>
                      {product.mrp > product.zammerPrice && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                          {Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)}% OFF
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <span>Stock: {product.variants?.reduce((total, variant) => total + (variant.quantity || 0), 0) || 0}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.status === 'active' ? 'bg-green-100 text-green-800' : 
                        product.status === 'paused' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {product.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-gray-600 text-lg mb-4">You haven't added any products yet.</p>
              <p className="text-gray-500 text-sm mb-6">Start building your inventory by adding your first product.</p>
              <Link 
                to="/seller/add-product" 
                className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-md text-sm font-medium inline-flex items-center transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Your First Product
              </Link>
            </div>
          )}
        </div>

        {/* Shop Information */}
        <div className="shop-info bg-gray-50 p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-gray-800">Your Shop Information</h2>
            <Link
              to="/seller/edit-profile"
              className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Shop Name</p>
                <p className="font-medium text-gray-800">{sellerAuth.seller?.shop?.name || 'N/A'}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-medium text-gray-800">{sellerAuth.seller?.shop?.category || 'N/A'}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium text-gray-800">{sellerAuth.seller?.shop?.address || 'N/A'}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Working Hours</p>
                <p className="font-medium text-gray-800">
                  {sellerAuth.seller?.shop?.openTime && sellerAuth.seller?.shop?.closeTime 
                    ? `${sellerAuth.seller.shop.openTime} - ${sellerAuth.seller.shop.closeTime}`
                    : 'Not set'
                  }
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Working Days</p>
                <p className="font-medium text-gray-800">{sellerAuth.seller?.shop?.workingDays || 'Not set'}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Connection Status</p>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className={`text-sm font-medium ${socketConnected ? 'text-green-700' : 'text-gray-600'}`}>
                    {socketConnected ? 'Real-time updates active' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
};

export default Dashboard;