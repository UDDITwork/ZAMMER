/**
 * Support Ticket Creation Test Script
 * Tests ticket creation for all 3 roles: Buyer, Seller, Delivery Agent
 *
 * Run with: node backend/tests/test-support-tickets.js
 *
 * Prerequisites:
 * - Backend server running on localhost:5001
 * - Test accounts created for each role
 */

const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5001/api';
const PRODUCTION_URL = 'https://zammernow.com/api';

// Test credentials - UPDATE THESE with actual test accounts
const TEST_CREDENTIALS = {
  buyer: {
    mobileNumber: '9999999991', // Update with real test buyer
    password: 'Test@123'
  },
  seller: {
    email: 'testseller@example.com', // Update with real test seller
    password: 'Test@123'
  },
  delivery: {
    mobileNumber: '9999999993', // Update with real delivery agent
    password: 'Test@123'
  }
};

// Hardcoded categories (same as backend)
const SUPPORT_CATEGORIES = {
  buyer: [
    { categoryCode: 'ORDER_NOT_DELIVERED', categoryName: 'Order not delivered', defaultPriority: 'high' },
    { categoryCode: 'DELIVERY_AGENT_BEHAVIOR', categoryName: 'Delivery Agent Behavior', defaultPriority: 'medium' },
    { categoryCode: 'WRONG_PRODUCT', categoryName: 'Wrong product Received', defaultPriority: 'high' },
    { categoryCode: 'DAMAGED_PRODUCT', categoryName: 'Damaged / defective product', defaultPriority: 'high' },
    { categoryCode: 'SIZE_FIT_ISSUE', categoryName: 'Size or fit issue', defaultPriority: 'medium' },
    { categoryCode: 'REFUND_EXCHANGE', categoryName: 'Need refund or exchange', defaultPriority: 'medium' },
    { categoryCode: 'RETURN_NOT_PICKED', categoryName: 'Return not Picked up', defaultPriority: 'medium' },
    { categoryCode: 'OTHER', categoryName: 'Other', defaultPriority: 'low' }
  ],
  seller: [
    { categoryCode: 'RETURN_ISSUES', categoryName: 'Return issues (wrong return, damage return)', defaultPriority: 'medium' },
    { categoryCode: 'PAYMENT_SETTLEMENT', categoryName: 'Payment | settlement issue', defaultPriority: 'high' },
    { categoryCode: 'LISTING_NOT_VISIBLE', categoryName: 'Listing not visible', defaultPriority: 'medium' },
    { categoryCode: 'ORDER_STUCK_SHIPPING', categoryName: 'Order stuck in shipping', defaultPriority: 'high' },
    { categoryCode: 'DELIVERY_NOT_PICKING', categoryName: 'Delivery Partner not picking order', defaultPriority: 'high' },
    { categoryCode: 'ACCOUNT_KYC', categoryName: 'Account or KYC issues', defaultPriority: 'high' },
    { categoryCode: 'LABEL_INVOICE', categoryName: 'Label | invoice not generating', defaultPriority: 'high' },
    { categoryCode: 'OTHER', categoryName: 'Other', defaultPriority: 'low' }
  ],
  delivery: [
    { categoryCode: 'PICKUP_ISSUE', categoryName: 'Issue Picking up Product from seller', defaultPriority: 'high' },
    { categoryCode: 'BUYER_UNAVAILABLE', categoryName: 'Buyer not Available / wrong Address', defaultPriority: 'medium' },
    { categoryCode: 'PAYMENT_DISPUTE', categoryName: 'Payment dispute (for COD orders)', defaultPriority: 'high' },
    { categoryCode: 'PARCEL_DAMAGED', categoryName: 'Parcel damaged before picked', defaultPriority: 'medium' },
    { categoryCode: 'PAYOUT_INCENTIVE', categoryName: 'Rider Payout & incentive not Received', defaultPriority: 'high' },
    { categoryCode: 'OTHER', categoryName: 'Other', defaultPriority: 'low' }
  ]
};

