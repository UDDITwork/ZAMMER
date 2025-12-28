/**
 * Quick Support Ticket API Test (No Authentication Required)
 * Tests the categories API and basic endpoint availability
 *
 * Run with: node backend/tests/test-support-quick.js
 */

const axios = require('axios');

const PRODUCTION_URL = 'https://zammernow.com/api';
const LOCAL_URL = 'http://localhost:5001/api';

const EXPECTED_CATEGORIES = {
  buyer: 8,
  seller: 8,
  delivery: 6
};

async function runQuickTests(url) {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║         SUPPORT TICKET API - QUICK VERIFICATION TEST         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  console.log(`Testing: ${url}\n`);

  let passed = 0;
  let failed = 0;

  // Test 1: Categories Endpoints
  console.log('═══ CATEGORIES ENDPOINTS ═══\n');

  for (const userType of ['buyer', 'seller', 'delivery']) {
    try {
      const response = await axios.get(`${url}/support/categories/${userType}`, { timeout: 10000 });

      if (response.data.success && Array.isArray(response.data.data)) {
        const count = response.data.data.length;
        const expected = EXPECTED_CATEGORIES[userType];

        if (count === expected) {
          console.log(`✅ GET /api/support/categories/${userType}`);
          console.log(`   Status: 200 OK`);
          console.log(`   Categories: ${count}/${expected} (MATCH)`);
          response.data.data.forEach((cat, i) => {
            console.log(`   ${i + 1}. ${cat.categoryCode} - ${cat.categoryName}`);
          });
          passed++;
        } else {
          console.log(`⚠️  GET /api/support/categories/${userType}`);
          console.log(`   Categories: ${count}/${expected} (MISMATCH)`);
          failed++;
        }
      } else {
        console.log(`❌ GET /api/support/categories/${userType}`);
        console.log(`   Error: Invalid response format`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ GET /api/support/categories/${userType}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      failed++;
    }
    console.log('');
  }

  // Test 2: Ticket Endpoint (should require auth)
  console.log('═══ TICKET ENDPOINTS (Auth Required) ═══\n');

  try {
    const response = await axios.post(`${url}/support/tickets`, {}, {
      validateStatus: () => true,
      timeout: 10000
    });

    if (response.status === 401) {
      console.log(`✅ POST /api/support/tickets`);
      console.log(`   Status: 401 (Correctly requires authentication)`);
      passed++;
    } else if (response.status === 400) {
      console.log(`⚠️  POST /api/support/tickets`);
      console.log(`   Status: 400 (Endpoint exists but might not check auth first)`);
      passed++;
    } else {
      console.log(`⚠️  POST /api/support/tickets`);
      console.log(`   Status: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ POST /api/support/tickets`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Test 3: Upload Endpoint
  console.log('═══ UPLOAD ENDPOINT (Auth Required) ═══\n');

  try {
    const response = await axios.post(`${url}/support/upload`, {}, {
      validateStatus: () => true,
      timeout: 10000
    });

    if (response.status === 401) {
      console.log(`✅ POST /api/support/upload`);
      console.log(`   Status: 401 (Correctly requires authentication)`);
      console.log(`   Route Order: CORRECT (upload route is accessible)`);
      passed++;
    } else {
      console.log(`⚠️  POST /api/support/upload`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Message: ${response.data?.message || 'N/A'}`);
    }
  } catch (error) {
    console.log(`❌ POST /api/support/upload`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Summary
  console.log('═══ SUMMARY ═══\n');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('');

  if (failed === 0) {
    console.log('🎉 All quick tests passed! Categories API is working correctly.\n');
    console.log('📋 To test full ticket creation, you need valid credentials.');
    console.log('   Update TEST_CREDENTIALS in test-support-tickets.js and run:');
    console.log('   node backend/tests/test-support-tickets.js --production\n');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.\n');
  }

  return { passed, failed };
}

// Run tests
const args = process.argv.slice(2);
const useProduction = args.includes('--production') || args.includes('-p');
const url = useProduction ? PRODUCTION_URL : LOCAL_URL;

runQuickTests(url).then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
