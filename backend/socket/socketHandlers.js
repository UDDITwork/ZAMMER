// backend/socket/socketHandlers.js
const Order = require('../models/Order');
const User = require('../models/User');
const Seller = require('../models/Seller');

// Enhanced logging for socket operations
const logSocketOperation = (operation, data, type = 'info') => {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'     // Reset
  };
  
  console.log(`${colors[type]}📡 [Socket${operation}] ${JSON.stringify(data)}${colors.reset}`);
};

// Global functions for emitting to specific user types
global.emitToSeller = (sellerId, eventType, data) => {
  if (global.io) {
    const roomName = `seller-${sellerId}`;
    logSocketOperation('EmitToSeller', {
      sellerId,
      eventType,
      roomName,
      orderNumber: data.orderNumber || 'N/A'
    }, 'info');
    
    global.io.to(roomName).emit(eventType, {
      type: eventType,
      data: data,
      timestamp: new Date().toISOString()
    });
    
    logSocketOperation('EmitToSeller', {
      success: true,
      sellerId,
      eventType
    }, 'success');
  }
};

global.emitToBuyer = (userId, eventType, data) => {
  if (global.io) {
    const roomName = `buyer-${userId}`;
    logSocketOperation('EmitToBuyer', {
      userId,
      eventType,
      roomName,
      orderNumber: data.orderNumber || 'N/A'
    }, 'info');
    
    global.io.to(roomName).emit(eventType, {
      type: eventType,
      data: data,
      timestamp: new Date().toISOString()
    });
    
    logSocketOperation('EmitToBuyer', {
      success: true,
      userId,
      eventType
    }, 'success');
  }
};

