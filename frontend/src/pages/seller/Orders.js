import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import SellerLayout from '../../components/layouts/SellerLayout';
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

  const statusTabs = [
    { key: 'Pending', label: 'Pending', icon: '⏳', color: 'yellow' },
    { key: 'Processing', label: 'Ready to Ship', icon: '📦', color: 'blue' },
    { key: 'Shipped', label: 'Shipped', icon: '🚚', color: 'purple' },
    { key: 'Delivered', label: 'Delivered', icon: '✅', color: 'green' },
    { key: 'Cancelled', label: 'Cancelled', icon: '❌', color: 'red' }
  ];

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
      toast.info(`Order #${data.data.orderNumber} status updated to ${data.data.status}`);
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
        if (activeTab === 'Processing') {
          return order.status === 'Processing';
        }
        return order.status === activeTab;
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
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">₹{order.totalPrice}</p>
                      <p className="text-sm text-gray-600">{order.paymentMethod}</p>
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
                    {order.status === 'Pending' && (
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
                    
                    {order.status === 'Processing' && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'Shipped')}
                        disabled={processingOrder === order._id}
                        className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white px-4 py-2 rounded text-sm font-medium flex items-center"
                      >
                        {processingOrder === order._id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        ) : null}
                        Mark as Shipped
                      </button>
                    )}
                    
                    {order.status === 'Shipped' && (
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
    </SellerLayout>
  );
};

export default Orders;