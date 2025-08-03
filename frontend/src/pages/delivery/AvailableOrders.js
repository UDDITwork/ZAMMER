// frontend/src/pages/delivery/AvailableOrders.js - Fixed to use AuthContext

import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../../contexts/AuthContext';

const AvailableOrders = () => {
  const [availableOrders, setAvailableOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  
  const navigate = useNavigate();
  const { deliveryAgentAuth, logoutDeliveryAgent } = useContext(AuthContext);

  // Check authentication
  useEffect(() => {
    if (!deliveryAgentAuth.isAuthenticated || !deliveryAgentAuth.deliveryAgent) {
      console.log('🚚 [AVAILABLE-ORDERS] Not authenticated, redirecting to login');
      navigate('/delivery/login');
      return;
    }

    loadAvailableOrders();
  }, [navigate, deliveryAgentAuth]);

  // Load available orders
  const loadAvailableOrders = async () => {
    try {
      setLoading(true);
      const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
      
      if (!token) {
        console.error('🚚 [AVAILABLE-ORDERS] No token available');
        navigate('/delivery/login');
        return;
      }

      console.log('🚚 [AVAILABLE-ORDERS] Fetching available orders...');

      const response = await fetch('http://localhost:5001/api/delivery/orders/available', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [AVAILABLE-ORDERS] Orders fetched successfully:', data.count || 0);
        setAvailableOrders(data.data || []);
      } else {
        console.error('❌ [AVAILABLE-ORDERS] Failed to fetch orders:', response.status);
        if (response.status === 401) {
          logoutDeliveryAgent();
          navigate('/delivery/login');
        } else {
          toast.error('Failed to load available orders');
        }
      }
    } catch (error) {
      console.error('❌ [AVAILABLE-ORDERS] Error fetching orders:', error);
      toast.error('Failed to load available orders');
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAvailableOrders();
    setRefreshing(false);
  };

  // Handle accept order
  const handleAcceptOrder = async (orderId) => {
    setAccepting(orderId);
    try {
      const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
      
      console.log('🚚 [AVAILABLE-ORDERS] Accepting order:', orderId);
      
      const response = await fetch(`http://localhost:5001/api/delivery/orders/${orderId}/accept`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Order accepted successfully!');
        console.log('✅ [AVAILABLE-ORDERS] Order accepted:', orderId);
        loadAvailableOrders(); // Refresh orders
        // Navigate to order details
        navigate(`/delivery/orders/${orderId}/pickup`);
      } else {
        console.error('❌ [AVAILABLE-ORDERS] Failed to accept order:', data.message);
        toast.error(data.message || 'Failed to accept order');
      }
    } catch (error) {
      console.error('❌ [AVAILABLE-ORDERS] Error accepting order:', error);
      toast.error('Failed to accept order');
    } finally {
      setAccepting(null);
    }
  };

  // Toggle availability
  const handleGoAvailable = async () => {
    try {
      const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
      
      const response = await fetch('http://localhost:5001/api/delivery/availability', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setIsAvailable(data.data.isAvailable);
        toast.success(`You are now ${data.data.isAvailable ? 'available' : 'unavailable'} for orders`);
        if (data.data.isAvailable) {
          loadAvailableOrders();
        }
      } else {
        toast.error('Failed to update availability');
      }
    } catch (error) {
      console.error('❌ [AVAILABLE-ORDERS] Error toggling availability:', error);
      toast.error('Failed to update availability');
    }
  };

  const handleLogout = () => {
    logoutDeliveryAgent();
    navigate('/delivery/login');
    toast.success('Logged out successfully');
  };

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <Link to="/delivery/dashboard" className="text-orange-600 hover:text-orange-500 mr-4">
                  ← Back to Dashboard
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">🚚 Available Orders</h1>
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
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading available orders...</p>
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
              <Link to="/delivery/dashboard" className="text-orange-600 hover:text-orange-500 mr-4">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">🚚 Available Orders</h1>
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
                Available Orders
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {availableOrders.length} orders ready for pickup
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
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

        {/* Availability Warning */}
        {!isAvailable && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  You are currently unavailable for new orders. 
                  <button
                    onClick={handleGoAvailable}
                    className="font-medium underline hover:text-yellow-800 ml-1"
                  >
                    Go available
                  </button>
                  {' '}to start accepting orders.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Orders List */}
        {availableOrders.length > 0 ? (
          <div className="space-y-6">
            {availableOrders.map((order) => (
              <div key={order._id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {/* Order Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M8 11v6h8v-6M8 11H6a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2v-6a2 2 0 00-2-2h-2" />
                              </svg>
                            </div>
                          </div>
                          <div className="ml-4">
                            <h3 className="text-lg font-medium text-gray-900">
                              Order #{order.orderNumber}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Customer: {order.user?.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-lg font-semibold text-green-600">₹{order.deliveryFees?.agentEarning || '50'}</p>
                            <p className="text-sm text-gray-500">Delivery fee</p>
                          </div>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {order.status}
                          </span>
                        </div>
                      </div>

                      {/* Order Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        {/* Pickup Location */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Pickup Location</h4>
                          <div className="bg-gray-50 rounded-md p-3">
                            <p className="text-sm font-medium text-gray-900">{order.seller?.firstName || 'Seller'}</p>
                            <p className="text-sm text-gray-600">{order.seller?.shop?.address || 'Pickup address'}</p>
                            {order.seller?.phoneNumber && (
                              <p className="text-sm text-gray-600 mt-1">📞 {order.seller.phoneNumber}</p>
                            )}
                          </div>
                        </div>

                        {/* Delivery Location */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Delivery Location</h4>
                          <div className="bg-gray-50 rounded-md p-3">
                            <p className="text-sm font-medium text-gray-900">{order.user?.name}</p>
                            <p className="text-sm text-gray-600">
                              {order.shippingAddress?.address || order.deliveryAddress?.address}
                            </p>
                            <p className="text-sm text-gray-600">{order.shippingAddress?.city || order.deliveryAddress?.city}</p>
                            {order.user?.phone && (
                              <p className="text-sm text-gray-600 mt-1">📞 {order.user.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Order Items ({order.orderItems?.length || 0})</h4>
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
                          <span>Created: {new Date(order.createdAt).toLocaleDateString()}</span>
                          {order.estimatedDelivery && (
                            <>
                              <span>•</span>
                              <span>Est. delivery: {new Date(order.estimatedDelivery.estimatedAt).toLocaleTimeString()}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleAcceptOrder(order._id)}
                          disabled={accepting === order._id || !isAvailable}
                          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            !isAvailable
                              ? 'bg-gray-400 cursor-not-allowed'
                              : accepting === order._id
                              ? 'bg-orange-400 cursor-not-allowed'
                              : 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                          }`}
                        >
                          {accepting === order._id ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Accepting...
                            </>
                          ) : !isAvailable ? (
                            'Go Available First'
                          ) : (
                            'Accept Order'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No available orders</h3>
            <p className="mt-1 text-sm text-gray-500">
              {isAvailable 
                ? "There are no orders available for pickup right now. Check back in a few minutes." 
                : "Go available to see orders waiting for delivery."
              }
            </p>
            <div className="mt-6">
              {!isAvailable ? (
                <button
                  onClick={handleGoAvailable}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Go Available
                </button>
              ) : (
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                >
                  {refreshing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Refreshing...
                    </>
                  ) : (
                    'Refresh Orders'
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailableOrders;