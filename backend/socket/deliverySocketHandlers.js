// backend/socket/deliverySocketHandlers.js - Real-time Delivery Socket Event Handlers

const DeliveryAgent = require('../models/DeliveryAgent');
const Order = require('../models/Order');
const OtpVerification = require('../models/OtpVerification');

// Enhanced socket logging
const socketLog = (event, data, socketId = 'unknown') => {
  const timestamp = new Date().toISOString();
  console.log(`🔌 [SOCKET-DELIVERY] ${timestamp} - ${event} | Socket: ${socketId.slice(0, 8)}...`, data ? JSON.stringify(data, null, 2) : '');
};

// Store delivery agent socket connections
const deliveryAgentSockets = new Map();
const adminSockets = new Map();
const customerSockets = new Map();

class DeliverySocketHandlers {
  constructor(io) {
    this.io = io;
    this.setupDeliveryNamespace();
  }

  // Setup delivery-specific namespace
  setupDeliveryNamespace() {
    // Delivery agent namespace
    this.deliveryNamespace = this.io.of('/delivery');
    
    this.deliveryNamespace.on('connection', (socket) => {
      socketLog('DELIVERY_AGENT_CONNECTED', { socketId: socket.id }, socket.id);
      
      // Register delivery agent socket handlers
      this.registerDeliveryAgentHandlers(socket);
    });

    // Admin namespace for delivery management
    this.adminNamespace = this.io.of('/admin');
    
    this.adminNamespace.on('connection', (socket) => {
      socketLog('ADMIN_CONNECTED', { socketId: socket.id }, socket.id);
      
      // Register admin socket handlers
      this.registerAdminHandlers(socket);
    });

    socketLog('DELIVERY_NAMESPACES_INITIALIZED');
  }

