// Debug script to check admin authentication state
// Run this in the browser console to debug the admin auth issue

console.log('🔍 DEBUGGING ADMIN AUTHENTICATION STATE');
console.log('=====================================');

// Check localStorage for admin tokens
const adminToken = localStorage.getItem('adminToken');
const adminData = localStorage.getItem('adminData');

console.log('📦 LocalStorage Check:');
console.log('  adminToken:', adminToken ? 'Present' : 'Missing');
console.log('  adminData:', adminData ? 'Present' : 'Missing');

if (adminToken) {
  console.log('  Token length:', adminToken.length);
  console.log('  Token preview:', adminToken.substring(0, 50) + '...');
}

if (adminData) {
  try {
    const parsed = JSON.parse(adminData);
    console.log('  Admin name:', parsed.name);
    console.log('  Admin email:', parsed.email);
    console.log('  Admin role:', parsed.role);
  } catch (e) {
    console.log('  Admin data parse error:', e.message);
  }
}

// Check all tokens in localStorage
console.log('\n🔑 All Tokens in localStorage:');
const allKeys = Object.keys(localStorage);
allKeys.forEach(key => {
  if (key.includes('Token') || key.includes('Data')) {
    const value = localStorage.getItem(key);
    console.log(`  ${key}:`, value ? 'Present' : 'Missing');
  }
});

// Test API request manually
console.log('\n🧪 Testing API Request:');
if (adminToken) {
  fetch('/api/admin/sellers?page=1&limit=20', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('  Response status:', response.status);
    console.log('  Response headers:', Object.fromEntries(response.headers.entries()));
    return response.json();
  })
  .then(data => {
    console.log('  Response data:', data);
  })
  .catch(error => {
    console.log('  Request error:', error);
  });
} else {
  console.log('  Cannot test API request - no admin token found');
}

// Check if we can access the auth context
console.log('\n🔧 Auth Context Check:');
if (window.debugAuth) {
  const authState = window.debugAuth();
  console.log('  Auth state:', authState);
} else {
  console.log('  debugAuth function not available');
}

console.log('\n✅ Debug complete. Check the results above.');
