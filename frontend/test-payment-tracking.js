#!/usr/bin/env node

/**
 * ZAMMER Payment Tracking Component Test
 * 
 * This script tests if the PaymentTracking component can be imported and rendered.
 * Run this from the frontend directory: node test-payment-tracking.js
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Helper function to run tests
function runTest(testName, testFunction) {
  testResults.total++;
  console.log(`\n🧪 Testing: ${testName}`);
  
  try {
    const result = testFunction();
    if (result.success) {
      testResults.passed++;
      console.log(`✅ ${testName}: PASSED`);
      if (result.details) {
        console.log(`   ${result.details}`);
      }
    } else {
      testResults.failed++;
      console.log(`❌ ${testName}: FAILED`);
      console.log(`   Error: ${result.error}`);
    }
    
    testResults.details.push({
      name: testName,
      success: result.success,
      error: result.error || null,
      details: result.details || null
    });
  } catch (error) {
    testResults.failed++;
    console.log(`❌ ${testName}: ERROR`);
    console.log(`   ${error.message}`);
    
    testResults.details.push({
      name: testName,
      success: false,
      error: error.message,
      details: null
    });
  }
}

// Individual test functions
function testPaymentTrackingFileExists() {
  const filePath = path.join(process.cwd(), 'src', 'pages', 'seller', 'PaymentTracking.js');
  const exists = fs.existsSync(filePath);
  
  return {
    success: exists,
    details: exists ? 'PaymentTracking.js file found' : 'PaymentTracking.js file not found',
    error: exists ? null : 'PaymentTracking.js file is missing'
  };
}

function testDateFnsDependency() {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const hasDateFns = !!dependencies['date-fns'];
    
    return {
      success: hasDateFns,
      details: hasDateFns ? 'date-fns dependency found in package.json' : 'date-fns dependency missing',
      error: hasDateFns ? null : 'date-fns package not installed'
    };
  } catch (error) {
    return {
      success: false,
      error: `Error checking package.json: ${error.message}`
    };
  }
}

function testDateFnsNodeModules() {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules', 'date-fns');
  const exists = fs.existsSync(nodeModulesPath);
  
  return {
    success: exists,
    details: exists ? 'date-fns installed in node_modules' : 'date-fns not installed in node_modules',
    error: exists ? null : 'Run: npm install date-fns'
  };
}

function testPaymentTrackingImports() {
  try {
    const filePath = path.join(process.cwd(), 'src', 'pages', 'seller', 'PaymentTracking.js');
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for required imports
    const requiredImports = [
      'import React',
      'import { AuthContext }',
      'import SellerLayout',
      'getPaymentTracking',
      'getEarningsSummary',
      'import { toast }',
      'import { format } from \'date-fns\''
    ];
    
    const missingImports = requiredImports.filter(importStatement => 
      !content.includes(importStatement)
    );
    
    return {
      success: missingImports.length === 0,
      details: missingImports.length === 0 ? 'All required imports present' : `Missing imports: ${missingImports.join(', ')}`,
      error: missingImports.length > 0 ? `Missing required imports: ${missingImports.join(', ')}` : null
    };
  } catch (error) {
    return {
      success: false,
      error: `Error reading PaymentTracking.js: ${error.message}`
    };
  }
}

function testPaymentTrackingComponent() {
  try {
    const filePath = path.join(process.cwd(), 'src', 'pages', 'seller', 'PaymentTracking.js');
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for component structure
    const requiredElements = [
      'const PaymentTracking = () => {',
      'return (',
      '<SellerLayout>',
      'export default PaymentTracking'
    ];
    
    const missingElements = requiredElements.filter(element => 
      !content.includes(element)
    );
    
    return {
      success: missingElements.length === 0,
      details: missingElements.length === 0 ? 'Component structure is correct' : `Missing elements: ${missingElements.join(', ')}`,
      error: missingElements.length > 0 ? `Missing component elements: ${missingElements.join(', ')}` : null
    };
  } catch (error) {
    return {
      success: false,
      error: `Error checking component structure: ${error.message}`
    };
  }
}

function testAppJsImport() {
  try {
    const filePath = path.join(process.cwd(), 'src', 'App.js');
    const content = fs.readFileSync(filePath, 'utf8');
    
    const hasImport = content.includes('import PaymentTracking from \'./pages/seller/PaymentTracking\'');
    const hasRoute = content.includes('<Route path="/seller/payment-tracking" element={<PaymentTracking />} />');
    
    return {
      success: hasImport && hasRoute,
      details: hasImport && hasRoute ? 'PaymentTracking imported and routed in App.js' : `Import: ${hasImport}, Route: ${hasRoute}`,
      error: !hasImport ? 'PaymentTracking not imported in App.js' : !hasRoute ? 'PaymentTracking route not found in App.js' : null
    };
  } catch (error) {
    return {
      success: false,
      error: `Error checking App.js: ${error.message}`
    };
  }
}

function testSellerLayoutNavigation() {
  try {
    const filePath = path.join(process.cwd(), 'src', 'components', 'layouts', 'SellerLayout.js');
    const content = fs.readFileSync(filePath, 'utf8');
    
    const hasNavigation = content.includes('/seller/payment-tracking') && content.includes('Payment Tracking');
    
    return {
      success: hasNavigation,
      details: hasNavigation ? 'Payment Tracking navigation found in SellerLayout' : 'Payment Tracking navigation missing',
      error: hasNavigation ? null : 'Payment Tracking not found in navigation menu'
    };
  } catch (error) {
    return {
      success: false,
      error: `Error checking SellerLayout.js: ${error.message}`
    };
  }
}

function testSellerServiceFunctions() {
  try {
    const filePath = path.join(process.cwd(), 'src', 'services', 'sellerService.js');
    const content = fs.readFileSync(filePath, 'utf8');
    
    const hasGetPaymentTracking = content.includes('getPaymentTracking');
    const hasGetEarningsSummary = content.includes('getEarningsSummary');
    
    return {
      success: hasGetPaymentTracking && hasGetEarningsSummary,
      details: hasGetPaymentTracking && hasGetEarningsSummary ? 'Required service functions found' : `getPaymentTracking: ${hasGetPaymentTracking}, getEarningsSummary: ${hasGetEarningsSummary}`,
      error: !hasGetPaymentTracking ? 'getPaymentTracking function missing' : !hasGetEarningsSummary ? 'getEarningsSummary function missing' : null
    };
  } catch (error) {
    return {
      success: false,
      error: `Error checking sellerService.js: ${error.message}`
    };
  }
}

// Main test runner
function runAllTests() {
  console.log('🚀 Starting ZAMMER Payment Tracking Component Test');
  console.log(`📍 Testing in: ${process.cwd()}`);
  console.log('=' .repeat(60));

  // File and dependency tests
  runTest('PaymentTracking File Exists', testPaymentTrackingFileExists);
  runTest('date-fns Dependency in package.json', testDateFnsDependency);
  runTest('date-fns Installed in node_modules', testDateFnsNodeModules);

  // Component structure tests
  runTest('PaymentTracking Imports', testPaymentTrackingImports);
  runTest('PaymentTracking Component Structure', testPaymentTrackingComponent);

  // Integration tests
  runTest('App.js Import and Route', testAppJsImport);
  runTest('SellerLayout Navigation', testSellerLayoutNavigation);
  runTest('Seller Service Functions', testSellerServiceFunctions);

  // Print summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total: ${testResults.total}`);
  console.log(`🎯 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  // Detailed results
  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.details
      .filter(test => !test.success)
      .forEach(test => {
        console.log(`   • ${test.name}: ${test.error}`);
      });
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (testResults.failed === 0) {
    console.log('   🎉 All tests passed! Payment Tracking should be working.');
  } else if (testResults.passed > testResults.failed) {
    console.log('   ⚠️  Most tests passed. Check failed tests above.');
  } else {
    console.log('   🚨 Multiple failures detected. Payment Tracking may not work.');
  }

  console.log('\n📝 NEXT STEPS:');
  console.log('   1. Fix any failed tests above');
  console.log('   2. Start the frontend: npm start');
  console.log('   3. Login as a seller');
  console.log('   4. Check the sidebar navigation for "Payment Tracking"');
  console.log('   5. Click on "Payment Tracking" to access the page');

  console.log('\n🔧 TROUBLESHOOTING:');
  console.log('   • If Payment Tracking is not visible in navigation, check SellerLayout.js');
  console.log('   • If page shows errors, check browser console for details');
  console.log('   • If date-fns errors occur, run: npm install date-fns');
  console.log('   • If API errors occur, check backend server is running');

  return testResults;
}

// Run tests if this file is executed directly
if (require.main === module) {
  try {
    runAllTests();
    process.exit(testResults.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  }
}

module.exports = { runAllTests, testResults };
