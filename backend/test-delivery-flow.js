// backend/test-delivery-flow.js - Test Delivery Agent Flow

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001/api';

// Test delivery agent registration
const testDeliveryAgentRegistration = async () => {
  console.log('\n🚚 ===============================');
  console.log('   TESTING DELIVERY AGENT REGISTRATION');
  console.log('===============================');

  const testAgent = {
    name: 'Test Delivery Agent',
    email: 'test.delivery@example.com',
    password: 'testpassword123',
    phone: '+919876543210',
    address: '123 Test Street, Mumbai, Maharashtra',
    vehicleType: 'Bicycle', // Using correct enum value
    vehicleModel: 'Test Bike Model',
    vehicleRegistration: 'MH12TEST1234',
    licenseNumber: 'DL1234567890123',
    workingAreas: 'Andheri, Bandra',
    emergencyContact: 'Emergency Contact: +919876543211'
  };

  try {
    console.log('📝 Test Data:', JSON.stringify(testAgent, null, 2));
    
    const response = await axios.post(`${API_BASE_URL}/delivery/register`, testAgent, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Registration Response:', {
      success: response.data.success,
      agentId: response.data.data?._id,
      hasToken: !!response.data.data?.token,
      tokenLength: response.data.data?.token?.length || 0
    });

    return response.data.data?.token;
  } catch (error) {
    console.error('❌ Registration Error:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      errors: error.response?.data?.errors
    });
    return null;
  }
};

// Test delivery agent login
const testDeliveryAgentLogin = async (email, password) => {
  console.log('\n🔐 ===============================');
  console.log('   TESTING DELIVERY AGENT LOGIN');
  console.log('===============================');

  try {
    const response = await axios.post(`${API_BASE_URL}/delivery/login`, {
      email,
      password
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Login Response:', {
      success: response.data.success,
      agentId: response.data.data?._id,
      hasToken: !!response.data.data?.token,
      tokenLength: response.data.data?.token?.length || 0
    });

    return response.data.data?.token;
  } catch (error) {
    console.error('❌ Login Error:', {
      status: error.response?.status,
      message: error.response?.data?.message
    });
    return null;
  }
};

// Test protected route access
const testProtectedRoute = async (token) => {
  console.log('\n🔒 ===============================');
  console.log('   TESTING PROTECTED ROUTE ACCESS');
  console.log('===============================');

  try {
    const response = await axios.get(`${API_BASE_URL}/delivery/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Protected Route Response:', {
      success: response.data.success,
      agentId: response.data.data?._id,
      agentName: response.data.data?.name
    });

    return true;
  } catch (error) {
    console.error('❌ Protected Route Error:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      code: error.response?.data?.code
    });
    return false;
  }
};

// Test available orders endpoint
const testAvailableOrders = async (token) => {
  console.log('\n📦 ===============================');
  console.log('   TESTING AVAILABLE ORDERS ENDPOINT');
  console.log('===============================');

  try {
    const response = await axios.get(`${API_BASE_URL}/delivery/orders/available`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Available Orders Response:', {
      success: response.data.success,
      orderCount: response.data.count,
      hasData: !!response.data.data
    });

    return true;
  } catch (error) {
    console.error('❌ Available Orders Error:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      code: error.response?.data?.code
    });
    return false;
  }
};

// Main test function
const runDeliveryAgentTests = async () => {
  console.log('🚀 Starting Delivery Agent Flow Tests...\n');

  // Test 1: Registration
  const registrationToken = await testDeliveryAgentRegistration();
  
  if (!registrationToken) {
    console.log('\n❌ Registration failed. Stopping tests.');
    return;
  }

  // Test 2: Login
  const loginToken = await testDeliveryAgentLogin('test.delivery@example.com', 'testpassword123');
  
  if (!loginToken) {
    console.log('\n❌ Login failed. Stopping tests.');
    return;
  }

  // Test 3: Protected Route
  const protectedRouteSuccess = await testProtectedRoute(loginToken);
  
  if (!protectedRouteSuccess) {
    console.log('\n❌ Protected route access failed.');
    return;
  }

  // Test 4: Available Orders
  const availableOrdersSuccess = await testAvailableOrders(loginToken);

  console.log('\n🎉 ===============================');
  console.log('   TEST RESULTS SUMMARY');
  console.log('===============================');
  console.log('✅ Registration:', !!registrationToken);
  console.log('✅ Login:', !!loginToken);
  console.log('✅ Protected Route:', protectedRouteSuccess);
  console.log('✅ Available Orders:', availableOrdersSuccess);
  console.log('===============================\n');

  if (registrationToken && loginToken && protectedRouteSuccess && availableOrdersSuccess) {
    console.log('🎉 ALL TESTS PASSED! Delivery agent flow is working correctly.');
  } else {
    console.log('❌ Some tests failed. Check the logs above for details.');
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runDeliveryAgentTests().catch(console.error);
}

module.exports = {
  testDeliveryAgentRegistration,
  testDeliveryAgentLogin,
  testProtectedRoute,
  testAvailableOrders,
  runDeliveryAgentTests
}; 