  // Register delivery agent socket event handlers
  registerDeliveryAgentHandlers(socket) {
    // Agent authentication
    socket.on('agent-authenticate', async (data) => {
      try {
        socketLog('AGENT_AUTHENTICATE', data, socket.id);
        
        const { agentId, token } = data;
        
        // Verify token and get agent details
        // This would typically verify JWT token
        const agent = await DeliveryAgent.findById(agentId);
        
        if (agent) {
          socket.agentId = agentId;
          socket.agentData = agent;
          
          // Store socket connection
          deliveryAgentSockets.set(agentId, socket);
          
          // Update agent as online
          agent.isOnline = true;
          agent.lastActiveAt = new Date();
          await agent.save();
          
          // Join agent-specific room
          socket.join(`agent-${agentId}`);
          
          // Send authentication success
          socket.emit('agent-authenticated', {
            success: true,
            agent: {
              id: agent._id,
              name: agent.name,
              isOnline: agent.isOnline,
              isAvailable: agent.isAvailable,
              currentLocation: agent.currentLocation
            }
          });
          
          socketLog('AGENT_AUTHENTICATED', { agentId, agentName: agent.name }, socket.id);
          
          // Notify admins about agent coming online
          this.notifyAdmins('agent-status-changed', {
            agentId,
            agentName: agent.name,
            status: 'online',
            timestamp: new Date()
          });
        } else {
          socket.emit('agent-authentication-failed', {
            success: false,
            message: 'Invalid agent credentials'
          });
        }
      } catch (error) {
        socketLog('AGENT_AUTHENTICATE_ERROR', { error: error.message }, socket.id);
        socket.emit('agent-authentication-failed', {
          success: false,
          message: 'Authentication failed'
        });
      }
    });

    // Location updates
    socket.on('location-update', async (data) => {
      try {
        const { latitude, longitude, accuracy, timestamp } = data;
        
        if (socket.agentId) {
          const agent = await DeliveryAgent.findById(socket.agentId);
          
          if (agent) {
            // Update agent location
            agent.currentLocation = {
              type: 'Point',
              coordinates: [longitude, latitude],
              lastUpdated: new Date(timestamp || Date.now())
            };
            agent.lastActiveAt = new Date();
            await agent.save();
            
            // Emit location update to relevant parties
            if (agent.currentOrder) {
              // Notify customer about delivery agent location
              this.notifyCustomer(agent.currentOrder.toString(), 'delivery-location-update', {
                agentLocation: {
                  latitude,
                  longitude,
                  accuracy,
                  timestamp: agent.currentLocation.lastUpdated
                },
                agentName: agent.name
              });
              
              // Notify admin about agent location
              this.notifyAdmins('agent-location-update', {
                agentId: socket.agentId,
                agentName: agent.name,
                location: { latitude, longitude },
                orderId: agent.currentOrder,
                timestamp: new Date()
              });
            }
            
            // Log location updates occasionally (not every time to avoid spam)
            if (Math.random() < 0.1) { // 10% of updates
              socketLog('LOCATION_UPDATE', { agentId: socket.agentId, latitude, longitude }, socket.id);
            }
          }
        }
      } catch (error) {
        socketLog('LOCATION_UPDATE_ERROR', { error: error.message }, socket.id);
      }
    });

    // Availability status changes
    socket.on('availability-changed', async (data) => {
      try {
        socketLog('AVAILABILITY_CHANGED', data, socket.id);
        
        const { isAvailable } = data;
        
        if (socket.agentId) {
          const agent = await DeliveryAgent.findById(socket.agentId);
          
          if (agent) {
            agent.isAvailable = isAvailable;
            agent.lastActiveAt = new Date();
            await agent.save();
            
            // Notify admins about availability change
            this.notifyAdmins('agent-availability-changed', {
              agentId: socket.agentId,
              agentName: agent.name,
              isAvailable,
              timestamp: new Date()
            });
            
            // If going unavailable, notify about any current orders
            if (!isAvailable && agent.currentOrder) {
              this.notifyAdmins('agent-unavailable-with-order', {
                agentId: socket.agentId,
                agentName: agent.name,
                orderId: agent.currentOrder,
                timestamp: new Date()
              });
            }
          }
        }
      } catch (error) {
        socketLog('AVAILABILITY_CHANGED_ERROR', { error: error.message }, socket.id);
      }
    });

    // Order pickup completion
    socket.on('order-pickup-completed', async (data) => {
      try {
        socketLog('ORDER_PICKUP_COMPLETED', data, socket.id);
        
        const { orderId, pickupData } = data;
        
        const order = await Order.findById(orderId)
          .populate('user', 'name phone')
          .populate('seller', 'firstName shop');
        
        if (order && socket.agentId) {
          // Notify customer about pickup completion
          this.notifyCustomer(order.user._id.toString(), 'order-picked-up', {
            orderId,
            orderNumber: order.orderNumber,
            status: order.status,
            agentName: socket.agentData?.name,
            pickupTime: pickupData.completedAt,
            estimatedDelivery: order.estimatedDelivery?.estimatedAt
          });
          
          // Notify seller about pickup completion
          this.notifySeller(order.seller._id.toString(), 'order-picked-up', {
            orderId,
            orderNumber: order.orderNumber,
            status: order.status,
            agentName: socket.agentData?.name,
            pickupTime: pickupData.completedAt
          });
          
          // Notify admins
          this.notifyAdmins('order-pickup-completed', {
            orderId,
            orderNumber: order.orderNumber,
            agentId: socket.agentId,
            agentName: socket.agentData?.name,
            timestamp: new Date()
          });
        }
      } catch (error) {
        socketLog('ORDER_PICKUP_COMPLETED_ERROR', { error: error.message }, socket.id);
      }
    });

    // Order delivery completion
    socket.on('order-delivery-completed', async (data) => {
      try {
        socketLog('ORDER_DELIVERY_COMPLETED', data, socket.id);
        
        const { orderId, deliveryData } = data;
        
        const order = await Order.findById(orderId)
          .populate('user', 'name phone')
          .populate('seller', 'firstName shop');
        
        if (order && socket.agentId) {
          // Notify customer about delivery completion
          this.notifyCustomer(order.user._id.toString(), 'order-delivered', {
            orderId,
            orderNumber: order.orderNumber,
            status: 'Delivered',
            agentName: socket.agentData?.name,
            deliveryTime: deliveryData.completedAt,
            recipientName: deliveryData.recipientName
          });
          
          // Notify seller about delivery completion
          this.notifySeller(order.seller._id.toString(), 'order-delivered', {
            orderId,
            orderNumber: order.orderNumber,
            status: 'Delivered',
            agentName: socket.agentData?.name,
            deliveryTime: deliveryData.completedAt,
            codCollected: deliveryData.codPayment?.isCollected || false
          });
          
          // Notify admins
          this.notifyAdmins('order-delivery-completed', {
            orderId,
            orderNumber: order.orderNumber,
            agentId: socket.agentId,
            agentName: socket.agentData?.name,
            deliveryTime: deliveryData.completedAt,
            codAmount: deliveryData.codPayment?.amount || 0,
            timestamp: new Date()
          });
          
          // Update agent availability
          if (socket.agentData) {
            socket.agentData.isAvailable = true;
            socket.agentData.currentOrder = null;
            await socket.agentData.save();
          }
        }
      } catch (error) {
        socketLog('ORDER_DELIVERY_COMPLETED_ERROR', { error: error.message }, socket.id);
      }
    });

    // Order issues/problems
    socket.on('order-issue-reported', async (data) => {
      try {
        socketLog('ORDER_ISSUE_REPORTED', data, socket.id);
        
        const { orderId, issueType, description, location } = data;
        
        // Notify admins immediately about the issue
        this.notifyAdmins('order-issue-reported', {
          orderId,
          agentId: socket.agentId,
          agentName: socket.agentData?.name,
          issueType,
          description,
          location,
          timestamp: new Date(),
          priority: 'high'
        });
        
        // Also notify customer if appropriate
        const order = await Order.findById(orderId).populate('user');
        if (order && ['customer_unavailable', 'wrong_address', 'delivery_failed'].includes(issueType)) {
          this.notifyCustomer(order.user._id.toString(), 'delivery-issue', {
            orderId,
            orderNumber: order.orderNumber,
            issueType,
            description,
            agentName: socket.agentData?.name,
            agentPhone: socket.agentData?.phoneNumber
          });
        }
      } catch (error) {
        socketLog('ORDER_ISSUE_REPORTED_ERROR', { error: error.message }, socket.id);
      }
    });

    // Emergency alert
    socket.on('emergency-alert', async (data) => {
      try {
        socketLog('EMERGENCY_ALERT', data, socket.id);
        
        const { type, description, location } = data;
        
        // Immediately notify all admins about emergency
        this.notifyAdmins('emergency-alert', {
          agentId: socket.agentId,
          agentName: socket.agentData?.name,
          agentPhone: socket.agentData?.phoneNumber,
          emergencyType: type,
          description,
          location,
          timestamp: new Date(),
          priority: 'critical'
        });
        
        // Could also trigger SMS/email alerts here
        
        // Acknowledge emergency received
        socket.emit('emergency-acknowledged', {
          alertId: Date.now(),
          message: 'Emergency alert received. Help is on the way.',
          timestamp: new Date()
        });
      } catch (error) {
        socketLog('EMERGENCY_ALERT_ERROR', { error: error.message }, socket.id);
      }
    });

    // Disconnect handler
    socket.on('disconnect', async () => {
      try {
        socketLog('AGENT_DISCONNECTED', { agentId: socket.agentId }, socket.id);
        
        if (socket.agentId) {
          // Remove from active connections
          deliveryAgentSockets.delete(socket.agentId);
          
          // Update agent status
          const agent = await DeliveryAgent.findById(socket.agentId);
          if (agent) {
            agent.isOnline = false;
            agent.lastActiveAt = new Date();
            await agent.save();
            
            // Notify admins about agent going offline
            this.notifyAdmins('agent-status-changed', {
              agentId: socket.agentId,
              agentName: agent.name,
              status: 'offline',
              timestamp: new Date()
            });
          }
        }
      } catch (error) {
        socketLog('AGENT_DISCONNECT_ERROR', { error: error.message }, socket.id);
      }
    });
  }

