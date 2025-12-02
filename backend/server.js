//backend/server.js
require('dotenv').config();
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const express = require('express');

// 🎯 ROBUST: Smart Environment Detection
const detectEnvironment = () => {
  // Auto-detect if running locally (has localhost in process.env)
  const isLocal = process.env.PORT === '5001' || 
                  process.env.NODE_ENV === 'development' ||
                  process.env.FRONTEND_URL_LOCAL ||
                  !process.env.FRONTEND_URL_PROD;
  
  return isLocal ? 'development' : 'production';
};

const NODE_ENV = process.env.NODE_ENV || detectEnvironment();
const PORT = Number(process.env.PORT) || 5001;
// 🎯 ROBUST: Smart Frontend URL Detection
const getFrontendUrl = () => {
  if (NODE_ENV === 'production') {
    const prodUrl = process.env.FRONTEND_URL_PROD || 
                   process.env.FRONTEND_URL || 
                   process.env.PUBLIC_URL;
    if (!prodUrl) {
      console.warn('⚠️ No FRONTEND_URL_PROD configured in production');
      return null;
    }
    return prodUrl.startsWith('https://') ? prodUrl : `https://${prodUrl.replace(/^https?:\/\//, '')}`;
  }
  return process.env.FRONTEND_URL_LOCAL || 
         process.env.FRONTEND_URL || 
         process.env.PUBLIC_URL ||
         'http://localhost:3000';
};

const FRONTEND_URL = getFrontendUrl();

console.log(`
🚀 ===============================
   ZAMMER SERVER INITIALIZATION
===============================
🌍 Environment: ${NODE_ENV}
📡 Port: ${PORT}
🌐 Frontend URL: ${FRONTEND_URL}
🔥 Starting server components...
===============================`);

// Define server variable in the global scope
let httpServer;

