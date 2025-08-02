// backend/services/trackingService.js - Order Tracking Service

const Order = require('../models/Order');
const DeliveryAgent = require('../models/DeliveryAgent');
const OtpVerification = require('../models/OtpVerification');
const { sendOrderTrackingUpdate } = require('../socket/deliverySocketHandlers');

// Enhanced logging for tracking operations
const trackingLog = (action, data, level = 'info') => {
  const timestamp = new Date().toISOString();
  const logLevels = {
    info: '📍',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  
  console.log(`${logLevels[level]} [TRACKING-SERVICE] ${timestamp} - ${action}`, data ? JSON.stringify(data, null, 2) : '');
};

class TrackingService {
  constructor() {
    this.trackingUpdateInterval = 30000; // 30 seconds
    this.activeTrackingSessions = new Map();
    this.startPeriodicUpdates();
  }

  // 🎯 ORDER TRACKING METHODS

  /**
   * Get comprehensive order tracking information
   * @param {string} orderId - Order ID
   * @param {string} requesterId - User/Admin/Agent ID requesting tracking
   * @param {string} requesterType - 'user', 'admin', 'delivery_agent', 'seller'
   */
  async getOrderTracking(orderId, requesterId, requesterType = 'user') {
    try {
      trackingLog('GET_ORDER_TRACKING', { orderId, requesterId, requesterType });

      const order = await Order.findById(orderId)
        .populate('user', 'name phone')
        .populate('seller', 'firstName shop phone')
        .populate('deliveryAgent.agent', 'name phoneNumber currentLocation vehicleDetails')
        .populate('otpVerification.currentOTP');

      if (!order) {
        throw new Error('Order not found');
      }

      // Check access permissions
      if (!this.hasTrackingAccess(order, requesterId, requesterType)) {
        throw new Error('Access denied for order tracking');
      }

      // Build comprehensive tracking response
      const trackingData = await this.buildTrackingResponse(order, requesterType);

      trackingLog('ORDER_TRACKING_RETRIEVED', { 
        orderId, 
        stage: trackingData.currentStage,
        status: trackingData.orderStatus 
      }, 'success');

      return {
        success: true,
        data: trackingData
      };
    } catch (error) {
      trackingLog('GET_ORDER_TRACKING_ERROR', { 
        orderId, 
        error: error.message 
      }, 'error');
      
      return {
        success: false,
        message: error.message || 'Failed to get order tracking'
      };
    }
  }

  /**
   * Update order tracking status
   * @param {string} orderId - Order ID
   * @param {Object} updateData - Tracking update data
   * @param {string} updatedBy - Who is updating (agent ID, admin ID, etc.)
   * @param {string} updaterType - 'delivery_agent', 'admin', 'system'
   */
  async updateOrderTracking(orderId, updateData, updatedBy, updaterType = 'system') {
    try {
      trackingLog('UPDATE_ORDER_TRACKING', { 
        orderId, 
        updateData, 
        updatedBy, 
        updaterType 
      });

      const order = await Order.findById(orderId)
        .populate('deliveryAgent.agent');

      if (!order) {
        throw new Error('Order not found');
      }

      // Process different types of updates
      let updateResult = {};

      switch (updateData.type) {
        case 'status_change':
          updateResult = await this.handleStatusUpdate(order, updateData, updatedBy, updaterType);
          break;
          
        case 'location_update':
          updateResult = await this.handleLocationUpdate(order, updateData, updatedBy);
          break;
          
        case 'pickup_completion':
          updateResult = await this.handlePickupCompletion(order, updateData, updatedBy);
          break;
          
        case 'delivery_completion':
          updateResult = await this.handleDeliveryCompletion(order, updateData, updatedBy);
          break;
          
        case 'delivery_attempt':
          updateResult = await this.handleDeliveryAttempt(order, updateData, updatedBy);
          break;
          
        case 'issue_reported':
          updateResult = await this.handleIssueReport(order, updateData, updatedBy);
          break;
          
        default:
          throw new Error(`Unknown update type: ${updateData.type}`);
      }

      // Send real-time updates to all relevant parties
      await this.broadcastTrackingUpdate(orderId, updateResult);

      trackingLog('ORDER_TRACKING_UPDATED', { 
        orderId, 
        updateType: updateData.type,
        result: updateResult 
      }, 'success');

      return {
        success: true,
        data: updateResult
      };
    } catch (error) {
      trackingLog('UPDATE_ORDER_TRACKING_ERROR', { 
        orderId, 
        error: error.message 
      }, 'error');
      
      return {
        success: false,
        message: error.message || 'Failed to update order tracking'
      };
    }
  }

  /**
   * Get real-time location of delivery agent for specific order
   * @param {string} orderId - Order ID
   * @param {string} requesterId - User requesting location
   */
  async getDeliveryAgentLocation(orderId, requesterId) {
    try {
      trackingLog('GET_DELIVERY_AGENT_LOCATION', { orderId, requesterId });

      const order = await Order.findById(orderId)
        .populate('user')
        .populate('deliveryAgent.agent', 'name currentLocation lastActiveAt');

      if (!order) {
        throw new Error('Order not found');
      }

      // Check if requester has access
      if (order.user._id.toString() !== requesterId) {
        throw new Error('Access denied');
      }

      const agent = order.deliveryAgent?.agent;
      if (!agent) {
        return {
          success: false,
          message: 'No delivery agent assigned to this order'
        };
      }

      // Calculate if location is recent (within last 5 minutes)
      const lastUpdate = agent.currentLocation?.lastUpdated || agent.lastActiveAt;
      const isLocationRecent = lastUpdate && (new Date() - new Date(lastUpdate)) < 300000;

      const locationData = {
        agentName: agent.name,
        isLocationAvailable: !!agent.currentLocation && isLocationRecent,
        location: isLocationRecent ? {
          latitude: agent.currentLocation.coordinates[1],
          longitude: agent.currentLocation.coordinates[0],
          lastUpdated: agent.currentLocation.lastUpdated
        } : null,
        lastActiveAt: agent.lastActiveAt,
        estimatedArrival: this.calculateEstimatedArrival(
          agent.currentLocation, 
          order.shippingAddress
        )
      };

      return {
        success: true,
        data: locationData
      };
    } catch (error) {
      trackingLog('GET_DELIVERY_AGENT_LOCATION_ERROR', { 
        orderId, 
        error: error.message 
      }, 'error');
      
      return {
        success: false,
        message: error.message || 'Failed to get delivery agent location'
      };
    }
  }

  /**
   * Start tracking session for order
   * @param {string} orderId - Order ID
   * @param {string} userId - User ID requesting tracking
   */
  async startTrackingSession(orderId, userId) {
    try {
      trackingLog('START_TRACKING_SESSION', { orderId, userId });

      const order = await Order.findById(orderId).populate('user');
      
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.user._id.toString() !== userId) {
        throw new Error('Access denied');
      }

      // Store active tracking session
      this.activeTrackingSessions.set(orderId, {
        userId,
        startedAt: new Date(),
        lastUpdate: new Date()
      });

      return {
        success: true,
        message: 'Tracking session started',
        sessionId: orderId
      };
    } catch (error) {
      trackingLog('START_TRACKING_SESSION_ERROR', { 
        orderId, 
        error: error.message 
      }, 'error');
      
      return {
        success: false,
        message: error.message || 'Failed to start tracking session'
      };
    }
  }

  /**
   * Stop tracking session
   * @param {string} orderId - Order ID
   * @param {string} userId - User ID
   */
  stopTrackingSession(orderId, userId) {
    try {
      const session = this.activeTrackingSessions.get(orderId);
      
      if (session && session.userId === userId) {
        this.activeTrackingSessions.delete(orderId);
        trackingLog('TRACKING_SESSION_STOPPED', { orderId, userId });
        return { success: true, message: 'Tracking session stopped' };
      }
      
      return { success: false, message: 'No active tracking session found' };
    } catch (error) {
      trackingLog('STOP_TRACKING_SESSION_ERROR', { 
        orderId, 
        error: error.message 
      }, 'error');
      
      return {
        success: false,
        message: error.message || 'Failed to stop tracking session'
      };
    }
  }

  // 🎯 HELPER METHODS

  /**
   * Check if requester has access to order tracking
   */
  hasTrackingAccess(order, requesterId, requesterType) {
    switch (requesterType) {
      case 'user':
        return order.user._id.toString() === requesterId;
      case 'seller':
        return order.seller._id.toString() === requesterId;
      case 'delivery_agent':
        return order.deliveryAgent?.agent?._id.toString() === requesterId;
      case 'admin':
        return true; // Admins have access to all orders
      default:
        return false;
    }
  }

  /**
   * Build comprehensive tracking response
   */
  async buildTrackingResponse(order, requesterType) {
    const trackingData = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      currentStage: this.getCurrentTrackingStage(order),
      createdAt: order.createdAt,
      estimatedDelivery: order.estimatedDelivery?.estimatedAt,
      actualDeliveryTime: order.estimatedDelivery?.actualDeliveryTime,
      isOnTime: order.estimatedDelivery?.isOnTime,
      
      // Timeline of events
      timeline: this.buildOrderTimeline(order),
      
      // Current progress
      progress: this.calculateOrderProgress(order),
      
      // Customer information (limited based on requester)
      customer: requesterType === 'admin' ? {
        name: order.user?.name,
        phone: order.user?.phone
      } : {
        name: order.user?.name
      },
      
      // Seller information
      seller: {
        name: order.seller?.firstName,
        shopName: order.seller?.shop?.name,
        address: order.seller?.shop?.address
      },
      
      // Delivery information
      delivery: await this.buildDeliveryInfo(order, requesterType),
      
      // Real-time tracking (if available)
      liveTracking: order.liveTracking?.isEnabled ? {
        isEnabled: true,
        lastKnownLocation: order.liveTracking.lastKnownLocation,
        estimatedArrival: order.liveTracking.estimatedArrival
      } : { isEnabled: false }
    };

    return trackingData;
  }

  /**
   * Get current tracking stage
   */
  getCurrentTrackingStage(order) {
    if (order.status === 'Delivered') return 'delivered';
    if (order.delivery?.isCompleted) return 'delivered';
    if (order.status === 'Out_for_Delivery') return 'out_for_delivery';
    if (order.pickup?.isCompleted) return 'picked_up';
    if (order.deliveryAgent?.status === 'accepted') return 'agent_assigned';
    if (order.adminApproval?.status === 'approved') return 'ready_for_pickup';
    if (order.adminApproval?.status === 'pending') return 'awaiting_approval';
    return 'processing';
  }

  /**
   * Build order timeline
   */
  buildOrderTimeline(order) {
    const timeline = [];
    
    // Add order creation
    timeline.push({
      stage: 'order_placed',
      title: 'Order Placed',
      description: 'Your order has been received and is being processed',
      timestamp: order.createdAt,
      status: 'completed'
    });

    // Add admin approval
    if (order.adminApproval?.approvedAt) {
      timeline.push({
        stage: 'approved',
        title: 'Order Approved',
        description: 'Order approved for delivery assignment',
        timestamp: order.adminApproval.approvedAt,
        status: 'completed'
      });
    }

    // Add agent assignment
    if (order.deliveryAgent?.assignedAt) {
      timeline.push({
        stage: 'agent_assigned',
        title: 'Delivery Agent Assigned',
        description: 'A delivery agent has been assigned to your order',
        timestamp: order.deliveryAgent.assignedAt,
        status: 'completed'
      });
    }

    // Add pickup completion
    if (order.pickup?.completedAt) {
      timeline.push({
        stage: 'picked_up',
        title: 'Order Picked Up',
        description: 'Your order has been picked up from the seller',
        timestamp: order.pickup.completedAt,
        status: 'completed'
      });
    }

    // Add delivery completion
    if (order.delivery?.completedAt) {
      timeline.push({
        stage: 'delivered',
        title: 'Order Delivered',
        description: 'Your order has been successfully delivered',
        timestamp: order.delivery.completedAt,
        status: 'completed'
      });
    } else {
      // Add expected delivery
      timeline.push({
        stage: 'delivery_expected',
        title: 'Expected Delivery',
        description: 'Estimated delivery time',
        timestamp: order.estimatedDelivery?.estimatedAt,
        status: 'pending'
      });
    }

    return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Calculate order progress percentage
   */
  calculateOrderProgress(order) {
    const stages = [
      'order_placed',
      'approved',
      'agent_assigned',
      'picked_up',
      'delivered'
    ];
    
    const currentStage = this.getCurrentTrackingStage(order);
    const currentIndex = stages.indexOf(currentStage);
    
    if (currentIndex === -1) return 0;
    
    return Math.round(((currentIndex + 1) / stages.length) * 100);
  }

  /**
   * Build delivery information
   */
  async buildDeliveryInfo(order, requesterType) {
    const deliveryInfo = {
      isAssigned: !!order.deliveryAgent?.agent,
      status: order.deliveryAgent?.status || 'unassigned'
    };

    if (order.deliveryAgent?.agent) {
      const agent = order.deliveryAgent.agent;
      
      deliveryInfo.agent = {
        name: agent.name,
        phone: requesterType === 'admin' ? agent.phoneNumber : null,
        vehicle: agent.vehicleDetails?.type,
        rating: agent.stats?.averageRating || 0
      };

      // Add location if available and recent
      if (agent.currentLocation?.lastUpdated) {
        const locationAge = new Date() - new Date(agent.currentLocation.lastUpdated);
        if (locationAge < 300000) { // 5 minutes
          deliveryInfo.agent.location = {
            latitude: agent.currentLocation.coordinates[1],
            longitude: agent.currentLocation.coordinates[0],
            lastUpdated: agent.currentLocation.lastUpdated
          };
        }
      }
    }

    return deliveryInfo;
  }

  /**
   * Handle status update
   */
  async handleStatusUpdate(order, updateData, updatedBy, updaterType) {
    const { newStatus, notes, location } = updateData;
    
    await order.updateStatus(newStatus, updaterType, notes, location);
    
    return {
      type: 'status_update',
      oldStatus: order.status,
      newStatus,
      updatedBy: updaterType,
      notes,
      timestamp: new Date()
    };
  }

  /**
   * Handle location update
   */
  async handleLocationUpdate(order, updateData, updatedBy) {
    const { latitude, longitude, accuracy } = updateData;
    
    // Update live tracking
    order.liveTracking = {
      isEnabled: true,
      lastKnownLocation: {
        type: 'Point',
        coordinates: [longitude, latitude],
        updatedAt: new Date()
      },
      estimatedArrival: this.calculateEstimatedArrival(
        { coordinates: [longitude, latitude] },
        order.shippingAddress
      )
    };
    
    await order.save();
    
    return {
      type: 'location_update',
      location: { latitude, longitude, accuracy },
      estimatedArrival: order.liveTracking.estimatedArrival,
      timestamp: new Date()
    };
  }

  /**
   * Handle pickup completion
   */
  async handlePickupCompletion(order, updateData, updatedBy) {
    await order.completePickup(updateData);
    
    return {
      type: 'pickup_completed',
      pickupLocation: updateData.location,
      pickupNotes: updateData.notes,
      timestamp: new Date()
    };
  }

  /**
   * Handle delivery completion
   */
  async handleDeliveryCompletion(order, updateData, updatedBy) {
    await order.completeDelivery(updateData);
    
    return {
      type: 'delivery_completed',
      deliveryLocation: updateData.location,
      recipientName: updateData.recipientName,
      deliveryNotes: updateData.notes,
      timestamp: new Date()
    };
  }

  /**
   * Handle delivery attempt
   */
  async handleDeliveryAttempt(order, updateData, updatedBy) {
    const attempt = {
      attemptNumber: order.delivery.attemptCount + 1,
      attemptedAt: new Date(),
      status: updateData.status,
      notes: updateData.notes || '',
      location: updateData.location || { type: 'Point', coordinates: [0, 0] }
    };
    
    order.delivery.attempts.push(attempt);
    order.delivery.attemptCount += 1;
    order.delivery.isAttempted = true;
    
    await order.save();
    
    return {
      type: 'delivery_attempt',
      attempt,
      timestamp: new Date()
    };
  }

  /**
   * Handle issue report
   */
  async handleIssueReport(order, updateData, updatedBy) {
    // Add issue to order notes or create a separate issue tracking
    const issueNote = `Issue reported: ${updateData.issueType} - ${updateData.description}`;
    
    order.statusHistory.push({
      status: order.status,
      changedBy: 'delivery_agent',
      changedAt: new Date(),
      notes: issueNote,
      location: updateData.location
    });
    
    await order.save();
    
    return {
      type: 'issue_reported',
      issueType: updateData.issueType,
      description: updateData.description,
      location: updateData.location,
      timestamp: new Date()
    };
  }

  /**
   * Calculate estimated arrival time
   */
  calculateEstimatedArrival(currentLocation, deliveryAddress) {
    // This is a simplified calculation
    // In a real implementation, you would use a routing service like Google Maps API
    
    if (!currentLocation?.coordinates || !deliveryAddress) {
      return null;
    }
    
    // Assume average speed of 30 km/h in city
    const averageSpeed = 30; // km/h
    
    // Calculate rough distance (this is very approximate)
    const distance = this.calculateDistance(
      currentLocation.coordinates[1], // latitude
      currentLocation.coordinates[0], // longitude
      deliveryAddress.latitude || 0,
      deliveryAddress.longitude || 0
    );
    
    const estimatedTimeHours = distance / averageSpeed;
    const estimatedTimeMs = estimatedTimeHours * 60 * 60 * 1000;
    
    return new Date(Date.now() + estimatedTimeMs);
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  /**
   * Broadcast tracking update to all relevant parties
   */
  async broadcastTrackingUpdate(orderId, updateData) {
    try {
      // Send update via socket handlers
      sendOrderTrackingUpdate(orderId, updateData);
      
      trackingLog('TRACKING_UPDATE_BROADCASTED', { orderId, updateData });
    } catch (error) {
      trackingLog('BROADCAST_TRACKING_UPDATE_ERROR', { 
        orderId, 
        error: error.message 
      }, 'error');
    }
  }

  /**
   * Start periodic updates for active tracking sessions
   */
  startPeriodicUpdates() {
    setInterval(async () => {
      try {
        // Update active tracking sessions
        for (const [orderId, session] of this.activeTrackingSessions.entries()) {
          await this.sendPeriodicUpdate(orderId, session);
        }
      } catch (error) {
        trackingLog('PERIODIC_UPDATE_ERROR', { error: error.message }, 'error');
      }
    }, this.trackingUpdateInterval);

    trackingLog('PERIODIC_UPDATES_STARTED', { 
      interval: this.trackingUpdateInterval 
    });
  }

  /**
   * Send periodic update for tracking session
   */
  async sendPeriodicUpdate(orderId, session) {
    try {
      const trackingData = await this.getOrderTracking(orderId, session.userId, 'user');
      
      if (trackingData.success) {
        // Send update via socket
        sendOrderTrackingUpdate(orderId, {
          type: 'periodic_update',
          data: trackingData.data,
          timestamp: new Date()
        });
        
        session.lastUpdate = new Date();
      }
    } catch (error) {
      trackingLog('SEND_PERIODIC_UPDATE_ERROR', { 
        orderId, 
        error: error.message 
      }, 'warning');
    }
  }

  // 🎯 ANALYTICS AND REPORTING METHODS

  /**
   * Get tracking analytics for admin dashboard
   */
  async getTrackingAnalytics(timeframe = '24h') {
    try {
      trackingLog('GET_TRACKING_ANALYTICS', { timeframe });

      const timeframMs = this.parseTimeframe(timeframe);
      const startDate = new Date(Date.now() - timeframMs);

      const [
        totalOrders,
        deliveredOrders,
        inTransitOrders,
        delayedOrders,
        averageDeliveryTime
      ] = await Promise.all([
        // Total orders in timeframe
        Order.countDocuments({
          createdAt: { $gte: startDate }
        }),
        
        // Delivered orders
        Order.countDocuments({
          status: 'Delivered',
          deliveredAt: { $gte: startDate }
        }),
        
        // In transit orders
        Order.countDocuments({
          status: { $in: ['Out_for_Delivery', 'Pickup_Ready'] },
          createdAt: { $gte: startDate }
        }),
        
        // Delayed orders (past estimated delivery time)
        Order.countDocuments({
          'estimatedDelivery.estimatedAt': { $lt: new Date() },
          status: { $nin: ['Delivered', 'Cancelled'] }
        }),
        
        // Average delivery time
        Order.aggregate([
          {
            $match: {
              status: 'Delivered',
              deliveredAt: { $gte: startDate },
              'estimatedDelivery.actualDeliveryTime': { $exists: true }
            }
          },
          {
            $group: {
              _id: null,
              avgDeliveryTime: { $avg: '$estimatedDelivery.actualDeliveryTime' }
            }
          }
        ])
      ]);

      const analytics = {
        timeframe,
        totalOrders,
        deliveredOrders,
        inTransitOrders,
        delayedOrders,
        averageDeliveryTime: averageDeliveryTime[0]?.avgDeliveryTime || 0,
        onTimeDeliveryRate: totalOrders > 0 ? 
          Math.round(((deliveredOrders - delayedOrders) / totalOrders) * 100) : 0,
        activeTrackingSessions: this.activeTrackingSessions.size,
        timestamp: new Date()
      };

      trackingLog('TRACKING_ANALYTICS_GENERATED', analytics, 'success');
      return { success: true, data: analytics };
    } catch (error) {
      trackingLog('GET_TRACKING_ANALYTICS_ERROR', { error: error.message }, 'error');
      return { success: false, message: error.message };
    }
  }

  /**
   * Get delivery performance metrics
   */
  async getDeliveryPerformance(agentId = null, timeframe = '7d') {
    try {
      trackingLog('GET_DELIVERY_PERFORMANCE', { agentId, timeframe });

      const timeframMs = this.parseTimeframe(timeframe);
      const startDate = new Date(Date.now() - timeframMs);

      const matchQuery = {
        'delivery.completedAt': { $gte: startDate },
        status: 'Delivered'
      };

      if (agentId) {
        matchQuery['deliveryAgent.agent'] = agentId;
      }

      const performanceData = await Order.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: agentId ? '$deliveryAgent.agent' : null,
            totalDeliveries: { $sum: 1 },
            onTimeDeliveries: {
              $sum: {
                $cond: [{ $eq: ['$estimatedDelivery.isOnTime', true] }, 1, 0]
              }
            },
            avgDeliveryTime: { $avg: '$estimatedDelivery.actualDeliveryTime' },
            totalEarnings: { $sum: '$deliveryFees.agentEarning' }
          }
        }
      ]);

      const performance = performanceData[0] || {
        totalDeliveries: 0,
        onTimeDeliveries: 0,
        avgDeliveryTime: 0,
        totalEarnings: 0
      };

      performance.onTimeRate = performance.totalDeliveries > 0 ?
        Math.round((performance.onTimeDeliveries / performance.totalDeliveries) * 100) : 0;

      return { success: true, data: performance };
    } catch (error) {
      trackingLog('GET_DELIVERY_PERFORMANCE_ERROR', { error: error.message }, 'error');
      return { success: false, message: error.message };
    }
  }

  /**
   * Generate tracking report
   */
  async generateTrackingReport(filters = {}) {
    try {
      trackingLog('GENERATE_TRACKING_REPORT', filters);

      const {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endDate = new Date(),
        status,
        agentId,
        sellerId
      } = filters;

      const matchQuery = {
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      };

      if (status) matchQuery.status = status;
      if (agentId) matchQuery['deliveryAgent.agent'] = agentId;
      if (sellerId) matchQuery.seller = sellerId;

      const reportData = await Order.aggregate([
        { $match: matchQuery },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        {
          $lookup: {
            from: 'deliveryagents',
            localField: 'deliveryAgent.agent',
            foreignField: '_id',
            as: 'agentInfo'
          }
        },
        {
          $project: {
            orderNumber: 1,
            status: 1,
            totalPrice: 1,
            createdAt: 1,
            deliveredAt: 1,
            estimatedDelivery: 1,
            'userInfo.name': 1,
            'agentInfo.name': 1,
            'deliveryFees.agentEarning': 1,
            isDelayed: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'Delivered'] },
                    { $lt: ['$estimatedDelivery.estimatedAt', new Date()] }
                  ]
                },
                true,
                false
              ]
            }
          }
        },
        { $sort: { createdAt: -1 } }
      ]);

      const summary = {
        totalOrders: reportData.length,
        deliveredOrders: reportData.filter(o => o.status === 'Delivered').length,
        delayedOrders: reportData.filter(o => o.isDelayed).length,
        totalRevenue: reportData.reduce((sum, o) => sum + (o.totalPrice || 0), 0),
        totalDeliveryFees: reportData.reduce((sum, o) => sum + (o.deliveryFees?.agentEarning || 0), 0)
      };

      const report = {
        summary,
        orders: reportData,
        filters,
        generatedAt: new Date()
      };

      trackingLog('TRACKING_REPORT_GENERATED', { 
        ordersCount: reportData.length,
        summary 
      }, 'success');

      return { success: true, data: report };
    } catch (error) {
      trackingLog('GENERATE_TRACKING_REPORT_ERROR', { error: error.message }, 'error');
      return { success: false, message: error.message };
    }
  }

  // 🎯 UTILITY METHODS

  /**
   * Parse timeframe string to milliseconds
   */
  parseTimeframe(timeframe) {
    const timeframes = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    return timeframes[timeframe] || timeframes['24h'];
  }

  /**
   * Cleanup expired tracking sessions
   */
  cleanupExpiredSessions() {
    const now = new Date();
    const expirationTime = 30 * 60 * 1000; // 30 minutes
    
    for (const [orderId, session] of this.activeTrackingSessions.entries()) {
      if (now - session.lastUpdate > expirationTime) {
        this.activeTrackingSessions.delete(orderId);
        trackingLog('TRACKING_SESSION_EXPIRED', { orderId }, 'warning');
      }
    }
  }

  /**
   * Get system health metrics
   */
  getSystemHealth() {
    return {
      activeTrackingSessions: this.activeTrackingSessions.size,
      trackingUpdateInterval: this.trackingUpdateInterval,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date()
    };
  }
}

// Create singleton instance
const trackingService = new TrackingService();

// Cleanup expired sessions every 10 minutes
setInterval(() => {
  trackingService.cleanupExpiredSessions();
}, 10 * 60 * 1000);

// Export the service
module.exports = trackingService;