#!/usr/bin/env node

/**
 * ZAMMER Payment Tracking Visibility Debug Script
 * 
 * This script helps debug why Payment Tracking might not be visible in the seller dashboard.
 * Run this from the frontend directory: node debug-payment-tracking-visibility.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 ZAMMER Payment Tracking Visibility Debug');
console.log('=' .repeat(50));

// Check if PaymentTracking component exists
const paymentTrackingPath = path.join(process.cwd(), 'src', 'pages', 'seller', 'PaymentTracking.js');
const paymentTrackingExists = fs.existsSync(paymentTrackingPath);
console.log(`✅ PaymentTracking.js exists: ${paymentTrackingExists}`);

// Check App.js routing
try {
  const appJsPath = path.join(process.cwd(), 'src', 'App.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  
  const hasImport = appJsContent.includes('import PaymentTracking from \'./pages/seller/PaymentTracking\'');
  const hasRoute = appJsContent.includes('<Route path="/seller/payment-tracking" element={<PaymentTracking />} />');
  
  console.log(`✅ App.js import: ${hasImport}`);
  console.log(`✅ App.js route: ${hasRoute}`);
} catch (error) {
  console.log(`❌ Error reading App.js: ${error.message}`);
}

// Check SellerLayout navigation
try {
  const sellerLayoutPath = path.join(process.cwd(), 'src', 'components', 'layouts', 'SellerLayout.js');
  const sellerLayoutContent = fs.readFileSync(sellerLayoutPath, 'utf8');
  
  const hasNavigationItem = sellerLayoutContent.includes('/seller/payment-tracking');
  const hasPaymentTrackingLabel = sellerLayoutContent.includes('Payment Tracking');
  
  console.log(`✅ SellerLayout navigation item: ${hasNavigationItem}`);
  console.log(`✅ SellerLayout label: ${hasPaymentTrackingLabel}`);
  
  // Extract navigation items
  const navigationMatch = sellerLayoutContent.match(/const navigationItems = \[([\s\S]*?)\];/);
  if (navigationMatch) {
    const navigationContent = navigationMatch[1];
    const hasPaymentTrackingInArray = navigationContent.includes('/seller/payment-tracking');
    console.log(`✅ Payment Tracking in navigation array: ${hasPaymentTrackingInArray}`);
  }
} catch (error) {
  console.log(`❌ Error reading SellerLayout.js: ${error.message}`);
}

// Check if date-fns is installed
try {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const hasDateFns = !!packageJson.dependencies['date-fns'];
  console.log(`✅ date-fns dependency: ${hasDateFns}`);
} catch (error) {
  console.log(`❌ Error reading package.json: ${error.message}`);
}

console.log('\n🎯 TROUBLESHOOTING STEPS:');
console.log('1. Make sure you are logged in as a SELLER (not a regular user)');
console.log('2. Check that you are on the seller dashboard: /seller/dashboard');
console.log('3. Look for "Payment Tracking" in the LEFT SIDEBAR navigation menu');
console.log('4. If not visible, try refreshing the page (Ctrl+F5)');
console.log('5. Check browser console for any JavaScript errors');
console.log('6. Make sure the backend server is running');

console.log('\n📍 EXPECTED LOCATION:');
console.log('- Look in the LEFT SIDEBAR of the seller dashboard');
console.log('- Should be between "Orders" and "Add Product"');
console.log('- Icon: 💰 (dollar sign)');
console.log('- Label: "Payment Tracking"');

console.log('\n🔧 IF STILL NOT VISIBLE:');
console.log('1. Open browser Developer Tools (F12)');
console.log('2. Go to Console tab');
console.log('3. Look for any red error messages');
console.log('4. Try navigating directly to: http://localhost:3000/seller/payment-tracking');
console.log('5. Check if you get a 404 error or if the page loads');

console.log('\n✅ VERIFICATION COMMANDS:');
console.log('1. Start frontend: npm start');
console.log('2. Login as seller');
console.log('3. Check sidebar navigation');
console.log('4. Or go directly to: /seller/payment-tracking');
