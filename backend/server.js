console.log('Starting server...');
console.log('Loading app module...');

// Define server variable in the global scope
let server;

try {
  const app = require('./app');
  console.log('App module loaded successfully');

  const PORT = process.env.PORT || 5000;
  console.log(`Using port: ${PORT}`);

  // More robust server initialization
  console.log('Starting server on port', PORT);
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ API available at http://localhost:${PORT}/api`);
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
  if (server) {
    server.close(() => {
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
  
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});