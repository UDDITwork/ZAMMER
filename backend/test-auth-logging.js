// File: /backend/test-auth-logging.js - Test authentication logging

const mongoose = require('mongoose');
require('dotenv').config();

// Import models and utilities
const User = require('./models/User');
const { logger } = require('./utils/logger');

// Test database connection
const connectDB = async () => {
  try {
    // Check if MONGODB_URI is defined
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI environment variable is not defined');
      console.log('💡 Please set MONGODB_URI in your .env file or environment');
      console.log('💡 Example: MONGODB_URI=mongodb://localhost:27017/zammer');
      process.exit(1);
    }
    
    console.log('🔗 Connecting to MongoDB...');
    console.log(`📍 URI: ${process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected for logging test');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('💡 Make sure MongoDB is running and the URI is correct');
    process.exit(1);
  }
};

// Test logging functionality
const testLogging = async () => {
  console.log('\n🔧 TESTING AUTHENTICATION LOGGING SYSTEM');
  console.log('==========================================\n');

  try {
    // Test 1: Create a test user (will trigger password hashing logs)
    console.log('1️⃣ Testing User Creation and Password Hashing...');
    const testUser = new User({
      name: 'Test User',
      email: 'test-logging@example.com',
      password: 'testpassword123',
      mobileNumber: '+1234567890'
    });

    await testUser.save();
    console.log('✅ Test user created successfully');

    // Test 2: Test password comparison (will trigger comparison logs)
    console.log('\n2️⃣ Testing Password Comparison...');
    const isMatch = await testUser.matchPassword('testpassword123');
    console.log(`✅ Password comparison result: ${isMatch}`);

    const isWrongMatch = await testUser.matchPassword('wrongpassword');
    console.log(`✅ Wrong password test result: ${isWrongMatch}`);

    // Test 3: Test login attempts (will trigger security logs)
    console.log('\n3️⃣ Testing Login Attempt Tracking...');
    await testUser.incLoginAttempts();
    await testUser.incLoginAttempts();
    await testUser.incLoginAttempts();
    console.log('✅ Login attempts incremented');

    // Test 4: Test password reset token generation
    console.log('\n4️⃣ Testing Password Reset Token Generation...');
    const resetToken = testUser.getResetPasswordToken();
    await testUser.save();
    console.log(`✅ Reset token generated: ${resetToken.substring(0, 10)}...`);

    // Test 5: Test token lookup
    console.log('\n5️⃣ Testing Password Reset Token Lookup...');
    const foundUser = await User.findByResetToken(resetToken);
    console.log(`✅ Token lookup result: ${foundUser ? 'Found' : 'Not found'}`);

    // Test 6: Test centralized logger
    console.log('\n6️⃣ Testing Centralized Logger...');
    logger.auth('TEST_LOGIN_ATTEMPT', { 
      email: 'test@example.com', 
      success: true,
      userId: testUser._id 
    });
    
    logger.password('TEST_PASSWORD_OPERATION', { 
      operation: 'change',
      userId: testUser._id,
      success: true 
    });
    
    logger.security('TEST_SECURITY_EVENT', { 
      event: 'test_event',
      userId: testUser._id 
    });

    // Test 7: Test password change
    console.log('\n7️⃣ Testing Password Change...');
    const oldPassword = testUser.password;
    testUser.password = 'newpassword123';
    await testUser.save();
    console.log('✅ Password changed successfully');

    // Test 8: Test login attempts reset
    console.log('\n8️⃣ Testing Login Attempts Reset...');
    await testUser.resetLoginAttempts();
    console.log('✅ Login attempts reset');

    // Test 9: Test email verification token
    console.log('\n9️⃣ Testing Email Verification Token...');
    const emailToken = testUser.getEmailVerificationToken();
    await testUser.save();
    console.log(`✅ Email verification token generated: ${emailToken.substring(0, 10)}...`);

    // Test 10: Clean up test user
    console.log('\n🔟 Cleaning up test user...');
    await User.deleteOne({ email: 'test-logging@example.com' });
    console.log('✅ Test user deleted');

    console.log('\n🎉 ALL LOGGING TESTS COMPLETED SUCCESSFULLY!');
    console.log('\n📋 Check the following log files for detailed logs:');
    console.log('   - backend/logs/password-*.log');
    console.log('   - backend/logs/security-*.log');
    console.log('   - backend/logs/auth-*.log');
    console.log('   - Console output above');

  } catch (error) {
    console.error('❌ Test failed:', error);
    logger.error('LOGGING_TEST_FAILED', { 
      error: error.message,
      stack: error.stack 
    });
  }
};

// Run the test
const runTest = async () => {
  try {
    await connectDB();
    await testLogging();
    
    console.log('\n🔧 Test completed. Check logs for detailed information.');
    console.log('\n📋 Next steps:');
    console.log('   1. Check the log files in backend/logs/');
    console.log('   2. Review the console output above');
    console.log('   3. Test your actual authentication endpoints');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    logger.error('AUTH_LOGGING_TEST_FAILED', { 
      error: error.message,
      stack: error.stack 
    });
  } finally {
    // Clean up database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
    process.exit(0);
  }
};

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  logger.critical('UNCAUGHT_EXCEPTION', { 
    error: error.message,
    stack: error.stack 
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  logger.critical('UNHANDLED_REJECTION', { 
    reason: reason,
    promise: promise 
  });
  process.exit(1);
});

// Run the test
runTest();