  // Register admin socket event handlers
  registerAdminHandlers(socket) {
    // Admin authentication
    socket.on('admin-authenticate', async (data) => {
      try {
        socketLog('ADMIN_AUTHENTICATE', data, socket.id);
        
        const { adminId, token } = data;
        
        // Verify admin token
        // const admin = await Admin.findById(adminId);
        
        // For now, accept any admin
        socket.adminId = adminId;
        adminSockets.set(adminId, socket);
        
        socket.join('admin-room');
        
        socket.emit('admin-authenticated', {
          success: true,
          adminId
        });
        
        socketLog('ADMIN_AUTHENTICATED', { adminId }, socket.id);
      } catch (error) {
        socketLog('ADMIN_AUTHENTICATE_ERROR', { error: error.message }, socket.id);
      }
    });

    // Assign order to delivery agent
    socket.on('assign-order-to-agent', async (data) => {
      try {
        socketLog('ASSIGN_ORDER_TO_AGENT', data, socket.id);
        
        const { orderId, agentId } = data;
        
        // Find order and agent
        const order = await Order.findById(orderId).populate('user seller');
        const agent = await DeliveryAgent.findById(agentId);
        
        if (order && agent) {
          // Assign order to agent
          await order.assignDeliveryAgent(agentId, socket.adminId);
          
          // Notify delivery agent
          const agentSocket = deliveryAgentSockets.get(agentId);
          if (agentSocket) {
            agentSocket.emit('order-assigned', {
              orderId,
              orderNumber: order.orderNumber,
              orderDetails: {
                totalAmount: order.totalPrice,
                deliveryFee: order.deliveryFees?.agentEarning || 15,
                customer: {
                  name: order.user.name,
                  phone: order.user.phone
                },
                deliveryAddress: order.shippingAddress,
                estimatedDelivery: order.estimatedDelivery?.estimatedAt
              }
            });
          }
          
          // Notify customer
          this.notifyCustomer(order.user._id.toString(), 'delivery-agent-assigned', {
            orderId,
            orderNumber: order.orderNumber,
            agentName: agent.name,
            agentPhone: agent.phoneNumber,
            estimatedDelivery: order.estimatedDelivery?.estimatedAt
          });
          
          // Acknowledge to admin
          socket.emit('order-assignment-success', {
            orderId,
            agentId,
            agentName: agent.name,
            timestamp: new Date()
          });
        }
      } catch (error) {
        socketLog('ASSIGN_ORDER_TO_AGENT_ERROR', { error: error.message }, socket.id);
        
        socket.emit('order-assignment-failed', {
          orderId: data.orderId,
          agentId: data.agentId,
          error: error.message
        });
      }
    });

    // Admin disconnect handler
    socket.on('disconnect', () => {
      socketLog('ADMIN_DISCONNECTED', { adminId: socket.adminId }, socket.id);
      
      if (socket.adminId) {
        adminSockets.delete(socket.adminId);
      }
    });
  }

