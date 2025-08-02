// frontend/src/services/trackingService.js - Frontend Order Tracking Service

import React from 'react';
import api from './api';
import io from 'socket.io-client';

// Enhanced logging for tracking operations
const trackingLog = (action, data, type = 'info') => {
  if (process.env.NODE_ENV === 'development') {
    const colors = {
      info: '#2196F3',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336'
    };
    
    console.log(
      `%c[TRACKING-SERVICE] ${action}`,
      `color: ${colors[type]}; font-weight: bold;`,
      data
    );
  }
};

class TrackingService {
  constructor() {
    this.socket = null;
    this.trackingSessions = new Map();
    this.updateCallbacks = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // 🎯 SOCKET CONNECTION MANAGEMENT

  /**
   * Initialize socket connection for real-time tracking
   */
  initializeSocket() {
    try {
      if (this.socket) {
        this.disconnectSocket();
      }

      const socketUrl = process.env.REACT_APP_SOCKET_URL || window.location.origin;
      
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      this.setupSocketListeners();
      
      trackingLog('Socket Connection Initialized', { socketUrl });
    } catch (error) {
      trackingLog('Socket Initialization Error', error, 'error');
    }
  }

  /**
   * Setup socket event listeners
   */
  setupSocketListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      trackingLog('Socket Connected', { socketId: this.socket.id }, 'success');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      trackingLog('Socket Disconnected', { reason }, 'warning');
      
      // Attempt reconnection
      this.handleReconnection();
    });

    this.socket.on('connect_error', (error) => {
      trackingLog('Socket Connection Error', error, 'error');
      this.handleReconnection();
    });

    // Tracking-specific events
    this.socket.on('order-tracking-update', (data) => {
      this.handleTrackingUpdate(data);
    });

    this.socket.on('delivery-location-update', (data) => {
      this.handleLocationUpdate(data);
    });

    this.socket.on('order-status-changed', (data) => {
      this.handleStatusUpdate(data);
    });

    this.socket.on('delivery-issue', (data) => {
      this.handleDeliveryIssue(data);
    });
  }

  /**
   * Handle socket reconnection
   */
  handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      trackingLog('Attempting Reconnection', { 
        attempt: this.reconnectAttempts, 
        delay 
      }, 'warning');
      
      setTimeout(() => {
        if (this.socket && !this.isConnected) {
          this.socket.connect();
        }
      }, delay);
    }
  }

  /**
   * Disconnect socket
   */
  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      trackingLog('Socket Disconnected Manually');
    }
  }

  // 🎯 ORDER TRACKING METHODS

  /**
   * Get comprehensive order tracking information
   * @param {string} orderId - Order ID
   */
  async getOrderTracking(orderId) {
    try {
      trackingLog('Getting Order Tracking', { orderId });

      const response = await api.get(`/tracking/order/${orderId}`);
      
      if (response.data.success) {
        trackingLog('Order Tracking Retrieved', {
          orderId,
          stage: response.data.data.currentStage,
          progress: response.data.data.progress
        }, 'success');
        
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to get tracking data');
      }
    } catch (error) {
      trackingLog('Get Order Tracking Error', {
        orderId,
        error: error.message
      }, 'error');
      
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Start real-time tracking for an order
   * @param {string} orderId - Order ID
   * @param {Function} onUpdate - Callback for tracking updates
   */
  async startTracking(orderId, onUpdate) {
    try {
      trackingLog('Starting Real-time Tracking', { orderId });

      // Initialize socket if not connected
      if (!this.socket || !this.isConnected) {
        this.initializeSocket();
        
        // Wait for connection
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Socket connection timeout')), 10000);
          
          if (this.isConnected) {
            clearTimeout(timeout);
            resolve();
          } else {
            this.socket.once('connect', () => {
              clearTimeout(timeout);
              resolve();
            });
          }
        });
      }

      // Start tracking session on server
      const response = await api.post(`/tracking/start/${orderId}`);
      
      if (response.data.success) {
        // Store tracking session
        this.trackingSessions.set(orderId, {
          startedAt: new Date(),
          isActive: true,
          sessionId: response.data.sessionId
        });

        // Store update callback
        if (onUpdate) {
          this.updateCallbacks.set(orderId, onUpdate);
        }

        // Join tracking room
        this.socket.emit('join-tracking', { orderId });

        trackingLog('Real-time Tracking Started', { orderId }, 'success');
        
        return {
          success: true,
          sessionId: response.data.sessionId
        };
      } else {
        throw new Error(response.data.message || 'Failed to start tracking');
      }
    } catch (error) {
      trackingLog('Start Tracking Error', {
        orderId,
        error: error.message
      }, 'error');
      
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Stop real-time tracking for an order
   * @param {string} orderId - Order ID
   */
  async stopTracking(orderId) {
    try {
      trackingLog('Stopping Real-time Tracking', { orderId });

      // Stop tracking session on server
      await api.post(`/tracking/stop/${orderId}`);

      // Leave tracking room
      if (this.socket && this.isConnected) {
        this.socket.emit('leave-tracking', { orderId });
      }

      // Clean up local tracking data
      this.trackingSessions.delete(orderId);
      this.updateCallbacks.delete(orderId);

      trackingLog('Real-time Tracking Stopped', { orderId }, 'success');
      
      return { success: true };
    } catch (error) {
      trackingLog('Stop Tracking Error', {
        orderId,
        error: error.message
      }, 'error');
      
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Get delivery agent location for specific order
   * @param {string} orderId - Order ID
   */
  async getDeliveryAgentLocation(orderId) {
    try {
      trackingLog('Getting Delivery Agent Location', { orderId });

      const response = await api.get(`/tracking/location/${orderId}`);
      
      if (response.data.success) {
        trackingLog('Delivery Agent Location Retrieved', {
          orderId,
          isLocationAvailable: response.data.data.isLocationAvailable
        }, 'success');
        
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to get agent location');
      }
    } catch (error) {
      trackingLog('Get Agent Location Error', {
        orderId,
        error: error.message
      }, 'error');
      
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Get multiple orders tracking (for dashboard)
   * @param {Array} orderIds - Array of order IDs
   */
  async getMultipleOrderTracking(orderIds) {
    try {
      trackingLog('Getting Multiple Order Tracking', { orderIds });

      const trackingPromises = orderIds.map(orderId => 
        this.getOrderTracking(orderId)
      );

      const results = await Promise.all(trackingPromises);
      const trackingData = {};

      results.forEach((result, index) => {
        const orderId = orderIds[index];
        trackingData[orderId] = result;
      });

      trackingLog('Multiple Order Tracking Retrieved', {
        orderCount: orderIds.length,
        successCount: results.filter(r => r.success).length
      }, 'success');

      return {
        success: true,
        data: trackingData
      };
    } catch (error) {
      trackingLog('Get Multiple Order Tracking Error', {
        orderIds,
        error: error.message
      }, 'error');
      
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  // 🎯 REAL-TIME UPDATE HANDLERS

  /**
   * Handle tracking updates from socket
   */
  handleTrackingUpdate(data) {
    try {
      trackingLog('Received Tracking Update', data);

      const { orderId, type, ...updateData } = data;
      const callback = this.updateCallbacks.get(orderId);

      if (callback) {
        callback({
          type: 'tracking_update',
          orderId,
          updateType: type,
          data: updateData,
          timestamp: new Date()
        });
      }

      // Trigger custom event for other components
      this.triggerTrackingEvent('tracking-update', data);
    } catch (error) {
      trackingLog('Handle Tracking Update Error', error, 'error');
    }
  }

  /**
   * Handle location updates from socket
   */
  handleLocationUpdate(data) {
    try {
      trackingLog('Received Location Update', data);

      const callback = this.updateCallbacks.get(data.orderId);

      if (callback) {
        callback({
          type: 'location_update',
          orderId: data.orderId,
          location: data.agentLocation,
          agentName: data.agentName,
          timestamp: new Date()
        });
      }

      // Trigger custom event
      this.triggerTrackingEvent('location-update', data);
    } catch (error) {
      trackingLog('Handle Location Update Error', error, 'error');
    }
  }

  /**
   * Handle status updates from socket
   */
  handleStatusUpdate(data) {
    try {
      trackingLog('Received Status Update', data);

      const callback = this.updateCallbacks.get(data.orderId);

      if (callback) {
        callback({
          type: 'status_update',
          orderId: data.orderId,
          newStatus: data.status,
          timestamp: data.timestamp || new Date()
        });
      }

      // Trigger custom event
      this.triggerTrackingEvent('status-update', data);
    } catch (error) {
      trackingLog('Handle Status Update Error', error, 'error');
    }
  }

  /**
   * Handle delivery issues from socket
   */
  handleDeliveryIssue(data) {
    try {
      trackingLog('Received Delivery Issue', data);

      const callback = this.updateCallbacks.get(data.orderId);

      if (callback) {
        callback({
          type: 'delivery_issue',
          orderId: data.orderId,
          issueType: data.issueType,
          description: data.description,
          agentName: data.agentName,
          agentPhone: data.agentPhone,
          timestamp: new Date()
        });
      }

      // Trigger custom event
      this.triggerTrackingEvent('delivery-issue', data);
    } catch (error) {
      trackingLog('Handle Delivery Issue Error', error, 'error');
    }
  }

  // 🎯 UTILITY METHODS

  /**
   * Trigger custom tracking event
   */
  triggerTrackingEvent(eventType, data) {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent(`tracking-${eventType}`, {
        detail: data
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error) {
    if (error.response) {
      return error.response.data.message || 'Server error occurred';
    } else if (error.request) {
      return 'Network error. Please check your connection.';
    } else {
      return error.message || 'An unexpected error occurred';
    }
  }

  /**
   * Format tracking stage for display
   */
  formatTrackingStage(stage) {
    const stageNames = {
      'processing': 'Order Processing',
      'awaiting_approval': 'Awaiting Approval',
      'ready_for_pickup': 'Ready for Pickup',
      'agent_assigned': 'Agent Assigned',
      'picked_up': 'Picked Up',
      'out_for_delivery': 'Out for Delivery',
      'delivered': 'Delivered'
    };

    return stageNames[stage] || stage.replace('_', ' ').toUpperCase();
  }

  /**
   * Get tracking stage color
   */
  getTrackingStageColor(stage) {
    const stageColors = {
      'processing': 'blue',
      'awaiting_approval': 'yellow',
      'ready_for_pickup': 'orange',
      'agent_assigned': 'purple',
      'picked_up': 'indigo',
      'out_for_delivery': 'pink',
      'delivered': 'green'
    };

    return stageColors[stage] || 'gray';
  }

  /**
   * Calculate time remaining for delivery
   */
  calculateTimeRemaining(estimatedDelivery) {
    if (!estimatedDelivery) return null;

    const now = new Date();
    const deliveryTime = new Date(estimatedDelivery);
    const timeDiff = deliveryTime - now;

    if (timeDiff <= 0) {
      return { overdue: true, message: 'Delivery overdue' };
    }

    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return { 
        overdue: false, 
        message: `${hours}h ${minutes}m remaining` 
      };
    } else {
      return { 
        overdue: false, 
        message: `${minutes}m remaining` 
      };
    }
  }

  /**
   * Format order timeline for display
   */
  formatOrderTimeline(timeline) {
    return timeline.map(event => ({
      ...event,
      formattedTime: new Date(event.timestamp).toLocaleString(),
      stageColor: this.getTrackingStageColor(event.stage),
      stageName: this.formatTrackingStage(event.stage)
    }));
  }

  /**
   * Check if tracking is active for order
   */
  isTrackingActive(orderId) {
    const session = this.trackingSessions.get(orderId);
    return session && session.isActive;
  }

  /**
   * Get active tracking sessions
   */
  getActiveTrackingSessions() {
    return Array.from(this.trackingSessions.keys());
  }

  /**
   * Clear all tracking sessions
   */
  clearAllTrackingSessions() {
    this.trackingSessions.clear();
    this.updateCallbacks.clear();
    trackingLog('All Tracking Sessions Cleared', null, 'warning');
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id,
      activeSessions: this.trackingSessions.size,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await api.get('/tracking/health');
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: 'Tracking service unavailable'
      };
    }
  }

  /**
   * Debug function (development only)
   */
  debug() {
    if (process.env.NODE_ENV === 'development') {
      const debugInfo = {
        connectionStatus: this.getConnectionStatus(),
        activeTrackingSessions: Array.from(this.trackingSessions.entries()),
        updateCallbacks: Array.from(this.updateCallbacks.keys()),
        socketEvents: this.socket ? Object.keys(this.socket._callbacks || {}) : []
      };

      trackingLog('Debug Info', debugInfo, 'info');
      return debugInfo;
    }
  }
}

// Create singleton instance
const trackingService = new TrackingService();

// Make debug available globally in development
if (process.env.NODE_ENV === 'development') {
  window.debugTracking = () => trackingService.debug();
}

// Custom hook for React components
export const useTracking = (orderId, autoStart = false) => {
  const [trackingData, setTrackingData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [isRealTimeActive, setIsRealTimeActive] = React.useState(false);

  // Load initial tracking data
  const loadTracking = React.useCallback(async () => {
    if (!orderId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await trackingService.getOrderTracking(orderId);
      
      if (result.success) {
        setTrackingData(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Start real-time tracking
  const startRealTimeTracking = React.useCallback(async () => {
    if (!orderId || isRealTimeActive) return;

    try {
      const result = await trackingService.startTracking(orderId, (update) => {
        setTrackingData(prevData => ({
          ...prevData,
          ...update.data,
          lastUpdate: update.timestamp
        }));
      });

      if (result.success) {
        setIsRealTimeActive(true);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [orderId, isRealTimeActive]);

  // Stop real-time tracking
  const stopRealTimeTracking = React.useCallback(async () => {
    if (!orderId || !isRealTimeActive) return;

    try {
      await trackingService.stopTracking(orderId);
      setIsRealTimeActive(false);
    } catch (err) {
      setError(err.message);
    }
  }, [orderId, isRealTimeActive]);

  // Load tracking data on mount
  React.useEffect(() => {
    loadTracking();
  }, [loadTracking]);

  // Auto-start real-time tracking if enabled
  React.useEffect(() => {
    if (autoStart && orderId && !isRealTimeActive) {
      startRealTimeTracking();
    }

    // Cleanup on unmount
    return () => {
      if (isRealTimeActive) {
        stopRealTimeTracking();
      }
    };
  }, [autoStart, orderId, isRealTimeActive, startRealTimeTracking, stopRealTimeTracking]);

  return {
    trackingData,
    loading,
    error,
    isRealTimeActive,
    loadTracking,
    startRealTimeTracking,
    stopRealTimeTracking
  };
};

// Export tracking service and utilities
export default trackingService;