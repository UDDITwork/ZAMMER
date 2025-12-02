import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ImageUpload from '../../components/support/ImageUpload';

const SupportTicketDetail = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  const [messageText, setMessageText] = useState('');
  const [messageAttachments, setMessageAttachments] = useState([]);
  const [isInternal, setIsInternal] = useState(false);
  const [assignedTo, setAssignedTo] = useState('');
  const [status, setStatus] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/support/tickets/${ticketId}`);
      setTicket(response.data.data.ticket);
      setMessages(response.data.data.messages || []);
      setUser(response.data.data.user);
      setAssignedTo(response.data.data.ticket.assignedTo?._id || '');
      setStatus(response.data.data.ticket.status);
    } catch (error) {
      console.error('Error loading ticket:', error);
      toast.error('Failed to load ticket details');
      navigate('/admin/support/tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTicket = async () => {
    if (!assignedTo) {
      toast.error('Please select an agent to assign');
      return;
    }

    try {
      setAssigning(true);
      const response = await api.post(`/admin/support/tickets/${ticketId}/assign`, {
        assignedTo
      });

      if (response.data.success) {
        toast.success('Ticket assigned successfully');
        loadTicket();
      }
    } catch (error) {
      console.error('Error assigning ticket:', error);
      toast.error(error.response?.data?.message || 'Failed to assign ticket');
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (status === 'resolved' && !resolutionNotes.trim()) {
      toast.error('Resolution notes are required when resolving a ticket');
      return;
    }

    try {
      setUpdatingStatus(true);
      const response = await api.patch(`/admin/support/tickets/${ticketId}/status`, {
        status,
        resolutionNotes: status === 'resolved' ? resolutionNotes : ''
      });

      if (response.data.success) {
        toast.success('Ticket status updated successfully');
        loadTicket();
        setResolutionNotes('');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!messageText.trim() && messageAttachments.length === 0) {
      toast.error('Please enter a message or attach an image');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post(`/admin/support/tickets/${ticketId}/messages`, {
        message: messageText.trim(),
        attachments: messageAttachments,
        isInternal
      });

      if (response.data.success) {
        setMessages(prev => [...prev, response.data.data]);
        setMessageText('');
        setMessageAttachments([]);
        setIsInternal(false);
        toast.success('Message sent successfully');
        loadTicket();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ticket not found</h3>
          <button
            onClick={() => navigate('/admin/support/tickets')}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/admin/support/tickets')}
        className="text-orange-600 hover:text-orange-700 mb-4 flex items-center"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Tickets
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Ticket {ticket.ticketNumber}
                </h1>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 capitalize">
                    {ticket.priority}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">Category:</span>
                <span className="ml-2 text-gray-900">{ticket.title || ticket.category}</span>
              </div>
              {ticket.customReason && (
                <div>
                  <span className="font-medium text-gray-700">Custom Reason:</span>
                  <span className="ml-2 text-gray-900">{ticket.customReason}</span>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700">Description:</span>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">{ticket.description}</p>
              </div>
              
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700 mb-2 block">Attachments:</span>
                  <div className="grid grid-cols-2 gap-4">
                    {ticket.attachments.map((attachment, index) => (
                      <img
                        key={index}
                        src={attachment.url}
                        alt={`Attachment ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-75"
                        onClick={() => window.open(attachment.url, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Conversation Thread */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversation</h2>
            
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No messages yet.</p>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message._id}
                    className={`p-4 rounded-lg ${
                      message.senderType === 'user' ? 'bg-gray-50' : 
                      message.isInternal ? 'bg-yellow-50 border border-yellow-200' : 
                      'bg-blue-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {message.senderType === 'user' ? 'User' : 'Support Team'}
                        </span>
                        {message.isInternal && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-200 text-yellow-800">
                            Internal
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap mb-2">{message.message}</p>
                    
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {message.attachments.map((attachment, index) => (
                          <img
                            key={index}
                            src={attachment.url}
                            alt={`Attachment ${index + 1}`}
                            className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-75"
                            onClick={() => window.open(attachment.url, '_blank')}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reply Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Reply</h2>
            <form onSubmit={handleSendMessage}>
              <div className="mb-4">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Type your message here..."
                  disabled={submitting}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attach Images (Optional)
                </label>
                <ImageUpload
                  maxImages={5}
                  onImagesChange={setMessageAttachments}
                  existingImages={messageAttachments}
                />
              </div>

              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Mark as internal (not visible to user)</span>
                </label>
              </div>
              
              <button
                type="submit"
                disabled={submitting || (!messageText.trim() && messageAttachments.length === 0)}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-6 py-2 rounded-md font-medium transition-colors"
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* User Info */}
          {user && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">User Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="ml-2 text-gray-900">{user.name || user.firstName || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className="ml-2 text-gray-900">{user.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Phone:</span>
                  <span className="ml-2 text-gray-900">{user.mobileNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">User Type:</span>
                  <span className="ml-2 text-gray-900 capitalize">{ticket.userType}</span>
                </div>
              </div>
            </div>
          )}

          {/* Assignment */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Admin ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <button
                onClick={handleAssignTicket}
                disabled={assigning || !assignedTo}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                {assigning ? 'Assigning...' : 'Assign Ticket'}
              </button>
            </div>
          </div>

          {/* Status Update */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="open">Open</option>
                  <option value="assigned">Assigned</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              
              {status === 'resolved' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Notes *</label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter resolution notes..."
                  />
                </div>
              )}
              
              <button
                onClick={handleUpdateStatus}
                disabled={updatingStatus}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                {updatingStatus ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>

          {/* Internal Notes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Internal Notes</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {ticket.internalNotes || 'No internal notes'}
            </p>
          </div>

          {/* SLA Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">SLA Information</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Deadline:</span>
                <span className="ml-2 text-gray-900">{new Date(ticket.slaDeadline).toLocaleString()}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <span className={`ml-2 font-semibold ${
                  ticket.slaStatus === 'overdue' ? 'text-red-600' :
                  ticket.slaStatus === 'warning' ? 'text-orange-600' :
                  'text-green-600'
                }`}>
                  {ticket.slaStatus === 'overdue' ? 'Overdue' :
                   ticket.slaStatus === 'warning' ? `${ticket.hoursRemaining}h remaining` :
                   `${ticket.hoursRemaining}h remaining`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportTicketDetail;

