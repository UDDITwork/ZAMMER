// backend/socket/socketHandlers.js - Enhanced Real-time System

const Order = require('../models/Order');
const User = require('../models/User');
const Seller = require('../models/Seller');

// Enhanced logging for socket operations with better formatting
const logSocketOperation = (operation, data, type = 'info') => {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    seller: '\x1b[35m',  // Magenta
    buyer: '\x1b[34m',   // Blue
    reset: '\x1b[0m'     // Reset
  };
  
  const timestamp = new Date().toISOString().slice(11, 23);
  const prefix = `${colors[type]}📡 [Socket-${operation}] ${timestamp}`;
  const suffix = colors.reset;
  
  if (typeof data === 'object') {
    console.log(`${prefix} ${JSON.stringify(data, null, 2)}${suffix}`);
  } else {
    console.log(`${prefix} ${data}${suffix}`);
  }
};

// 🎯 FIX: Enhanced global functions for emitting to specific user types
global.emitToSeller = (sellerId, eventType, data) => {
  if (!global.io) {
    logSocketOperation('EmitToSeller', {
      error: 'Socket.io not initialized',
      sellerId,
      eventType
    }, 'error');
    return false;
  }

  try {
    const roomName = `seller-${sellerId}`;
    logSocketOperation('EmitToSeller', {
      sellerId,
      eventType,
      roomName,
      orderNumber: data.orderNumber || 'N/A',
      timestamp: new Date().toISOString()
    }, 'seller');
    
    const payload = {
      type: eventType,
      data: data,
      timestamp: new Date().toISOString(),
      source: 'server'
    };
    
    // Emit to the seller room
    global.io.to(roomName).emit(eventType, payload);
    
    // 🎯 FIX: Also emit to all connected sockets for this seller (fallback)
    const sellerSockets = Array.from(global.io.sockets.sockets.values())
      .filter(socket => socket.sellerId === sellerId);
    
    sellerSockets.forEach(socket => {
      socket.emit(eventType, payload);
    });
    
    logSocketOperation('EmitToSeller', {
      success: true,
      sellerId,
      eventType,
      roomTargets: 1,
      socketTargets: sellerSockets.length,
      totalTargets: sellerSockets.length + 1
    }, 'success');
    
    return true;
  } catch (error) {
    logSocketOperation('EmitToSeller', {
      error: error.message,
      sellerId,
      eventType,
      stack: error.stack
    }, 'error');
    return false;
  }
};

global.emitToBuyer = (userId, eventType, data) => {
  if (!global.io) {
    logSocketOperation('EmitToBuyer', {
      error: 'Socket.io not initialized',
      userId,
      eventType
    }, 'error');
    return false;
  }

  try {
    const roomName = `buyer-${userId}`;
    logSocketOperation('EmitToBuyer', {
      userId,
      eventType,
      roomName,
      orderNumber: data.orderNumber || 'N/A',
      timestamp: new Date().toISOString()
    }, 'buyer');
    
    const payload = {
      type: eventType,
      data: data,
      timestamp: new Date().toISOString(),
      source: 'server'
    };
    
    // Emit to the buyer room
    global.io.to(roomName).emit(eventType, payload);
    
    // 🎯 FIX: Also emit to all connected sockets for this buyer (fallback)
    const buyerSockets = Array.from(global.io.sockets.sockets.values())
      .filter(socket => socket.userId === userId);
    
    buyerSockets.forEach(socket => {
      socket.emit(eventType, payload);
    });
    
    logSocketOperation('EmitToBuyer', {
      success: true,
      userId,
      eventType,
      roomTargets: 1,
      socketTargets: buyerSockets.length,
      totalTargets: buyerSockets.length + 1
    }, 'success');
    
    return true;
  } catch (error) {
    logSocketOperation('EmitToBuyer', {
      error: error.message,
      userId,
      eventType,
      stack: error.stack
    }, 'error');
    return false;
  }
};

