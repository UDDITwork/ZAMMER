import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import SellerLayout from '../../components/layouts/SellerLayout';
import { getPaymentTracking, getEarningsSummary } from '../../services/sellerService';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const PaymentTracking = () => {
  const { sellerAuth } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const [earningsSummary, setEarningsSummary] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    paymentMethod: '',
    page: 1,
    limit: 20
  });
  const [activeTab, setActiveTab] = useState('overview');

  // 🎯 Enhanced data fetching with error handling
  const fetchPaymentData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('💰 Fetching payment tracking data...');
      
      const [paymentResponse, earningsResponse] = await Promise.all([
        getPaymentTracking(filters),
        getEarningsSummary('30')
      ]);

      if (paymentResponse.success) {
        setPaymentData(paymentResponse.data);
        console.log('✅ Payment data loaded:', {
          ordersCount: paymentResponse.data.orders.length,
          totalEarnings: paymentResponse.data.statistics.totalEarnings
        });
      }

      if (earningsResponse.success) {
        setEarningsSummary(earningsResponse.data);
        console.log('✅ Earnings summary loaded:', {
          periodEarnings: earningsResponse.data.periodEarnings.total,
          todayEarnings: earningsResponse.data.todayEarnings.total
        });
      }

    } catch (error) {
      console.error('❌ Error fetching payment data:', error);
      toast.error('Failed to load payment data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // 🎯 Fetch data on component mount and filter changes
  useEffect(() => {
    fetchPaymentData();
  }, [fetchPaymentData]);

  // 🎯 Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  // 🎯 Handle pagination
  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  // 🎯 Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // 🎯 Format date
  const formatDate = (dateString) => {
    return format(new Date(dateString), 'dd MMM yyyy, h:mm a');
  };

  // 🎯 Get status badge color
  const getStatusBadgeColor = (status) => {
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Processing': 'bg-blue-100 text-blue-800',
      'Shipped': 'bg-purple-100 text-purple-800',
      'Delivered': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // 🎯 Get payment method icon
  const getPaymentMethodIcon = (method) => {
    const icons = {
      'SMEPay': '💳',
      'Cash on Delivery': '💰',
      'UPI': '📱',
      'Card': '💳',
      'PayPal': '🌐'
    };
    return icons[method] || '💳';
  };

  // 🎯 Loading component
  if (loading) {
    return (
      <SellerLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white p-6 rounded-lg shadow">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              💰 Payment Tracking & Earnings
            </h1>
            <p className="text-gray-600">
              Track your earnings, payment history, and financial analytics
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <nav className="flex space-x-8">
              {[
                { key: 'overview', label: 'Overview', icon: '📊' },
                { key: 'earnings', label: 'Earnings', icon: '💰' },
                { key: 'payments', label: 'Payment History', icon: '📋' },
                { key: 'analytics', label: 'Analytics', icon: '📈' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-orange-100 text-orange-700 border-b-2 border-orange-500'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Earnings Summary Cards */}
              {earningsSummary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 text-lg">💰</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Today's Earnings</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(earningsSummary.todayEarnings.total)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {earningsSummary.todayEarnings.orders} orders
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-lg">📅</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">This Month</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(earningsSummary.thisMonthEarnings.total)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {earningsSummary.thisMonthEarnings.orders} orders
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <span className="text-orange-600 text-lg">📊</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Last 30 Days</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(earningsSummary.periodEarnings.total)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {earningsSummary.periodEarnings.orders} orders
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                          <span className="text-yellow-600 text-lg">⏳</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Pending Payments</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(earningsSummary.pendingPayments.total)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {earningsSummary.pendingPayments.orders} orders
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              {paymentData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Payment Method Distribution */}
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Payment Methods
                    </h3>
                    <div className="space-y-3">
                      {paymentData.statistics.paymentMethodStats.map((stat, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span>{getPaymentMethodIcon(stat._id)}</span>
                            <span className="text-sm font-medium text-gray-700">
                              {stat._id}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(stat.totalAmount)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {stat.orderCount} orders
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Status Distribution */}
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Order Status
                    </h3>
                    <div className="space-y-3">
                      {paymentData.statistics.statusStats.map((stat, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(stat._id)}`}>
                              {stat._id}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(stat.totalAmount)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {stat.orderCount} orders
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Earnings Tab */}
          {activeTab === 'earnings' && (
            <div className="space-y-6">
              {/* Daily Earnings Chart */}
              {paymentData && paymentData.statistics.dailyEarnings.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Daily Earnings (Last 30 Days)
                  </h3>
                  <div className="overflow-x-auto">
                    <div className="min-w-full">
                      <div className="grid grid-cols-30 gap-1">
                        {paymentData.statistics.dailyEarnings.map((day, index) => (
                          <div key={index} className="text-center">
                            <div 
                              className="bg-orange-500 rounded-t"
                              style={{ 
                                height: `${Math.max(10, (day.dailyEarnings / Math.max(...paymentData.statistics.dailyEarnings.map(d => d.dailyEarnings))) * 100)}px` 
                              }}
                            ></div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(day._id).getDate()}
                            </div>
                            <div className="text-xs font-medium text-gray-700">
                              ₹{day.dailyEarnings}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Earnings Summary */}
              {earningsSummary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Average Order Value</h4>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(earningsSummary.periodEarnings.average)}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Total Orders</h4>
                    <p className="text-2xl font-bold text-gray-900">
                      {earningsSummary.periodEarnings.orders}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Total Earnings</h4>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(earningsSummary.periodEarnings.total)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment History Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">All Status</option>
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={filters.paymentMethod}
                      onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">All Methods</option>
                      <option value="SMEPay">SMEPay</option>
                      <option value="Cash on Delivery">Cash on Delivery</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                      <option value="PayPal">PayPal</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment History Table */}
              {paymentData && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Payment History
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Showing {paymentData.orders.length} of {paymentData.pagination.totalOrders} orders
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Order Details
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payment Method
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paymentData.orders.map((order) => (
                          <tr key={order._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  #{order.orderNumber}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {order.items.length} items
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {order.customer.name}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {order.customer.email}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-sm font-semibold text-gray-900">
                                {formatCurrency(order.totalPrice)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {order.isPaid ? 'Paid' : 'Pending'}
                              </p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <span>{getPaymentMethodIcon(order.paymentMethod)}</span>
                                <span className="text-sm text-gray-900">
                                  {order.paymentMethod}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(order.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {paymentData.pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          Page {paymentData.pagination.currentPage} of {paymentData.pagination.totalPages}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handlePageChange(paymentData.pagination.currentPage - 1)}
                            disabled={!paymentData.pagination.hasPrevPage}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => handlePageChange(paymentData.pagination.currentPage + 1)}
                            disabled={!paymentData.pagination.hasNextPage}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Performance Metrics */}
              {paymentData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Total Revenue</h4>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(paymentData.statistics.totalEarnings)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      From {paymentData.statistics.totalOrders} orders
                    </p>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Average Order Value</h4>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(paymentData.statistics.averageOrderValue)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Per order
                    </p>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Success Rate</h4>
                    <p className="text-2xl font-bold text-gray-900">
                      {paymentData.statistics.statusStats.find(s => s._id === 'Delivered')?.orderCount || 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Delivered orders
                    </p>
                  </div>
                </div>
              )}

              {/* Payment Method Analysis */}
              {paymentData && paymentData.statistics.paymentMethodStats.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Payment Method Analysis
                  </h3>
                  <div className="space-y-4">
                    {paymentData.statistics.paymentMethodStats.map((stat, index) => {
                      const percentage = ((stat.totalAmount / paymentData.statistics.totalEarnings) * 100).toFixed(1);
                      return (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{getPaymentMethodIcon(stat._id)}</span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{stat._id}</p>
                              <p className="text-xs text-gray-500">{stat.orderCount} orders</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(stat.totalAmount)}
                            </p>
                            <p className="text-xs text-gray-500">{percentage}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SellerLayout>
  );
};

export default PaymentTracking;
