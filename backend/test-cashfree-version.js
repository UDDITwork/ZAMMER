// backend/test-cashfree-version.js - Test different API versions
require('dotenv').config();
const axios = require('axios');

async function testCashfreeVersions() {
  console.log('🧪 Testing Cashfree API Versions\n');

  const config = {
    baseUrl: 'https://api.cashfree.com/payout',
    clientId: process.env.CASHFREE_PAYOUT_CLIENT_ID_PROD,
    secretKey: process.env.CASHFREE_PAYOUT_SECRET_KEY_PROD
  };

  const versions = ['2024-01-01', '2023-08-01', '2022-09-01'];

  for (const version of versions) {
    console.log(`\n🔍 Testing API Version: ${version}`);
    
    const headers = {
      'Content-Type': 'application/json',
      'x-api-version': version,
      'x-client-id': config.clientId,
      'x-client-secret': config.secretKey
    };

    try {
      // Test with a simple beneficiary request
      const response = await axios.get(`${config.baseUrl}/beneficiary`, {
        headers: headers,
        timeout: 10000
      });
      console.log(`✅ Version ${version} - Success:`, response.status);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`❌ Version ${version} - Authentication Failed`);
      } else if (error.response?.status === 400) {
        console.log(`✅ Version ${version} - API Working (400 expected without params)`);
      } else {
        console.log(`⚠️ Version ${version} - Error:`, error.response?.status, error.response?.data?.message);
      }
    }
  }

  // Test with different base URLs
  console.log('\n🔍 Testing Different Base URLs');
  const baseUrls = [
    'https://api.cashfree.com/payout',
    'https://api.cashfree.com/payouts',
    'https://payouts.cashfree.com'
  ];

  for (const baseUrl of baseUrls) {
    console.log(`\n🔍 Testing Base URL: ${baseUrl}`);
    
    const headers = {
      'Content-Type': 'application/json',
      'x-api-version': '2024-01-01',
      'x-client-id': config.clientId,
      'x-client-secret': config.secretKey
    };

    try {
      const response = await axios.get(`${baseUrl}/beneficiary`, {
        headers: headers,
        timeout: 10000
      });
      console.log(`✅ Base URL ${baseUrl} - Success:`, response.status);
    } catch (error) {
      console.log(`⚠️ Base URL ${baseUrl} - Error:`, error.response?.status, error.response?.data?.message);
    }
  }
}

testCashfreeVersions();
