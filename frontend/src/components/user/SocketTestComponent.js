import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import socketService from '../../services/socketService';

const SocketTestComponent = () => {
  const { userAuth } = useContext(AuthContext);
  const [connectionStatus, setConnectionStatus] = useState({});
  const [messages, setMessages] = useState([]);
  const [testOrderData, setTestOrderData] = useState({
    orderNumber: 'ORD-' + Date.now(),
    status: 'Pending',
    totalPrice: 1299
  });

  useEffect(() => {
    // Check connection status every 2 seconds
    const interval = setInterval(() => {
      const status = socketService.getConnectionStatus();
      setConnectionStatus(status);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const addMessage = (message, type = 'info') => {
    const newMessage = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [newMessage, ...prev].slice(0, 20)); // Keep last 20 messages
  };

  const connectSocket = () => {
    try {
      const socket = socketService.connect();
      if (socket) {
        addMessage('✅ Socket connection initiated', 'success');
        
        // Auto-connect based on authentication
        const autoConnectResult = socketService.autoConnect();
        if (autoConnectResult) {
          addMessage(`🔄 Auto-connected as ${autoConnectResult.type}`, 'info');
        }
      } else {
        addMessage('❌ Failed to create socket connection', 'error');
      }
    } catch (error) {
      addMessage(`❌ Socket connection error: ${error.message}`, 'error');
    }
  };

  const disconnectSocket = () => {
    socketService.disconnect();
    addMessage('🔌 Socket disconnected', 'warning');
  };

  const joinBuyerRoom = () => {
    if (userAuth.user?._id) {
      const success = socketService.joinBuyerRoom(userAuth.user._id);
      if (success) {
        addMessage(`👤 Joined buyer room: ${userAuth.user._id}`, 'success');
      } else {
        addMessage('❌ Failed to join buyer room', 'error');
      }
    } else {
      addMessage('❌ No user ID available', 'error');
    }
  };

  const testOrderUpdate = () => {
    if (socketService.socket) {
      const testData = {
        ...testOrderData,
        status: ['Pending', 'Processing', 'Shipped', 'Delivered'][Math.floor(Math.random() * 4)],
        orderNumber: 'ORD-' + Date.now()
      };
      
      socketService.socket.emit('test-order-update', testData);
      addMessage(`📦 Sent test order update: ${testData.orderNumber} - ${testData.status}`, 'info');
      setTestOrderData(testData);
    } else {
      addMessage('❌ Socket not connected', 'error');
    }
  };

  const setupOrderListener = () => {
    socketService.onOrderUpdate((data) => {
      addMessage(`🔔 Order update received: ${data.data?.orderNumber} - ${data.data?.status}`, 'success');
    });
    addMessage('👂 Order update listener set up', 'info');
  };

  const pingServer = () => {
    const success = socketService.ping();
    if (success) {
      addMessage('🏓 Ping sent to server', 'info');
    } else {
      addMessage('❌ Failed to ping server', 'error');
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const getStatusColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Socket.IO Test Dashboard</h2>
      
      {/* Connection Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Connection Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-sm">
            <span className="font-medium">Connected:</span>
            <span className={`ml-2 ${connectionStatus.isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {connectionStatus.isConnected ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          <div className="text-sm">
            <span className="font-medium">Socket ID:</span>
            <span className="ml-2 font-mono text-xs">
              {connectionStatus.socketId || 'None'}
            </span>
          </div>
          <div className="text-sm">
            <span className="font-medium">User Type:</span>
            <span className="ml-2">
              {connectionStatus.userType || 'None'}
            </span>
          </div>
          <div className="text-sm">
            <span className="font-medium">User ID:</span>
            <span className="ml-2 font-mono text-xs">
              {connectionStatus.userId || 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={connectSocket}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Connect Socket
        </button>
        <button
          onClick={disconnectSocket}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Disconnect
        </button>
        <button
          onClick={joinBuyerRoom}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          disabled={!userAuth.user?._id}
        >
          Join Buyer Room
        </button>
        <button
          onClick={setupOrderListener}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Setup Listener
        </button>
        <button
          onClick={testOrderUpdate}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Test Order Update
        </button>
        <button
          onClick={pingServer}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Ping Server
        </button>
        <button
          onClick={clearMessages}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Clear Log
        </button>
      </div>

      {/* Authentication Info */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Authentication Info</h3>
        <div className="text-sm space-y-2">
          <div>
            <span className="font-medium">Authenticated:</span>
            <span className={`ml-2 ${userAuth.isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
              {userAuth.isAuthenticated ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          {userAuth.user && (
            <>
              <div>
                <span className="font-medium">User Name:</span>
                <span className="ml-2">{userAuth.user.name}</span>
              </div>
              <div>
                <span className="font-medium">User ID:</span>
                <span className="ml-2 font-mono text-xs">{userAuth.user._id}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Message Log */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Activity Log</h3>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-sm">No messages yet. Try connecting to the socket...</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex items-start space-x-3 text-sm">
                <span className="text-gray-400 font-mono text-xs whitespace-nowrap">
                  {msg.timestamp}
                </span>
                <span className={getStatusColor(msg.type)}>
                  {msg.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Testing Instructions</h3>
        <ol className="text-sm space-y-2 list-decimal list-inside">
          <li>Click "Connect Socket" to establish connection</li>
          <li>Click "Join Buyer Room" to join the buyer notification room</li>
          <li>Click "Setup Listener" to listen for order updates</li>
          <li>Click "Test Order Update" to simulate receiving an order status update</li>
          <li>Check the activity log for real-time updates</li>
          <li>Use "Ping Server" to test connection health</li>
        </ol>
      </div>
    </div>
  );
};

export default SocketTestComponent;