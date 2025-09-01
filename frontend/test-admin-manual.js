// frontend/test-admin-manual.js - Manual Admin Frontend Test
// Simple test to verify admin frontend is working correctly

const testAdminEndpoints = async () => {
  console.log('🧪 Manual Admin Frontend Test\n');
  
  const baseUrl = 'http://localhost:3000';
  
  const endpoints = [
    '/admin/login',
    '/admin/dashboard', 
    '/admin/users',
    '/admin/sellers',
    '/admin/delivery-agents',
    '/admin/orders'
  ];
  
  console.log('📋 Testing Admin Endpoints:');
  console.log('========================\n');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`🔗 Testing: ${baseUrl}${endpoint}`);
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          console.log(`✅ ${endpoint} - Page loads successfully (${response.status})`);
        } else {
          console.log(`⚠️  ${endpoint} - Response received but not HTML (${response.status})`);
        }
      } else {
        console.log(`❌ ${endpoint} - Failed to load (${response.status})`);
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('🎯 Manual Test Instructions:');
  console.log('============================');
  console.log('1. Open browser and go to: http://localhost:3000/admin/login');
  console.log('2. Login with admin credentials');
  console.log('3. Check if sidebar appears only ONCE (not duplicated)');
  console.log('4. Navigate between different admin pages');
  console.log('5. Verify sidebar remains single on all pages');
  console.log('6. Test responsive behavior (resize browser window)');
  console.log('\n✅ Expected Result: Single sidebar on all admin pages');
  console.log('❌ Problem Fixed: No more duplicate sidebars');
};

// Run the test
testAdminEndpoints().catch(console.error);
