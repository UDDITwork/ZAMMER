// File: /backend/test-mongodb-connection.js - Simple MongoDB connection test

const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔗 Testing MongoDB Connection');
console.log('============================\n');

// Check environment variables
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not defined');
  console.log('💡 Please run: node setup-test-env.js');
  process.exit(1);
}

console.log('📍 MongoDB URI:', process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));

// Test connection
const testConnection = async () => {
  try {
    console.log('🔗 Attempting to connect to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
    });
    
    console.log('✅ MongoDB connection successful!');
    
    // Test basic operations
    console.log('🧪 Testing basic operations...');
    
    // List databases
    const admin = mongoose.connection.db.admin();
    const dbs = await admin.listDatabases();
    console.log('📋 Available databases:', dbs.databases.map(db => db.name).join(', '));
    
    // Test collection access
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📁 Collections in current database:', collections.map(col => col.name).join(', '));
    
    console.log('\n🎉 MongoDB connection test completed successfully!');
    console.log('✅ You can now run: node test-auth-logging.js');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 MongoDB connection refused. Possible solutions:');
      console.log('   1. Make sure MongoDB is running');
      console.log('   2. Check if MongoDB is running on the correct port (default: 27017)');
      console.log('   3. Verify the MONGODB_URI in your .env file');
    } else if (error.message.includes('authentication failed')) {
      console.log('\n💡 Authentication failed. Check your MongoDB credentials');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 Connection timeout. Check your network and MongoDB server');
    }
    
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

// Run the test
testConnection();
