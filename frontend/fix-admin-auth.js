// frontend/fix-admin-auth.js
// Quick fix for admin authentication issues

console.log('🔧 Admin Authentication Fix');

// Function to manually set admin token and data
const fixAdminAuth = () => {
  console.log('🔧 Fixing admin authentication...');
  
  // Use the working token from backend test
  const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4OTIyNWU3ZDc4MDM3MTZiNzU3YWE2MyIsImlhdCI6MTc1NjY4NzMzOCwiZXhwIjoxNzU2NzczNzM4fQ.7OSDOF0NCjILMwXAbaOHwVVnCA8Q4kkDaVVNEXxe1uo';
  
  const adminData = {
    _id: '689225e7d7803716b757aa63',
    name: 'ZAMMER Admin',
    email: 'admin@zammer.com',
    role: 'super_admin',
    token: adminToken
  };
  
  // Clear any existing tokens
  localStorage.removeItem('userToken');
  localStorage.removeItem('userData');
  localStorage.removeItem('sellerToken');
  localStorage.removeItem('sellerData');
  localStorage.removeItem('deliveryAgentToken');
  localStorage.removeItem('deliveryAgentData');
  
  // Set admin token and data
  localStorage.setItem('adminToken', adminToken);
  localStorage.setItem('adminData', JSON.stringify(adminData));
  
  console.log('✅ Admin authentication fixed!');
  console.log('Admin token set:', adminToken.substring(0, 50) + '...');
  console.log('Admin data set:', adminData);
  
  // Reload the page to reinitialize AuthContext
  console.log('🔄 Reloading page to reinitialize authentication...');
  window.location.reload();
  
  return true;
};

// Function to test admin API call
const testAdminAPI = async () => {
  console.log('🧪 Testing admin API call...');
  
  const adminToken = localStorage.getItem('adminToken');
  
  if (!adminToken) {
    console.log('❌ No admin token found. Run fixAdminAuth() first.');
    return false;
  }
  
  try {
    const response = await fetch('/api/admin/sellers?page=1&limit=20', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response Status:', response.status);
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ Admin API call successful!');
      console.log('Sellers count:', data.data?.length || 0);
      return true;
    } else {
      console.log('❌ Admin API call failed with status:', response.status);
      const errorData = await response.json();
      console.log('Error details:', errorData);
      return false;
    }
  } catch (error) {
    console.error('❌ Admin API call error:', error);
    return false;
  }
};

// Function to check current auth state
const checkAuthState = () => {
  console.log('🔍 Checking current authentication state...');
  
  const adminToken = localStorage.getItem('adminToken');
  const adminData = localStorage.getItem('adminData');
  
  console.log('Admin Token:', adminToken ? 'Present' : 'Missing');
  console.log('Admin Data:', adminData ? 'Present' : 'Missing');
  
  if (adminToken) {
    console.log('Token length:', adminToken.length);
    console.log('Token preview:', adminToken.substring(0, 50) + '...');
  }
  
  if (adminData) {
    try {
      const parsed = JSON.parse(adminData);
      console.log('Admin name:', parsed.name);
      console.log('Admin email:', parsed.email);
      console.log('Admin role:', parsed.role);
    } catch (error) {
      console.log('Admin data parse error:', error.message);
    }
  }
  
  return { adminToken, adminData };
};

// Export functions for browser console
if (typeof window !== 'undefined') {
  window.fixAdminAuth = fixAdminAuth;
  window.testAdminAPI = testAdminAPI;
  window.checkAuthState = checkAuthState;
  
  console.log('🔧 Admin auth fix functions available:');
  console.log('  - fixAdminAuth() - Fix admin authentication');
  console.log('  - testAdminAPI() - Test admin API call');
  console.log('  - checkAuthState() - Check current auth state');
  
  // Auto-check auth state
  console.log('\n🔍 Current authentication state:');
  checkAuthState();
}

export { fixAdminAuth, testAdminAPI, checkAuthState };
