// frontend/src/pages/delivery/DeliveryEarnings.js - Detailed Earnings Breakdown

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import DeliveryLayout from '../../components/layouts/DeliveryLayout';
import deliveryService from '../../services/deliveryService';
import { 
  FiDollarSign, 
  FiCalendar, 
  FiPackage, 
  FiChevronRight,
  FiChevronDown,
  FiFilter,
  FiDownload,
  FiRefreshCw
} from 'react-icons/fi';

const DeliveryEarnings = () => {
  const { deliveryAgentAuth } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [earningsData, setEarningsData] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  
  // Filter states
  const [period, setPeriod] = useState('all'); // 'all', 'day', 'week', 'month'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'order'
  
  // Format currency
  const formatCurrency = (amount) => {
    return `₹${Number(amount).toFixed(2)}`;
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

  // Load earnings data
  const loadEarnings = async () => {
    setLoading(true);
    try {
      const filters = {};
      
      if (period !== 'all') {
        filters.period = period;
      } else if (dateFrom || dateTo) {
        filters.startDate = dateFrom;
        filters.endDate = dateTo;
      }
      
      const response = await deliveryService.getDeliveryEarnings(filters);
      
      if (response.success) {
        // Merge order details from orderWiseBreakdown into earningsByDay orders
        const enrichedData = { ...response.data };
        if (enrichedData.earningsByDay && enrichedData.orderWiseBreakdown) {
          const orderMap = new Map(
            enrichedData.orderWiseBreakdown.map(order => [order.orderId?.toString(), order])
          );
          
          enrichedData.earningsByDay = enrichedData.earningsByDay.map(day => ({
            ...day,
            orders: day.orders.map(order => {
              // Handle both string and ObjectId formats
              const orderIdKey = order.orderId ? (typeof order.orderId === 'string' ? order.orderId : order.orderId.toString()) : null;
              const fullOrderDetails = orderIdKey ? orderMap.get(orderIdKey) : null;
              return {
                ...order,
                customer: fullOrderDetails?.customer || null,
                seller: fullOrderDetails?.seller || null,
                shippingAddress: fullOrderDetails?.shippingAddress || null,
                paymentMethod: fullOrderDetails?.paymentMethod || 'Cash on Delivery',
                codPaymentMethod: fullOrderDetails?.codPaymentMethod || null
              };
            })
          }));
        }
        setEarningsData(enrichedData);
      } else {
        toast.error(response.message || 'Failed to load earnings');
      }
    } catch (error) {
      console.error('Error loading earnings:', error);
      toast.error(error.message || 'Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deliveryAgentAuth.isAuthenticated) {
      loadEarnings();
    } else {
      navigate('/delivery/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, dateFrom, dateTo]);

  // Handle filter changes
  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'all') {
      setDateFrom('');
      setDateTo('');
    }
  };

  // Apply custom date range
  const applyCustomDateRange = () => {
    if (!dateFrom || !dateTo) {
      toast.error('Please select both start and end dates');
      return;
    }
    if (new Date(dateFrom) > new Date(dateTo)) {
      toast.error('Start date must be before end date');
      return;
    }
    setPeriod('all');
    loadEarnings();
  };

  if (loading && !earningsData) {
    return (
      <DeliveryLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading earnings data...</p>
          </div>
        </div>
      </DeliveryLayout>
    );
  }

  if (!earningsData) {
    return (
      <DeliveryLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 mb-4">No earnings data available</p>
            <button
              onClick={loadEarnings}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
            >
              Retry
            </button>
          </div>
        </div>
      </DeliveryLayout>
    );
  }

  const { summary, earningsByDay, orderWiseBreakdown } = earningsData;

  return (
    <DeliveryLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FiDollarSign className="mr-2 text-green-600" />
                My Earnings
              </h1>
              <p className="text-gray-600 mt-1">Detailed breakdown of your delivery earnings</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadEarnings}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                <FiRefreshCw className="mr-2" />
                Refresh
              </button>
              <Link
                to="/delivery/dashboard"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(summary.totalEarnings)}
                </p>
              </div>
              <FiDollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {summary.totalDeliveries}
                </p>
              </div>
              <FiPackage className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg per Delivery</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(summary.avgEarningsPerDelivery)}
                </p>
              </div>
              <FiDollarSign className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Order Value</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(summary.totalOrderValue)}
                </p>
              </div>
              <FiPackage className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <FiFilter className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter:</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePeriodChange('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  period === 'all' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => handlePeriodChange('day')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  period === 'day' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => handlePeriodChange('week')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  period === 'week' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => handlePeriodChange('month')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  period === 'month' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                This Month
              </button>
            </div>

            <div className="flex items-center space-x-2 ml-auto">
              <span className="text-sm text-gray-600">Custom Range:</span>
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
              <button
                onClick={applyCustomDateRange}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm"
              >
                Apply
              </button>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">View:</span>
              <button
                onClick={() => setViewMode('day')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  viewMode === 'day' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Day-wise
              </button>
              <button
                onClick={() => setViewMode('order')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  viewMode === 'order' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Order-wise
              </button>
            </div>
          </div>
        </div>

        {/* Earnings Breakdown */}
        {viewMode === 'day' ? (
          /* Day-wise Breakdown */
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Day-wise Earnings Breakdown</h2>
            {earningsByDay.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-600">No earnings found for the selected period</p>
              </div>
            ) : (
              earningsByDay.map((day) => (
                <div key={day.date} className="bg-white rounded-lg shadow overflow-hidden">
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                    onClick={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <FiCalendar className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-semibold text-gray-900">
                          {formatDate(day.date)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {day.deliveryCount} delivery{day.deliveryCount !== 1 ? 'ies' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-green-600">
                        {formatCurrency(day.totalEarnings)}
                      </p>
                    </div>
                    {expandedDay === day.date ? (
                      <FiChevronDown className="w-5 h-5 text-gray-500 ml-4" />
                    ) : (
                      <FiChevronRight className="w-5 h-5 text-gray-500 ml-4" />
                    )}
                  </div>

                  {expandedDay === day.date && (
                    <div className="border-t border-gray-200 bg-gray-50 p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-white p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Cash Payments (COD)</p>
                          <p className="text-xl font-bold text-gray-900">
                            {formatCurrency(
                              day.orders
                                .filter(o => o.codPaymentMethod === 'cash' || (o.paymentMethod === 'Cash on Delivery' && !o.codPaymentMethod))
                                .reduce((sum, o) => sum + (Number(o.earnings) || 0), 0)
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {
                              day.orders.filter(o => o.codPaymentMethod === 'cash' || (o.paymentMethod === 'Cash on Delivery' && !o.codPaymentMethod)).length
                            } order{day.orders.filter(o => o.codPaymentMethod === 'cash' || (o.paymentMethod === 'Cash on Delivery' && !o.codPaymentMethod)).length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Digital Payments (UPI/Card)</p>
                          <p className="text-xl font-bold text-gray-900">
                            {formatCurrency(
                              day.orders
                                .filter(o => o.codPaymentMethod === 'upi' || o.codPaymentMethod === 'card' || (o.paymentMethod !== 'Cash on Delivery' && o.paymentMethod !== 'cash'))
                                .reduce((sum, o) => sum + (Number(o.earnings) || 0), 0)
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {
                              day.orders.filter(o => o.codPaymentMethod === 'upi' || o.codPaymentMethod === 'card' || (o.paymentMethod !== 'Cash on Delivery' && o.paymentMethod !== 'cash')).length
                            } order{day.orders.filter(o => o.codPaymentMethod === 'upi' || o.codPaymentMethod === 'card' || (o.paymentMethod !== 'Cash on Delivery' && o.paymentMethod !== 'cash')).length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-900 mb-3">Order Details:</h4>
                        {day.orders.map((order) => (
                          <div
                            key={order.orderId}
                            className="bg-white p-4 rounded-lg border border-gray-200 hover:border-orange-300 cursor-pointer"
                            onClick={() => {
                              const orderId = typeof order.orderId === 'string' ? order.orderId : order.orderId?.toString();
                              setExpandedOrder(expandedOrder === orderId ? null : orderId);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  Order #{order.orderNumber}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {formatDateTime(order.completedAt)}
                                </p>
                              </div>
                              <div className="text-right mr-4">
                                <p className="font-bold text-green-600">
                                  {formatCurrency(order.earnings)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {order.codPaymentMethod === 'cash' || (order.paymentMethod === 'Cash on Delivery' && !order.codPaymentMethod) ? 'Cash (COD)' : 
                                   order.codPaymentMethod === 'upi' ? 'UPI (COD)' :
                                   order.codPaymentMethod === 'card' ? 'Card (COD)' :
                                   order.paymentMethod || 'Prepaid'}
                                </p>
                              </div>
                              {expandedOrder === (typeof order.orderId === 'string' ? order.orderId : order.orderId?.toString()) ? (
                                <FiChevronDown className="w-5 h-5 text-gray-500" />
                              ) : (
                                <FiChevronRight className="w-5 h-5 text-gray-500" />
                              )}
                            </div>

                            {expandedOrder === (typeof order.orderId === 'string' ? order.orderId : order.orderId?.toString()) && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-gray-600">Customer:</p>
                                    <p className="font-medium text-gray-900">
                                      {order.customer?.name || 'N/A'}
                                    </p>
                                    {order.customer?.phone && (
                                      <p className="text-gray-600">{order.customer.phone}</p>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-gray-600">Seller:</p>
                                    <p className="font-medium text-gray-900">
                                      {order.seller?.name || 'N/A'}
                                    </p>
                                    {order.seller?.shop && (
                                      <p className="text-gray-600">{order.seller.shop}</p>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-gray-600">Order Value:</p>
                                    <p className="font-medium text-gray-900">
                                      {formatCurrency(order.orderValue)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600">Your Earning:</p>
                                    <p className="font-medium text-green-600">
                                      {formatCurrency(order.earnings || 0)}
                                    </p>
                                  </div>
                                  {order.shippingAddress && (
                                    <div className="col-span-2">
                                      <p className="text-gray-600">Delivery Address:</p>
                                      <p className="text-gray-900">
                                        {order.shippingAddress.address}, {order.shippingAddress.city} - {order.shippingAddress.postalCode}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          /* Order-wise Breakdown */
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order-wise Earnings Breakdown</h2>
            {orderWiseBreakdown.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-600">No orders found for the selected period</p>
              </div>
            ) : (
              orderWiseBreakdown.map((order) => (
                <div
                  key={order.orderId}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <FiPackage className="w-5 h-5 text-orange-500" />
                        <div>
                          <p className="font-bold text-lg text-gray-900">
                            Order #{order.orderNumber}
                          </p>
                          <p className="text-sm text-gray-600">
                            Completed: {formatDateTime(order.completedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-gray-600">Customer</p>
                          <p className="font-medium text-gray-900">
                            {order.customer?.name || 'N/A'}
                          </p>
                          {order.customer?.phone && (
                            <p className="text-sm text-gray-600">{order.customer.phone}</p>
                          )}
                        </div>

                        <div>
                          <p className="text-sm text-gray-600">Seller</p>
                          <p className="font-medium text-gray-900">
                            {order.seller?.name || 'N/A'}
                          </p>
                          {order.seller?.shop && (
                            <p className="text-sm text-gray-600">{order.seller.shop}</p>
                          )}
                        </div>

                        <div>
                          <p className="text-sm text-gray-600">Order Value</p>
                          <p className="font-medium text-gray-900">
                            {formatCurrency(order.orderValue)}
                          </p>
                        </div>
                      </div>

                      {order.shippingAddress && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-sm text-gray-600">Delivery Address</p>
                          <p className="text-sm text-gray-900">
                            {order.shippingAddress.address}, {order.shippingAddress.city} - {order.shippingAddress.postalCode}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="ml-6 text-right">
                      <p className="text-sm text-gray-600 mb-1">Your Earning</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(order.earnings)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {order.codPaymentMethod === 'cash' || (order.paymentMethod === 'Cash on Delivery' && !order.codPaymentMethod) ? 'Cash Payment (COD)' :
                         order.codPaymentMethod === 'upi' ? 'UPI Payment (COD)' :
                         order.codPaymentMethod === 'card' ? 'Card Payment (COD)' :
                         order.paymentMethod || 'Prepaid Payment'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </DeliveryLayout>
  );
};

export default DeliveryEarnings;

