// frontend/src/services/returnService.js - Return Management API Service

const RAW_API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5001' : '');
const API_BASE_URL = RAW_API_BASE.replace(/\/api\/?$/, '');

class ReturnService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  // Get authorization headers
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };
  }

  // Handle API responses
  async handleResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'An error occurred');
    }
    
    return data;
  }

  // 🎯 CHECK RETURN ELIGIBILITY
  async checkReturnEligibility(orderId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/returns/eligibility/${orderId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error checking return eligibility:', error);
      throw error;
    }
  }

  // 🎯 REQUEST RETURN
  async requestReturn(orderId, reason) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/returns/request/${orderId}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ reason })
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error requesting return:', error);
      throw error;
    }
  }

  // 🎯 GET RETURN STATUS
  async getReturnStatus(orderId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/returns/status/${orderId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error getting return status:', error);
      throw error;
    }
  }

  // 🎯 GET RETURN ORDERS (Admin)
  async getReturnOrders(status = null) {
    try {
      const url = status 
        ? `${API_BASE_URL}/api/returns/admin/dashboard?status=${status}`
        : `${API_BASE_URL}/api/returns/admin/dashboard`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error getting return orders:', error);
      throw error;
    }
  }

  // 🎯 ASSIGN RETURN AGENT (Admin)
  async assignReturnAgent(returnId, agentId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/returns/${returnId}/assign`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ agentId })
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error assigning return agent:', error);
      throw error;
    }
  }

  // 🎯 COMPLETE RETURN (Admin)
  async completeReturn(returnId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/returns/${returnId}/complete`, {
        method: 'PUT',
        headers: this.getHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error completing return:', error);
      throw error;
    }
  }

  // 🎯 GET DELIVERY AGENT RETURN ASSIGNMENTS
  async getDeliveryAgentReturns() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/returns/delivery-agent/assignments`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error getting delivery agent returns:', error);
      throw error;
    }
  }

  // 🎯 HANDLE RETURN ASSIGNMENT RESPONSE (Delivery Agent)
  async handleReturnAssignmentResponse(returnId, response, reason = '') {
    try {
      const response_data = await fetch(`${API_BASE_URL}/api/returns/${returnId}/response`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ response, reason })
      });

      return await this.handleResponse(response_data);
    } catch (error) {
      console.error('Error handling return assignment response:', error);
      throw error;
    }
  }

  // 🎯 MARK BUYER LOCATION ARRIVAL (Delivery Agent)
  async markReturnBuyerArrival(returnId, payload = {}) {
    try {
      console.debug('[ReturnService] markReturnBuyerArrival payload:', payload);
      const response = await fetch(`${API_BASE_URL}/api/returns/${returnId}/buyer-arrival`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error marking buyer arrival for return:', error);
      throw error;
    }
  }

  // 🎯 COMPLETE RETURN PICKUP (Delivery Agent)
  async completeReturnPickup(returnId, pickupData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/returns/${returnId}/pickup`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(pickupData)
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error completing return pickup:', error);
      throw error;
    }
  }

  // 🎯 MARK SELLER ARRIVAL & SEND OTP (Delivery Agent)
  async markReturnSellerArrival(returnId, payload = {}) {
    try {
      console.debug('[ReturnService] markReturnSellerArrival payload:', payload);
      const response = await fetch(`${API_BASE_URL}/api/returns/${returnId}/seller-arrival`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error marking seller arrival for return:', error);
      throw error;
    }
  }

  // 🎯 COMPLETE RETURN DELIVERY (Delivery Agent)
  async completeReturnDelivery(returnId, deliveryData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/returns/${returnId}/deliver`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(deliveryData)
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error completing return delivery:', error);
      throw error;
    }
  }

  // 🎯 UTILITY METHODS

  // Format return status for display
  formatReturnStatus(status) {
    const statusMap = {
      'eligible': { label: 'Eligible', color: 'green', icon: 'check-circle' },
      'requested': { label: 'Requested', color: 'blue', icon: 'clock' },
      'approved': { label: 'Approved', color: 'purple', icon: 'check-circle' },
      'assigned': { label: 'Assigned', color: 'orange', icon: 'user-check' },
      'accepted': { label: 'Accepted', color: 'green', icon: 'check-circle' },
      'agent_reached_buyer': { label: 'At Buyer Location', color: 'indigo', icon: 'map-pin' },
      'picked_up': { label: 'Picked Up', color: 'blue', icon: 'package' },
      'agent_reached_seller': { label: 'At Seller Location', color: 'purple', icon: 'map-pin' },
      'returned_to_seller': { label: 'Returned to Seller', color: 'purple', icon: 'truck' },
      'completed': { label: 'Completed', color: 'green', icon: 'check-circle' },
      'pickup_failed': { label: 'Pickup Failed', color: 'red', icon: 'alert-triangle' },
      'rejected': { label: 'Rejected', color: 'red', icon: 'x-circle' }
    };

    return statusMap[status] || { label: status, color: 'gray', icon: 'help-circle' };
  }

  // Format time remaining for return window
  formatTimeRemaining(hours) {
    if (hours <= 0) return 'Expired';
    
    const hoursInt = Math.floor(hours);
    const minutes = Math.floor((hours - hoursInt) * 60);
    
    if (hoursInt > 0) {
      return `${hoursInt}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  }

  // Calculate return deadline
  calculateReturnDeadline(deliveredAt) {
    const deliveryTime = new Date(deliveredAt);
    const deadline = new Date(deliveryTime.getTime() + 24 * 60 * 60 * 1000);
    return deadline;
  }

  // Check if return is within window
  isWithinReturnWindow(deliveredAt) {
    const deliveryTime = new Date(deliveredAt);
    const currentTime = new Date();
    const hoursSinceDelivery = (currentTime - deliveryTime) / (1000 * 60 * 60);
    
    return hoursSinceDelivery <= 24;
  }

  // Get return progress percentage
  getReturnProgress(returnStatus) {
    const progressMap = {
      'eligible': 0,
      'requested': 25,
      'approved': 50,
      'assigned': 60,
      'accepted': 70,
      'agent_reached_buyer': 75,
      'picked_up': 85,
      'agent_reached_seller': 95,
      'returned_to_seller': 95,
      'completed': 100,
      'rejected': 0
    };

    return progressMap[returnStatus] || 0;
  }

  // Get next step in return process
  getNextStep(returnStatus) {
    const stepMap = {
      'eligible': 'Request return',
      'requested': 'Waiting for admin approval',
      'approved': 'Waiting for delivery agent assignment',
      'assigned': 'Waiting for agent acceptance',
      'accepted': 'Waiting for pickup',
      'agent_reached_buyer': 'Confirm pickup with buyer',
      'picked_up': 'Return in transit to seller',
      'agent_reached_seller': 'Verify seller OTP',
      'pickup_failed': 'Awaiting admin review',
      'returned_to_seller': 'Waiting for completion',
      'completed': 'Return completed',
      'rejected': 'Return rejected'
    };

    return stepMap[returnStatus] || 'Unknown status';
  }

  // Validate return reason
  validateReturnReason(reason) {
    const minLength = 10;
    const maxLength = 500;
    
    if (!reason || reason.trim().length < minLength) {
      return `Return reason must be at least ${minLength} characters long`;
    }
    
    if (reason.length > maxLength) {
      return `Return reason must be less than ${maxLength} characters`;
    }
    
    return null; // Valid
  }

  // Get return history timeline
  formatReturnHistory(returnHistory) {
    if (!returnHistory || !Array.isArray(returnHistory)) {
      return [];
    }

    return returnHistory.map(entry => ({
      id: entry._id,
      status: entry.status,
      changedBy: entry.changedBy,
      changedAt: new Date(entry.changedAt),
      notes: entry.notes,
      location: entry.location
    })).sort((a, b) => b.changedAt - a.changedAt);
  }

  // Check if user can request return
  canRequestReturn(order) {
    // Order must be delivered
    if (!order.isDelivered || !order.deliveredAt) {
      return { canRequest: false, reason: 'Order not delivered yet' };
    }

    // Check if already returned or return in progress
    if (order.returnDetails?.returnStatus && 
        order.returnDetails.returnStatus !== 'eligible') {
      return { 
        canRequest: false, 
        reason: `Return already ${order.returnDetails.returnStatus}` 
      };
    }

    // Check 24-hour window
    if (!this.isWithinReturnWindow(order.deliveredAt)) {
      return { 
        canRequest: false, 
        reason: 'Return window expired (24 hours)' 
      };
    }

    return { canRequest: true, reason: 'Eligible for return' };
  }

  // Generate return tracking number
  generateReturnTrackingNumber(orderNumber) {
    const timestamp = Date.now().toString().slice(-6);
    return `RT-${orderNumber}-${timestamp}`;
  }

  // Format return data for display
  formatReturnData(returnDetails) {
    if (!returnDetails) {
      return null;
    }

    return {
      ...returnDetails,
      formattedStatus: this.formatReturnStatus(returnDetails.returnStatus),
      progress: this.getReturnProgress(returnDetails.returnStatus),
      nextStep: this.getNextStep(returnDetails.returnStatus),
      timeRemaining: returnDetails.returnWindow ? 
        this.formatTimeRemaining(
          (new Date(returnDetails.returnWindow.returnDeadline) - new Date()) / (1000 * 60 * 60)
        ) : null,
      history: this.formatReturnHistory(returnDetails.returnHistory)
    };
  }

  // 🎯 MARK RETURN PICKUP AS FAILED (Delivery Agent)
  async markReturnPickupFailed(returnId, reason) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/returns/${returnId}/pickup-failed`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ reason })
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error marking return pickup as failed:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const returnService = new ReturnService();
export default returnService;

// Export class for testing
export { ReturnService };
