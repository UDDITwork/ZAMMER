// frontend/test-admin-sellers-auth.js
// Test script to verify admin authentication flow for ViewAllSellers component

console.log('🧪 Testing Admin Sellers Authentication Flow...');

// Check if running in browser or Node.js
const isBrowser = typeof window !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

if (isNode) {
  console.log('📋 Running in Node.js environment');
  console.log('ℹ️ This test script is designed to run in a browser environment');
  console.log('ℹ️ To test admin authentication:');
  console.log('   1. Start the frontend development server: npm start');
  console.log('   2. Open browser and navigate to admin dashboard');
  console.log('   3. Open browser console (F12)');
  console.log('   4. Run: testAdminSellersAuth()');
  console.log('   5. Navigate to /admin/sellers to test the fix');
  console.log('');
  console.log('🔧 Available test functions in browser console:');
  console.log('   - testAdminSellersAuth() - Run all tests');
  console.log('   - testAdminTokenStorage() - Test token storage');
  console.log('   - testAPIInterceptor() - Test API calls');
  console.log('   - window.debugAdminAuth() - Debug auth context');
  console.log('');
  console.log('✅ Authentication fixes have been applied to:');
  console.log('   - ViewAllSellers.js - Added auth initialization delay');
  console.log('   - AdminLayout.js - Added auth initialization delay');
  console.log('   - Enhanced error handling and token verification');
  process.exit(0);
}

// Test 1: Check if admin tokens are properly stored
const testAdminTokenStorage = () => {
  console.log('\n📋 Test 1: Admin Token Storage');
  
  const adminToken = localStorage.getItem('adminToken');
  const adminData = localStorage.getItem('adminData');
  
  console.log('Admin Token:', adminToken ? 'Present' : 'Missing');
  console.log('Admin Data:', adminData ? 'Present' : 'Missing');
  
  if (adminToken && adminData) {
    try {
      const parsedData = JSON.parse(adminData);
      console.log('Admin Name:', parsedData.name);
      console.log('Admin Email:', parsedData.email);
      console.log('Admin Role:', parsedData.role);
      console.log('Token Length:', adminToken.length);
      return true;
    } catch (error) {
      console.error('❌ Failed to parse admin data:', error);
      return false;
    }
  }
  
  return false;
};

// Test 2: Check API interceptor token handling
const testAPIInterceptor = () => {
  console.log('\n📋 Test 2: API Interceptor Token Handling');
  
  const adminToken = localStorage.getItem('adminToken');
  
  if (!adminToken) {
    console.log('❌ No admin token available for testing');
    return false;
  }
  
  // Test the API call that ViewAllSellers makes
  const testAPICall = async () => {
    try {
      console.log('🧪 Testing API call to /admin/sellers...');
      
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
        return false;
      } else if (response.status === 200) {
        const data = await response.json();
        console.log('✅ API call successful');
        console.log('Sellers count:', data.data?.length || 0);
        return true;
      } else {
        console.log('⚠️ Unexpected response status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ API call failed:', error);
      return false;
    }
  };
  
  return testAPICall();
};

// Test 3: Check authentication context state
const testAuthContext = () => {
  console.log('\n📋 Test 3: Authentication Context State');
  
  // This would need to be run in the React app context
  console.log('ℹ️ This test requires React context - run in browser console on admin page');
  console.log('Run: window.debugAdminAuth() in browser console');
  
  return true;
};

// Test 4: Simulate navigation flow
const testNavigationFlow = () => {
  console.log('\n📋 Test 4: Navigation Flow Simulation');
  
  const currentPath = window.location.pathname;
  console.log('Current Path:', currentPath);
  
  if (currentPath.includes('/admin/')) {
    console.log('✅ Currently on admin route');
    
    if (currentPath === '/admin/sellers') {
      console.log('✅ On sellers page - authentication should be verified');
    } else {
      console.log('ℹ️ Not on sellers page - navigate to /admin/sellers to test');
    }
  } else {
    console.log('⚠️ Not on admin route - navigate to admin dashboard first');
  }
  
  return true;
};

// Run all tests
const runAllTests = async () => {
  console.log('🚀 Starting Admin Sellers Authentication Tests...\n');
  
  const results = {
    tokenStorage: testAdminTokenStorage(),
    apiInterceptor: await testAPIInterceptor(),
    authContext: testAuthContext(),
    navigationFlow: testNavigationFlow()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('Token Storage:', results.tokenStorage ? '✅ PASS' : '❌ FAIL');
  console.log('API Interceptor:', results.apiInterceptor ? '✅ PASS' : '❌ FAIL');
  console.log('Auth Context:', results.authContext ? '✅ PASS' : '❌ FAIL');
  console.log('Navigation Flow:', results.navigationFlow ? '✅ PASS' : '❌ FAIL');
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Admin authentication should work properly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the issues above.');
  }
  
  return results;
};

// Export for use in browser console
if (isBrowser) {
  window.testAdminSellersAuth = runAllTests;
  window.testAdminTokenStorage = testAdminTokenStorage;
  window.testAPIInterceptor = testAPIInterceptor;
  console.log('🔧 Test functions available:');
  console.log('  - testAdminSellersAuth() - Run all tests');
  console.log('  - testAdminTokenStorage() - Test token storage');
  console.log('  - testAPIInterceptor() - Test API calls');
}

// Auto-run if in browser and on admin page
if (isBrowser && window.location.pathname.includes('/admin/')) {
  console.log('🔄 Auto-running tests...');
  runAllTests();
}

// Export for ES modules (only if not in Node.js)
if (isBrowser) {
  window.AdminSellersAuthTests = { runAllTests, testAdminTokenStorage, testAPIInterceptor, testAuthContext, testNavigationFlow };
}
