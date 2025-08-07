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
    this.userType = null; // 'seller' or 'buyer'
    this.userId = null;
  }

  // Get the server URL
  getServerUrl() {
    // Production environment
    if (process.env.NODE_ENV === 'production') {
      // Check if we're on Google App Engine
      if (window.location.hostname.includes('appspot.com')) {
        return process.env.REACT_APP_API_URL_PROD?.replace('/api', '') || 'https://onyx-osprey-462815-i9.uc.r.appspot.com';
      }
      
      // Use production API URL
      return process.env.REACT_APP_API_URL_PROD?.replace('/api', '') || 'https://onyx-osprey-462815-i9.uc.r.appspot.com';
    }
    
    // Development environment
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL.replace('/api', '');
    }
    
    return 'http://localhost:5001';
  }

  // 🎯 FIXED: Initialize Socket.io connection - NOW RETURNS A PROMISE
  connect() {
    return new Promise((resolve, reject) => {
      try {
        const serverUrl = this.getServerUrl();
        debugLog('🔌 Initializing Socket.io connection', { serverUrl }, 'socket');

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
          withCredentials: true,
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectInterval
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
        isConnected: this.isConnected
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
        description: error.description
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
    this.socket.emit('ping');
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
      userId: this.userId
    };
  }

  // 🎯 UPDATED: Auto-connect based on authentication - NOW RETURNS A PROMISE
  autoConnect() {
    return new Promise((resolve, reject) => {
      // Check if user is authenticated
      const userToken = localStorage.getItem('userToken');
      const userData = localStorage.getItem('userData');
      const sellerToken = localStorage.getItem('sellerToken');
      const sellerData = localStorage.getItem('sellerData');

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
          reject(error);
          return;
        }
      } else if (sellerToken && sellerData) {
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
          reject(error);
          return;
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
      'window.socketService.ping() - Test connection',
      'window.socketService.getConnectionStatus() - Check status',
      'window.socketService.disconnect() - Disconnect'
    ]
  }, 'socket');
}

export default socketService;