// Wrap the main initialization in an async function
async function initializeServer() {
  try {
    // Load app module
    console.log('Loading app module...');
    const { app } = require('./app');
    console.log('✅ App module loaded successfully');

    // Initialize scheduler service
    console.log('Initializing scheduler service...');
    const SchedulerService = require('./services/schedulerService');
    await SchedulerService.initialize();
    SchedulerService.start();
    console.log('✅ Scheduler service initialized and started');

  // Create HTTP server
  httpServer = http.createServer(app);

  // 🎯 FLEXIBLE: Smart Socket.IO Origins - Works on all devices
  const getAllowedOrigins = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const origins = [];
    
    if (isProduction) {
      // Production: Use environment variables + flexible patterns
      if (FRONTEND_URL) {
        const cleanUrl = FRONTEND_URL.replace(/\/$/, '');
        origins.push(cleanUrl);
        origins.push(`${cleanUrl}/`);
        
        // Add HTTP version for flexibility
        if (cleanUrl.startsWith('https://')) {
          const httpVersion = cleanUrl.replace('https://', 'http://');
          origins.push(httpVersion);
          origins.push(`${httpVersion}/`);
        }
      }
      
      // Add pattern matching for Google Cloud domains
      origins.push(/https:\/\/.*\.appspot\.com$/);
      origins.push(/https:\/\/.*\.googleusercontent\.com$/);
      
      // Add CDN domains if configured
      if (process.env.CDN_DOMAINS) {
        const cdnDomains = process.env.CDN_DOMAINS.split(',').map(d => d.trim()).filter(Boolean);
        cdnDomains.forEach(domain => {
          const cleanDomain = domain.replace(/\/$/, '');
          origins.push(cleanDomain);
          origins.push(`${cleanDomain}/`);
        });
      }
      
      // Add additional origins if configured
      if (process.env.ADDITIONAL_ALLOWED_ORIGINS) {
        const additionalOrigins = process.env.ADDITIONAL_ALLOWED_ORIGINS.split(',').map(d => d.trim()).filter(Boolean);
        additionalOrigins.forEach(origin => {
          const cleanOrigin = origin.replace(/\/$/, '');
          origins.push(cleanOrigin);
          origins.push(`${cleanOrigin}/`);
        });
      }
    } else {
      // Development: Localhost variations
      origins.push(
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://localhost:3000',
        'http://localhost',
        'http://127.0.0.1'
      );
      
      // Add production URL if configured (for testing)
      if (FRONTEND_URL && FRONTEND_URL !== 'http://localhost:3000') {
        const cleanUrl = FRONTEND_URL.replace(/\/$/, '');
        origins.push(cleanUrl);
        origins.push(`${cleanUrl}/`);
      }
    }
    
    return origins;
  };

  // Setup Socket.IO with enhanced CORS configuration
  const io = socketIo(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    // Add connection state recovery for production
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    }
  });

  // Basic Socket.IO connection handling (main logic is in app.js)
  io.on('connection', (socket) => {
    console.log(`🔌 Socket.IO connection established: ${socket.id}`);
    
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket.IO disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  // Make io available globally for use in routes
  global.io = io;

  console.log(`
✅ ===============================
   SOCKET.IO CONFIGURATION
===============================
🔗 Transport: WebSocket + Polling
🛡️ CORS Origins: ${getAllowedOrigins().length} configured
⚡ Real-time Features: ACTIVE
🔄 State Recovery: ENABLED
===============================`);

  // 🎯 PRODUCTION: Enhanced server startup
  const startServer = () => {
    return new Promise((resolve, reject) => {
      httpServer.listen(PORT, '0.0.0.0', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  };

  // Start server with error handling
  startServer()
    .then(() => {
      console.log(`
🎉 ===============================
   ZAMMER SERVER READY!
===============================
🌐 HTTP Server: http://0.0.0.0:${PORT}
📡 Socket Server: ws://0.0.0.0:${PORT}
🛒 API Endpoints: http://0.0.0.0:${PORT}/api
💚 Health Check: http://0.0.0.0:${PORT}/api/health
🔔 Real-time: OPERATIONAL
🚀 Environment: ${NODE_ENV}
===============================`);

      // 🎯 PRODUCTION: Additional startup checks
      if (NODE_ENV === 'production') {
        console.log(`
🔒 ===============================
   PRODUCTION SECURITY ACTIVE
===============================
🛡️ Helmet: ENABLED
⚡ Rate Limiting: ACTIVE
🔐 CORS: RESTRICTED
📊 Monitoring: READY
===============================`);
      }
    })
    .catch((error) => {
      console.error('❌ FAILED TO START SERVER:');
      console.error(error);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ CRITICAL ERROR DURING SERVER STARTUP:');
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Start the server
initializeServer();

// 🎯 PRODUCTION: Enhanced error handling
process.on('unhandledRejection', (err, promise) => {
  console.log('💥 UNHANDLED REJECTION! Shutting down...');
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  
  if (NODE_ENV === 'development') {
    console.error('Error stack:', err.stack);
    console.error('Promise:', promise);
  }
  
  // Close server & exit process
  if (httpServer) {
    httpServer.close(() => {
      console.log('🛑 Server closed due to unhandled rejection');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  console.log('💥 UNCAUGHT EXCEPTION! Shutting down...');
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  
  if (NODE_ENV === 'development') {
    console.error('Error stack:', err.stack);
  }
  
  // Close server & exit process
  if (httpServer) {
    httpServer.close(() => {
      console.log('🛑 Server closed due to uncaught exception');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// 🎯 PRODUCTION: Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  if (httpServer) {
    httpServer.close(() => {
      console.log('✅ HTTP server closed gracefully');
      
      // Give time for cleanup
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.log('⚠️ Forcing server shutdown...');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  
  if (httpServer) {
    httpServer.close(() => {
      console.log('✅ HTTP server closed gracefully');
      process.exit(0);
    });
    
    // Force close after 5 seconds
    setTimeout(() => {
      console.log('⚠️ Forcing server shutdown...');
      process.exit(1);
    }, 5000);
  } else {
    process.exit(0);
  }
});

// 🎯 PRODUCTION: Memory usage monitoring
if (NODE_ENV === 'production') {
  setInterval(() => {
    const used = process.memoryUsage();
    const memoryUsage = {
      rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(used.external / 1024 / 1024 * 100) / 100
    };
    
    // Log if memory usage is high
    if (memoryUsage.heapUsed > 500) { // More than 500MB
      console.log(`⚠️ High memory usage detected: ${JSON.stringify(memoryUsage)} MB`);
    }
  }, 30000); // Check every 30 seconds
}

// Export for testing purposes
module.exports = { httpServer };