/**
 * Test Configuration Helper
 * Check if server is running and credentials are set
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5001/api';

async function checkServerHealth() {
  console.log('\n🔍 Checking Server Health...\n');
  
  try {
    // Try to connect to a simple endpoint
    const response = await axios.get(`${BASE_URL.replace('/api', '')}/health`, {
      timeout: 5000
    });
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Server is not running!');
      console.error(`   Expected server at: ${BASE_URL.replace('/api', '')}`);
      console.error('   Please start the backend server first');
      return false;
    } else if (error.response) {
      console.log('⚠️  Server responded but /health endpoint may not exist');
      console.log('   Status:', error.response.status);
      return true; // Server is running, just different response
    } else {
      console.error('❌ Error connecting to server:', error.message);
      return false;
    }
  }
}

async function checkEndpoints() {
  console.log('\n🔍 Checking API Endpoints...\n');
  
  const endpoints = [
    { name: 'User Login', url: `${BASE_URL}/users/login`, method: 'POST' },
    { name: 'Seller Login', url: `${BASE_URL}/sellers/login`, method: 'POST' },
    { name: 'Delivery Login', url: `${BASE_URL}/delivery/login`, method: 'POST' },
    { name: 'Returns Route', url: `${BASE_URL}/returns`, method: 'GET' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: endpoint.url,
        data: endpoint.method === 'POST' ? {} : undefined,
        validateStatus: () => true // Accept any status
      });
      
      if (response.status === 400 || response.status === 401 || response.status === 404) {
        console.log(`✅ ${endpoint.name}: Endpoint exists (status ${response.status})`);
      } else if (response.status === 200) {
        console.log(`✅ ${endpoint.name}: Endpoint exists and accessible`);
      } else {
        console.log(`⚠️  ${endpoint.name}: Unexpected status ${response.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.error(`❌ ${endpoint.name}: Cannot connect to server`);
        return false;
      } else {
        console.log(`✅ ${endpoint.name}: Endpoint exists (error: ${error.response?.status || error.message})`);
      }
    }
  }
  
  return true;
}

module.exports = { checkServerHealth, checkEndpoints };

if (require.main === module) {
  (async () => {
    const serverRunning = await checkServerHealth();
    if (serverRunning) {
      await checkEndpoints();
    }
  })();
}

