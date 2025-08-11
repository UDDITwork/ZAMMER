// backend/debug-smepay.js - Debug SMEPay Credentials Issue
require('dotenv').config();
const axios = require('axios');

console.log('🔍 DEBUGGING SMEPAY CREDENTIALS ISSUE');
console.log('=====================================\n');

// Check environment variables
console.log('📋 Environment Variables Check:');
console.log('SMEPAY_CLIENT_ID from env:', process.env.SMEPAY_CLIENT_ID ? `"${process.env.SMEPAY_CLIENT_ID}"` : 'NOT SET');
console.log('SMEPAY_CLIENT_SECRET from env:', process.env.SMEPAY_CLIENT_SECRET ? `"${process.env.SMEPAY_CLIENT_SECRET}"` : 'NOT SET');
console.log('SMEPAY_MODE from env:', process.env.SMEPAY_MODE || 'NOT SET');

// Your exact credentials from the image
const dashboardCredentials = {
  clientId: 'OTUxMjcxNDgzNXxXRVdJZ0MXXRVdJTExGSUdVUkVJVE9VHwyMDI1LTA2LTEw',
  clientSecret: 'TEST_BDRY3FGJMQUBAJVTLBYk3'
};

console.log('\n📱 Dashboard Credentials:');
console.log('Client ID from dashboard:', `"${dashboardCredentials.clientId}"`);
console.log('Client Secret from dashboard:', `"${dashboardCredentials.clientSecret}"`);

// Compare credentials
console.log('\n🔍 Credential Comparison:');
const envClientId = process.env.SMEPAY_CLIENT_ID;
const envClientSecret = process.env.SMEPAY_CLIENT_SECRET;

if (envClientId === dashboardCredentials.clientId) {
  console.log('✅ Client ID matches dashboard');
} else {
  console.log('❌ Client ID does NOT match dashboard');
  console.log('Env length:', envClientId ? envClientId.length : 0);
  console.log('Dashboard length:', dashboardCredentials.clientId.length);
  console.log('Env value:', envClientId ? `"${envClientId}"` : 'null');
  console.log('Dashboard value:', `"${dashboardCredentials.clientId}"`);
}

if (envClientSecret === dashboardCredentials.clientSecret) {
  console.log('✅ Client Secret matches dashboard');
} else {
  console.log('❌ Client Secret does NOT match dashboard');
  console.log('Env length:', envClientSecret ? envClientSecret.length : 0);
  console.log('Dashboard length:', dashboardCredentials.clientSecret.length);
  console.log('Env value:', envClientSecret ? `"${envClientSecret}"` : 'null');
  console.log('Dashboard value:', `"${dashboardCredentials.clientSecret}"`);
}

// Test with dashboard credentials directly
async function testWithDashboardCredentials() {
  console.log('\n🧪 Testing with Dashboard Credentials Directly:');
  console.log('-----------------------------------------------');
  
  const authPayload = {
    client_id: dashboardCredentials.clientId,
    client_secret: dashboardCredentials.clientSecret
  };
  
  console.log('📤 Sending request with dashboard credentials...');
  console.log('URL:', 'https://apps.typof.in/api/external/auth');
  console.log('Payload:', JSON.stringify(authPayload, null, 2));
  
  try {
    const response = await axios({
      method: 'POST',
      url: 'https://apps.typof.in/api/external/auth',
      data: authPayload,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ZAMMER-Debug/1.0'
      },
      timeout: 15000,
      validateStatus: () => true
    });
    
    console.log('📬 Response Status:', response.status);
    console.log('📝 Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      console.log('✅ SUCCESS with dashboard credentials!');
      return true;
    } else {
      console.log('❌ FAILED with dashboard credentials');
      return false;
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    if (error.response) {
      console.log('Response Status:', error.response.status);
      console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// Test with different API endpoints
async function testDifferentEndpoints() {
  console.log('\n🌐 Testing Different API Endpoints:');
  console.log('-----------------------------------');
  
  const endpoints = [
    'https://apps.typof.in/api/external/auth',
    'https://apps.typof.com/api/external/auth', // Production endpoint
    'https://typof.in/api/external/auth',       // Alternative
    'https://api.typof.in/external/auth'        // Alternative
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n🎯 Testing: ${endpoint}`);
    
    try {
      const response = await axios({
        method: 'POST',
        url: endpoint,
        data: {
          client_id: dashboardCredentials.clientId,
          client_secret: dashboardCredentials.clientSecret
        },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000,
        validateStatus: () => true
      });
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Message: ${response.data?.message || 'No message'}`);
      
      if (response.status === 200) {
        console.log(`   ✅ SUCCESS! This endpoint works!`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

// Check if credentials are encoded
function checkCredentialEncoding() {
  console.log('\n🔤 Checking Credential Encoding:');
  console.log('--------------------------------');
  
  console.log('Client ID analysis:');
  console.log('  Raw length:', dashboardCredentials.clientId.length);
  console.log('  Contains |:', dashboardCredentials.clientId.includes('|'));
  console.log('  Base64-like:', /^[A-Za-z0-9+/=|]+$/.test(dashboardCredentials.clientId));
  
  // Try to decode if it looks like base64
  try {
    const decoded = Buffer.from(dashboardCredentials.clientId, 'base64').toString();
    console.log('  Possible decoded value:', decoded);
  } catch (e) {
    console.log('  Not standard base64');
  }
  
  console.log('\nClient Secret analysis:');
  console.log('  Raw length:', dashboardCredentials.clientSecret.length);
  console.log('  Starts with TEST_:', dashboardCredentials.clientSecret.startsWith('TEST_'));
  console.log('  Format seems correct for test credentials');
}

// Main debug function
async function runDebug() {
  checkCredentialEncoding();
  
  const dashboardSuccess = await testWithDashboardCredentials();
  
  if (!dashboardSuccess) {
    await testDifferentEndpoints();
  }
  
  console.log('\n📋 SUMMARY:');
  console.log('===========');
  
  if (dashboardSuccess) {
    console.log('✅ Dashboard credentials work!');
    console.log('✅ Issue is likely with .env file configuration');
    console.log('\n🔧 Next steps:');
    console.log('1. Double-check your .env file has the exact credentials');
    console.log('2. Make sure there are no extra spaces or quotes');
    console.log('3. Restart your application after updating .env');
  } else {
    console.log('❌ Dashboard credentials do not work');
    console.log('❌ This could mean:');
    console.log('   - Credentials are for a different environment');
    console.log('   - Account needs activation');
    console.log('   - API endpoint has changed');
    console.log('   - Credentials have expired');
    console.log('\n🔧 Next steps:');
    console.log('1. Contact SMEPay support');
    console.log('2. Verify account status in dashboard');
    console.log('3. Check if there are newer credentials available');
  }
}

runDebug().catch(console.error);