  // Helper methods for notifications

  // Notify specific delivery agent
  notifyDeliveryAgent(agentId, event, data) {
    const socket = deliveryAgentSockets.get(agentId);
    if (socket) {
      socket.emit(event, data);
      socketLog('NOTIFY_AGENT', { agentId, event, data }, socket.id);
    }
  }

  // Notify all admins
  notifyAdmins(event, data) {
    this.adminNamespace.to('admin-room').emit(event, data);
    socketLog('NOTIFY_ADMINS', { event, data });
  }

  // Notify customer (assumes customer socket connection exists)
  notifyCustomer(userId, event, data) {
    // This would notify customer through main socket namespace
    this.io.to(`user-${userId}`).emit(event, data);
    socketLog('NOTIFY_CUSTOMER', { userId, event, data });
  }

  // Notify seller
  notifySeller(sellerId, event, data) {
    // This would notify seller through main socket namespace
    this.io.to(`seller-${sellerId}`).emit(event, data);
    socketLog('NOTIFY_SELLER', { sellerId, event, data });
  }

  // Broadcast to all delivery agents
  broadcastToAllAgents(event, data) {
    this.deliveryNamespace.emit(event, data);
    socketLog('BROADCAST_TO_AGENTS', { event, data });
  }

  // Get active delivery agents
  getActiveDeliveryAgents() {
    const activeAgents = [];
    deliveryAgentSockets.forEach((socket, agentId) => {
      if (socket.agentData) {
        activeAgents.push({
          id: agentId,
          name: socket.agentData.name,
          isOnline: socket.agentData.isOnline,
          isAvailable: socket.agentData.isAvailable,
          currentLocation: socket.agentData.currentLocation,
          currentOrder: socket.agentData.currentOrder
        });
      }
    });
    return activeAgents;
  }

  // Get active admin connections
  getActiveAdmins() {
    return Array.from(adminSockets.keys());
  }

  // Emergency broadcast to all parties
  emergencyBroadcast(message, data) {
    // Notify all delivery agents
    this.broadcastToAllAgents('emergency-broadcast', {
      message,
      data,
      timestamp: new Date(),
      priority: 'critical'
    });

    // Notify all admins
    this.notifyAdmins('emergency-broadcast', {
      message,
      data,
      timestamp: new Date(),
      priority: 'critical'
    });

    socketLog('EMERGENCY_BROADCAST', { message, data });
  }

  // System maintenance notification
  systemMaintenanceNotification(maintenanceData) {
    const notification = {
      type: 'maintenance',
      message: maintenanceData.message,
      scheduledTime: maintenanceData.scheduledTime,
      estimatedDuration: maintenanceData.estimatedDuration,
      timestamp: new Date()
    };

    // Notify all delivery agents
    this.broadcastToAllAgents('system-maintenance', notification);

    // Notify all admins
    this.notifyAdmins('system-maintenance', notification);

    socketLog('SYSTEM_MAINTENANCE_NOTIFICATION', notification);
  }