// Test Results Storage
const testResults = {
  timestamp: new Date().toISOString(),
  environment: '',
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  },
  matrix: {
    categories: { buyer: null, seller: null, delivery: null },
    authentication: { buyer: null, seller: null, delivery: null },
    ticketCreation: { buyer: null, seller: null, delivery: null },
    ticketRetrieval: { buyer: null, seller: null, delivery: null },
    frontendBackendSync: null,
    backendDatabaseSync: null
  }
};

// Helper Functions
function logTest(name, status, details = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${icon} ${name}: ${status} ${details ? `- ${details}` : ''}`);

  testResults.tests.push({ name, status, details, timestamp: new Date().toISOString() });
  testResults.summary.total++;

  if (status === 'PASS') testResults.summary.passed++;
  else if (status === 'FAIL') testResults.summary.failed++;
  else testResults.summary.skipped++;
}

function logSection(title) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(60)}\n`);
}

// Test Functions
async function testServerHealth(url) {
  try {
    const response = await axios.get(`${url.replace('/api', '')}/health`, { timeout: 5000 });
    return { success: true, status: response.status };
  } catch (error) {
    if (error.response) {
      return { success: true, status: error.response.status }; // Server is running
    }
    return { success: false, error: error.message };
  }
}

async function testGetCategories(url, userType) {
  try {
    const response = await axios.get(`${url}/support/categories/${userType}`, { timeout: 10000 });

    if (response.data.success && Array.isArray(response.data.data)) {
      const categories = response.data.data;
      const expected = SUPPORT_CATEGORIES[userType];

      // Verify categories match hardcoded ones
      const matchCount = categories.filter(cat =>
        expected.some(exp => exp.categoryCode === cat.categoryCode)
      ).length;

      return {
        success: true,
        count: categories.length,
        expected: expected.length,
        match: matchCount === expected.length,
        categories
      };
    }
    return { success: false, error: 'Invalid response format' };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || error.message };
  }
}

async function loginUser(url, userType, credentials) {
  const loginEndpoints = {
    buyer: '/users/login',
    seller: '/sellers/login',
    delivery: '/delivery/login'
  };

  try {
    const loginData = userType === 'seller'
      ? { email: credentials.email, password: credentials.password }
      : { mobileNumber: credentials.mobileNumber, password: credentials.password };

    const response = await axios.post(`${url}${loginEndpoints[userType]}`, loginData, { timeout: 10000 });

    if (response.data.success || response.data.token) {
      return {
        success: true,
        token: response.data.token,
        user: response.data.data || response.data.user || response.data.seller || response.data.deliveryAgent
      };
    }
    return { success: false, error: response.data.message || 'Login failed' };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || error.message };
  }
}

async function createTicket(url, token, userType, category, description) {
  try {
    const response = await axios.post(
      `${url}/support/tickets`,
      {
        userType,
        category,
        description,
        customReason: category === 'OTHER' ? 'Test custom reason' : ''
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
      }
    );

    if (response.data.success) {
      return {
        success: true,
        ticketId: response.data.data.ticketId,
        ticketNumber: response.data.data.ticketNumber,
        status: response.data.data.status
      };
    }
    return { success: false, error: response.data.message || 'Ticket creation failed' };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || error.message };
  }
}

async function getTickets(url, token) {
  try {
    const response = await axios.get(
      `${url}/support/tickets`,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      }
    );

    if (response.data.success) {
      return {
        success: true,
        tickets: response.data.data.tickets,
        count: response.data.data.tickets?.length || 0,
        pagination: response.data.data.pagination
      };
    }
    return { success: false, error: response.data.message };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || error.message };
  }
}

