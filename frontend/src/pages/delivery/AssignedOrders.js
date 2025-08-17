// frontend/src/pages/delivery/AssignedOrders.js - Assigned Orders Management

import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../../contexts/AuthContext';

const AssignedOrders = () => {
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingOrder, setProcessingOrder] = useState(null);
  const [actionType, setActionType] = useState(null); // 'pickup' or 'delivery'
  
  // Modal states
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Form states
  const [pickupForm, setPickupForm] = useState({
    orderIdVerification: '',
    pickupNotes: ''
  });
  const [deliveryForm, setDeliveryForm] = useState({
    otp: '',
    deliveryNotes: '',
    customerSignature: ''
  });
  
  const navigate = useNavigate();
  const { deliveryAgentAuth, logoutDeliveryAgent } = useContext(AuthContext);

  // Check authentication
  useEffect(() => {
    if (!deliveryAgentAuth.isAuthenticated || !deliveryAgentAuth.deliveryAgent) {
      console.log('🚚 [ASSIGNED-ORDERS] Not authenticated, redirecting to login');
      navigate('/delivery/login');
      return;
    }

    loadAssignedOrders();
  }, [navigate, deliveryAgentAuth]);

  // Load assigned orders
  const loadAssignedOrders = async () => {
    try {
      setLoading(true);
      const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
      
      if (!token) {
        console.error('🚚 [ASSIGNED-ORDERS] No token available');
        navigate('/delivery/login');
        return;
      }

      console.log('🚚 [ASSIGNED-ORDERS] Fetching assigned orders...');

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/delivery/orders/assigned`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [ASSIGNED-ORDERS] Orders fetched successfully:', data.count || 0);
        setAssignedOrders(data.data || []);
      } else {
        console.error('❌ [ASSIGNED-ORDERS] Failed to fetch orders:', response.status);
        if (response.status === 401) {
          logoutDeliveryAgent();
          navigate('/delivery/login');
        } else {
          toast.error('Failed to load assigned orders');
        }
      }
    } catch (error) {
      console.error('❌ [ASSIGNED-ORDERS] Error fetching orders:', error);
      toast.error('Failed to load assigned orders');
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAssignedOrders();
    setRefreshing(false);
  };

  // Handle pickup completion
  const handlePickupComplete = async () => {
    if (!selectedOrder || !pickupForm.orderIdVerification.trim()) {
      toast.error('Please enter order ID verification');
      return;
    }

    setProcessingOrder(selectedOrder._id);
    setActionType('pickup');

    try {
      const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
      
      console.log('🚚 [ASSIGNED-ORDERS] Completing pickup for order:', selectedOrder._id);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/delivery/orders/${selectedOrder._id}/pickup`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderIdVerification: pickupForm.orderIdVerification,
          pickupNotes: pickupForm.pickupNotes
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Pickup completed successfully!');
        console.log('✅ [ASSIGNED-ORDERS] Pickup completed:', selectedOrder._id);
        
        // Reset form and close modal
        setPickupForm({ orderIdVerification: '', pickupNotes: '' });
        setShowPickupModal(false);
        setSelectedOrder(null);
        
        // Refresh orders
        loadAssignedOrders();
      } else {
        console.error('❌ [ASSIGNED-ORDERS] Failed to complete pickup:', data.message);
        toast.error(data.message || 'Failed to complete pickup');
      }
    } catch (error) {
      console.error('❌ [ASSIGNED-ORDERS] Error completing pickup:', error);
      toast.error('Failed to complete pickup');
    } finally {
      setProcessingOrder(null);
      setActionType(null);
    }
  };

  // Handle delivery completion
  const handleDeliveryComplete = async () => {
    if (!selectedOrder || !deliveryForm.otp.trim()) {
      toast.error('Please enter OTP from customer');
      return;
    }

    setProcessingOrder(selectedOrder._id);
    setActionType('delivery');

    try {
      const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
      
      console.log('🚚 [ASSIGNED-ORDERS] Completing delivery for order:', selectedOrder._id);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/delivery/orders/${selectedOrder._id}/deliver`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          otp: deliveryForm.otp,
          deliveryNotes: deliveryForm.deliveryNotes,
          customerSignature: deliveryForm.customerSignature
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Delivery completed successfully!');
        console.log('✅ [ASSIGNED-ORDERS] Delivery completed:', selectedOrder._id);
        
        // Reset form and close modal
        setDeliveryForm({ otp: '', deliveryNotes: '', customerSignature: '' });
        setShowDeliveryModal(false);
        setSelectedOrder(null);
        
        // Refresh orders
        loadAssignedOrders();
      } else {
        console.error('❌ [ASSIGNED-ORDERS] Failed to complete delivery:', data.message);
        toast.error(data.message || 'Failed to complete delivery');
      }
    } catch (error) {
      console.error('❌ [ASSIGNED-ORDERS] Error completing delivery:', error);
      toast.error('Failed to complete delivery');
    } finally {
      setProcessingOrder(null);
      setActionType(null);
    }
  };

  // Open pickup modal
  const openPickupModal = (order) => {
    setSelectedOrder(order);
    setPickupForm({ 
      orderIdVerification: order.orderNumber || '',
      pickupNotes: '' 
    });
    setShowPickupModal(true);
  };

  // Open delivery modal
  const openDeliveryModal = (order) => {
    setSelectedOrder(order);
    setDeliveryForm({ 
      otp: '',
      deliveryNotes: '',
      customerSignature: '' 
    });
    setShowDeliveryModal(true);
  };

  const handleLogout = () => {
    logoutDeliveryAgent();
    navigate('/delivery/login');
    toast.success('Logged out successfully');
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-orange-100 text-orange-800';
      case 'pickup_completed': return 'bg-purple-100 text-purple-800';
      case 'delivery_completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get next action for order
  const getNextAction = (order) => {
    switch (order.deliveryStatus) {
      case 'assigned':
      case 'accepted':
        return !order.pickup?.isCompleted ? 'pickup' : 'delivery';
      case 'pickup_completed':
        return 'delivery';
      default:
        return null;
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <Link to="/delivery/dashboard" className="text-blue-600 hover:text-blue-500 mr-4">
                  ← Back to Dashboard
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">📋 My Assigned Orders</h1>
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
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading assigned orders...</p>
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
              <Link to="/delivery/dashboard" className="text-blue-600 hover:text-blue-500 mr-4">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">📋 My Assigned Orders</h1>
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
                My Assigned Orders
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {assignedOrders.length} orders in progress
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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

        {/* Orders List */}
        {assignedOrders.length > 0 ? (
          <div className="space-y-6">
            {assignedOrders.map((order) => {
              const nextAction = getNextAction(order);
              const isProcessing = processingOrder === order._id;
              
              return (
                <div key={order._id} className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="px-6 py-4">
                    {/* Order Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                          <p className="text-sm text-gray-500">Your earnings</p>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(order.deliveryStatus)}`}>
                          {order.deliveryStatus?.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Progress Indicator */}
                    <div className="mb-6">
                      <div className="flex items-center">
                        <div className={`flex items-center ${order.deliveryStatus === 'assigned' || order.deliveryStatus === 'accepted' ? 'text-blue-600' : 'text-green-500'}`}>
                          <div className={`w-4 h-4 rounded-full border-2 ${order.deliveryStatus === 'assigned' || order.deliveryStatus === 'accepted' ? 'border-blue-600 bg-blue-600' : 'border-green-500 bg-green-500'}`}></div>
                          <span className="ml-2 text-sm font-medium">Assigned</span>
                        </div>
                        <div className={`flex-1 h-0.5 mx-4 ${order.pickup?.isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <div className={`flex items-center ${order.pickup?.isCompleted ? 'text-green-500' : 'text-gray-400'}`}>
                          <div className={`w-4 h-4 rounded-full border-2 ${order.pickup?.isCompleted ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}></div>
                          <span className="ml-2 text-sm font-medium">Picked Up</span>
                        </div>
                        <div className={`flex-1 h-0.5 mx-4 ${order.delivery?.isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <div className={`flex items-center ${order.delivery?.isCompleted ? 'text-green-500' : 'text-gray-400'}`}>
                          <div className={`w-4 h-4 rounded-full border-2 ${order.delivery?.isCompleted ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}></div>
                          <span className="ml-2 text-sm font-medium">Delivered</span>
                        </div>
                      </div>
                    </div>

                    {/* Order Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      {/* Pickup Location */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">📍 Pickup from Seller</h4>
                        <div className="bg-orange-50 rounded-md p-3">
                          <p className="text-sm font-medium text-gray-900">{order.seller?.name}</p>
                          <p className="text-sm text-gray-600">{order.seller?.shopName}</p>
                          <p className="text-sm text-gray-600">{order.seller?.address}</p>
                          {order.seller?.phone && (
                            <p className="text-sm text-orange-600 mt-1">📞 {order.seller.phone}</p>
                          )}
                        </div>
                      </div>

                      {/* Delivery Location */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">🏠 Deliver to Customer</h4>
                        <div className="bg-blue-50 rounded-md p-3">
                          <p className="text-sm font-medium text-gray-900">{order.user?.name}</p>
                          <p className="text-sm text-gray-600">
                            {order.shippingAddress?.address}
                          </p>
                          <p className="text-sm text-gray-600">{order.shippingAddress?.city}</p>
                          {order.user?.phone && (
                            <p className="text-sm text-blue-600 mt-1">📞 {order.user.phone}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">📦 Order Items ({order.orderItems?.length || 0})</h4>
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
                        <span>Assigned: {new Date(order.assignedAt).toLocaleDateString()}</span>
                        {order.estimatedDelivery && (
                          <>
                            <span>•</span>
                            <span>Est. delivery: {new Date(order.estimatedDelivery).toLocaleTimeString()}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3">
                      {nextAction === 'pickup' && (
                        <button
                          onClick={() => openPickupModal(order)}
                          disabled={isProcessing}
                          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            isProcessing && actionType === 'pickup'
                              ? 'bg-orange-400 cursor-not-allowed'
                              : 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                          }`}
                        >
                          {isProcessing && actionType === 'pickup' ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Completing...
                            </>
                          ) : (
                            '📦 Complete Pickup'
                          )}
                        </button>
                      )}
                      
                      {nextAction === 'delivery' && (
                        <button
                          onClick={() => openDeliveryModal(order)}
                          disabled={isProcessing}
                          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            isProcessing && actionType === 'delivery'
                              ? 'bg-green-400 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                          }`}
                        >
                          {isProcessing && actionType === 'delivery' ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Completing...
                            </>
                          ) : (
                            '🚚 Complete Delivery'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No assigned orders</h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have any orders assigned to you right now. Check the available orders to accept new deliveries.
            </p>
            <div className="mt-6">
              <Link
                to="/delivery/orders/available"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                View Available Orders
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Pickup Completion Modal */}
      {showPickupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📦 Complete Pickup</h2>
            <p className="text-sm text-gray-600 mb-4">
              Order: <strong>#{selectedOrder?.orderNumber}</strong>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order ID Verification <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={pickupForm.orderIdVerification}
                  onChange={(e) => setPickupForm(prev => ({ ...prev, orderIdVerification: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter order ID from seller"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Notes (optional)
                </label>
                <textarea
                  value={pickupForm.pickupNotes}
                  onChange={(e) => setPickupForm(prev => ({ ...prev, pickupNotes: e.target.value }))}
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
                  setPickupForm({ orderIdVerification: '', pickupNotes: '' });
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePickupComplete}
                disabled={processingOrder === selectedOrder?._id}
                className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                {processingOrder === selectedOrder?._id ? 'Processing...' : 'Complete Pickup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Completion Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🚚 Complete Delivery</h2>
            <p className="text-sm text-gray-600 mb-4">
              Order: <strong>#{selectedOrder?.orderNumber}</strong>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OTP from Customer <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={deliveryForm.otp}
                  onChange={(e) => setDeliveryForm(prev => ({ ...prev, otp: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter 4-6 digit OTP"
                  maxLength="6"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Notes (optional)
                </label>
                <textarea
                  value={deliveryForm.deliveryNotes}
                  onChange={(e) => setDeliveryForm(prev => ({ ...prev, deliveryNotes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  setDeliveryForm({ otp: '', deliveryNotes: '', customerSignature: '' });
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeliveryComplete}
                disabled={processingOrder === selectedOrder?._id}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                {processingOrder === selectedOrder?._id ? 'Processing...' : 'Complete Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignedOrders;