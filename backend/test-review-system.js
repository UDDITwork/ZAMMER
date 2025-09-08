// backend/test-review-system.js
// 🎯 COMPREHENSIVE REVIEW SYSTEM TEST SCRIPT
// Tests all review functionality with authentication

const axios = require('axios');
const mongoose = require('mongoose');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const TEST_USER = {
  email: 'udditkantsinha2@gmail.com',
  password: 'jpmcA123'
};

// Test data
let authToken = '';
let userId = '';
let productId = '';
let orderId = '';
let reviewId = '';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logSuccess = (message) => log(`✅ ${message}`, 'green');
const logError = (message) => log(`❌ ${message}`, 'red');
const logInfo = (message) => log(`ℹ️  ${message}`, 'blue');
const logWarning = (message) => log(`⚠️  ${message}`, 'yellow');
const logTest = (message) => log(`🧪 ${message}`, 'cyan');

// Helper function to make authenticated requests
const makeRequest = async (method, url, data = null, headers = {}) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
};

// Test 1: User Authentication
const testAuthentication = async () => {
  logTest('TEST 1: User Authentication');
  
  try {
    const response = await axios.post(`${BASE_URL}/users/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    if (response.data.success) {
      authToken = response.data.token;
      userId = response.data.user._id;
      logSuccess(`Authentication successful for user: ${response.data.user.name}`);
      logInfo(`User ID: ${userId}`);
      logInfo(`Token: ${authToken.substring(0, 20)}...`);
      return true;
    } else {
      logError('Authentication failed: Invalid credentials');
      return false;
    }
  } catch (error) {
    logError(`Authentication error: ${error.response?.data?.message || error.message}`);
    return false;
  }
};

// Test 2: Get User's Orders (to find a product they purchased)
const testGetUserOrders = async () => {
  logTest('TEST 2: Get User Orders to Find Purchased Products');
  
  const response = await makeRequest('GET', '/orders/my-orders?limit=10');
  
  if (response.success && response.data.success) {
    const orders = response.data.data.orders;
    logInfo(`Found ${orders.length} orders`);
    
    // Find an order with paid status
    const paidOrder = orders.find(order => 
      order.isPaid && 
      ['completed', 'processing'].includes(order.paymentStatus) &&
      order.status !== 'Cancelled'
    );
    
    if (paidOrder) {
      orderId = paidOrder._id;
      productId = paidOrder.orderItems[0].product;
      logSuccess(`Found paid order: ${paidOrder.orderNumber}`);
      logInfo(`Order ID: ${orderId}`);
      logInfo(`Product ID: ${productId}`);
      logInfo(`Payment Status: ${paidOrder.paymentStatus}`);
      logInfo(`Order Status: ${paidOrder.status}`);
      return true;
    } else {
      logWarning('No paid orders found. User needs to purchase a product first.');
      return false;
    }
  } else {
    logError(`Failed to get orders: ${response.error?.message || 'Unknown error'}`);
    return false;
  }
};

// Test 3: Check Review Eligibility
const testCheckReviewEligibility = async () => {
  logTest('TEST 3: Check Review Eligibility');
  
  if (!productId) {
    logError('No product ID available for testing');
    return false;
  }
  
  const response = await makeRequest('GET', `/reviews/check/${productId}`);
  
  if (response.success && response.data.success) {
    const eligibility = response.data.data;
    logInfo(`Can Review: ${eligibility.canReview}`);
    logInfo(`Has Purchased: ${eligibility.hasPurchased}`);
    logInfo(`Has Reviewed: ${eligibility.hasReviewed}`);
    logInfo(`Reason: ${eligibility.reason}`);
    
    if (eligibility.canReview) {
      logSuccess('User is eligible to review this product');
      return true;
    } else {
      logWarning(`User cannot review: ${eligibility.reason}`);
      return false;
    }
  } else {
    logError(`Failed to check eligibility: ${response.error?.message || 'Unknown error'}`);
    return false;
  }
};

// Test 4: Create a Review
const testCreateReview = async () => {
  logTest('TEST 4: Create a Review');
  
  if (!productId) {
    logError('No product ID available for testing');
    return false;
  }
  
  const reviewData = {
    product: productId,
    rating: 5,
    review: `This is a test review created by the automated test script on ${new Date().toISOString()}. The product is excellent and I highly recommend it!`
  };
  
  const response = await makeRequest('POST', '/reviews', reviewData);
  
  if (response.success && response.data.success) {
    reviewId = response.data.data._id;
    logSuccess('Review created successfully');
    logInfo(`Review ID: ${reviewId}`);
    logInfo(`Rating: ${response.data.data.rating}`);
    logInfo(`Review: ${response.data.data.review.substring(0, 50)}...`);
    return true;
  } else {
    logError(`Failed to create review: ${response.error?.message || 'Unknown error'}`);
    if (response.status === 403) {
      logWarning('This might be because user has not purchased the product or already reviewed it');
    }
    return false;
  }
};

// Test 5: Get Product Reviews (Public Access)
const testGetProductReviews = async () => {
  logTest('TEST 5: Get Product Reviews (Public Access)');
  
  if (!productId) {
    logError('No product ID available for testing');
    return false;
  }
  
  // Test without authentication (public access)
  try {
    const response = await axios.get(`${BASE_URL}/reviews/product/${productId}`);
    
    if (response.data.success) {
      const reviews = response.data.data;
      logSuccess(`Retrieved ${reviews.length} reviews for product`);
      logInfo(`Total Reviews: ${response.data.totalReviews}`);
      logInfo(`Average Rating: ${response.data.averageRating}`);
      
      // Check if our test review is in the list
      const testReview = reviews.find(review => review._id === reviewId);
      if (testReview) {
        logSuccess('Test review found in public reviews list');
        logInfo(`Review by: ${testReview.user.name}`);
      } else {
        logWarning('Test review not found in public reviews list');
      }
      
      return true;
    } else {
      logError('Failed to get product reviews');
      return false;
    }
  } catch (error) {
    logError(`Error getting product reviews: ${error.response?.data?.message || error.message}`);
    return false;
  }
};

// Test 6: Try to Create Duplicate Review
const testDuplicateReview = async () => {
  logTest('TEST 6: Try to Create Duplicate Review');
  
  if (!productId) {
    logError('No product ID available for testing');
    return false;
  }
  
  const reviewData = {
    product: productId,
    rating: 4,
    review: 'This should fail because I already reviewed this product'
  };
  
  const response = await makeRequest('POST', '/reviews', reviewData);
  
  if (!response.success && response.status === 400) {
    logSuccess('Duplicate review correctly rejected');
    logInfo(`Error message: ${response.error?.message || 'Unknown error'}`);
    return true;
  } else {
    logError('Duplicate review was not properly rejected');
    return false;
  }
};

// Test 7: Try to Review Without Purchase (Different Product)
const testReviewWithoutPurchase = async () => {
  logTest('TEST 7: Try to Review Product Without Purchase');
  
  // Use a different product ID (this should fail)
  const fakeProductId = '507f1f77bcf86cd799439011'; // Random ObjectId
  
  const reviewData = {
    product: fakeProductId,
    rating: 5,
    review: 'This should fail because I have not purchased this product'
  };
  
  const response = await makeRequest('POST', '/reviews', reviewData);
  
  if (!response.success && response.status === 403) {
    logSuccess('Review without purchase correctly rejected');
    logInfo(`Error message: ${response.error?.message || 'Unknown error'}`);
    return true;
  } else {
    logError('Review without purchase was not properly rejected');
    return false;
  }
};

// Test 8: Get User's Reviews
const testGetUserReviews = async () => {
  logTest('TEST 8: Get User Reviews');
  
  const response = await makeRequest('GET', '/reviews/user');
  
  if (response.success && response.data.success) {
    const reviews = response.data.data;
    logSuccess(`Retrieved ${reviews.length} reviews by user`);
    
    // Check if our test review is in the list
    const testReview = reviews.find(review => review._id === reviewId);
    if (testReview) {
      logSuccess('Test review found in user reviews list');
    } else {
      logWarning('Test review not found in user reviews list');
    }
    
    return true;
  } else {
    logError(`Failed to get user reviews: ${response.error?.message || 'Unknown error'}`);
    return false;
  }
};

// Test 9: Update Review
const testUpdateReview = async () => {
  logTest('TEST 9: Update Review');
  
  if (!reviewId) {
    logError('No review ID available for testing');
    return false;
  }
  
  const updateData = {
    rating: 4,
    review: `Updated review on ${new Date().toISOString()}. Still a great product but rating updated to 4 stars.`
  };
  
  const response = await makeRequest('PUT', `/reviews/${reviewId}`, updateData);
  
  if (response.success && response.data.success) {
    logSuccess('Review updated successfully');
    logInfo(`New Rating: ${response.data.data.rating}`);
    logInfo(`Updated Review: ${response.data.data.review.substring(0, 50)}...`);
    return true;
  } else {
    logError(`Failed to update review: ${response.error?.message || 'Unknown error'}`);
    return false;
  }
};

// Test 10: Get Purchased Products
const testGetPurchasedProducts = async () => {
  logTest('TEST 10: Get Purchased Products');
  
  const response = await makeRequest('GET', '/reviews/purchased-products');
  
  if (response.success && response.data.success) {
    const products = response.data.data.products;
    logSuccess(`Retrieved ${products.length} purchased products`);
    
    // Check if our test product is in the list
    const testProduct = products.find(p => p.product._id === productId);
    if (testProduct) {
      logSuccess('Test product found in purchased products list');
      logInfo(`Product: ${testProduct.product.name}`);
      logInfo(`Order Number: ${testProduct.orderNumber}`);
    } else {
      logWarning('Test product not found in purchased products list');
    }
    
    return true;
  } else {
    logError(`Failed to get purchased products: ${response.error?.message || 'Unknown error'}`);
    return false;
  }
};

// Test 11: Delete Review
const testDeleteReview = async () => {
  logTest('TEST 11: Delete Review');
  
  if (!reviewId) {
    logError('No review ID available for testing');
    return false;
  }
  
  const response = await makeRequest('DELETE', `/reviews/${reviewId}`);
  
  if (response.success && response.data.success) {
    logSuccess('Review deleted successfully');
    return true;
  } else {
    logError(`Failed to delete review: ${response.error?.message || 'Unknown error'}`);
    return false;
  }
};

// Test 12: Verify Review Deletion
const testVerifyReviewDeletion = async () => {
  logTest('TEST 12: Verify Review Deletion');
  
  if (!productId) {
    logError('No product ID available for testing');
    return false;
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/reviews/product/${productId}`);
    
    if (response.data.success) {
      const reviews = response.data.data;
      const deletedReview = reviews.find(review => review._id === reviewId);
      
      if (!deletedReview) {
        logSuccess('Review successfully deleted and no longer appears in public reviews');
        return true;
      } else {
        logError('Review still appears in public reviews after deletion');
        return false;
      }
    } else {
      logError('Failed to verify review deletion');
      return false;
    }
  } catch (error) {
    logError(`Error verifying review deletion: ${error.response?.data?.message || error.message}`);
    return false;
  }
};

// Main test runner
const runTests = async () => {
  log('🚀 STARTING REVIEW SYSTEM COMPREHENSIVE TEST', 'bright');
  log('=' .repeat(60), 'cyan');
  
  const tests = [
    { name: 'Authentication', fn: testAuthentication, critical: true },
    { name: 'Get User Orders', fn: testGetUserOrders, critical: true },
    { name: 'Check Review Eligibility', fn: testCheckReviewEligibility, critical: false },
    { name: 'Create Review', fn: testCreateReview, critical: false },
    { name: 'Get Product Reviews (Public)', fn: testGetProductReviews, critical: false },
    { name: 'Try Duplicate Review', fn: testDuplicateReview, critical: false },
    { name: 'Try Review Without Purchase', fn: testReviewWithoutPurchase, critical: false },
    { name: 'Get User Reviews', fn: testGetUserReviews, critical: false },
    { name: 'Update Review', fn: testUpdateReview, critical: false },
    { name: 'Get Purchased Products', fn: testGetPurchasedProducts, critical: false },
    { name: 'Delete Review', fn: testDeleteReview, critical: false },
    { name: 'Verify Review Deletion', fn: testVerifyReviewDeletion, critical: false }
  ];
  
  let passed = 0;
  let failed = 0;
  let criticalFailed = 0;
  
  for (const test of tests) {
    try {
      log(`\n${'='.repeat(40)}`, 'magenta');
      const result = await test.fn();
      
      if (result) {
        passed++;
        logSuccess(`${test.name} - PASSED`);
      } else {
        failed++;
        if (test.critical) {
          criticalFailed++;
          logError(`${test.name} - FAILED (CRITICAL)`);
        } else {
          logWarning(`${test.name} - FAILED (NON-CRITICAL)`);
        }
      }
    } catch (error) {
      failed++;
      if (test.critical) {
        criticalFailed++;
      }
      logError(`${test.name} - ERROR: ${error.message}`);
    }
  }
  
  // Final Results
  log(`\n${'='.repeat(60)}`, 'cyan');
  log('📊 TEST RESULTS SUMMARY', 'bright');
  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, 'red');
  log(`🚨 Critical Failed: ${criticalFailed}`, 'red');
  
  if (criticalFailed === 0) {
    log('\n🎉 ALL CRITICAL TESTS PASSED!', 'green');
    log('✅ Review system is working correctly', 'green');
  } else {
    log('\n⚠️  SOME CRITICAL TESTS FAILED!', 'red');
    log('❌ Review system needs attention', 'red');
  }
  
  log(`\n📋 Test Details:`, 'blue');
  log(`- User: ${TEST_USER.email}`, 'blue');
  log(`- Product ID: ${productId || 'N/A'}`, 'blue');
  log(`- Order ID: ${orderId || 'N/A'}`, 'blue');
  log(`- Review ID: ${reviewId || 'N/A'}`, 'blue');
  
  log('\n🏁 Test completed!', 'bright');
};

// Error handling
process.on('unhandledRejection', (error) => {
  logError(`Unhandled rejection: ${error.message}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runTests().catch(error => {
    logError(`Test runner error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testAuthentication,
  testGetUserOrders,
  testCheckReviewEligibility,
  testCreateReview,
  testGetProductReviews,
  testDuplicateReview,
  testReviewWithoutPurchase,
  testGetUserReviews,
  testUpdateReview,
  testGetPurchasedProducts,
  testDeleteReview,
  testVerifyReviewDeletion
};


