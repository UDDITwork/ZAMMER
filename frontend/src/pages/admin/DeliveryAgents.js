// the purpose of this file is to send the data and order hsitory of the delivery agents to admin dashbaord 
// frontend/src/pages/admin/DeliveryAgents.js - Complete Delivery Agent Management
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/layouts/AdminLayout';
import adminService from '../../services/adminService';

const DeliveryAgents = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [agentHistory, setAgentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    vehicleType: 'all',
    isActive: 'all',
    search: ''
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const { adminAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!adminAuth.isAuthenticated) {
      navigate('/admin/login');
      return;
    }
    fetchDeliveryAgents();
  }, [currentPage, filters]);

  const fetchDeliveryAgents = async () => {
    try {
      setLoading(true);
      const response = await adminService.getDeliveryAgents({
        page: currentPage,
        limit: 20,
        status: filters.status !== 'all' ? filters.status : undefined,
        vehicleType: filters.vehicleType !== 'all' ? filters.vehicleType : undefined,
        isActive: filters.isActive !== 'all' ? filters.isActive : undefined
      });

      if (response.success) {
        setAgents(response.data);
        setTotalPages(response.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch delivery agents:', error);
      toast.error('Failed to load delivery agents');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentProfile = async (agentId) => {
    try {
      setHistoryLoading(true);
      const response = await adminService.getDeliveryAgentProfile(agentId);
      
      if (response.success) {
        setSelectedAgent(response.data.agent);
        setAgentHistory(response.data.deliveryHistory || []);
        setShowProfileModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch agent profile:', error);
      toast.error('Failed to load agent profile');
    } finally {
      setHistoryLoading(false);
    }
  };

  const updateAgentStatus = async (agentId, newStatus, isActive) => {
    try {
      const response = await adminService.updateDeliveryAgentStatus(agentId, {
        status: newStatus,
        isActive: isActive
      });

      if (response.success) {
        toast.success('Agent status updated successfully');
        fetchDeliveryAgents();
        if (showProfileModal) {
          fetchAgentProfile(agentId);
        }
      }
    } catch (error) {
      toast.error('Failed to update agent status');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'available': 'bg-green-100 text-green-800',
      'assigned': 'bg-blue-100 text-blue-800',
      'delivering': 'bg-yellow-100 text-yellow-800',
      'offline': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getVehicleIcon = (type) => {
    const icons = {
      'bike': '🏍️',
      'scooter': '🛵',
      'car': '🚗',
      'bicycle': '🚲'
    };
    return icons[type] || '🚚';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
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

  // Agent Card Component
  const AgentCard = ({ agent }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-2xl">
            {getVehicleIcon(agent.vehicleType)}
          </div>
          <div className="ml-3">
            <h3 className="font-semibold text-gray-900">{agent.name}</h3>
            <p className="text-sm text-gray-500">{agent.email}</p>
            <p className="text-xs text-gray-500">{agent.mobileNumber}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
            {agent.status?.toUpperCase()}
          </span>
          <div className="mt-1">
            {agent.isActive ? (
              <span className="text-xs text-green-600">✅ Active</span>
            ) : (
              <span className="text-xs text-red-600">❌ Inactive</span>
            )}
          </div>
        </div>
      </div>

      <div className="border-t pt-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Deliveries:</span>
          <span className="font-medium">{agent.deliveryStats?.totalDeliveries || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Completed:</span>
          <span className="font-medium text-green-600">
            {agent.deliveryStats?.completedDeliveries || 0}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Rating:</span>
          <span className="font-medium">
            ⭐ {agent.deliveryStats?.averageRating?.toFixed(1) || '0.0'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Earnings:</span>
          <span className="font-medium text-green-600">
            {formatCurrency(agent.deliveryStats?.totalEarnings)}
          </span>
        </div>
      </div>

      <div className="mt-4 flex space-x-2">
        <button
          onClick={() => fetchAgentProfile(agent._id)}
          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors"
        >
          View Profile
        </button>
        <button
          onClick={() => updateAgentStatus(agent._id, agent.status, !agent.isActive)}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            agent.isActive 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {agent.isActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );

  // Profile Modal Component
  const ProfileModal = () => {
    if (!selectedAgent) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b p-6 z-10">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                Delivery Agent Profile
              </h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Agent Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-3">Personal Information</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Name:</span> {selectedAgent.name}</p>
                  <p><span className="font-medium">Email:</span> {selectedAgent.email}</p>
                  <p><span className="font-medium">Phone:</span> {selectedAgent.mobileNumber}</p>
                  <p><span className="font-medium">Vehicle:</span> {getVehicleIcon(selectedAgent.vehicleType)} {selectedAgent.vehicleType}</p>
                  <p><span className="font-medium">Vehicle No:</span> {selectedAgent.vehicleNumber || 'N/A'}</p>
                  <p><span className="font-medium">Service Area:</span> {selectedAgent.area || 'All areas'}</p>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-3">Performance Stats</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Total Deliveries:</span> {selectedAgent.deliveryStats?.totalDeliveries || 0}</p>
                  <p><span className="font-medium">Completed:</span> {selectedAgent.deliveryStats?.completedDeliveries || 0}</p>
                  <p><span className="font-medium">Cancelled:</span> {selectedAgent.deliveryStats?.cancelledDeliveries || 0}</p>
                  <p><span className="font-medium">Completion Rate:</span> {selectedAgent.completionRate || 0}%</p>
                  <p><span className="font-medium">Average Rating:</span> ⭐ {selectedAgent.deliveryStats?.averageRating?.toFixed(1) || '0.0'}</p>
                  <p><span className="font-medium">Total Earnings:</span> {formatCurrency(selectedAgent.deliveryStats?.totalEarnings)}</p>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Current Status</h3>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedAgent.status)}`}>
                    {selectedAgent.status?.toUpperCase()}
                  </span>
                  <span className={`ml-3 px-3 py-1 rounded-full text-sm font-medium ${
                    selectedAgent.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedAgent.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {selectedAgent.isVerified && (
                    <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      ✓ Verified
                    </span>
                  )}
                </div>
                {selectedAgent.currentOrder && (
                  <p className="text-sm text-gray-600">
                    Currently assigned to Order #{selectedAgent.currentOrder.orderNumber}
                  </p>
                )}
              </div>
            </div>

            {/* Delivery History */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Delivery History</h3>
              {historyLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading delivery history...</p>
                </div>
              ) : agentHistory.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {agentHistory.map((order) => (
                    <div key={order._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">Order #{order.orderNumber}</p>
                          <p className="text-sm text-gray-600">Customer: {order.user?.name || 'N/A'}</p>
                          <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-600">{formatCurrency(order.totalPrice)}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.status?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No delivery history found</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Delivery Agents Management</h1>
            <p className="text-gray-600">Manage and monitor delivery personnel</p>
          </div>
          <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
            + Add New Agent
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="delivering">Delivering</option>
              <option value="offline">Offline</option>
            </select>

            <select
              value={filters.vehicleType}
              onChange={(e) => setFilters({...filters, vehicleType: e.target.value})}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Vehicles</option>
              <option value="bike">Bike</option>
              <option value="scooter">Scooter</option>
              <option value="car">Car</option>
              <option value="bicycle">Bicycle</option>
            </select>

            <select
              value={filters.isActive}
              onChange={(e) => setFilters({...filters, isActive: e.target.value})}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Agents</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>

            <button
              onClick={() => setFilters({status: 'all', vehicleType: 'all', isActive: 'all', search: ''})}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Agents Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : agents.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent) => (
                <AgentCard key={agent._id} agent={agent} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center space-x-2 mt-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Delivery Agents Found</h3>
            <p className="text-gray-600">Add delivery agents to start managing deliveries</p>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {showProfileModal && <ProfileModal />}
    </AdminLayout>
  );
};

export default DeliveryAgents;