const setupSocketHandlers = (io) => {
  // Store io globally for use in controllers
  global.io = io;
  
  logSocketOperation('Setup', { message: 'Socket handlers initialized' }, 'success');

  io.on('connection', (socket) => {
    logSocketOperation('Connection', {
      socketId: socket.id,
      timestamp: new Date().toISOString()
    }, 'info');

    // 🎯 Seller joins their room
    socket.on('seller-join', async (sellerId) => {
      try {
        logSocketOperation('SellerJoin', {
          sellerId,
          socketId: socket.id
        }, 'info');

        // Validate seller exists
        const seller = await Seller.findById(sellerId);
        if (!seller) {
          logSocketOperation('SellerJoin', {
            error: 'Seller not found',
            sellerId
          }, 'error');
          socket.emit('error', { message: 'Seller not found' });
          return;
        }

        const roomName = `seller-${sellerId}`;
        socket.join(roomName);
        socket.sellerId = sellerId;
        socket.userType = 'seller';

        logSocketOperation('SellerJoin', {
          success: true,
          sellerId,
          roomName,
          sellerName: seller.firstName
        }, 'success');

        // Confirm join
        socket.emit('seller-joined', {
          sellerId,
          roomName,
          message: 'Successfully joined seller room',
          timestamp: new Date().toISOString()
        });

        // Notify about unread orders
        const unreadOrdersCount = await Order.countDocuments({
          seller: sellerId,
          isRead: false
        });

        if (unreadOrdersCount > 0) {
          socket.emit('unread-orders', {
            count: unreadOrdersCount,
            message: `You have ${unreadOrdersCount} unread orders`
          });
        }

      } catch (error) {
        logSocketOperation('SellerJoin', {
          error: error.message,
          sellerId
        }, 'error');
        socket.emit('error', { message: 'Failed to join seller room' });
      }
    });

    // 🎯 Buyer joins their room
    socket.on('buyer-join', async (userId) => {
      try {
        logSocketOperation('BuyerJoin', {
          userId,
          socketId: socket.id
        }, 'info');

        // Validate user exists
        const user = await User.findById(userId);
        if (!user) {
          logSocketOperation('BuyerJoin', {
            error: 'User not found',
            userId
          }, 'error');
          socket.emit('error', { message: 'User not found' });
          return;
        }

        const roomName = `buyer-${userId}`;
        socket.join(roomName);
        socket.userId = userId;
        socket.userType = 'buyer';

        logSocketOperation('BuyerJoin', {
          success: true,
          userId,
          roomName,
          userName: user.name
        }, 'success');

        // Confirm join
        socket.emit('buyer-joined', {
          userId,
          roomName,
          message: 'Successfully joined buyer room',
          timestamp: new Date().toISOString()
        });

        // Send active orders count
        const activeOrdersCount = await Order.countDocuments({
          user: userId,
          status: { $in: ['Pending', 'Processing', 'Shipped'] }
        });

        if (activeOrdersCount > 0) {
          socket.emit('active-orders', {
            count: activeOrdersCount,
            message: `You have ${activeOrdersCount} active orders`
          });
        }

      } catch (error) {
        logSocketOperation('BuyerJoin', {
          error: error.message,
          userId
        }, 'error');
        socket.emit('error', { message: 'Failed to join buyer room' });
      }
    });

    // 🎯 Handle ping for connection testing
    socket.on('ping', () => {
      logSocketOperation('Ping', {
        socketId: socket.id,
        userType: socket.userType
      }, 'info');
      socket.emit('pong', {
        timestamp: new Date().toISOString(),
        message: 'Connection is active'
      });
    });

    // 🎯 Handle manual order status check
    socket.on('check-order-status', async (orderNumber) => {
      try {
        logSocketOperation('CheckOrderStatus', {
          orderNumber,
          socketId: socket.id
        }, 'info');

        const order = await Order.findOne({ orderNumber })
          .populate('user', 'name email')
          .populate('seller', 'firstName shop');

        if (order) {
          socket.emit('order-status-response', {
            orderNumber,
            status: order.status,
            lastUpdated: order.updatedAt,
            orderData: order
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
          orderNumber
        }, 'error');
        socket.emit('error', { message: 'Failed to check order status' });
      }
    });

    // 🎯 Handle buyer order cancellation
    socket.on('cancel-order', async ({ orderId, reason }) => {
      try {
        logSocketOperation('BuyerCancelOrder', {
          orderId,
          reason,
          userId: socket.userId
        }, 'info');

        if (socket.userType !== 'buyer') {
          socket.emit('error', { message: 'Only buyers can cancel orders' });
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

        // Update order status
        order.status = 'Cancelled';
        order.notes = `Cancelled by buyer: ${reason || 'No reason provided'}`;
        await order.save();

        logSocketOperation('BuyerCancelOrder', {
          success: true,
          orderId,
          orderNumber: order.orderNumber
        }, 'success');

        // Notify buyer
        socket.emit('order-cancelled', {
          orderId,
          orderNumber: order.orderNumber,
          message: 'Order cancelled successfully'
        });

        // Notify seller
        global.emitToSeller(order.seller._id, 'order-cancelled-by-buyer', {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          user: order.user,
          reason: reason || 'No reason provided',
          cancelledAt: new Date().toISOString()
        });

      } catch (error) {
        logSocketOperation('BuyerCancelOrder', {
          error: error.message,
          orderId
        }, 'error');
        socket.emit('error', { message: 'Failed to cancel order' });
      }
    });

    // 🎯 Handle disconnection
    socket.on('disconnect', (reason) => {
      logSocketOperation('Disconnect', {
        socketId: socket.id,
        userType: socket.userType,
        userId: socket.userId || socket.sellerId,
        reason
      }, 'warning');

      // Leave all rooms
      if (socket.userType === 'seller' && socket.sellerId) {
        socket.leave(`seller-${socket.sellerId}`);
      } else if (socket.userType === 'buyer' && socket.userId) {
        socket.leave(`buyer-${socket.userId}`);
      }
    });

    // 🎯 Error handling
    socket.on('error', (error) => {
      logSocketOperation('Error', {
        socketId: socket.id,
        error: error.message,
        userType: socket.userType
      }, 'error');
    });
  });

  return io;
};

module.exports = setupSocketHandlers;