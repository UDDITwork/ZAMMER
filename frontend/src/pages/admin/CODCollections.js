// frontend/src/pages/admin/CODCollections.js - COD Collections by Delivery Agents

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import { 
  FiDollarSign, 
  FiCalendar, 
  FiPackage, 
  FiChevronRight,
  FiChevronDown,
  FiFilter,
  FiRefreshCw,
  FiUser,
  FiPhone,
  FiMapPin
} from 'react-icons/fi';

const CODCollections = () => {
  const { adminAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [collectionsData, setCollectionsData] = useState(null);
  const [expandedAgent, setExpandedAgent] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  
  // Filter states
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('all'); // 'all', 'cash', 'upi'
  
  // Format currency
  const formatCurrency = (amount) => {
    return `₹${Number(amount || 0).toFixed(2)}`;
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  
  // Format date and time
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Load COD collections data
  const loadCollections = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (paymentMethod !== 'all') filters.paymentMethod = paymentMethod;
      
      const response = await adminService.getAllDeliveryAgentsCODCollections(filters);
      
      if (response.success) {
        setCollectionsData(response.data);
      } else {
        toast.error(response.message || 'Failed to load COD collections');
      }
    } catch (error) {
      console.error('Error loading COD collections:', error);
      toast.error(error.message || 'Failed to load COD collections data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminAuth.isAuthenticated) {
      loadCollections();
    }
  }, []);

  // Apply filters
  const applyFilters = () => {
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      toast.error('Start date must be before end date');
      return;
    }
    loadCollections();
  };

  // Reset filters
  const resetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setPaymentMethod('all');
    setTimeout(() => loadCollections(), 100);
  };

  // Group orders by date for each agent
  const groupOrdersByDate = (orders) => {
    const grouped = {};
    orders.forEach(order => {
      const date = order.completedAt ? new Date(order.completedAt).toISOString().split('T')[0] : 'Unknown';
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(order);
    });
    
    // Convert to array and sort by date (most recent first)
    return Object.entries(grouped)
      .map(([date, orders]) => ({
        date,
        orders: orders.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)),
        totalAmount: orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0),
        cashAmount: orders.filter(o => o.paymentMethod === 'cash').reduce((sum, o) => sum + (Number(o.amount) || 0), 0),
        upiAmount: orders.filter(o => o.paymentMethod === 'upi' || o.paymentMethod === 'card').reduce((sum, o) => sum + (Number(o.amount) || 0), 0)
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  if (loading && !collectionsData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading COD collections data...</p>
        </div>
      </div>
    );
  }

  if (!collectionsData) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-600 mb-4">No COD collections data available</p>
        <button
          onClick={loadCollections}
          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const { summary, agents } = collectionsData;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FiDollarSign className="mr-2 text-green-600" />
              COD Collections by Delivery Agents
            </h1>
            <p className="text-gray-600 mt-1">Track all Cash on Delivery amounts collected by delivery agents</p>
          </div>
          <button
            onClick={loadCollections}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            <FiRefreshCw className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cash Collected</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(summary.grandTotalCashCOD)}
              </p>
            </div>
            <FiDollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total UPI/Card Collected</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(summary.grandTotalUPICOD)}
              </p>
            </div>
            <FiDollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Grand Total COD</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(summary.grandTotalCOD)}
              </p>
            </div>
            <FiDollarSign className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Agents</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {summary.totalAgents}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {summary.grandTotalOrders} orders
              </p>
            </div>
            <FiUser className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <FiFilter className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Date Range:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="From"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="To"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Payment Method:</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash Only</option>
              <option value="upi">UPI/Card Only</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 ml-auto">
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm"
            >
              Apply Filters
            </button>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Agents List */}
      <div className="space-y-4">
        {agents.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No COD collections found for the selected period</p>
          </div>
        ) : (
          agents.map((agent) => {
            const ordersByDate = groupOrdersByDate(agent.orders);
            return (
              <div key={agent.agentId} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Agent Header */}
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                  onClick={() => setExpandedAgent(expandedAgent === agent.agentId ? null : agent.agentId)}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <FiUser className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-gray-900">{agent.agentName}</p>
                      <p className="text-sm text-gray-600">{agent.agentEmail}</p>
                      <p className="text-xs text-gray-500">{agent.agentPhone}</p>
                    </div>
                  </div>
                  <div className="text-right mr-6">
                    <p className="text-xs text-gray-600">Total COD Collected</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(agent.totalCOD)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {agent.totalCashCOD > 0 && `${formatCurrency(agent.totalCashCOD)} cash`}
                      {agent.totalCashCOD > 0 && agent.totalUPICOD > 0 && ' • '}
                      {agent.totalUPICOD > 0 && `${formatCurrency(agent.totalUPICOD)} digital`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{agent.totalOrders} orders</p>
                  </div>
                  {expandedAgent === agent.agentId ? (
                    <FiChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <FiChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                </div>

                {expandedAgent === agent.agentId && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    {/* Date-wise Breakdown */}
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Date-wise Breakdown</h3>
                      <div className="space-y-3">
                        {ordersByDate.map((dateGroup) => (
                          <div key={dateGroup.date} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div
                              className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                              onClick={() => setExpandedOrder(expandedOrder === `${agent.agentId}-${dateGroup.date}` ? null : `${agent.agentId}-${dateGroup.date}`)}
                            >
                              <div className="flex items-center space-x-3">
                                <FiCalendar className="w-5 h-5 text-gray-500" />
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {formatDate(dateGroup.date)}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {dateGroup.orders.length} order{dateGroup.orders.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right mr-4">
                                <p className="font-bold text-green-600">
                                  {formatCurrency(dateGroup.totalAmount)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {dateGroup.cashAmount > 0 && `${formatCurrency(dateGroup.cashAmount)} cash`}
                                  {dateGroup.cashAmount > 0 && dateGroup.upiAmount > 0 && ' • '}
                                  {dateGroup.upiAmount > 0 && `${formatCurrency(dateGroup.upiAmount)} digital`}
                                </p>
                              </div>
                              {expandedOrder === `${agent.agentId}-${dateGroup.date}` ? (
                                <FiChevronDown className="w-5 h-5 text-gray-500" />
                              ) : (
                                <FiChevronRight className="w-5 h-5 text-gray-500" />
                              )}
                            </div>

                            {expandedOrder === `${agent.agentId}-${dateGroup.date}` && (
                              <div className="border-t border-gray-200 bg-gray-50 p-4">
                                <div className="space-y-3">
                                  {dateGroup.orders.map((order) => (
                                    <div key={order._id} className="bg-white p-4 rounded-lg border border-gray-200">
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                          <p className="text-sm text-gray-600">Order Details</p>
                                          <p className="font-bold text-gray-900">Order #{order.orderNumber}</p>
                                          <p className="text-xs text-gray-500">
                                            {formatDateTime(order.completedAt)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-gray-600">Customer</p>
                                          <p className="font-medium text-gray-900">
                                            {order.customerName || 'N/A'}
                                          </p>
                                          {order.customerPhone && (
                                            <p className="text-xs text-gray-500 flex items-center">
                                              <FiPhone className="w-3 h-3 mr-1" />
                                              {order.customerPhone}
                                            </p>
                                          )}
                                        </div>
                                        <div>
                                          <p className="text-sm text-gray-600">Collection Details</p>
                                          <p className="font-bold text-green-600 text-lg">
                                            {formatCurrency(order.amount)}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {order.paymentMethod === 'cash' ? 'Cash Payment' : 
                                             order.paymentMethod === 'upi' ? 'UPI Payment' :
                                             order.paymentMethod === 'card' ? 'Card Payment' : 
                                             'Payment'}
                                          </p>
                                          {order.collectedAt && (
                                            <p className="text-xs text-gray-500 mt-1">
                                              Collected: {formatDateTime(order.collectedAt)}
                                            </p>
                                          )}
                                        </div>
                                        {order.sellerName && (
                                          <div className="md:col-span-3">
                                            <p className="text-sm text-gray-600">Seller</p>
                                            <p className="text-gray-900">{order.sellerName}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CODCollections;

