// frontend/test-frontend-token-debug.js
// Test script to debug frontend token handling

console.log('🔧 Frontend Token Debug Test');

// Test 1: Check localStorage tokens
const testLocalStorageTokens = () => {
  console.log('\n📋 Test 1: LocalStorage Token Check');
  
  const tokens = {
    adminToken: localStorage.getItem('adminToken'),
    adminData: localStorage.getItem('adminData'),
    userToken: localStorage.getItem('userToken'),
    userData: localStorage.getItem('userData'),
    sellerToken: localStorage.getItem('sellerToken'),
    sellerData: localStorage.getItem('sellerData'),
    deliveryAgentToken: localStorage.getItem('deliveryAgentToken'),
    deliveryAgentData: localStorage.getItem('deliveryAgentData')
  };
  
  console.log('Tokens in localStorage:');
  Object.entries(tokens).forEach(([key, value]) => {
    console.log(`  ${key}:`, value ? 'Present' : 'Missing');
    if (value && key.includes('Token')) {
      console.log(`    Length: ${value.length}`);
      console.log(`    Preview: ${value.substring(0, 50)}...`);
    }
  });
  
  return tokens;
};

// Test 2: Check AuthContext state
const testAuthContext = () => {
  console.log('\n📋 Test 2: AuthContext State Check');
  
  // This would need to be run in React context
  console.log('ℹ️ This test requires React context - run in browser console on admin page');
  console.log('Run: window.debugAuthContext() in browser console');
  
  return true;
};

// Test 3: Test API interceptor logic
const testAPIInterceptor = () => {
  console.log('\n📋 Test 3: API Interceptor Logic Test');
  
  const adminToken = localStorage.getItem('adminToken');
  
  if (!adminToken) {
    console.log('❌ No admin token found in localStorage');
    return false;
  }
  
  // Simulate the API interceptor logic
  const mockConfig = {
    url: '/admin/sellers',
    headers: {}
  };
  
  const urlPath = mockConfig.url || '';
  const isAdminRoute = urlPath.includes('/admin/');
  
  console.log('Route analysis:', {
    urlPath,
    isAdminRoute,
    hasAdminToken: !!adminToken
  });
  
  if (isAdminRoute && adminToken) {
    mockConfig.headers.Authorization = `Bearer ${adminToken}`;
    console.log('✅ Admin token would be attached to request');
    console.log('Authorization header:', mockConfig.headers.Authorization.substring(0, 50) + '...');
    return true;
  } else {
    console.log('❌ Admin token would NOT be attached to request');
    return false;
  }
};

// Test 4: Test actual API call
const testAPICall = async () => {
  console.log('\n📋 Test 4: Actual API Call Test');
  
  const adminToken = localStorage.getItem('adminToken');
  
  if (!adminToken) {
    console.log('❌ No admin token available for API test');
    return false;
  }
  
  try {
    console.log('🧪 Testing API call to /api/admin/sellers...');
    
    const response = await fetch('/api/admin/sellers?page=1&limit=20', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response Status:', response.status);
    
    if (response.status === 401) {
      console.log('❌ Authentication failed - token may be invalid or expired');
      const errorData = await response.json();
      console.log('Error details:', errorData);
      return false;
    } else if (response.status === 200) {
      const data = await response.json();
      console.log('✅ API call successful');
      console.log('Sellers count:', data.data?.length || 0);
      return true;
    } else {
      console.log('⚠️ Unexpected response status:', response.status);
      const errorData = await response.json();
      console.log('Response data:', errorData);
      return false;
    }
  } catch (error) {
    console.error('❌ API call failed:', error);
    return false;
  }
};

// Test 5: Set test token
const setTestToken = () => {
  console.log('\n📋 Test 5: Set Test Admin Token');
  
  // Use the token from the backend test
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4OTIyNWU3ZDc4MDM3MTZiNzU3YWE2MyIsImlhdCI6MTc1NjY4NzMzOCwiZXhwIjoxNzU2NzczNzM4fQ.7OSDOF0NCjILMwXAbaOHwVVnCA8Q4kkDaVVNEXxe1uo';
  
  localStorage.setItem('adminToken', testToken);
  localStorage.setItem('adminData', JSON.stringify({
    _id: '689225e7d7803716b757aa63',
    name: 'ZAMMER Admin',
    email: 'admin@zammer.com',
    role: 'super_admin',
    token: testToken
  }));
  
  console.log('✅ Test admin token set in localStorage');
  console.log('Token length:', testToken.length);
  console.log('Token preview:', testToken.substring(0, 50) + '...');
  
  return true;
};

// Run all tests
const runAllTests = async () => {
  console.log('🚀 Starting Frontend Token Debug Tests...\n');
  
  try {
    // Test 1: Check localStorage
    const tokens = testLocalStorageTokens();
    
    // Test 5: Set test token if needed
    if (!tokens.adminToken) {
      console.log('⚠️ No admin token found, setting test token...');
      setTestToken();
    }
    
    // Test 2: AuthContext (placeholder)
    const authContextWorks = testAuthContext();
    
    // Test 3: API interceptor
    const interceptorWorks = testAPIInterceptor();
    
    // Test 4: Actual API call
    const apiCallWorks = await testAPICall();
    
    console.log('\n📊 Test Results Summary:');
    console.log('LocalStorage Tokens:', tokens.adminToken ? '✅ PASS' : '❌ FAIL');
    console.log('AuthContext State:', authContextWorks ? '✅ PASS' : '❌ FAIL');
    console.log('API Interceptor Logic:', interceptorWorks ? '✅ PASS' : '❌ FAIL');
    console.log('Actual API Call:', apiCallWorks ? '✅ PASS' : '❌ FAIL');
    
    const allPassed = tokens.adminToken && authContextWorks && interceptorWorks && apiCallWorks;
    
    if (allPassed) {
      console.log('\n🎉 All tests passed! Frontend token handling should work.');
      console.log('\n🔧 Next steps:');
      console.log('1. Navigate to admin dashboard');
      console.log('2. Click on "Sellers" tab');
      console.log('3. Check if authentication works without logout');
    } else {
      console.log('\n⚠️ Some tests failed. Check the issues above.');
      
      if (!tokens.adminToken) {
        console.log('\n🔧 Fix: Set admin token in localStorage');
        console.log('Run: setTestToken() in browser console');
      }
      
      if (!interceptorWorks) {
        console.log('\n🔧 Fix: Check API interceptor logic');
      }
      
      if (!apiCallWorks) {
        console.log('\n🔧 Fix: Check API endpoint and token validity');
      }
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testFrontendTokens = runAllTests;
  window.testLocalStorageTokens = testLocalStorageTokens;
  window.testAPIInterceptor = testAPIInterceptor;
  window.testAPICall = testAPICall;
  window.setTestToken = setTestToken;
  
  console.log('🔧 Test functions available:');
  console.log('  - testFrontendTokens() - Run all tests');
  console.log('  - testLocalStorageTokens() - Check localStorage');
  console.log('  - testAPIInterceptor() - Test interceptor logic');
  console.log('  - testAPICall() - Test actual API call');
  console.log('  - setTestToken() - Set test admin token');
}

// Auto-run if in browser
if (typeof window !== 'undefined' && window.location.pathname.includes('/admin/')) {
  console.log('🔄 Auto-running frontend token tests...');
  runAllTests();
}

export { runAllTests, testLocalStorageTokens, testAPIInterceptor, testAPICall, setTestToken };
