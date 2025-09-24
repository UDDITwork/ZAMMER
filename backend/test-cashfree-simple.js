// backend/test-cashfree-simple.js - Simple Cashfree API test
require('dotenv').config();
const axios = require('axios');

async function testCashfreeSimple() {
  console.log('🧪 Simple Cashfree API Test\n');

  const config = {
    baseUrl: 'https://api.cashfree.com/payout',
    clientId: process.env.CASHFREE_PAYOUT_CLIENT_ID_PROD,
    secretKey: process.env.CASHFREE_PAYOUT_SECRET_KEY_PROD,
    apiVersion: '2024-01-01'
  };

  console.log('📋 Using Configuration:', {
    baseUrl: config.baseUrl,
    clientId: config.clientId ? 'Present' : 'Missing',
    secretKey: config.secretKey ? 'Present' : 'Missing',
    apiVersion: config.apiVersion
  });

  // Test with minimal headers
  const headers = {
    'Content-Type': 'application/json',
    'x-api-version': config.apiVersion,
    'x-client-id': config.clientId,
    'x-client-secret': config.secretKey
  };

  try {
    // Test 1: Try to get balance (if available)
    console.log('\n🔍 Test 1: Balance Check');
    try {
      const balanceResponse = await axios.get(`${config.baseUrl}/balance`, {
        headers: headers,
        timeout: 10000
      });
      console.log('✅ Balance Response:', balanceResponse.data);
    } catch (error) {
      console.log('⚠️ Balance Check:', error.response?.status, error.response?.data?.message || error.message);
    }

    // Test 2: Try to get beneficiaries list
    console.log('\n🔍 Test 2: List Beneficiaries');
    try {
      const beneficiariesResponse = await axios.get(`${config.baseUrl}/beneficiary`, {
        headers: headers,
        timeout: 10000
      });
      console.log('✅ Beneficiaries Response:', beneficiariesResponse.data);
    } catch (error) {
      console.log('⚠️ Beneficiaries List:', error.response?.status, error.response?.data?.message || error.message);
    }

    // Test 3: Check if API keys are valid by trying a simple request
    console.log('\n🔍 Test 3: API Key Validation');
    try {
      // Try to create a beneficiary with minimal data to test authentication
      const testData = {
        beneficiary_id: 'TEST_' + Date.now(),
        beneficiary_name: 'Test User',
        beneficiary_instrument_details: {
          bank_account_number: '1234567890',
          bank_ifsc: 'HDFC0000001'
        },
        beneficiary_contact_details: {
          beneficiary_email: 'test@example.com',
          beneficiary_phone: '9876543210',
          beneficiary_country_code: '+91',
          beneficiary_address: 'Test Address',
          beneficiary_city: 'Mumbai',
          beneficiary_state: 'Maharashtra',
          beneficiary_postal_code: '400001'
        }
      };

      const createResponse = await axios.post(`${config.baseUrl}/beneficiary`, testData, {
        headers: headers,
        timeout: 10000
      });
      console.log('✅ Create Beneficiary Success:', createResponse.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('❌ Authentication Failed - Invalid API Keys');
        console.log('📝 Error:', error.response.data);
      } else if (error.response?.status === 400) {
        console.log('✅ API Keys Valid - Request format error (expected)');
        console.log('📝 Error:', error.response.data);
      } else {
        console.log('⚠️ Other Error:', error.response?.status, error.response?.data || error.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCashfreeSimple();