// 🎯 NEW: Emit to delivery agent
global.emitToDeliveryAgent = (agentId, eventType, data) => {
  if (!global.io) {
    logSocketOperation('EmitToDeliveryAgent', {
      error: 'Socket.io not initialized',
      agentId,
      eventType
    }, 'error');
    return false;
  }

  try {
    const roomName = `delivery-agent-${agentId}`;
    logSocketOperation('EmitToDeliveryAgent', {
      agentId,
      eventType,
      roomName,
      orderNumber: data.orderNumber || 'N/A',
      timestamp: new Date().toISOString()
    }, 'info');
    
    const payload = {
      type: eventType,
      data: data,
      timestamp: new Date().toISOString(),
      source: 'server'
    };
    
    // Emit to the delivery agent room
    global.io.to(roomName).emit(eventType, payload);
    
    // 🎯 FIX: Also emit to all connected sockets for this agent (fallback)
    const agentSockets = Array.from(global.io.sockets.sockets.values())
      .filter(socket => socket.deliveryAgentId === agentId);
    
    agentSockets.forEach(socket => {
      socket.emit(eventType, payload);
    });
    
    logSocketOperation('EmitToDeliveryAgent', {
      success: true,
      agentId,
      eventType,
      roomTargets: 1,
      socketTargets: agentSockets.length,
      totalTargets: agentSockets.length + 1
    }, 'success');
    
    return true;
  } catch (error) {
    logSocketOperation('EmitToDeliveryAgent', {
      error: error.message,
      agentId,
      eventType,
      stack: error.stack
    }, 'error');
    return false;
  }
};

// 🎯 NEW: Emit to admin
global.emitToAdmin = (eventType, data) => {
  if (!global.io) {
    logSocketOperation('EmitToAdmin', {
      error: 'Socket.io not initialized',
      eventType
    }, 'error');
    return false;
  }

  try {
    const roomName = 'admin-dashboard';
    logSocketOperation('EmitToAdmin', {
      eventType,
      roomName,
      orderNumber: data.orderNumber || 'N/A',
      timestamp: new Date().toISOString()
    }, 'info');
    
    const payload = {
      type: eventType,
      data: data,
      timestamp: new Date().toISOString(),
      source: 'server'
    };
    
    // Emit to the admin room
    global.io.to(roomName).emit(eventType, payload);
    
    // Also emit to all admin sockets
    const adminSockets = Array.from(global.io.sockets.sockets.values())
      .filter(socket => socket.userType === 'admin');
    
    adminSockets.forEach(socket => {
      socket.emit(eventType, payload);
    });
    
    logSocketOperation('EmitToAdmin', {
      success: true,
      eventType,
      roomTargets: 1,
      socketTargets: adminSockets.length,
      totalTargets: adminSockets.length + 1
    }, 'success');
    
    return true;
  } catch (error) {
    logSocketOperation('EmitToAdmin', {
      error: error.message,
      eventType,
      stack: error.stack
    }, 'error');
    return false;
  }
};

// 🎯 NEW: Get connection statistics
global.getSocketStats = () => {
  if (!global.io) return null;
  
  const sockets = Array.from(global.io.sockets.sockets.values());
  const stats = {
    totalConnections: sockets.length,
    sellers: sockets.filter(s => s.userType === 'seller').length,
    buyers: sockets.filter(s => s.userType === 'buyer').length,
    admins: sockets.filter(s => s.userType === 'admin').length,
    deliveryAgents: sockets.filter(s => s.userType === 'delivery_agent').length,
    unauthenticated: sockets.filter(s => !s.userType).length,
    rooms: Object.keys(global.io.sockets.adapter.rooms).length
  };
  
  return stats;
};

