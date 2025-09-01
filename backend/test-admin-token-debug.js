// backend/test-admin-token-debug.js
// Test script to debug admin token issues

// Load environment variables
require('dotenv').config();

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

console.log('🔧 Admin Token Debug Test');

// Connect to database
const connectDB = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Test 1: Check JWT secret
const testJWTSecret = () => {
  console.log('\n📋 Test 1: JWT Secret Check');
  
  const adminSecret = process.env.ADMIN_JWT_SECRET;
  const generalSecret = process.env.JWT_SECRET;
  
  console.log('ADMIN_JWT_SECRET:', adminSecret ? 'Present' : 'Missing');
  console.log('JWT_SECRET:', generalSecret ? 'Present' : 'Missing');
  
  if (adminSecret) {
    console.log('Admin Secret Length:', adminSecret.length);
  }
  
  if (generalSecret) {
    console.log('General Secret Length:', generalSecret.length);
  }
  
  return adminSecret || generalSecret;
};

// Test 2: Create a test admin token
const createTestToken = async (secret) => {
  console.log('\n📋 Test 2: Create Test Admin Token');
  
  try {
    // Find an admin user
    const admin = await Admin.findOne({ isActive: true });
    
    if (!admin) {
      console.log('❌ No active admin found in database');
      return null;
    }
    
    console.log('Found admin:', {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role
    });
    
    // Create token
    const token = jwt.sign(
      { id: admin._id },
      secret,
      { expiresIn: '24h' }
    );
    
    console.log('✅ Test token created');
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 50) + '...');
    
    return { token, admin };
  } catch (error) {
    console.error('❌ Error creating test token:', error);
    return null;
  }
};

// Test 3: Verify token
const verifyTestToken = (token, secret) => {
  console.log('\n📋 Test 3: Verify Test Token');
  
  try {
    const decoded = jwt.verify(token, secret);
    console.log('✅ Token verification successful');
    console.log('Decoded payload:', decoded);
    return decoded;
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    return null;
  }
};

// Test 4: Test middleware logic
const testMiddlewareLogic = (token, secret) => {
  console.log('\n📋 Test 4: Test Middleware Logic');
  
  // Simulate the middleware logic
  const mockReq = {
    headers: {
      authorization: `Bearer ${token}`
    }
  };
  
  console.log('Mock request headers:', mockReq.headers);
  
  // Extract token
  let extractedToken;
  if (mockReq.headers.authorization && mockReq.headers.authorization.startsWith('Bearer')) {
    extractedToken = mockReq.headers.authorization.split(' ')[1];
    console.log('✅ Token extracted from Authorization header');
  }
  
  if (!extractedToken) {
    console.log('❌ No token extracted');
    return false;
  }
  
  // Verify token
  try {
    const decoded = jwt.verify(extractedToken, secret);
    console.log('✅ Token verification in middleware logic successful');
    console.log('Admin ID from token:', decoded.id);
    return true;
  } catch (error) {
    console.error('❌ Token verification in middleware failed:', error.message);
    return false;
  }
};

// Test 5: Check database connection
const testDatabaseConnection = async () => {
  console.log('\n📋 Test 5: Database Connection');
  
  try {
    const adminCount = await Admin.countDocuments();
    console.log('✅ Database connected');
    console.log('Total admins in database:', adminCount);
    
    const activeAdmins = await Admin.find({ isActive: true }).select('name email role');
    console.log('Active admins:', activeAdmins);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

// Run all tests
const runAllTests = async () => {
  console.log('🚀 Starting Admin Token Debug Tests...\n');
  
  try {
    // Connect to database first
    const dbConnected = await connectDB();
    if (!dbConnected) {
      console.log('❌ Database connection failed. Cannot proceed with tests.');
      return;
    }
    
    // Test 1: JWT Secret
    const secret = testJWTSecret();
    if (!secret) {
      console.log('❌ No JWT secret found. Cannot proceed with token tests.');
      return;
    }
    
    // Test 5: Database
    const dbTestPassed = await testDatabaseConnection();
    if (!dbTestPassed) {
      console.log('❌ Database test failed. Cannot proceed with admin tests.');
      return;
    }
    
    // Test 2: Create token
    const tokenResult = await createTestToken(secret);
    if (!tokenResult) {
      console.log('❌ Could not create test token. Cannot proceed.');
      return;
    }
    
    const { token, admin } = tokenResult;
    
    // Test 3: Verify token
    const decoded = verifyTestToken(token, secret);
    if (!decoded) {
      console.log('❌ Token verification failed. Cannot proceed.');
      return;
    }
    
    // Test 4: Middleware logic
    const middlewareWorks = testMiddlewareLogic(token, secret);
    
    console.log('\n📊 Test Results Summary:');
    console.log('JWT Secret:', secret ? '✅ PASS' : '❌ FAIL');
    console.log('Database Connection:', dbTestPassed ? '✅ PASS' : '❌ FAIL');
    console.log('Token Creation:', tokenResult ? '✅ PASS' : '❌ FAIL');
    console.log('Token Verification:', decoded ? '✅ PASS' : '❌ FAIL');
    console.log('Middleware Logic:', middlewareWorks ? '✅ PASS' : '❌ FAIL');
    
    if (middlewareWorks) {
      console.log('\n🎉 All tests passed! Admin authentication should work.');
      console.log('\n🔧 To test with frontend:');
      console.log('1. Use this token in browser console:');
      console.log(`   localStorage.setItem('adminToken', '${token}');`);
      console.log('2. Navigate to admin dashboard');
      console.log('3. Check if authentication works');
    } else {
      console.log('\n⚠️ Some tests failed. Check the issues above.');
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    // Close database connection
    try {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
    }
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().then(() => {
    console.log('\n✅ Tests completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Tests failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testJWTSecret,
  createTestToken,
  verifyTestToken,
  testMiddlewareLogic,
  testDatabaseConnection,
  runAllTests
};
