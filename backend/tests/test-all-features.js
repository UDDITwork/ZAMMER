/**
 * Master Test Script: Run All Feature Tests
 * Tests all implemented features in sequence
 */

const testReturnRequestAuth = require('./test-return-request-auth');
const testSellerReturnOrders = require('./test-seller-return-orders');
const testDeliveryForgotPassword = require('./test-delivery-forgot-password');
const testDeliveryEarnings = require('./test-delivery-earnings');
const { checkServerHealth, checkEndpoints } = require('./test-config');

async function runAllTests() {
  console.log('\n🚀 ============================================');
  console.log('   COMPREHENSIVE TEST SUITE');
  console.log('   Testing All Implemented Features');
  console.log('============================================\n');

  // Pre-flight checks
  console.log('🔍 Running pre-flight checks...\n');
  const serverRunning = await checkServerHealth();
  if (!serverRunning) {
    console.error('\n❌ Server is not running. Please start the backend server first.\n');
    process.exit(1);
  }
  
  await checkEndpoints();
  console.log('\n');

  const results = {
    passed: [],
    failed: [],
    skipped: []
  };

  // Test 1: Return Request Authentication
  try {
    console.log('\n▶️  Starting Test 1: Return Request Authentication\n');
    await testReturnRequestAuth();
    results.passed.push('Test 1: Return Request Authentication');
  } catch (error) {
    console.error('\n❌ Test 1 failed with error:', error.message);
    results.failed.push('Test 1: Return Request Authentication');
  }

  // Test 2: Seller Return Orders
  try {
    console.log('\n▶️  Starting Test 2: Seller Return Orders Endpoint\n');
    await testSellerReturnOrders();
    results.passed.push('Test 2: Seller Return Orders Endpoint');
  } catch (error) {
    console.error('\n❌ Test 2 failed with error:', error.message);
    results.failed.push('Test 2: Seller Return Orders Endpoint');
  }

  // Test 3: Delivery Forgot Password
  try {
    console.log('\n▶️  Starting Test 3: Delivery Agent Forgot Password\n');
    await testDeliveryForgotPassword();
    // Note: This test may exit early if OTP is needed, so we consider it passed if no error thrown
    results.passed.push('Test 3: Delivery Agent Forgot Password (partial - OTP may require manual entry)');
  } catch (error) {
    console.error('\n❌ Test 3 failed with error:', error.message);
    results.failed.push('Test 3: Delivery Agent Forgot Password');
  }

  // Test 4: Delivery Earnings
  try {
    console.log('\n▶️  Starting Test 4: Delivery Agent Earnings\n');
    await testDeliveryEarnings();
    results.passed.push('Test 4: Delivery Agent Earnings Endpoint');
  } catch (error) {
    console.error('\n❌ Test 4 failed with error:', error.message);
    results.failed.push('Test 4: Delivery Agent Earnings Endpoint');
  }

  // Summary
  console.log('\n\n📊 ============================================');
  console.log('   TEST SUMMARY');
  console.log('============================================\n');

  console.log(`✅ Passed: ${results.passed.length}`);
  results.passed.forEach(test => console.log(`   - ${test}`));

  console.log(`\n❌ Failed: ${results.failed.length}`);
  results.failed.forEach(test => console.log(`   - ${test}`));

  if (results.skipped.length > 0) {
    console.log(`\n⚠️  Skipped/Partial: ${results.skipped.length}`);
    results.skipped.forEach(test => console.log(`   - ${test}`));
  }

  console.log('\n============================================\n');

  if (results.failed.length === 0) {
    console.log('🎉 All automated tests passed!');
    console.log('⚠️  Note: Manual OTP testing may be required for forgot password flow\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the output above.\n');
    process.exit(1);
  }
}

// Run all tests
if (require.main === module) {
  runAllTests()
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = runAllTests;