  // Performance monitoring
  getSocketStats() {
    return {
      activeDeliveryAgents: deliveryAgentSockets.size,
      activeAdmins: adminSockets.size,
      totalConnections: deliveryAgentSockets.size + adminSockets.size,
      timestamp: new Date()
    };
  }

  // Cleanup disconnected sockets
  cleanupDisconnectedSockets() {
    // Remove disconnected delivery agent sockets
    for (const [agentId, socket] of deliveryAgentSockets.entries()) {
      if (socket.disconnected) {
        deliveryAgentSockets.delete(agentId);
        socketLog('CLEANUP_DISCONNECTED_AGENT', { agentId });
      }
    }

    // Remove disconnected admin sockets
    for (const [adminId, socket] of adminSockets.entries()) {
      if (socket.disconnected) {
        adminSockets.delete(adminId);
        socketLog('CLEANUP_DISCONNECTED_ADMIN', { adminId });
      }
    }
  }

  // Order tracking updates
  sendOrderTrackingUpdate(orderId, trackingData) {
    try {
      // Find order to get relevant parties
      Order.findById(orderId)
        .populate('user seller deliveryAgent.agent')
        .then(order => {
          if (order) {
            // Notify customer
            if (order.user) {
              this.notifyCustomer(order.user._id.toString(), 'order-tracking-update', {
                orderId,
                orderNumber: order.orderNumber,
                ...trackingData
              });
            }

            // Notify seller
            if (order.seller) {
              this.notifySeller(order.seller._id.toString(), 'order-tracking-update', {
                orderId,
                orderNumber: order.orderNumber,
                ...trackingData
              });
            }

            // Notify assigned delivery agent
            if (order.deliveryAgent?.agent) {
              this.notifyDeliveryAgent(order.deliveryAgent.agent._id.toString(), 'order-tracking-update', {
                orderId,
                orderNumber: order.orderNumber,
                ...trackingData
              });
            }

            // Notify admins
            this.notifyAdmins('order-tracking-update', {
              orderId,
              orderNumber: order.orderNumber,
              ...trackingData
            });
          }
        })
        .catch(error => {
          socketLog('ORDER_TRACKING_UPDATE_ERROR', { error: error.message });
        });
    } catch (error) {
      socketLog('SEND_ORDER_TRACKING_UPDATE_ERROR', { error: error.message });
    }
  }
}

// Initialize delivery socket handlers
let deliverySocketInstance = null;

const initializeDeliverySocketHandlers = (io) => {
  if (!deliverySocketInstance) {
    deliverySocketInstance = new DeliverySocketHandlers(io);
    socketLog('DELIVERY_SOCKET_HANDLERS_INITIALIZED');
  }
  return deliverySocketInstance;
};

// Export functions for use in other parts of the application
const getDeliverySocketInstance = () => {
  return deliverySocketInstance;
};

// Export notification helpers for use in controllers
const notifyDeliveryAgent = (agentId, event, data) => {
  if (deliverySocketInstance) {
    deliverySocketInstance.notifyDeliveryAgent(agentId, event, data);
  }
};

const notifyAdmins = (event, data) => {
  if (deliverySocketInstance) {
    deliverySocketInstance.notifyAdmins(event, data);
  }
};

const broadcastToAllAgents = (event, data) => {
  if (deliverySocketInstance) {
    deliverySocketInstance.broadcastToAllAgents(event, data);
  }
};

const sendOrderTrackingUpdate = (orderId, trackingData) => {
  if (deliverySocketInstance) {
    deliverySocketInstance.sendOrderTrackingUpdate(orderId, trackingData);
  }
};

const emergencyBroadcast = (message, data) => {
  if (deliverySocketInstance) {
    deliverySocketInstance.emergencyBroadcast(message, data);
  }
};

const getSocketStats = () => {
  if (deliverySocketInstance) {
    return deliverySocketInstance.getSocketStats();
  }
  return { activeDeliveryAgents: 0, activeAdmins: 0, totalConnections: 0 };
};

// Periodic cleanup of disconnected sockets
setInterval(() => {
  if (deliverySocketInstance) {
    deliverySocketInstance.cleanupDisconnectedSockets();
  }
}, 300000); // Every 5 minutes

module.exports = {
  DeliverySocketHandlers,
  initializeDeliverySocketHandlers,
  getDeliverySocketInstance,
  notifyDeliveryAgent,
  notifyAdmins,
  broadcastToAllAgents,
  sendOrderTrackingUpdate,
  emergencyBroadcast,
  getSocketStats
};