// frontend/src/pages/delivery/DeliveryDashboard.js - COMPLETE Delivery Agent Dashboard
// 🎯 ADDED: Complete delivery agent interface with order management
// 🎯 ADDED: Order acceptance, pickup, and delivery functionality
// 🎯 ADDED: Real-time order notifications and status updates

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import deliveryService from '../../services/deliveryService';
import socketService from '../../services/socketService';

const DeliveryDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [agentStatus, setAgentStatus] = useState('available');
  
  // Order action states
  const [accepting, setAccepting] = useState(false);
  const [pickupData, setPickupData] = useState({ orderId: '', notes: '' });
  const [deliveryData, setDeliveryData] = useState({ orderId: '', otp: '', notes: '' });
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  
  // 🆕 NEW: Profile and logout states
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'profile'
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const { deliveryAgentAuth, logoutDeliveryAgent } = useAuth();

  // Enhanced logging for delivery operations
  const logDelivery = (action, data, type = 'info') => {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '#2196F3',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336'
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `%c[DELIVERY-DASHBOARD] ${timestamp} - ${action}`,
        `color: ${colors[type]}; font-weight: bold;`,
        data
      );
    }
  };

  useEffect(() => {
    if (deliveryAgentAuth.isAuthenticated) {
      initializeDashboard();
    }
  }, [deliveryAgentAuth.isAuthenticated]);

  // 🆕 NEW: Load profile data
  const loadProfileData = async () => {
    try {
      setProfileLoading(true);
      const response = await deliveryService.getProfile();
      if (response.success) {
        setProfileData(response.data);
        logDelivery('PROFILE_LOADED', { agentId: response.data._id }, 'success');
      }
    } catch (error) {
      logDelivery('PROFILE_LOAD_ERROR', { error: error.message }, 'error');
      toast.error('Failed to load profile data');
    } finally {
      setProfileLoading(false);
    }
  };

  // 🆕 NEW: Handle logout
  const handleLogout = async () => {
    try {
      logDelivery('LOGOUT_STARTED', { agentId: deliveryAgentAuth.deliveryAgent?._id });
      
      // Disconnect socket
      await socketService.disconnect();
      
      // Logout from service
      await deliveryService.logoutDeliveryAgent();
      
      // Clear auth context
      logoutDeliveryAgent();
      
      logDelivery('LOGOUT_SUCCESS', { agentId: deliveryAgentAuth.deliveryAgent?._id }, 'success');
      toast.success('Logged out successfully');
      
    } catch (error) {
      logDelivery('LOGOUT_ERROR', { error: error.message }, 'error');
      toast.error('Logout failed. Please try again.');
    }
  };

  // 🆕 NEW: Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'profile' && !profileData) {
      loadProfileData();
    }
  };

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      logDelivery('DASHBOARD_INIT_START', { agentId: deliveryAgentAuth.deliveryAgent?._id });

      await Promise.all([
        fetchStats(),
        fetchAvailableOrders(),
        fetchAssignedOrders(),
        setupSocketConnection()
      ]);

      logDelivery('DASHBOARD_INIT_SUCCESS', { agentId: deliveryAgentAuth.deliveryAgent?._id }, 'success');
    } catch (error) {
      logDelivery('DASHBOARD_INIT_ERROR', { error: error.message }, 'error');
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const setupSocketConnection = async () => {
    try {
      logDelivery('SOCKET_SETUP_START');
      await socketService.connect();
      
      // Join delivery agent room
      if (deliveryAgentAuth.deliveryAgent?._id) {
        socketService.joinDeliveryRoom(deliveryAgentAuth.deliveryAgent._id);
        
        // Listen for order assignments
        socketService.onDeliveryAssignment((data) => {
          logDelivery('ORDER_ASSIGNMENT_RECEIVED', data.data, 'success');
          toast.success(`New order assigned: ${data.data.orderNumber}`);
          fetchAvailableOrders();
          fetchAssignedOrders();
        });

        logDelivery('SOCKET_SETUP_SUCCESS', { agentId: deliveryAgentAuth.deliveryAgent._id }, 'success');
      }
    } catch (error) {
      logDelivery('SOCKET_SETUP_ERROR', { error: error.message }, 'error');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await deliveryService.getDeliveryStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      const response = await deliveryService.getAvailableOrders();
      if (response.success) {
        setAvailableOrders(response.data);
        logDelivery('AVAILABLE_ORDERS_FETCHED', { count: response.data.length }, 'success');
      }
    } catch (error) {
      console.error('Failed to fetch available orders:', error);
    }
  };

  const fetchAssignedOrders = async () => {
    try {
      const response = await deliveryService.getAssignedOrders();
      if (response.success) {
        setAssignedOrders(response.data);
        logDelivery('ASSIGNED_ORDERS_FETCHED', { count: response.data.length }, 'success');
      }
    } catch (error) {
      console.error('Failed to fetch assigned orders:', error);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      setAccepting(true);
      logDelivery('ORDER_ACCEPT_START', { orderId });

      const response = await deliveryService.acceptOrder(orderId);
      
      if (response.success) {
        toast.success('Order accepted successfully!');
        logDelivery('ORDER_ACCEPT_SUCCESS', { orderId }, 'success');
        
        // Refresh data
        fetchAvailableOrders();
        fetchAssignedOrders();
        fetchStats();
      } else {
        throw new Error(response.message || 'Failed to accept order');
      }
    } catch (error) {
      logDelivery('ORDER_ACCEPT_ERROR', { orderId, error: error.message }, 'error');
      toast.error(error.message || 'Failed to accept order');
    } finally {
      setAccepting(false);
    }
  };

  const handlePickupComplete = async () => {
    try {
      logDelivery('PICKUP_COMPLETE_START', pickupData);

      if (!pickupData.orderId) {
        toast.error('Please enter order ID');
        return;
      }

      const response = await deliveryService.completePickup(pickupData.orderId, {
        notes: pickupData.notes,
        pickedUpAt: new Date()
      });

      if (response.success) {
        toast.success('Pickup completed successfully!');
        logDelivery('PICKUP_COMPLETE_SUCCESS', pickupData, 'success');
        
        setShowPickupModal(false);
        setPickupData({ orderId: '', notes: '' });
        
        // Refresh data
        fetchAssignedOrders();
        fetchStats();
      } else {
        throw new Error(response.message || 'Failed to complete pickup');
      }
    } catch (error) {
      logDelivery('PICKUP_COMPLETE_ERROR', { pickupData, error: error.message }, 'error');
      toast.error(error.message || 'Failed to complete pickup');
    }
  };

  const handleDeliveryComplete = async () => {
    try {
      logDelivery('DELIVERY_COMPLETE_START', deliveryData);

      if (!deliveryData.orderId || !deliveryData.otp) {
        toast.error('Please enter order ID and OTP');
        return;
      }

      const response = await deliveryService.completeDelivery(deliveryData.orderId, {
        otp: deliveryData.otp,
        notes: deliveryData.notes,
        deliveredAt: new Date()
      });

      if (response.success) {
        toast.success('Delivery completed successfully!');
        logDelivery('DELIVERY_COMPLETE_SUCCESS', deliveryData, 'success');
        
        setShowDeliveryModal(false);
        setDeliveryData({ orderId: '', otp: '', notes: '' });
        
        // Refresh data
        fetchAssignedOrders();
        fetchStats();
      } else {
        throw new Error(response.message || 'Failed to complete delivery');
      }
    } catch (error) {
      logDelivery('DELIVERY_COMPLETE_ERROR', { deliveryData, error: error.message }, 'error');
      toast.error(error.message || 'Failed to complete delivery');
    }
  };

  const toggleAvailability = async () => {
    try {
      const response = await deliveryService.toggleAvailability();
      if (response.success) {
        setAgentStatus(response.data.isAvailable ? 'available' : 'offline');
        toast.success(`Status changed to ${response.data.isAvailable ? 'Available' : 'Offline'}`);
      }
    } catch (error) {
      toast.error('Failed to update availability');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Order Card Component
  const OrderCard = ({ order, isAssigned = false }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">Order #{order.orderNumber}</h3>
          <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          order.status === 'approved' ? 'bg-blue-100 text-blue-800' :
          order.status === 'pickedUp' ? 'bg-purple-100 text-purple-800' :
          order.status === 'inTransit' ? 'bg-orange-100 text-orange-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {order.status?.toUpperCase()}
        </span>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Customer:</span>
          <span className="text-sm font-medium">{order.user?.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Amount:</span>
          <span className="text-sm font-bold text-green-600">{formatCurrency(order.totalPrice)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Items:</span>
          <span className="text-sm">{order.orderItems?.length} items</span>
        </div>
      </div>

      <div className="space-y-2">
        {!isAssigned ? (
          <button
            onClick={() => handleAcceptOrder(order._id)}
            disabled={accepting}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
          >
            {accepting ? 'Accepting...' : 'Accept Order'}
          </button>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => setSelectedOrder(order)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
            >
              View Details
            </button>
            
            {order.status === 'approved' && (
              <button
                onClick={() => {
                  setPickupData({ orderId: order.orderNumber, notes: '' });
                  setShowPickupModal(true);
                }}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
              >
                Complete Pickup
              </button>
            )}
            
            {(order.status === 'pickedUp' || order.status === 'inTransit') && (
              <button
                onClick={() => {
                  setDeliveryData({ orderId: order.orderNumber, otp: '', notes: '' });
                  setShowDeliveryModal(true);
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
              >
                Complete Delivery
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Stats Card Component
  const StatsCard = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  // Pickup Modal
  const PickupModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Complete Pickup</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order ID (from seller)
            </label>
            <input
              type="text"
              value={pickupData.orderId}
              onChange={(e) => setPickupData(prev => ({ ...prev, orderId: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter order ID"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={pickupData.notes}
              onChange={(e) => setPickupData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Any notes about pickup..."
            />
          </div>
        </div>

        <div className="flex space-x-4 mt-6">
          <button
            onClick={() => setShowPickupModal(false)}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePickupComplete}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
          >
            Complete Pickup
          </button>
        </div>
      </div>
    </div>
  );

  // Delivery Modal
  const DeliveryModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Complete Delivery</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order ID
            </label>
            <input
              type="text"
              value={deliveryData.orderId}
              onChange={(e) => setDeliveryData(prev => ({ ...prev, orderId: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter order ID"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OTP (from customer)
            </label>
            <input
              type="text"
              value={deliveryData.otp}
              onChange={(e) => setDeliveryData(prev => ({ ...prev, otp: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter 6-digit OTP"
              maxLength="6"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={deliveryData.notes}
              onChange={(e) => setDeliveryData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows="3"
              placeholder="Any notes about delivery..."
            />
          </div>
        </div>

        <div className="flex space-x-4 mt-6">
          <button
            onClick={() => setShowDeliveryModal(false)}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDeliveryComplete}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
          >
            Complete Delivery
          </button>
        </div>
      </div>
    </div>
  );

  // 🆕 NEW: Profile Tab Component
  const ProfileTab = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">My Profile</h2>
      </div>
      
      <div className="p-6">
        {profileLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        ) : profileData ? (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <p className="mt-1 text-sm text-gray-900">{profileData.name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{profileData.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                  <p className="mt-1 text-sm text-gray-900">{profileData.mobileNumber || profileData.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toLocaleDateString() : 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gender</label>
                  <p className="mt-1 text-sm text-gray-900">{profileData.gender || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Profile Completion</label>
                  <div className="mt-1">
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${profileData.profileCompletion || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{profileData.profileCompletion || 0}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            {profileData.address && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Street</label>
                    <p className="mt-1 text-sm text-gray-900">{profileData.address.street || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Area</label>
                    <p className="mt-1 text-sm text-gray-900">{profileData.address.area || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">City</label>
                    <p className="mt-1 text-sm text-gray-900">{profileData.address.city || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">State</label>
                    <p className="mt-1 text-sm text-gray-900">{profileData.address.state || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Pincode</label>
                    <p className="mt-1 text-sm text-gray-900">{profileData.address.pincode || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle Information */}
            {profileData.vehicleDetails && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vehicle Type</label>
                    <p className="mt-1 text-sm text-gray-900">{profileData.vehicleDetails.type || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vehicle Model</label>
                    <p className="mt-1 text-sm text-gray-900">{profileData.vehicleDetails.model || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Registration Number</label>
                    <p className="mt-1 text-sm text-gray-900">{profileData.vehicleDetails.registrationNumber || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">License Number</label>
                    <p className="mt-1 text-sm text-gray-900">{profileData.documents?.licenseNumber || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Working Areas */}
            {profileData.workingAreas && profileData.workingAreas.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Working Areas</h3>
                <div className="flex flex-wrap gap-2">
                  {profileData.workingAreas.map((area, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency Contact */}
            {profileData.emergencyContact && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Name</label>
                    <p className="mt-1 text-sm text-gray-900">{profileData.emergencyContact.name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Relationship</label>
                    <p className="mt-1 text-sm text-gray-900">{profileData.emergencyContact.relationship || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                    <p className="mt-1 text-sm text-gray-900">{profileData.emergencyContact.mobileNumber || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Verification Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center ${
                    profileData.verificationStatus?.documents === 'verified' ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <svg className={`w-8 h-8 ${
                      profileData.verificationStatus?.documents === 'verified' ? 'text-green-600' : 'text-yellow-600'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900">Documents</p>
                  <p className={`text-xs ${
                    profileData.verificationStatus?.documents === 'verified' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {profileData.verificationStatus?.documents || 'pending'}
                  </p>
                </div>
                
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center ${
                    profileData.verificationStatus?.identity === 'verified' ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <svg className={`w-8 h-8 ${
                      profileData.verificationStatus?.identity === 'verified' ? 'text-green-600' : 'text-yellow-600'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900">Identity</p>
                  <p className={`text-xs ${
                    profileData.verificationStatus?.identity === 'verified' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {profileData.verificationStatus?.identity || 'pending'}
                  </p>
                </div>
                
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center ${
                    profileData.verificationStatus?.vehicle === 'verified' ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <svg className={`w-8 h-8 ${
                      profileData.verificationStatus?.vehicle === 'verified' ? 'text-green-600' : 'text-yellow-600'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900">Vehicle</p>
                  <p className={`text-xs ${
                    profileData.verificationStatus?.vehicle === 'verified' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {profileData.verificationStatus?.vehicle || 'pending'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Not Found</h3>
            <p className="text-gray-600">Unable to load profile data</p>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Delivery Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Status Toggle */}
              <button
                onClick={toggleAvailability}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  agentStatus === 'available' 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
              >
                {agentStatus === 'available' ? '🟢 Available' : '🔴 Offline'}
              </button>
              
              {/* Agent Info */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {deliveryAgentAuth.deliveryAgent?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {deliveryAgentAuth.deliveryAgent?.name}
                </span>
              </div>

              {/* 🆕 NEW: Logout Button */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 🆕 NEW: Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => handleTabChange('profile')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👤 Profile
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatsCard
                title="Total Deliveries"
                value={stats?.total?.deliveries || 0}
                icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>}
                color="bg-blue-500"
              />
              
              <StatsCard
                title="Total Earnings"
                value={formatCurrency(stats?.total?.earnings || 0)}
                icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>}
                color="bg-green-500"
              />
              
              <StatsCard
                title="Assigned Orders"
                value={assignedOrders.length}
                icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                color="bg-orange-500"
              />
              
              <StatsCard
                title="Available Orders"
                value={availableOrders.length}
                icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                color="bg-purple-500"
              />
            </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Assigned Orders */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">My Assigned Orders</h2>
            </div>
            <div className="p-6">
              {assignedOrders.length > 0 ? (
                <div className="space-y-4">
                  {assignedOrders.map((order) => (
                    <OrderCard key={order._id} order={order} isAssigned={true} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Assigned Orders</h3>
                  <p className="text-gray-600">You don't have any assigned orders yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Available Orders */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Available Orders</h2>
            </div>
            <div className="p-6">
              {availableOrders.length > 0 ? (
                <div className="space-y-4">
                  {availableOrders.map((order) => (
                    <OrderCard key={order._id} order={order} isAssigned={false} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Orders</h3>
                  <p className="text-gray-600">Check back later for new delivery opportunities</p>
                </div>
              )}
            </div>
          </div>
        </div>
          </>
        ) : (
          /* 🆕 NEW: Profile Tab Content */
          <ProfileTab />
        )}
      </main>

      {/* Modals */}
      {showPickupModal && <PickupModal />}
      {showDeliveryModal && <DeliveryModal />}
    </div>
  );
};

export default DeliveryDashboard;