async function getTicketById(url, token, ticketId) {
  try {
    const response = await axios.get(
      `${url}/support/tickets/${ticketId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      }
    );

    if (response.data.success) {
      return {
        success: true,
        ticket: response.data.data.ticket,
        messages: response.data.data.messages
      };
    }
    return { success: false, error: response.data.message };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || error.message };
  }
}

// Main Test Runner
async function runTests(useProduction = false) {
  const url = useProduction ? PRODUCTION_URL : BASE_URL;
  testResults.environment = useProduction ? 'PRODUCTION' : 'LOCAL';

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       SUPPORT TICKET SYSTEM - COMPREHENSIVE TEST SUITE       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\nEnvironment: ${testResults.environment}`);
  console.log(`API URL: ${url}`);
  console.log(`Timestamp: ${testResults.timestamp}\n`);

  // ═══════════════════════════════════════════════════════════════════
  // TEST 1: Server Health Check
  // ═══════════════════════════════════════════════════════════════════
  logSection('1. SERVER HEALTH CHECK');

  const healthResult = await testServerHealth(url);
  if (healthResult.success) {
    logTest('Server Health', 'PASS', `Server is running`);
  } else {
    logTest('Server Health', 'FAIL', healthResult.error);
    console.log('\n❌ Server not running. Aborting tests.\n');
    return testResults;
  }

  // ═══════════════════════════════════════════════════════════════════
  // TEST 2: Categories API (Frontend-Backend Sync)
  // ═══════════════════════════════════════════════════════════════════
  logSection('2. CATEGORIES API TEST (Frontend-Backend Sync)');

  for (const userType of ['buyer', 'seller', 'delivery']) {
    const catResult = await testGetCategories(url, userType);

    if (catResult.success && catResult.match) {
      logTest(`GET /support/categories/${userType}`, 'PASS',
        `${catResult.count} categories match hardcoded (expected: ${catResult.expected})`);
      testResults.matrix.categories[userType] = 'PASS';
    } else if (catResult.success) {
      logTest(`GET /support/categories/${userType}`, 'FAIL',
        `Count mismatch: got ${catResult.count}, expected ${catResult.expected}`);
      testResults.matrix.categories[userType] = 'FAIL';
    } else {
      logTest(`GET /support/categories/${userType}`, 'FAIL', catResult.error);
      testResults.matrix.categories[userType] = 'FAIL';
    }
  }

  // Check frontend-backend sync
  const allCategoriesPass = Object.values(testResults.matrix.categories).every(v => v === 'PASS');
  testResults.matrix.frontendBackendSync = allCategoriesPass ? 'SYNCED' : 'OUT_OF_SYNC';
  console.log(`\n📊 Frontend-Backend Categories Sync: ${testResults.matrix.frontendBackendSync}`);

  // ═══════════════════════════════════════════════════════════════════
  // TEST 3: Authentication for All Roles
  // ═══════════════════════════════════════════════════════════════════
  logSection('3. AUTHENTICATION TEST (All Roles)');

  const tokens = { buyer: null, seller: null, delivery: null };

  for (const userType of ['buyer', 'seller', 'delivery']) {
    const creds = TEST_CREDENTIALS[userType];
    const loginResult = await loginUser(url, userType, creds);

    if (loginResult.success) {
      tokens[userType] = loginResult.token;
      logTest(`${userType.toUpperCase()} Login`, 'PASS', 'Token received');
      testResults.matrix.authentication[userType] = 'PASS';
    } else {
      logTest(`${userType.toUpperCase()} Login`, 'FAIL', loginResult.error);
      testResults.matrix.authentication[userType] = 'FAIL';
      console.log(`   ⚠️  Update TEST_CREDENTIALS.${userType} with valid credentials`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // TEST 4: Ticket Creation for All Roles
  // ═══════════════════════════════════════════════════════════════════
  logSection('4. TICKET CREATION TEST (All Roles)');

  const createdTickets = { buyer: null, seller: null, delivery: null };

  for (const userType of ['buyer', 'seller', 'delivery']) {
    if (!tokens[userType]) {
      logTest(`${userType.toUpperCase()} Ticket Creation`, 'SKIP', 'No auth token');
      testResults.matrix.ticketCreation[userType] = 'SKIP';
      continue;
    }

    // Use first category for each user type
    const category = SUPPORT_CATEGORIES[userType][0].categoryCode;
    const description = `Test ticket from ${userType} - ${new Date().toISOString()}`;

    const createResult = await createTicket(url, tokens[userType], userType, category, description);

    if (createResult.success) {
      createdTickets[userType] = createResult;
      logTest(`${userType.toUpperCase()} Ticket Creation`, 'PASS',
        `Ticket: ${createResult.ticketNumber} (Status: ${createResult.status})`);
      testResults.matrix.ticketCreation[userType] = 'PASS';
    } else {
      logTest(`${userType.toUpperCase()} Ticket Creation`, 'FAIL', createResult.error);
      testResults.matrix.ticketCreation[userType] = 'FAIL';
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // TEST 5: Ticket Retrieval (Backend-Database Sync)
  // ═══════════════════════════════════════════════════════════════════
  logSection('5. TICKET RETRIEVAL TEST (Backend-Database Sync)');

  for (const userType of ['buyer', 'seller', 'delivery']) {
    if (!tokens[userType]) {
      logTest(`${userType.toUpperCase()} Ticket Retrieval`, 'SKIP', 'No auth token');
      testResults.matrix.ticketRetrieval[userType] = 'SKIP';
      continue;
    }

    const listResult = await getTickets(url, tokens[userType]);

    if (listResult.success) {
      logTest(`${userType.toUpperCase()} GET /support/tickets`, 'PASS',
        `Found ${listResult.count} tickets`);

      // If we created a ticket, verify it exists in the list
      if (createdTickets[userType]) {
        const ticketExists = listResult.tickets.some(
          t => t.ticketNumber === createdTickets[userType].ticketNumber
        );

        if (ticketExists) {
          logTest(`${userType.toUpperCase()} Ticket in DB`, 'PASS',
            `Created ticket ${createdTickets[userType].ticketNumber} found in database`);
          testResults.matrix.ticketRetrieval[userType] = 'PASS';
        } else {
          logTest(`${userType.toUpperCase()} Ticket in DB`, 'FAIL',
            `Created ticket not found in list`);
          testResults.matrix.ticketRetrieval[userType] = 'FAIL';
        }
      } else {
        testResults.matrix.ticketRetrieval[userType] = 'PASS';
      }
    } else {
      logTest(`${userType.toUpperCase()} Ticket Retrieval`, 'FAIL', listResult.error);
      testResults.matrix.ticketRetrieval[userType] = 'FAIL';
    }
  }

  // Backend-Database Sync Status
  const ticketCreationsPass = Object.values(testResults.matrix.ticketCreation)
    .filter(v => v !== 'SKIP').every(v => v === 'PASS');
  const ticketRetrievalsPass = Object.values(testResults.matrix.ticketRetrieval)
    .filter(v => v !== 'SKIP').every(v => v === 'PASS');
  testResults.matrix.backendDatabaseSync = (ticketCreationsPass && ticketRetrievalsPass)
    ? 'SYNCED' : 'ISSUES_FOUND';

  // ═══════════════════════════════════════════════════════════════════
  // TEST 6: Single Ticket Detail Retrieval
  // ═══════════════════════════════════════════════════════════════════
  logSection('6. SINGLE TICKET DETAIL TEST');

  for (const userType of ['buyer', 'seller', 'delivery']) {
    if (!tokens[userType] || !createdTickets[userType]) {
      logTest(`${userType.toUpperCase()} Ticket Detail`, 'SKIP', 'No ticket to retrieve');
      continue;
    }

    const detailResult = await getTicketById(
      url,
      tokens[userType],
      createdTickets[userType].ticketId
    );

    if (detailResult.success) {
      logTest(`${userType.toUpperCase()} GET /support/tickets/:id`, 'PASS',
        `Category: ${detailResult.ticket.category}, Priority: ${detailResult.ticket.priority}`);
    } else {
      logTest(`${userType.toUpperCase()} Ticket Detail`, 'FAIL', detailResult.error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // TEST 7: Invalid Category Test
  // ═══════════════════════════════════════════════════════════════════
  logSection('7. VALIDATION TESTS');

  // Test invalid category
  if (tokens.buyer) {
    const invalidCatResult = await createTicket(
      url, tokens.buyer, 'buyer', 'INVALID_CATEGORY', 'Test invalid category'
    );

    if (!invalidCatResult.success && invalidCatResult.error.includes('Invalid')) {
      logTest('Invalid Category Rejection', 'PASS', 'Server correctly rejected invalid category');
    } else if (invalidCatResult.success) {
      logTest('Invalid Category Rejection', 'FAIL', 'Server accepted invalid category');
    } else {
      logTest('Invalid Category Rejection', 'PASS', invalidCatResult.error);
    }
  }

  // Test userType mismatch (buyer token with seller userType)
  if (tokens.buyer) {
    const mismatchResult = await createTicket(
      url, tokens.buyer, 'seller', 'RETURN_ISSUES', 'Test userType mismatch'
    );

    if (!mismatchResult.success) {
      logTest('UserType Mismatch Rejection', 'PASS', 'Server correctly rejected mismatched userType');
    } else {
      logTest('UserType Mismatch Rejection', 'FAIL', 'Server accepted mismatched userType');
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════════════════════════════
  logSection('FINAL TEST RESULTS SUMMARY');

  console.log('\n📋 TEST MATRIX:\n');
  console.log('┌─────────────────────┬─────────┬─────────┬──────────┐');
  console.log('│ Test Component      │ Buyer   │ Seller  │ Delivery │');
  console.log('├─────────────────────┼─────────┼─────────┼──────────┤');
  console.log(`│ Categories API      │ ${padStatus(testResults.matrix.categories.buyer)} │ ${padStatus(testResults.matrix.categories.seller)} │ ${padStatus(testResults.matrix.categories.delivery)} │`);
  console.log(`│ Authentication      │ ${padStatus(testResults.matrix.authentication.buyer)} │ ${padStatus(testResults.matrix.authentication.seller)} │ ${padStatus(testResults.matrix.authentication.delivery)} │`);
  console.log(`│ Ticket Creation     │ ${padStatus(testResults.matrix.ticketCreation.buyer)} │ ${padStatus(testResults.matrix.ticketCreation.seller)} │ ${padStatus(testResults.matrix.ticketCreation.delivery)} │`);
  console.log(`│ Ticket Retrieval    │ ${padStatus(testResults.matrix.ticketRetrieval.buyer)} │ ${padStatus(testResults.matrix.ticketRetrieval.seller)} │ ${padStatus(testResults.matrix.ticketRetrieval.delivery)} │`);
  console.log('└─────────────────────┴─────────┴─────────┴──────────┘');

  console.log('\n📊 SYNC STATUS:');
  console.log(`   Frontend ↔ Backend: ${testResults.matrix.frontendBackendSync}`);
  console.log(`   Backend ↔ Database: ${testResults.matrix.backendDatabaseSync}`);

  console.log('\n📈 OVERALL RESULTS:');
  console.log(`   Total Tests: ${testResults.summary.total}`);
  console.log(`   ✅ Passed: ${testResults.summary.passed}`);
  console.log(`   ❌ Failed: ${testResults.summary.failed}`);
  console.log(`   ⏭️  Skipped: ${testResults.summary.skipped}`);

  const passRate = ((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1);
  console.log(`   Pass Rate: ${passRate}%`);

  if (testResults.summary.failed > 0) {
    console.log('\n⚠️  FAILED TESTS:');
    testResults.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => console.log(`   - ${t.name}: ${t.details}`));
  }

  console.log('\n' + '═'.repeat(60) + '\n');

  return testResults;
}

function padStatus(status) {
  const str = status || 'N/A';
  return str.padEnd(7);
}

// CLI Entry Point
const args = process.argv.slice(2);
const useProduction = args.includes('--production') || args.includes('-p');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Support Ticket Test Script

Usage: node test-support-tickets.js [options]

Options:
  --production, -p    Test against production API (https://zammernow.com/api)
  --help, -h          Show this help message

Before running:
  1. Update TEST_CREDENTIALS in this file with valid test accounts
  2. Ensure the backend server is running (local or production)

Examples:
  node test-support-tickets.js           # Test local server
  node test-support-tickets.js -p        # Test production server
  `);
  process.exit(0);
}

// Run tests
runTests(useProduction).then(results => {
  // Exit with appropriate code
  process.exit(results.summary.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});
