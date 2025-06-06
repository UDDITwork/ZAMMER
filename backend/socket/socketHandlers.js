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

// 🎯 NEW: Get connection statistics
global.getSocketStats = () => {
  if (!global.io) return null;
  
  const sockets = Array.from(global.io.sockets.sockets.values());
  const stats = {
    totalConnections: sockets.length,
    sellers: sockets.filter(s => s.userType === 'seller').length,
    buyers: sockets.filter(s => s.userType === 'buyer').length,
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
        const cancellationData = {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          previousStatus: previousStatus,
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