import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import SellerLayout from '../../components/layouts/SellerLayout';
import LabelPreview from '../../components/seller/LabelPreview';
import orderService from '../../services/orderService';
import socketService from '../../services/socketService';
import { toast } from 'react-toastify';

const Orders = () => {
  const { sellerAuth } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending');
  const [stats, setStats] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingOrder, setProcessingOrder] = useState(null);
  const [generatingLabel, setGeneratingLabel] = useState(null);
  const [labelPreview, setLabelPreview] = useState({ isOpen: false, orderId: null });

  const statusTabs = [
    { key: 'Pending', label: 'Pending', icon: '⏳', color: 'yellow' },
    { key: 'Processing', label: 'Ready to Ship', icon: '📦', color: 'blue' },
    { key: 'Shipped', label: 'Shipped', icon: '🚚', color: 'purple' },
    { key: 'Delivered', label: 'Delivered', icon: '✅', color: 'green' },
    { key: 'Cancelled', label: 'Cancelled', icon: '❌', color: 'red' }
  ];

  // 🎯 Seller-Specific Status Mapping Helper
  // Maps backend order statuses to seller-friendly statuses
  // This mapping matches the backend mapping to ensure consistency
  const mapStatusForDisplay = (backendStatus) => {
    const statusMap = {
      'Pending': 'Pending',                    // Keep as-is
      'Processing': 'Processing',              // Keep as-is
      'Pickup_Ready': 'Processing',            // When admin assigns agent → seller sees as Ready to Ship
      'Out_for_Delivery': 'Shipped',           // When agent picks up → seller sees as Shipped
      'Out for Delivery': 'Shipped',           // Handle both formats
      'Shipped': 'Shipped',                    // Keep as-is
      'Delivered': 'Delivered',                // Keep as-is
      'Cancelled': 'Cancelled'                 // Keep as-is
    };
    return statusMap[backendStatus] || backendStatus; // Fallback to original if not mapped
  };

  const setupSocketConnection = useCallback(() => {
    if (!sellerAuth?.seller?._id) return;

    console.log('🔌 Setting up socket connection for seller:', sellerAuth.seller._id);
    
    if (!socketService.getConnectionStatus().isConnected) {
      socketService.connect().then(() => {
        socketService.joinSellerRoom(sellerAuth.seller._id);
        setSocketConnected(true);
      }).catch(error => {
        console.error('❌ Socket connection failed:', error);
        setSocketConnected(false);
      });
    } else {
      socketService.joinSellerRoom(sellerAuth.seller._id);
      setSocketConnected(true);
    }
    
    socketService.onNewOrder((data) => {
      console.log('📦 New order received via socket:', data);
      toast.success(
        <div className="flex items-center">
          <span className="text-2xl mr-2">🎉</span>
          <div>
            <p className="font-bold">New Order!</p>
            <p className="text-sm">Order #{data.data.orderNumber}</p>
          </div>
        </div>,
        { autoClose: 8000 }
      );
      fetchOrders();
      fetchStats();
    });

    socketService.onOrderStatusUpdate((data) => {
      console.log('🔄 Order status updated via socket:', data);
      // 🎯 MAP STATUS FOR DISPLAY: Transform backend status to seller-friendly status
      const mappedStatus = mapStatusForDisplay(data.data.status);
      toast.info(`Order #${data.data.orderNumber} status updated to ${mappedStatus}`);
      fetchOrders();
    });

    socketService.socket?.on('order-cancelled-by-buyer', (data) => {
      console.log('❌ Order cancelled by buyer:', data);
      toast.warning(
        <div className="flex items-center">
          <span className="text-2xl mr-2">⚠️</span>
          <div>
            <p className="font-bold">Order Cancelled</p>
            <p className="text-sm">Order #{data.data.orderNumber} cancelled by customer</p>
          </div>
        </div>
      );
      fetchOrders();
      fetchStats();
    });

    const checkConnection = () => {
      const status = socketService.getConnectionStatus();
      setSocketConnected(status.isConnected);
    };

    const connectionInterval = setInterval(checkConnection, 5000);
    checkConnection();

    return () => {
      clearInterval(connectionInterval);
      socketService.removeListener('new-order');
      socketService.removeListener('order-status-updated');
      socketService.socket?.off('order-cancelled-by-buyer');
    };
  }, [sellerAuth?.seller?._id]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await orderService.getSellerOrders(1, 100);
      
      if (response.success) {
        setOrders(response.data);
        console.log('✅ Orders fetched successfully:', response.data.length);
      } else {
        console.error('❌ Failed to fetch orders:', response.message);
        toast.error(response.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      toast.error('Error fetching orders');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await orderService.getSellerOrderStats();
      if (response.success) {
        setStats(response.data);
        console.log('✅ Order stats fetched:', response.data);
      }
    } catch (error) {
      console.error('❌ Error fetching order stats:', error);
    }
  }, []);

  useEffect(() => {
    if (orders.length > 0) {
      let filtered = orders.filter(order => {
        // 🎯 PRIORITY 1: Cancelled orders always appear in Cancelled tab regardless of other conditions
        if (activeTab === 'Cancelled') {
          return order.status === 'Cancelled';
        }
        // If order is cancelled, it should only appear in Cancelled tab
        if (order.status === 'Cancelled') {
          return false;
        }
        
        // 🎯 PRIORITY 2: Delivered orders always appear in Delivered tab
        if (activeTab === 'Delivered') {
          return order.status === 'Delivered';
        }
        // If order is delivered, it should only appear in Delivered tab
        if (order.status === 'Delivered') {
          return false;
        }
        
        // 🎯 MAP STATUS FOR FILTERING: Use mapped status for tab filtering
        const mappedStatus = mapStatusForDisplay(order.status);
        const orderIdStatus = order.order_id_status || 'unverified'; // Default to 'unverified' for backward compatibility
        
        if (activeTab === 'Pending') {
          return mappedStatus === 'Pending';
        }
        
        if (activeTab === 'Processing') {
          // "Ready to Ship" tab: Show orders where:
          // - Status is Processing or Pickup_Ready AND
          // - order_id_status is 'unverified'
          return mappedStatus === 'Processing' && orderIdStatus === 'unverified';
        }
        
        if (activeTab === 'Shipped') {
          // "Shipped" tab: Show orders where:
          // - Status is Out_for_Delivery or Shipped OR
          // - (order_id_status is 'verified' AND status is Processing or Pickup_Ready)
          if (mappedStatus === 'Shipped') {
            return true;
          }
          if (mappedStatus === 'Processing' && orderIdStatus === 'verified') {
            return true;
          }
          return false;
        }
        
        return mappedStatus === activeTab;
      });
      
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(order => 
          order.orderNumber.toLowerCase().includes(query) ||
          order.user?.name?.toLowerCase().includes(query) ||
          order.user?.email?.toLowerCase().includes(query)
        );
      }
      
      setFilteredOrders(filtered);
      console.log(`📊 Filtered orders for ${activeTab}:`, filtered.length);
    } else {
      setFilteredOrders([]);
    }
  }, [orders, activeTab, searchQuery]);

  useEffect(() => {
    fetchOrders();
    fetchStats();
    setupSocketConnection();
  }, [fetchOrders, fetchStats, setupSocketConnection]);

  // 🎯 POLLING: Check for order_id_status updates for orders in "Ready to Ship" tab
  useEffect(() => {
    // Only poll when on "Ready to Ship" tab
    if (activeTab !== 'Processing') {
      return;
    }

    // Find orders that need polling (unverified orders in Ready to Ship tab)
    const unverifiedOrders = orders.filter(order => {
      // Skip cancelled and delivered orders
      if (order.status === 'Cancelled' || order.status === 'Delivered') {
        return false;
      }
      const mappedStatus = mapStatusForDisplay(order.status);
      const orderIdStatus = order.order_id_status || 'unverified';
      return mappedStatus === 'Processing' && orderIdStatus === 'unverified';
    });

    // If no unverified orders, don't poll
    if (unverifiedOrders.length === 0) {
      return;
    }

    console.log(`🔄 Polling ${unverifiedOrders.length} unverified order(s) for status updates...`);

    // Set up polling interval (every 5 seconds)
    const pollInterval = setInterval(() => {
      fetchOrders();
    }, 5000);

    // Cleanup interval on unmount, tab change, or when orders update
    return () => {
      clearInterval(pollInterval);
    };
  }, [activeTab, orders.length, fetchOrders]); // Use orders.length instead of orders to reduce re-renders

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      setProcessingOrder(orderId);
      console.log('🔄 Updating order status:', { orderId, newStatus });
      
      const response = await orderService.updateOrderStatus(orderId, newStatus);
      
      if (response.success) {
        toast.success(`Order status updated to ${newStatus}`);
        fetchOrders();
      } else {
        toast.error(response.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      toast.error('Error updating order status');
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleGenerateLabel = async (orderId) => {
    try {
      setGeneratingLabel(orderId);
      console.log('🏷️ Generating shipping label for order:', orderId);
      
      const response = await orderService.generateShippingLabel(orderId);
      
      if (response.success) {
        toast.success(
          <div className="flex items-center">
            <span className="text-2xl mr-2">🏷️</span>
            <div>
              <p className="font-bold">Label Generated!</p>
              <p className="text-sm">Tracking: {response.data.trackingNumber}</p>
            </div>
          </div>,
          { autoClose: 8000 }
        );
        fetchOrders(); // Refresh orders to show label status
      } else {
        toast.error(response.message || 'Failed to generate shipping label');
      }
    } catch (error) {
      console.error('❌ Error generating shipping label:', error);
      toast.error('Error generating shipping label');
    } finally {
      setGeneratingLabel(null);
    }
  };

  const handleDownloadLabel = async (orderId) => {
    try {
      console.log('📥 Downloading shipping label for order:', orderId);
      
      const response = await orderService.downloadShippingLabel(orderId);
      
      if (response.success) {
        toast.success('Shipping label downloaded successfully');
      } else {
        toast.error(response.message || 'Failed to download shipping label');
      }
    } catch (error) {
      console.error('❌ Error downloading shipping label:', error);
      toast.error('Error downloading shipping label');
    }
  };

  const handlePreviewLabel = (orderId) => {
    setLabelPreview({ isOpen: true, orderId });
  };

  const handleCloseLabelPreview = () => {
    setLabelPreview({ isOpen: false, orderId: null });
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

  return (
    <SellerLayout>
      <div className="orders-page">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Orders Management</h1>
            <p className="text-gray-600 mt-1">
              Manage and track all your orders
              {socketConnected && (
                <span className="ml-2 inline-flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></span>
                  <span className="text-xs text-green-600">Live updates</span>
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {stats && (
              <div className="bg-white rounded-lg shadow-sm p-4 border">
                <div className="text-sm text-gray-500">Today's Orders</div>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.todayOrdersCount || 0}
                </div>
              </div>
            )}
            
            <button
              onClick={() => {
                fetchOrders();
                fetchStats();
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {statusTabs.map((tab) => {
              const count = stats.statusCounts?.[tab.key] || 0;
              return (
                <div
                  key={tab.key}
                  className={`bg-white rounded-lg shadow-sm p-4 border cursor-pointer transition-all hover:shadow-md ${
                    activeTab === tab.key ? 'ring-2 ring-orange-500 border-orange-300' : 'border-gray-200'
                  }`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{tab.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{count}</p>
                    </div>
                    <div className="text-2xl">{tab.icon}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {statusTabs.map((tab) => {
              const count = stats?.statusCounts?.[tab.key] || 0;
              const isActive = activeTab === tab.key;
              
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    isActive
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
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

        <div className="bg-white rounded-lg shadow-sm">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <span className="ml-3 text-gray-600">Loading orders...</span>
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <div key={order._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order.orderNumber}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(mapStatusForDisplay(order.status))}`}>
                          {mapStatusForDisplay(order.status)}
                        </span>
                        {order.shippingLabel?.isGenerated && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                            Label Generated
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">₹{order.totalPrice}</p>
                      <p className="text-sm text-gray-600">{order.paymentMethod}</p>
                      {order.shippingLabel?.trackingNumber && (
                        <p className="text-xs text-blue-600 font-medium mt-1">
                          Tracking: {order.shippingLabel.trackingNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Customer Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Name: </span>
                        <span className="font-medium">{order.user?.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Email: </span>
                        <span className="font-medium">{order.user?.email}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Phone: </span>
                        <span className="font-medium">{order.user?.mobileNumber || order.shippingAddress?.phone}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">City: </span>
                        <span className="font-medium">{order.shippingAddress?.city}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Order Items</h4>
                    <div className="space-y-2">
                      {order.orderItems?.map((item, index) => (
                        <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            {item.image ? (
                              <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-600">
                              Qty: {item.quantity} | Size: {item.size} | Color: {item.color}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₹{item.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {mapStatusForDisplay(order.status) === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(order._id, 'Processing')}
                          disabled={processingOrder === order._id}
                          className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded text-sm font-medium flex items-center"
                        >
                          {processingOrder === order._id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          ) : null}
                          Mark Ready to Ship
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(order._id, 'Cancelled')}
                          disabled={processingOrder === order._id}
                          className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2 rounded text-sm font-medium"
                        >
                          Cancel Order
                        </button>
                      </>
                    )}
                    
                    {mapStatusForDisplay(order.status) === 'Processing' && (
                      <div className="flex space-x-2">
                        {!order.shippingLabel?.isGenerated ? (
                          <button
                            onClick={() => handleGenerateLabel(order._id)}
                            disabled={generatingLabel === order._id}
                            className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded text-sm font-medium flex items-center"
                          >
                            {generatingLabel === order._id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                            ) : (
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                              </svg>
                            )}
                            Generate Label
                          </button>
                        ) : (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handlePreviewLabel(order._id)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium flex items-center"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Preview
                            </button>
                            <button
                              onClick={() => handleDownloadLabel(order._id)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm font-medium flex items-center"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Download
                            </button>
                          </div>
                        )}
                        
                        <button
                          onClick={() => handleStatusUpdate(order._id, 'Shipped')}
                          disabled={processingOrder === order._id || !order.shippingLabel?.isGenerated}
                          className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white px-4 py-2 rounded text-sm font-medium flex items-center"
                        >
                          {processingOrder === order._id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          ) : null}
                          Mark as Shipped
                        </button>
                      </div>
                    )}
                    
                    {mapStatusForDisplay(order.status) === 'Shipped' && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'Delivered')}
                        disabled={processingOrder === order._id}
                        className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded text-sm font-medium flex items-center"
                      >
                        {processingOrder === order._id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        ) : null}
                        Mark as Delivered
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-600 text-lg mb-2">No {activeTab.toLowerCase()} orders found</p>
              <p className="text-gray-500 text-sm">
                {searchQuery ? (
                  `No orders found matching "${searchQuery}"`
                ) : activeTab === 'Pending' ? (
                  'New orders will appear here when customers make purchases.'
                ) : (
                  `No orders with ${activeTab.toLowerCase()} status at the moment.`
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Label Preview Modal */}
      <LabelPreview
        orderId={labelPreview.orderId}
        isOpen={labelPreview.isOpen}
        onClose={handleCloseLabelPreview}
      />
    </SellerLayout>
  );
};

export default Orders;