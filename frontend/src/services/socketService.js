import { io } from 'socket.io-client';

// Enhanced debugging
const debugLog = (message, data = null, type = 'info') => {
  if (process.env.NODE_ENV === 'development') {
    const colors = {
      info: '#2196F3',
      success: '#4CAF50', 
      warning: '#FF9800',
      error: '#F44336',
      socket: '#9C27B0',
      buyer: '#E91E63'
    };
    
    console.log(
      `%c[SocketService] ${message}`,
      `color: ${colors[type]}; font-weight: bold;`,
      data
    );
  }
};

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000;
    this.eventListeners = new Map();
    this.userType = null; // 'seller', 'buyer', or 'delivery'
    this.userId = null;
  }

  // UNIVERSAL Server URL - Environment Variable Based
  getServerUrl() {
    // Production environment
    if (process.env.NODE_ENV === 'production') {
      // Try production-specific variables first
      const prodSocketUrl = process.env.REACT_APP_SOCKET_URL_PROD;
      const prodApiUrl = process.env.REACT_APP_API_URL_PROD?.replace('/api', '');
      const generalSocketUrl = process.env.REACT_APP_SOCKET_URL;
      const generalApiUrl = process.env.REACT_APP_API_URL?.replace('/api', '');
      
      // Return first available URL
      return prodSocketUrl || prodApiUrl || generalSocketUrl || generalApiUrl || 'http://localhost:5001';
    }
    
    // Development environment
    const devSocketUrl = process.env.REACT_APP_SOCKET_URL;
    const devApiUrl = process.env.REACT_APP_API_URL?.replace('/api', '');
    
    return devSocketUrl || devApiUrl || 'http://localhost:5001';
  }

  // 🎯 FIXED: Initialize Socket.io connection - NOW RETURNS A PROMISE
  connect() {
    return new Promise((resolve, reject) => {
      try {
        const serverUrl = this.getServerUrl();
        debugLog('🔌 Initializing Socket.io connection', { 
          serverUrl,
          environment: process.env.NODE_ENV 
        }, 'socket');

        // If already connected, resolve immediately
        if (this.socket && this.isConnected) {
          debugLog('✅ Socket already connected', { socketId: this.socket.id }, 'success');
          resolve(this.socket);
          return;
        }

        // If socket exists but not connected, disconnect first
        if (this.socket) {
          this.socket.disconnect();
          this.socket = null;
        }

        this.socket = io(serverUrl, {
          withCredentials: false, // Changed to false for better compatibility
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectInterval,
          forceNew: true
        });

        // Set up event handlers with Promise resolution
        this.setupEventHandlersWithPromise(resolve, reject);

      } catch (error) {
        debugLog('❌ Socket connection error', error, 'error');
        reject(error);
      }
    });
  }

  // 🎯 NEW: Setup event handlers with Promise support
  setupEventHandlersWithPromise(resolve, reject) {
    if (!this.socket) {
      reject(new Error('Socket not initialized'));
      return;
    }

    // Connection successful
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      debugLog('✅ Socket connected successfully', {
        socketId: this.socket.id,
        isConnected: this.isConnected,
        serverUrl: this.getServerUrl()
      }, 'success');
      
      // Resolve the Promise
      resolve(this.socket);
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      this.isConnected = false;
      debugLog('❌ Socket connection error', {
        error: error.message,
        type: error.type,
        description: error.description,
        serverUrl: this.getServerUrl()
      }, 'error');
      
      // Reject the Promise
      reject(error);
    });

    // Setup other event handlers
    this.setupBasicEventHandlers();
  }

  // 🎯 REFACTORED: Setup basic event handlers (separated from Promise logic)
  setupBasicEventHandlers() {
    if (!this.socket) return;

    // Disconnection
    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      debugLog('🔌 Socket disconnected', {
        reason,
        wasConnected: this.isConnected
      }, 'warning');
    });

    // Reconnection attempt
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.reconnectAttempts = attemptNumber;
      debugLog('🔄 Socket reconnection attempt', {
        attempt: attemptNumber,
        maxAttempts: this.maxReconnectAttempts
      }, 'warning');
    });

    // Reconnection successful
    this.socket.on('reconnect', (attemptNumber) => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      debugLog('✅ Socket reconnected successfully', {
        attempts: attemptNumber
      }, 'success');

      // Re-join room if we had one
      if (this.userType && this.userId) {
        if (this.userType === 'seller') {
          this.joinSellerRoom(this.userId);
        } else if (this.userType === 'buyer') {
          this.joinBuyerRoom(this.userId);
        } else if (this.userType === 'delivery') {
          this.joinDeliveryRoom(this.userId);
        }
      }
    });

    // Reconnection failed
    this.socket.on('reconnect_failed', () => {
      this.isConnected = false;
      debugLog('❌ Socket reconnection failed', {
        maxAttemptsReached: true
      }, 'error');
    });

    // Handle pong response for connection testing
    this.socket.on('pong', (data) => {
      debugLog('🏓 Pong received', data, 'socket');
    });

    // Handle server errors
    this.socket.on('error', (error) => {
      debugLog('🚨 Socket server error', error, 'error');
    });
  }

  // Setup basic event handlers (LEGACY - kept for backward compatibility)
  setupEventHandlers() {
    this.setupBasicEventHandlers();
  }

  // 🎯 NEW: Join buyer room for order notifications
  joinBuyerRoom(userId) {
    if (!this.socket || !this.isConnected) {
      debugLog('❌ Cannot join buyer room - socket not connected', { userId }, 'error');
      return false;
    }

    debugLog('👤 Joining buyer room', { userId }, 'buyer');
    
    this.userType = 'buyer';
    this.userId = userId;
    
    this.socket.emit('buyer-join', userId);
    
    // Listen for join confirmation
    this.socket.on('buyer-joined', (data) => {
      debugLog('✅ Buyer room joined successfully', data, 'success');
    });

    // Listen for errors
    this.socket.on('error', (error) => {
      debugLog('❌ Buyer room join error', { error, userId }, 'error');
    });

    return true;
  }

  // Join seller room for notifications
  joinSellerRoom(sellerId) {
    if (!this.socket || !this.isConnected) {
      debugLog('❌ Cannot join seller room - socket not connected', { sellerId }, 'error');
      return false;
    }

    debugLog('👨‍💼 Joining seller room', { sellerId }, 'socket');
    
    this.userType = 'seller';
    this.userId = sellerId;
    
    this.socket.emit('seller-join', sellerId);
    
    // Listen for join confirmation
    this.socket.on('seller-joined', (data) => {
      debugLog('✅ Seller room joined successfully', data, 'success');
    });

    // Listen for errors
    this.socket.on('error', (error) => {
      debugLog('❌ Seller room join error', { error, sellerId }, 'error');
    });

    return true;
  }

  // 🎯 NEW: Join delivery agent room for notifications
  joinDeliveryRoom(agentId) {
    if (!this.socket || !this.isConnected) {
      debugLog('❌ Cannot join delivery room - socket not connected', { agentId }, 'error');
      return false;
    }

    debugLog('🚚 Joining delivery room', { agentId }, 'socket');
    
    this.userType = 'delivery';
    this.userId = agentId;
    
    this.socket.emit('delivery-join', agentId);
    
    // Listen for join confirmation
    this.socket.on('delivery-joined', (data) => {
      debugLog('✅ Delivery room joined successfully', data, 'success');
    });

    // Listen for errors
    this.socket.on('error', (error) => {
      debugLog('❌ Delivery room join error', { error, agentId }, 'error');
    });

    return true;
  }

  // 🎯 NEW: Listen for order status updates (for buyers)
  onOrderUpdate(callback) {
    if (!this.socket) {
      debugLog('❌ Cannot listen for order updates - socket not initialized', null, 'error');
      return;
    }

    debugLog('👂 Setting up order status update listener', null, 'buyer');
    
    this.socket.on('order-status-update', (data) => {
      debugLog('🔄 Order status update received', {
        orderId: data.data?._id,
        orderNumber: data.data?.orderNumber,
        status: data.data?.status,
        previousStatus: data.data?.previousStatus
      }, 'buyer');
      
      if (callback && typeof callback === 'function') {
        callback(data);
      }
    });

    // Store the listener for cleanup
    this.eventListeners.set('order-status-update', callback);
  }

  // Listen for new order notifications (for sellers)
  onNewOrder(callback) {
    if (!this.socket) {
      debugLog('❌ Cannot listen for new orders - socket not initialized', null, 'error');
      return;
    }

    debugLog('👂 Setting up new order listener', null, 'socket');
    
    this.socket.on('new-order', (data) => {
      debugLog('📦 New order notification received', {
        orderId: data.data?._id,
        orderNumber: data.data?.orderNumber,
        totalPrice: data.data?.totalPrice
      }, 'success');
      
      if (callback && typeof callback === 'function') {
        callback(data);
      }
    });

    // Store the listener for cleanup
    this.eventListeners.set('new-order', callback);
  }

  // Listen for order status updates (for sellers)
  onOrderStatusUpdate(callback) {
    if (!this.socket) {
      debugLog('❌ Cannot listen for order updates - socket not initialized', null, 'error');
      return;
    }

    debugLog('👂 Setting up order status update listener', null, 'socket');
    
    this.socket.on('order-status-updated', (data) => {
      debugLog('🔄 Order status update notification received', {
        orderId: data.data?._id,
        orderNumber: data.data?.orderNumber,
        status: data.data?.status,
        previousStatus: data.data?.previousStatus
      }, 'success');
      
      if (callback && typeof callback === 'function') {
        callback(data);
      }
    });

    // Store the listener for cleanup
    this.eventListeners.set('order-status-updated', callback);
  }

  // 🎯 NEW: Listen for delivery notifications (for delivery agents)
  onDeliveryAssignment(callback) {
    if (!this.socket) {
      debugLog('❌ Cannot listen for delivery assignments - socket not initialized', null, 'error');
      return;
    }

    debugLog('👂 Setting up delivery assignment listener', null, 'socket');
    
    this.socket.on('delivery-assigned', (data) => {
      debugLog('🚚 Delivery assignment received', {
        orderId: data.data?.orderId,
        orderNumber: data.data?.orderNumber
      }, 'success');
      
      if (callback && typeof callback === 'function') {
        callback(data);
      }
    });

    // Store the listener for cleanup
    this.eventListeners.set('delivery-assigned', callback);
  }

  // 🎯 NEW: Listen for invoice ready notifications
  onInvoiceReady(callback) {
    if (!this.socket) {
      debugLog('❌ Cannot listen for invoice notifications - socket not initialized', null, 'error');
      return;
    }

    debugLog('👂 Setting up invoice ready listener', null, 'buyer');
    
    this.socket.on('invoice-ready', (data) => {
      debugLog('📄 Invoice ready notification received', {
        orderId: data.data?.orderId,
        orderNumber: data.data?.orderNumber,
        invoiceUrl: data.data?.invoiceUrl
      }, 'buyer');
      
      if (callback && typeof callback === 'function') {
        callback(data);
      }
    });

    // Store the listener for cleanup
    this.eventListeners.set('invoice-ready', callback);
  }

  // Remove event listener
  removeListener(eventName) {
    if (this.socket && this.eventListeners.has(eventName)) {
      this.socket.off(eventName);
      this.eventListeners.delete(eventName);
      debugLog('🗑️ Event listener removed', { eventName }, 'socket');
    }
  }

  // Remove all listeners
  removeAllListeners() {
    this.eventListeners.forEach((callback, eventName) => {
      this.removeListener(eventName);
    });
    debugLog('🗑️ All event listeners removed', null, 'socket');
  }

  // Test connection with ping
  ping() {
    if (!this.socket || !this.isConnected) {
      debugLog('❌ Cannot ping - socket not connected', null, 'error');
      return false;
    }

    debugLog('🏓 Sending ping', null, 'socket');
    this.socket.emit('ping', { timestamp: Date.now() });
    return true;
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts,
      hasSocket: !!this.socket,
      userType: this.userType,
      userId: this.userId,
      serverUrl: this.getServerUrl(),
      environment: process.env.NODE_ENV
    };
  }

  // 🎯 UPDATED: Auto-connect based on authentication - NOW RETURNS A PROMISE
  autoConnect() {
    return new Promise((resolve, reject) => {
      // Check authentication tokens
      const userToken = localStorage.getItem('userToken');
      const userData = localStorage.getItem('userData');
      const sellerToken = localStorage.getItem('sellerToken');
      const sellerData = localStorage.getItem('sellerData');
      const deliveryToken = localStorage.getItem('deliveryAgentToken');
      const deliveryData = localStorage.getItem('deliveryAgentData');

      // Try user authentication first
      if (userToken && userData) {
        try {
          const user = JSON.parse(userData);
          debugLog('🔄 Auto-connecting as buyer', { userId: user._id, userName: user.name }, 'buyer');
          
          if (!this.isConnected) {
            this.connect().then(() => {
              this.joinBuyerRoom(user._id);
              resolve({ type: 'buyer', user });
            }).catch(reject);
          } else {
            this.joinBuyerRoom(user._id);
            resolve({ type: 'buyer', user });
          }
          
          return;
        } catch (error) {
          debugLog('❌ Invalid user data', error, 'error');
        }
      }
      
      // Try seller authentication
      if (sellerToken && sellerData) {
        try {
          const seller = JSON.parse(sellerData);
          debugLog('🔄 Auto-connecting as seller', { sellerId: seller._id, sellerName: seller.firstName }, 'socket');
          
          if (!this.isConnected) {
            this.connect().then(() => {
              this.joinSellerRoom(seller._id);
              resolve({ type: 'seller', seller });
            }).catch(reject);
          } else {
            this.joinSellerRoom(seller._id);
            resolve({ type: 'seller', seller });
          }
          
          return;
        } catch (error) {
          debugLog('❌ Invalid seller data', error, 'error');
        }
      }

      // Try delivery agent authentication
      if (deliveryToken && deliveryData) {
        try {
          const agent = JSON.parse(deliveryData);
          debugLog('🔄 Auto-connecting as delivery agent', { agentId: agent._id, agentName: agent.name }, 'socket');
          
          if (!this.isConnected) {
            this.connect().then(() => {
              this.joinDeliveryRoom(agent._id);
              resolve({ type: 'delivery', agent });
            }).catch(reject);
          } else {
            this.joinDeliveryRoom(agent._id);
            resolve({ type: 'delivery', agent });
          }
          
          return;
        } catch (error) {
          debugLog('❌ Invalid delivery agent data', error, 'error');
        }
      }

      debugLog('⚠️ No valid authentication found for auto-connect', null, 'warning');
      reject(new Error('No valid authentication found'));
    });
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      debugLog('🔌 Disconnecting socket', null, 'socket');
      
      // Remove all event listeners
      this.removeAllListeners();
      
      // Disconnect
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.userType = null;
      this.userId = null;
    }
  }

  // 🎯 UPDATED: Manual reconnection - NOW RETURNS A PROMISE
  reconnect() {
    debugLog('🔄 Manual reconnection attempt', null, 'socket');
    this.disconnect();
    return this.connect();
  }

  // 🎯 NEW: Health check method
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { 
          healthy: false, 
          message: 'Socket not connected',
          serverUrl: this.getServerUrl()
        };
      }

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ 
            healthy: false, 
            message: 'Health check timeout',
            serverUrl: this.getServerUrl()
          });
        }, 5000);

        this.socket.once('pong', () => {
          clearTimeout(timeout);
          resolve({ 
            healthy: true, 
            message: 'Socket connection healthy',
            serverUrl: this.getServerUrl(),
            socketId: this.socket.id
          });
        });

        this.socket.emit('ping', { timestamp: Date.now() });
      });
    } catch (error) {
      return { 
        healthy: false, 
        message: error.message,
        serverUrl: this.getServerUrl()
      };
    }
  }

  // 🎯 NEW: Environment info
  getEnvironmentInfo() {
    return {
      nodeEnv: process.env.NODE_ENV,
      serverUrl: this.getServerUrl(),
      availableEnvVars: {
        hasApiUrl: !!process.env.REACT_APP_API_URL,
        hasApiUrlProd: !!process.env.REACT_APP_API_URL_PROD,
        hasSocketUrl: !!process.env.REACT_APP_SOCKET_URL,
        hasSocketUrlProd: !!process.env.REACT_APP_SOCKET_URL_PROD
      }
    };
  }

  // 🔧 Generic on method for event listening
  on(event, callback) {
    if (!this.socket) {
      debugLog('❌ Cannot add listener - socket not initialized', { event }, 'error');
      return;
    }

    debugLog('👂 Adding generic event listener', { event }, 'socket');
    
    this.socket.on(event, callback);
    
    // Store the listener for cleanup
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  // 🔧 Generic off method for removing event listeners
  off(event, callback) {
    if (!this.socket) {
      debugLog('❌ Cannot remove listener - socket not initialized', { event }, 'error');
      return;
    }

    debugLog('🔇 Removing generic event listener', { event }, 'socket');
    
    this.socket.off(event, callback);
    
    // Remove from stored listeners
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.findIndex(cb => cb === callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
      
      // Remove event entirely if no listeners left
      if (listeners.length === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  // 🔧 Generic emit method for sending events
  emit(event, data) {
    if (!this.socket || !this.isConnected) {
      debugLog('❌ Cannot emit - socket not connected', { event }, 'error');
      return false;
    }

    debugLog('📤 Emitting generic event', { event, data }, 'socket');
    this.socket.emit(event, data);
    return true;
  }

  // 🔧 Get connection status (enhanced version)
  isConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }
}

// Create and export singleton instance
const socketService = new SocketService();

// Make available globally in development
if (process.env.NODE_ENV === 'development') {
  window.socketService = socketService;
  
  debugLog('🔧 DEBUG MODE - Enhanced socket service available globally', {
    availableFunctions: [
      'window.socketService.connect() - Connect to server (returns Promise)',
      'window.socketService.autoConnect() - Auto-connect based on auth (returns Promise)',
      'window.socketService.joinBuyerRoom(userId) - Join buyer room',
      'window.socketService.joinSellerRoom(sellerId) - Join seller room',
      'window.socketService.joinDeliveryRoom(agentId) - Join delivery room',
      'window.socketService.ping() - Test connection',
      'window.socketService.getConnectionStatus() - Check status',
      'window.socketService.healthCheck() - Health check (returns Promise)',
      'window.socketService.getEnvironmentInfo() - Environment info',
      'window.socketService.disconnect() - Disconnect'
    ]
  }, 'socket');
}

export default socketService;