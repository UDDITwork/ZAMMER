const http = require('http');
const socketIo = require('socket.io');
const setupSocketHandlers = require('./socket/socketHandlers');

console.log('Starting server...');
console.log('Loading app module...');

// Define server variable in the global scope
let httpServer;

try {
  const { app } = require('./app');
  console.log('App module loaded successfully');

  // Create HTTP server
  httpServer = http.createServer(app);

  // Setup Socket.IO with CORS configuration
  const io = socketIo(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Setup socket handlers
  setupSocketHandlers(io);

  // Enhanced logging for server startup
  console.log(`
🚀 ===============================
   ZAMMER SERVER STARTING...
===============================
📡 Socket.IO: ENABLED
🌐 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}
🔗 Transport: WebSocket + Polling
⚡ Real-time Features: ACTIVE
===============================`);

  const PORT = process.env.PORT || 5000;
  console.log(`Using port: ${PORT}`);

  // Start server
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`
✅ ===============================
   SERVER RUNNING SUCCESSFULLY!
===============================
🌐 HTTP Server: http://localhost:${PORT}
📡 Socket Server: ws://localhost:${PORT}
🛒 Order Management: READY
📱 Real-time Updates: ACTIVE
===============================`);
  });

} catch (error) {
  console.error('❌ CRITICAL ERROR DURING SERVER STARTUP:');
  console.error(error);
  process.exit(1);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error('Error:', err.message);
  
  // Close server & exit process
  if (httpServer) {
    httpServer.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error('Error:', err.message);
  
  if (httpServer) {
    httpServer.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  if (httpServer) {
    httpServer.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  if (httpServer) {
    httpServer.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});