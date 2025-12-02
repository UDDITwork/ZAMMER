import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import supportService from '../../services/supportService';
import ImageUpload from '../../components/support/ImageUpload';

const TicketDetail = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { sellerAuth, userAuth, deliveryAgentAuth } = useContext(AuthContext);
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messageAttachments, setMessageAttachments] = useState([]);

  useEffect(() => {
    // Check authentication
    if (!userAuth.isAuthenticated && !sellerAuth.isAuthenticated && !deliveryAgentAuth.isAuthenticated) {
      toast.error('Please login to view ticket details');
      navigate('/support/tickets');
      return;
    }

    loadTicket();
  }, [ticketId, userAuth, sellerAuth, deliveryAgentAuth, navigate]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const response = await supportService.getTicket(ticketId);
      setTicket(response.data.ticket);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error loading ticket:', error);
      toast.error('Failed to load ticket details');
      navigate('/support/tickets');
    } finally {
      setLoading(false);
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

      const messageData = {
        message: messageText.trim(),
        attachments: messageAttachments
      };

      const response = await supportService.addMessage(ticketId, messageData);

      if (response.success) {
        setMessages(prev => [...prev, response.data]);
        setMessageText('');
        setMessageAttachments([]);
        toast.success('Message sent successfully');
        
        // Reload ticket to update updatedAt
        loadTicket();
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message');
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

  const getSLABadge = (slaDeadline) => {
    if (!slaDeadline) return null;
    
    const now = new Date();
    const deadline = new Date(slaDeadline);
    const hoursRemaining = (deadline - now) / (1000 * 60 * 60);
    
    if (hoursRemaining < 0) {
      return <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">Overdue</span>;
    } else if (hoursRemaining <= 4) {
      return <span className="px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 text-orange-800">{Math.round(hoursRemaining)}h remaining</span>;
    } else {
      return <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">{Math.round(hoursRemaining)}h remaining</span>;
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
          <p className="text-gray-600 mb-4">The ticket you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/support/tickets')}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/support/tickets')}
          className="text-orange-600 hover:text-orange-700 mb-4 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tickets
        </button>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Ticket {ticket.ticketNumber}
              </h1>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                  {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                </span>
                {ticket.priority === 'urgent' && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    Urgent
                  </span>
                )}
              </div>
            </div>
            {getSLABadge(ticket.slaDeadline)}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Created:</span> {new Date(ticket.createdAt).toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span> {new Date(ticket.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ticket Details</h2>
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                {ticket.attachments.map((attachment, index) => (
                  <div key={index} className="relative">
                    <img
                      src={attachment.url}
                      alt={`Attachment ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-75"
                      onClick={() => window.open(attachment.url, '_blank')}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conversation Thread */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversation</h2>
        
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No messages yet. Start the conversation below.</p>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message._id}
                className={`p-4 rounded-lg ${
                  message.senderType === 'user' ? 'bg-gray-50' : 'bg-blue-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {message.senderType === 'user' ? 'You' : 'Support Team'}
                    </span>
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
      {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add a Reply</h2>
          <form onSubmit={handleSendMessage}>
            <div className="mb-4">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
            
            <button
              type="submit"
              disabled={submitting || (!messageText.trim() && messageAttachments.length === 0)}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                'Send Message'
              )}
            </button>
          </form>
        </div>
      )}

      {ticket.status === 'resolved' && ticket.resolutionNotes && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">Resolution Notes</h3>
          <p className="text-green-800 whitespace-pre-wrap">{ticket.resolutionNotes}</p>
        </div>
      )}
    </div>
  );
};

export default TicketDetail;

