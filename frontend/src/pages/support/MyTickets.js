import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import supportService from '../../services/supportService';

// 🎯 Hardcoded Support Categories - No API dependency
const SUPPORT_CATEGORIES = {
  buyer: [
    { categoryCode: 'ORDER_NOT_DELIVERED', categoryName: 'Order not delivered', description: 'Order has not been delivered within expected timeframe', defaultPriority: 'high' },
    { categoryCode: 'DELIVERY_AGENT_BEHAVIOR', categoryName: 'Delivery Agent Behavior', description: 'Issues with delivery agent conduct or service', defaultPriority: 'medium' },
    { categoryCode: 'WRONG_PRODUCT', categoryName: 'Wrong product Received', description: 'Received a different product than ordered', defaultPriority: 'high' },
    { categoryCode: 'DAMAGED_PRODUCT', categoryName: 'Damaged / defective product', description: 'Product received is damaged or defective', defaultPriority: 'high' },
    { categoryCode: 'SIZE_FIT_ISSUE', categoryName: 'Size or fit issue', description: 'Product size or fit does not match expectations', defaultPriority: 'medium' },
    { categoryCode: 'REFUND_EXCHANGE', categoryName: 'Need refund or exchange', description: 'Request for refund or product exchange', defaultPriority: 'medium' },
    { categoryCode: 'RETURN_NOT_PICKED', categoryName: 'Return not Picked up', description: 'Return order has not been picked up by delivery partner', defaultPriority: 'medium' },
    { categoryCode: 'OTHER', categoryName: 'Other', description: 'Other issues not listed above', defaultPriority: 'low' }
  ],
  seller: [
    { categoryCode: 'RETURN_ISSUES', categoryName: 'Return issues (wrong return, damage return)', description: 'Issues related to product returns', defaultPriority: 'medium' },
    { categoryCode: 'PAYMENT_SETTLEMENT', categoryName: 'Payment | settlement issue', description: 'Issues with payment processing or settlement', defaultPriority: 'high' },
    { categoryCode: 'LISTING_NOT_VISIBLE', categoryName: 'Listing not visible', description: 'Product listing is not appearing in search results', defaultPriority: 'medium' },
    { categoryCode: 'ORDER_STUCK_SHIPPING', categoryName: 'Order stuck in shipping', description: 'Order status is not updating or stuck in shipping phase', defaultPriority: 'high' },
    { categoryCode: 'DELIVERY_NOT_PICKING', categoryName: 'Delivery Partner not picking order', description: 'Delivery partner has not picked up the order', defaultPriority: 'high' },
    { categoryCode: 'ACCOUNT_KYC', categoryName: 'Account or KYC issues', description: 'Issues with account verification or KYC process', defaultPriority: 'high' },
    { categoryCode: 'LABEL_INVOICE', categoryName: 'Label | invoice not generating', description: 'Shipping labels or invoices are not being generated', defaultPriority: 'high' },
    { categoryCode: 'OTHER', categoryName: 'Other', description: 'Other issues not listed above', defaultPriority: 'low' }
  ],
  delivery: [
    { categoryCode: 'PICKUP_ISSUE', categoryName: 'Issue Picking up Product from seller', description: 'Problems encountered while picking up product from seller', defaultPriority: 'high' },
    { categoryCode: 'BUYER_UNAVAILABLE', categoryName: 'Buyer not Available / wrong Address', description: 'Buyer is unavailable or provided incorrect address', defaultPriority: 'medium' },
    { categoryCode: 'PAYMENT_DISPUTE', categoryName: 'Payment dispute (for COD orders)', description: 'Disputes regarding Cash on Delivery payments', defaultPriority: 'high' },
    { categoryCode: 'PARCEL_DAMAGED', categoryName: 'Parcel damaged before picked', description: 'Parcel was already damaged when attempting pickup', defaultPriority: 'medium' },
    { categoryCode: 'PAYOUT_INCENTIVE', categoryName: 'Rider Payout & incentive not Received', description: 'Issues with receiving payouts or incentives', defaultPriority: 'high' },
    { categoryCode: 'OTHER', categoryName: 'Other', description: 'Other issues not listed above', defaultPriority: 'low' }
  ]
};

const MyTickets = () => {
  const navigate = useNavigate();
  const { sellerAuth, userAuth, deliveryAgentAuth } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({});
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    // Check authentication
    if (!userAuth.isAuthenticated && !sellerAuth.isAuthenticated && !deliveryAgentAuth.isAuthenticated) {
      toast.error('Please login to view your tickets');
      navigate('/');
      return;
    }

    // 🎯 Load hardcoded categories directly - no API call needed
    const userType = userAuth.isAuthenticated ? 'buyer' :
                    sellerAuth.isAuthenticated ? 'seller' : 'delivery';
    setCategories(SUPPORT_CATEGORIES[userType] || []);

    loadTickets();
  }, [filters, userAuth, sellerAuth, deliveryAgentAuth, navigate]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await supportService.getUserTickets(filters);
      setTickets(response.data.tickets || []);
      setPagination(response.data.pagination || {});
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value,
      page: 1 // Reset to first page
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-purple-100 text-purple-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSLABadge = (slaDeadline) => {
    if (!slaDeadline) return null;
    
    const now = new Date();
    const deadline = new Date(slaDeadline);
    const hoursRemaining = (deadline - now) / (1000 * 60 * 60);
    
    if (hoursRemaining < 0) {
      return <span className="text-red-600 font-semibold">Overdue</span>;
    } else if (hoursRemaining <= 4) {
      return <span className="text-orange-600 font-semibold">{Math.round(hoursRemaining)}h remaining</span>;
    } else {
      return <span className="text-green-600">{Math.round(hoursRemaining)}h remaining</span>;
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Support Tickets</h1>
          <p className="text-gray-600 mt-2">View and manage your support tickets</p>
        </div>
        <button
          onClick={() => navigate('/support/create')}
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
        >
          Create New Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="assigned">Assigned</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.categoryCode} value={cat.categoryCode}>
                  {cat.categoryName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      {tickets.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
          <p className="text-gray-600 mb-4">You haven't created any support tickets yet.</p>
          <button
            onClick={() => navigate('/support/create')}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            Create Your First Ticket
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => {
            const category = categories.find(cat => cat.categoryCode === ticket.category);
            return (
              <div
                key={ticket._id}
                onClick={() => navigate(`/support/tickets/${ticket._id}`)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        {ticket.ticketNumber}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                      </span>
                      {ticket.priority === 'urgent' && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Urgent
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {category?.categoryName || ticket.category}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {ticket.description}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                      {ticket.attachments && ticket.attachments.length > 0 && (
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {ticket.attachments.length} attachment(s)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {getSLABadge(ticket.slaDeadline)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="mt-6 flex justify-center space-x-2">
          <button
            onClick={() => handleFilterChange('page', filters.page - 1)}
            disabled={filters.page === 1}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-700">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => handleFilterChange('page', filters.page + 1)}
            disabled={filters.page >= pagination.pages}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default MyTickets;