const setupSocketHandlers = (io) => {
  // Store io globally for use in controllers
  global.io = io;
  
  logSocketOperation('Setup', { 
    message: 'Socket handlers initialized',
    timestamp: new Date().toISOString()
  }, 'success');

  // 🎯 FIX: Enhanced connection tracking
  io.on('connection', (socket) => {
    logSocketOperation('Connection', {
      socketId: socket.id,
      clientIP: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent']?.substring(0, 50),
      timestamp: new Date().toISOString()
    }, 'info');

    // 🎯 FIX: Enhanced seller room joining with validation
    socket.on('seller-join', async (sellerId) => {
      try {
        logSocketOperation('SellerJoin', {
          sellerId,
          socketId: socket.id,
          clientIP: socket.handshake.address
        }, 'seller');

        // Validate seller ID format
        if (!sellerId || typeof sellerId !== 'string') {
          logSocketOperation('SellerJoin', {
            error: 'Invalid seller ID format',
            receivedId: sellerId,
            type: typeof sellerId
          }, 'error');
          socket.emit('error', { message: 'Invalid seller ID' });
          return;
        }

        // Validate seller exists
        const seller = await Seller.findById(sellerId);
        if (!seller) {
          logSocketOperation('SellerJoin', {
            error: 'Seller not found in database',
            sellerId
          }, 'error');
          socket.emit('error', { message: 'Seller not found' });
          return;
        }

        const roomName = `seller-${sellerId}`;
        
        // Leave any previous rooms for this socket
        socket.rooms.forEach(room => {
          if (room !== socket.id) {
            socket.leave(room);
          }
        });
        
        // Join the seller room
        socket.join(roomName);
        socket.sellerId = sellerId;
        socket.userType = 'seller';
        socket.joinedAt = new Date();

        logSocketOperation('SellerJoin', {
          success: true,
          sellerId,
          roomName,
          sellerName: seller.firstName,
          shopName: seller.shop?.name || 'No shop'
        }, 'success');

        // Confirm join with detailed info
        socket.emit('seller-joined', {
          sellerId,
          roomName,
          message: 'Successfully joined seller room',
          timestamp: new Date().toISOString(),
          socketId: socket.id
        });

        // 🎯 FIX: Send unread orders count
        const unreadOrdersCount = await Order.countDocuments({
          seller: sellerId,
          isRead: false
        });

        if (unreadOrdersCount > 0) {
          socket.emit('unread-orders', {
            count: unreadOrdersCount,
            message: `You have ${unreadOrdersCount} unread orders`,
            timestamp: new Date().toISOString()
          });
        }

        // 🎯 FIX: Send today's orders summary
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const todayOrdersCount = await Order.countDocuments({
          seller: sellerId,
          createdAt: { $gte: todayStart }
        });

        socket.emit('today-orders-summary', {
          count: todayOrdersCount,
          date: todayStart.toISOString(),
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        logSocketOperation('SellerJoin', {
          error: error.message,
          sellerId,
          stack: error.stack
        }, 'error');
        socket.emit('error', { message: 'Failed to join seller room' });
      }
    });

    // 🎯 FIX: Enhanced buyer room joining with validation
    socket.on('buyer-join', async (userId) => {
      try {
        logSocketOperation('BuyerJoin', {
          userId,
          socketId: socket.id,
          clientIP: socket.handshake.address
        }, 'buyer');

        // Validate user ID format
        if (!userId || typeof userId !== 'string') {
          logSocketOperation('BuyerJoin', {
            error: 'Invalid user ID format',
            receivedId: userId,
            type: typeof userId
          }, 'error');
          socket.emit('error', { message: 'Invalid user ID' });
          return;
        }

        // Validate user exists
        const user = await User.findById(userId);
        if (!user) {
          logSocketOperation('BuyerJoin', {
            error: 'User not found in database',
            userId
          }, 'error');
          socket.emit('error', { message: 'User not found' });
          return;
        }

        const roomName = `buyer-${userId}`;
        
        // Leave any previous rooms for this socket
        socket.rooms.forEach(room => {
          if (room !== socket.id) {
            socket.leave(room);
          }
        });
        
        // Join the buyer room
        socket.join(roomName);
        socket.userId = userId;
        socket.userType = 'buyer';
        socket.joinedAt = new Date();

        logSocketOperation('BuyerJoin', {
          success: true,
          userId,
          roomName,
          userName: user.name,
          userEmail: user.email
        }, 'success');

        // Confirm join with detailed info
        socket.emit('buyer-joined', {
          userId,
          roomName,
          message: 'Successfully joined buyer room',
          timestamp: new Date().toISOString(),
          socketId: socket.id
        });

        // 🎯 FIX: Send active orders count
        const activeOrdersCount = await Order.countDocuments({
          user: userId,
          status: { $in: ['Pending', 'Processing', 'Shipped'] }
        });

        if (activeOrdersCount > 0) {
          socket.emit('active-orders', {
            count: activeOrdersCount,
            message: `You have ${activeOrdersCount} active orders`,
            timestamp: new Date().toISOString()
          });
        }

        // 🎯 FIX: Send recent orders summary
        const recentOrders = await Order.find({
          user: userId,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }).sort({ createdAt: -1 }).limit(3);

        if (recentOrders.length > 0) {
          socket.emit('recent-orders-summary', {
            orders: recentOrders.map(order => ({
              orderNumber: order.orderNumber,
              status: order.status,
              totalPrice: order.totalPrice,
              createdAt: order.createdAt
            })),
            count: recentOrders.length,
            timestamp: new Date().toISOString()
          });
        }

      } catch (error) {
        logSocketOperation('BuyerJoin', {
          error: error.message,
          userId,
          stack: error.stack
        }, 'error');
        socket.emit('error', { message: 'Failed to join buyer room' });
      }
    });

    // 🎯 FIX: Enhanced ping handling with latency calculation
    socket.on('ping', (data) => {
      const receiveTime = Date.now();
      const sentTime = data?.timestamp || receiveTime;
      const latency = receiveTime - sentTime;
      
      logSocketOperation('Ping', {
        socketId: socket.id,
        userType: socket.userType,
        latency: latency > 0 ? latency : 0
      }, 'info');
      
      socket.emit('pong', {
        timestamp: receiveTime,
        latency: latency > 0 ? latency : 0,
        message: 'Connection is active'
      });
    });

    // 🎯 FIX: Enhanced order status check
    socket.on('check-order-status', async (orderNumber) => {
      try {
        logSocketOperation('CheckOrderStatus', {
          orderNumber,
          socketId: socket.id,
          userType: socket.userType
        }, 'info');

        if (!orderNumber) {
          socket.emit('error', { message: 'Order number is required' });
          return;
        }

        const order = await Order.findOne({ orderNumber })
          .populate('user', 'name email')
          .populate('seller', 'firstName shop');

        if (order) {
          // Check if user is authorized to view this order
          const isAuthorized = 
            (socket.userType === 'buyer' && order.user._id.toString() === socket.userId) ||
            (socket.userType === 'seller' && order.seller._id.toString() === socket.sellerId);

          if (!isAuthorized) {
            socket.emit('error', { message: 'Not authorized to view this order' });
            return;
          }

          socket.emit('order-status-response', {
            orderNumber,
            status: order.status,
            lastUpdated: order.updatedAt,
            orderData: {
              _id: order._id,
              orderNumber: order.orderNumber,
              status: order.status,
              totalPrice: order.totalPrice,
              createdAt: order.createdAt,
              updatedAt: order.updatedAt
            }
          });
        } else {
          socket.emit('order-not-found', {
            orderNumber,
            message: 'Order not found'
          });
        }
      } catch (error) {
        logSocketOperation('CheckOrderStatus', {
          error: error.message,
          orderNumber,
          stack: error.stack
        }, 'error');
        socket.emit('error', { message: 'Failed to check order status' });
      }
    });

    // 🎯 FIX: Enhanced buyer order cancellation
    socket.on('cancel-order', async ({ orderId, reason }) => {
      try {
        logSocketOperation('BuyerCancelOrder', {
          orderId,
          reason,
          userId: socket.userId,
          socketId: socket.id
        }, 'buyer');

        if (socket.userType !== 'buyer') {
          socket.emit('error', { message: 'Only buyers can cancel orders' });
          return;
        }

        if (!orderId) {
          socket.emit('error', { message: 'Order ID is required' });
          return;
        }

        const order = await Order.findById(orderId)
          .populate('user', 'name email')
          .populate('seller', 'firstName shop');

        if (!order) {
          socket.emit('error', { message: 'Order not found' });
          return;
        }

        // Check if order belongs to this buyer
        if (order.user._id.toString() !== socket.userId) {
          socket.emit('error', { message: 'Unauthorized to cancel this order' });
          return;
        }

        // Check if order can be cancelled (only Pending and Processing)
        if (!['Pending', 'Processing'].includes(order.status)) {
          socket.emit('error', { 
            message: `Cannot cancel order with status: ${order.status}` 
          });
          return;
        }

        const previousStatus = order.status;
        
        // Update order status
        order.status = 'Cancelled';
        order.notes = `Cancelled by buyer: ${reason || 'No reason provided'}`;
        
        // 🎯 FIX: Add cancellation details
        order.cancellationDetails = {
          cancelledBy: 'buyer',
          cancelledAt: new Date(),
          cancellationReason: reason || 'No reason provided',
          previousStatus: previousStatus
        };
        
        await order.save();

        logSocketOperation('BuyerCancelOrder', {
          success: true,
          orderId,
          orderNumber: order.orderNumber,
          previousStatus,
          reason
        }, 'success');

        // Notify buyer
        socket.emit('order-cancelled', {
          orderId,
          orderNumber: order.orderNumber,
          previousStatus,
          currentStatus: 'Cancelled',
          message: 'Order cancelled successfully',
          timestamp: new Date().toISOString()
        });

        // 🎯 FIX: Notify seller about cancellation
        // 🎯 MAP STATUS FOR SELLER: Transform backend status to seller-friendly status
        const { mapStatusForSeller } = require('../utils/orderUtils');
        const sellerStatus = mapStatusForSeller(order.status);
        const sellerPreviousStatus = mapStatusForSeller(previousStatus);
        
        const cancellationData = {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: sellerStatus, // Use mapped status for seller (Cancelled maps to Cancelled)
          previousStatus: sellerPreviousStatus,
          user: order.user,
          reason: reason || 'No reason provided',
          cancelledAt: new Date().toISOString(),
          cancellationDetails: order.cancellationDetails
        };

        global.emitToSeller(order.seller._id, 'order-cancelled-by-buyer', cancellationData);

      } catch (error) {
        logSocketOperation('BuyerCancelOrder', {
          error: error.message,
          orderId,
          stack: error.stack
        }, 'error');
        socket.emit('error', { message: 'Failed to cancel order' });
      }
    });

    // 🎯 NEW: Handle seller order status updates
    socket.on('update-order-status', async ({ orderId, newStatus, notes }) => {
      try {
        logSocketOperation('SellerUpdateOrder', {
          orderId,
          newStatus,
          sellerId: socket.sellerId,
          socketId: socket.id
        }, 'seller');

        if (socket.userType !== 'seller') {
          socket.emit('error', { message: 'Only sellers can update order status' });
          return;
        }

        if (!orderId || !newStatus) {
          socket.emit('error', { message: 'Order ID and status are required' });
          return;
        }

        const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(newStatus)) {
          socket.emit('error', { message: 'Invalid order status' });
          return;
        }

        const order = await Order.findById(orderId)
          .populate('user', 'name email')
          .populate('seller', 'firstName shop');

        if (!order) {
          socket.emit('error', { message: 'Order not found' });
          return;
        }

        // Check if order belongs to this seller
        if (order.seller._id.toString() !== socket.sellerId) {
          socket.emit('error', { message: 'Unauthorized to update this order' });
          return;
        }

        const previousStatus = order.status;
        order.status = newStatus;
        
        if (notes) {
          order.notes = notes;
        }
        
        if (newStatus === 'Delivered') {
          order.isDelivered = true;
          order.deliveredAt = Date.now();
        }

        await order.save();

        logSocketOperation('SellerUpdateOrder', {
          success: true,
          orderId,
          orderNumber: order.orderNumber,
          previousStatus,
          newStatus
        }, 'success');

        // Notify seller of successful update
        socket.emit('order-status-updated', {
          orderId,
          orderNumber: order.orderNumber,
          previousStatus,
          currentStatus: newStatus,
          message: 'Order status updated successfully',
          timestamp: new Date().toISOString()
        });

        // 🎯 FIX: Notify buyer about status change
        const updateData = {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          previousStatus: previousStatus,
          updatedAt: order.updatedAt,
          user: order.user,
          seller: order.seller
        };

        global.emitToBuyer(order.user._id, 'order-status-update', updateData);

      } catch (error) {
        logSocketOperation('SellerUpdateOrder', {
          error: error.message,
          orderId,
          stack: error.stack
        }, 'error');
        socket.emit('error', { message: 'Failed to update order status' });
      }
    });

    // 🎯 FIX: Enhanced disconnection handling
    socket.on('disconnect', (reason) => {
      logSocketOperation('Disconnect', {
        socketId: socket.id,
        userType: socket.userType,
        userId: socket.userId || socket.sellerId,
        reason,
        connectedDuration: socket.joinedAt ? Date.now() - socket.joinedAt : 0,
        timestamp: new Date().toISOString()
      }, 'warning');

      // Leave all rooms
      socket.rooms.forEach(room => {
        if (room !== socket.id) {
          socket.leave(room);
        }
      });

      // Clean up socket data
      delete socket.userType;
      delete socket.userId;
      delete socket.sellerId;
      delete socket.joinedAt;
    });

    // 🎯 FIX: Enhanced error handling
    socket.on('error', (error) => {
      logSocketOperation('SocketError', {
        socketId: socket.id,
        userType: socket.userType,
        error: error.message,
        stack: error.stack
      }, 'error');
    });

    // 🎯 NEW: Handle connection health check
    socket.on('health-check', () => {
      const stats = global.getSocketStats();
      socket.emit('health-response', {
        socketId: socket.id,
        userType: socket.userType,
        timestamp: new Date().toISOString(),
        serverStats: stats,
        uptime: process.uptime()
      });
    });

    // 🎯 NEW: Admin room joining
    socket.on('admin-join', async (adminId) => {
      try {
        logSocketOperation('AdminJoin', {
          adminId,
          socketId: socket.id,
          clientIP: socket.handshake.address
        }, 'info');

        // Validate admin ID format
        if (!adminId || typeof adminId !== 'string') {
          logSocketOperation('AdminJoin', {
            error: 'Invalid admin ID format',
            receivedId: adminId,
            type: typeof adminId
          }, 'error');
          socket.emit('error', { message: 'Invalid admin ID' });
          return;
        }

        // Validate admin exists
        const admin = await Admin.findById(adminId);
        if (!admin) {
          logSocketOperation('AdminJoin', {
            error: 'Admin not found in database',
            adminId
          }, 'error');
          socket.emit('error', { message: 'Admin not found' });
          return;
        }

        const roomName = 'admin-dashboard';
        
        // Leave any previous rooms for this socket
        socket.rooms.forEach(room => {
          if (room !== socket.id) {
            socket.leave(room);
          }
        });
        
        // Join the admin room
        socket.join(roomName);
        socket.adminId = adminId;
        socket.userType = 'admin';
        socket.joinedAt = new Date();

        logSocketOperation('AdminJoin', {
          success: true,
          adminId,
          roomName,
          adminName: admin.firstName + ' ' + admin.lastName
        }, 'success');

        // Confirm join with detailed info
        socket.emit('admin-joined', {
          adminId,
          roomName,
          message: 'Successfully joined admin room',
          timestamp: new Date().toISOString(),
          socketId: socket.id
        });

      } catch (error) {
        logSocketOperation('AdminJoin', {
          error: error.message,
          adminId,
          stack: error.stack
        }, 'error');
        socket.emit('error', { message: 'Failed to join admin room' });
      }
    });

    // 🎯 NEW: Delivery agent room joining
    socket.on('delivery-agent-join', async (agentId) => {
      try {
        logSocketOperation('DeliveryAgentJoin', {
          agentId,
          socketId: socket.id,
          clientIP: socket.handshake.address
        }, 'info');

        // Validate agent ID format
        if (!agentId || typeof agentId !== 'string') {
          logSocketOperation('DeliveryAgentJoin', {
            error: 'Invalid agent ID format',
            receivedId: agentId,
            type: typeof agentId
          }, 'error');
          socket.emit('error', { message: 'Invalid agent ID' });
          return;
        }

        // Validate delivery agent exists
        const deliveryAgent = await DeliveryAgent.findById(agentId);
        if (!deliveryAgent) {
          logSocketOperation('DeliveryAgentJoin', {
            error: 'Delivery agent not found in database',
            agentId
          }, 'error');
          socket.emit('error', { message: 'Delivery agent not found' });
          return;
        }

        const roomName = `delivery-agent-${agentId}`;
        
        // Leave any previous rooms for this socket
        socket.rooms.forEach(room => {
          if (room !== socket.id) {
            socket.leave(room);
          }
        });
        
        // Join the delivery agent room
        socket.join(roomName);
        socket.deliveryAgentId = agentId;
        socket.userType = 'delivery_agent';
        socket.joinedAt = new Date();

        logSocketOperation('DeliveryAgentJoin', {
          success: true,
          agentId,
          roomName,
          agentName: deliveryAgent.firstName + ' ' + deliveryAgent.lastName
        }, 'success');

        // Confirm join with detailed info
        socket.emit('delivery-agent-joined', {
          agentId,
          roomName,
          message: 'Successfully joined delivery agent room',
          timestamp: new Date().toISOString(),
          socketId: socket.id
        });

      } catch (error) {
        logSocketOperation('DeliveryAgentJoin', {
          error: error.message,
          agentId,
          stack: error.stack
        }, 'error');
        socket.emit('error', { message: 'Failed to join delivery agent room' });
      }
    });

    // 🎯 NEW: Handle return request from buyer
    socket.on('request-return', async ({ orderId, reason }) => {
      try {
        logSocketOperation('RequestReturn', {
          orderId,
          reason,
          userId: socket.userId,
          socketId: socket.id
        }, 'return');

        if (socket.userType !== 'buyer') {
          socket.emit('error', { message: 'Only buyers can request returns' });
          return;
        }

        if (!orderId || !reason) {
          socket.emit('error', { message: 'Order ID and reason are required' });
          return;
        }

        const order = await Order.findById(orderId)
          .populate('user', 'name email')
          .populate('seller', 'firstName shop');

        if (!order) {
          socket.emit('error', { message: 'Order not found' });
          return;
        }

        // Check if order belongs to this buyer
        if (order.user._id.toString() !== socket.userId) {
          socket.emit('error', { message: 'Unauthorized to request return for this order' });
          return;
        }

        // Check return eligibility
        const eligibility = order.checkReturnEligibility();
        if (!eligibility.eligible) {
          socket.emit('error', { message: eligibility.reason });
          return;
        }

        // Request return
        await order.requestReturn(reason, socket.userId);

        logSocketOperation('RequestReturn', {
          success: true,
          orderId,
          orderNumber: order.orderNumber,
          reason,
          returnStatus: order.returnDetails.returnStatus
        }, 'success');

        // Notify buyer
        socket.emit('return-requested', {
          orderId,
          orderNumber: order.orderNumber,
          returnStatus: order.returnDetails.returnStatus,
          requestedAt: order.returnDetails.returnRequestedAt,
          message: 'Return request submitted successfully',
          timestamp: new Date().toISOString()
        });

        // Notify seller about return request
        global.emitToSeller(order.seller._id, 'return-requested', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          user: order.user,
          reason,
          requestedAt: order.returnDetails.returnRequestedAt,
          returnDeadline: order.returnDetails.returnWindow.returnDeadline
        });

        // Notify admin about return request
        global.emitToAdmin('return-requested', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          user: order.user,
          seller: order.seller,
          reason,
          requestedAt: order.returnDetails.returnRequestedAt
        });

      } catch (error) {
        logSocketOperation('RequestReturn', {
          error: error.message,
          orderId,
          stack: error.stack
        }, 'error');
        socket.emit('error', { message: 'Failed to request return' });
      }
    });

    // 🎯 NEW: Handle return assignment response from delivery agent
    socket.on('return-assignment-response', async ({ returnId, response, reason }) => {
      try {
        logSocketOperation('ReturnAssignmentResponse', {
          returnId,
          response,
          reason,
          agentId: socket.deliveryAgentId,
          socketId: socket.id
        }, 'return');

        if (socket.userType !== 'delivery_agent') {
          socket.emit('error', { message: 'Only delivery agents can respond to return assignments' });
          return;
        }

        if (!returnId || !response || !['accepted', 'rejected'].includes(response)) {
          socket.emit('error', { message: 'Return ID and valid response are required' });
          return;
        }

        const order = await Order.findById(returnId)
          .populate('user', 'name email')
          .populate('seller', 'firstName shop')
          .populate('returnDetails.returnAssignment.deliveryAgent', 'firstName lastName phone');

        if (!order) {
          socket.emit('error', { message: 'Return order not found' });
          return;
        }

        // Check if agent is assigned to this return
        if (order.returnDetails?.returnAssignment?.deliveryAgent?.toString() !== socket.deliveryAgentId) {
          socket.emit('error', { message: 'Unauthorized to respond to this return assignment' });
          return;
        }

        // Handle response
        await order.handleReturnAgentResponse(response, reason);

        logSocketOperation('ReturnAssignmentResponse', {
          success: true,
          returnId,
          orderNumber: order.orderNumber,
          response,
          reason,
          returnStatus: order.returnDetails.returnStatus
        }, 'success');

        // Notify delivery agent
        socket.emit('return-assignment-response-handled', {
          returnId,
          orderNumber: order.orderNumber,
          response,
          returnStatus: order.returnDetails.returnStatus,
          message: `Return assignment ${response} successfully`,
          timestamp: new Date().toISOString()
        });

        if (response === 'accepted') {
          // Notify buyer about return acceptance
          global.emitToBuyer(order.user._id, 'return-agent-accepted', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            agent: order.returnDetails.returnAssignment.deliveryAgent,
            acceptedAt: order.returnDetails.returnAssignment.acceptedAt
          });

          // Notify seller about return acceptance
          global.emitToSeller(order.seller._id, 'return-agent-accepted', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            agent: order.returnDetails.returnAssignment.deliveryAgent,
            acceptedAt: order.returnDetails.returnAssignment.acceptedAt
          });

          // Notify admin about return acceptance
          global.emitToAdmin('return-agent-accepted', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            agent: order.returnDetails.returnAssignment.deliveryAgent,
            acceptedAt: order.returnDetails.returnAssignment.acceptedAt
          });

        } else if (response === 'rejected') {
          // Notify admin about return rejection for reassignment
          global.emitToAdmin('return-agent-rejected', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            agent: order.returnDetails.returnAssignment.deliveryAgent,
            rejectedAt: order.returnDetails.returnAssignment.rejectedAt,
            rejectionReason: reason
          });
        }

      } catch (error) {
        logSocketOperation('ReturnAssignmentResponse', {
          error: error.message,
          returnId,
          stack: error.stack
        }, 'error');
        socket.emit('error', { message: 'Failed to handle return assignment response' });
      }
    });

    // 🎯 NEW: Handle return status updates
    socket.on('return-status-update', async ({ returnId, status, notes }) => {
      try {
        logSocketOperation('ReturnStatusUpdate', {
          returnId,
          status,
          notes,
          userType: socket.userType,
          socketId: socket.id
        }, 'return');

        const order = await Order.findById(returnId)
          .populate('user', 'name email')
          .populate('seller', 'firstName shop')
          .populate('returnDetails.returnAssignment.deliveryAgent', 'firstName lastName phone');

        if (!order) {
          socket.emit('error', { message: 'Return order not found' });
          return;
        }

        // Update return status based on user type and current status
        let updatedOrder;
        const currentTime = new Date().toISOString();

        switch (status) {
          case 'picked_up':
            if (socket.userType === 'delivery_agent') {
              updatedOrder = await order.completeReturnPickup({
                notes,
                location: { type: 'Point', coordinates: [0, 0] } // Default location
              });
            }
            break;
          
          case 'delivered_to_seller':
            if (socket.userType === 'delivery_agent') {
              updatedOrder = await order.completeReturnDelivery({
                notes,
                location: { type: 'Point', coordinates: [0, 0] } // Default location
              });
            }
            break;
          
          case 'completed':
            if (socket.userType === 'admin') {
              updatedOrder = await order.completeReturn();
            }
            break;
          
          default:
            socket.emit('error', { message: 'Invalid status update' });
            return;
        }

        if (updatedOrder) {
          logSocketOperation('ReturnStatusUpdate', {
            success: true,
            returnId,
            orderNumber: order.orderNumber,
            newStatus: status,
            returnStatus: updatedOrder.returnDetails.returnStatus
          }, 'success');

          // Notify all parties about status update
          const updateData = {
            orderId: order._id,
            orderNumber: order.orderNumber,
            newStatus: status,
            returnStatus: updatedOrder.returnDetails.returnStatus,
            updatedAt: currentTime,
            notes
          };

          // Notify buyer
          global.emitToBuyer(order.user._id, 'return-status-updated', updateData);

          // Notify seller
          global.emitToSeller(order.seller._id, 'return-status-updated', updateData);

          // Notify admin
          global.emitToAdmin('return-status-updated', updateData);

          // Notify delivery agent if applicable
          if (order.returnDetails?.returnAssignment?.deliveryAgent) {
            global.emitToDeliveryAgent(
              order.returnDetails.returnAssignment.deliveryAgent._id,
              'return-status-updated',
              updateData
            );
          }

          // Confirm to sender
          socket.emit('return-status-updated', {
            ...updateData,
            message: 'Return status updated successfully'
          });
        }

      } catch (error) {
        logSocketOperation('ReturnStatusUpdate', {
          error: error.message,
          returnId,
          status,
          stack: error.stack
        }, 'error');
        socket.emit('error', { message: 'Failed to update return status' });
      }
    });
  });

  // 🎯 NEW: Log server statistics periodically
  setInterval(() => {
    const stats = global.getSocketStats();
    if (stats && stats.totalConnections > 0) {
      logSocketOperation('ServerStats', stats, 'info');
    }
  }, 60000); // Every minute

  return io;
};

module.exports = setupSocketHandlers;