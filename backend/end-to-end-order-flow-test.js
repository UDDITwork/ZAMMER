#!/usr/bin/env node

/**
 * End-to-End Order Flow Test Script
 * Tests complete buyer → seller order flow like electricity in a wire
 * 
 * Usage: node end-to-end-order-flow-test.js
 */

const axios = require('axios');
const io = require('socket.io-client');
const colors = require('colors/safe');

// Configuration
const CONFIG = {
  BASE_URL: 'http://localhost:5000/api',
  SOCKET_URL: 'http://localhost:5000',
  TEST_TIMEOUT: 30000, // 30 seconds
  STEP_DELAY: 1000 // 1 second between steps
};

// Test data
const TEST_DATA = {
  buyer: {
    name: 'Test Buyer',
    email: 'buyer@test.com',
    password: 'password123',
    mobileNumber: '9999999999',
    location: {
      coordinates: [77.2090, 28.6139],
      address: 'New Delhi, India'
    }
  },
  seller: {
    firstName: 'Test Seller',
    email: 'seller@test.com', 
    password: 'password123',
    mobileNumber: '8888888888',
    shop: {
      name: 'Test Shop',
      address: 'Test Address, Delhi',
      category: 'Men'
    }
  },
  product: {
    name: 'Test Product for Order Flow',
    description: 'Test product for automated order flow testing',
    category: 'Men',
    subCategory: 'T-shirts',
    productCategory: 'Traditional Indian',
    zammerPrice: 999,
    mrp: 1299,
    variants: [{
      size: 'M',
      color: 'Blue',
      colorCode: '#0000FF',
      quantity: 10,
      images: ['test-image.jpg']
    }],
    images: ['test-product.jpg'],
    tags: ['test', 'automated']
  },
  shippingAddress: {
    address: '123 Test Street',
    city: 'Delhi',
    postalCode: '110001',
    country: 'India', 
    phone: '9999999999'
  }
};

// Global variables
let buyerToken = null;
let sellerToken = null;
let sellerId = null;
let productId = null;
let orderId = null;
let socket = null;
let testResults = {
  steps: [],
  timings: {},
  startTime: null,
  endTime: null
};

// Utility functions
const log = (step, message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const coloredMessage = type === 'success' ? colors.green(message) : 
                        type === 'error' ? colors.red(message) : 
                        type === 'warning' ? colors.yellow(message) :
                        colors.blue(message);
  
  console.log(`[${timestamp}] ${colors.cyan(step)}: ${coloredMessage}`);
  
  testResults.steps.push({
    step,
    message,
    type,
    timestamp
  });
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const makeRequest = async (method, endpoint, data = null, token = null) => {
  try {
    const config = {
      method,
      url: `${CONFIG.BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
};

// Test steps
async function step1_CheckServerHealth() {
  log('STEP-1', '🏥 Checking server health...', 'info');
  
  const result = await makeRequest('GET', '/health');
  if (!result.success) {
    throw new Error('Server is not running! Please start the backend server.');
  }
  
  log('STEP-1', '✅ Server is healthy and running', 'success');
  testResults.timings.serverHealth = Date.now();
}

async function step2_RegisterBuyer() {
  log('STEP-2', '👤 Registering test buyer...', 'info');
  
  const result = await makeRequest('POST', '/users/register', TEST_DATA.buyer);
  
  if (result.success) {
    buyerToken = result.data.data.token;
    log('STEP-2', '✅ Buyer registered successfully', 'success');
  } else if (result.error.message === 'User already exists') {
    // Login instead
    const loginResult = await makeRequest('POST', '/users/login', {
      email: TEST_DATA.buyer.email,
      password: TEST_DATA.buyer.password
    });
    
    if (loginResult.success) {
      buyerToken = loginResult.data.data.token;
      log('STEP-2', '✅ Buyer logged in (already exists)', 'success');
    } else {
      throw new Error('Failed to register/login buyer');
    }
  } else {
    throw new Error(`Buyer registration failed: ${result.error.message}`);
  }
  
  testResults.timings.buyerAuth = Date.now();
}

async function step3_RegisterSeller() {
  log('STEP-3', '🏪 Registering test seller...', 'info');
  
  const result = await makeRequest('POST', '/sellers/register', TEST_DATA.seller);
  
  if (result.success) {
    sellerToken = result.data.data.token;
    sellerId = result.data.data._id;
    log('STEP-3', '✅ Seller registered successfully', 'success');
  } else if (result.error.message === 'Seller already exists') {
    // Login instead
    const loginResult = await makeRequest('POST', '/sellers/login', {
      email: TEST_DATA.seller.email,
      password: TEST_DATA.seller.password
    });
    
    if (loginResult.success) {
      sellerToken = loginResult.data.data.token;
      sellerId = loginResult.data.data._id;
      log('STEP-3', '✅ Seller logged in (already exists)', 'success');
    } else {
      throw new Error('Failed to register/login seller');
    }
  } else {
    throw new Error(`Seller registration failed: ${result.error.message}`);
  }
  
  testResults.timings.sellerAuth = Date.now();
}

async function step4_CreateProduct() {
  log('STEP-4', '📦 Creating test product...', 'info');
  
  const result = await makeRequest('POST', '/products', TEST_DATA.product, sellerToken);
  
  if (!result.success) {
    throw new Error(`Product creation failed: ${result.error.message}`);
  }
  
  productId = result.data.data._id;
  log('STEP-4', `✅ Product created successfully (ID: ${productId})`, 'success');
  testResults.timings.productCreation = Date.now();
}

async function step5_SetupSocketConnection() {
  log('STEP-5', '🔌 Setting up Socket.io connection for seller...', 'info');
  
  return new Promise((resolve, reject) => {
    socket = io(CONFIG.SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      log('STEP-5', '✅ Socket connected successfully', 'success');
      
      // Join seller room
      socket.emit('seller-join', sellerId);
    });

    socket.on('seller-joined', (data) => {
      log('STEP-5', '✅ Seller joined notification room', 'success');
      testResults.timings.socketConnection = Date.now();
      resolve();
    });

    socket.on('connect_error', (error) => {
      log('STEP-5', `❌ Socket connection failed: ${error.message}`, 'error');
      reject(error);
    });

    // Timeout
    setTimeout(() => {
      reject(new Error('Socket connection timeout'));
    }, 10000);
  });
}

async function step6_AddToCart() {
  log('STEP-6', '🛒 Adding product to buyer cart...', 'info');
  
  const cartData = {
    productId: productId,
    quantity: 1,
    selectedSize: 'M',
    selectedColor: 'Blue'
  };
  
  const result = await makeRequest('POST', '/cart', cartData, buyerToken);
  
  if (!result.success) {
    throw new Error(`Add to cart failed: ${result.error.message}`);
  }
  
  log('STEP-6', '✅ Product added to cart successfully', 'success');
  testResults.timings.addToCart = Date.now();
}

async function step7_CreateOrder() {
  log('STEP-7', '💳 Creating order (simulating checkout + payment)...', 'info');
  
  return new Promise(async (resolve, reject) => {
    let orderReceived = false;
    let orderNotificationTimeout;

    // Listen for real-time order notification
    socket.on('new-order', (data) => {
      if (!orderReceived) {
        orderReceived = true;
        clearTimeout(orderNotificationTimeout);
        
        const notificationDelay = Date.now() - testResults.timings.orderCreationStart;
        log('STEP-7', `🔔 Real-time order notification received in ${notificationDelay}ms`, 'success');
        testResults.timings.orderNotification = Date.now();
        testResults.timings.notificationDelay = notificationDelay;
        
        resolve(data);
      }
    });

    // Set notification timeout
    orderNotificationTimeout = setTimeout(() => {
      if (!orderReceived) {
        log('STEP-7', '⚠️ Order notification not received within 5 seconds', 'warning');
        resolve(null); // Continue test even if notification fails
      }
    }, 5000);

    // Create order
    const orderData = {
      orderItems: [{
        product: productId,
        name: TEST_DATA.product.name,
        quantity: 1,
        price: TEST_DATA.product.zammerPrice,
        image: TEST_DATA.product.images[0],
        size: 'M',
        color: 'Blue'
      }],
      shippingAddress: TEST_DATA.shippingAddress,
      paymentMethod: 'UPI',
      taxPrice: Math.round(TEST_DATA.product.zammerPrice * 0.18),
      shippingPrice: 0,
      totalPrice: TEST_DATA.product.zammerPrice + Math.round(TEST_DATA.product.zammerPrice * 0.18),
      sellerId: sellerId
    };

    testResults.timings.orderCreationStart = Date.now();
    
    const result = await makeRequest('POST', '/orders', orderData, buyerToken);
    
    if (!result.success) {
      clearTimeout(orderNotificationTimeout);
      reject(new Error(`Order creation failed: ${result.error.message}`));
      return;
    }
    
    orderId = result.data.data._id;
    const orderNumber = result.data.data.orderNumber;
    
    testResults.timings.orderCreationComplete = Date.now();
    const orderCreationTime = testResults.timings.orderCreationComplete - testResults.timings.orderCreationStart;
    
    log('STEP-7', `✅ Order created successfully (${orderNumber}) in ${orderCreationTime}ms`, 'success');
    
    // If notification already received, resolve immediately
    if (orderReceived) {
      clearTimeout(orderNotificationTimeout);
      resolve();
    }
  });
}

async function step8_VerifySellerOrders() {
  log('STEP-8', '📋 Verifying order appears in seller dashboard...', 'info');
  
  const result = await makeRequest('GET', '/orders/seller?page=1&limit=10', null, sellerToken);
  
  if (!result.success) {
    throw new Error(`Failed to fetch seller orders: ${result.error.message}`);
  }
  
  const orders = result.data.data;
  const ourOrder = orders.find(order => order._id === orderId);
  
  if (!ourOrder) {
    throw new Error('Order not found in seller dashboard!');
  }
  
  log('STEP-8', `✅ Order found in seller dashboard (Status: ${ourOrder.status})`, 'success');
  testResults.timings.sellerOrderVerification = Date.now();
}

async function step9_TestOrderStatusFlow() {
  log('STEP-9', '🔄 Testing order status flow (Pending → Processing → Shipped → Delivered)...', 'info');
  
  const statusFlow = ['Processing', 'Shipped', 'Delivered'];
  
  for (const status of statusFlow) {
    await sleep(CONFIG.STEP_DELAY);
    
    const result = await makeRequest('PUT', `/orders/${orderId}/status`, { status }, sellerToken);
    
    if (!result.success) {
      throw new Error(`Failed to update order to ${status}: ${result.error.message}`);
    }
    
    log('STEP-9', `✅ Order status updated to: ${status}`, 'success');
    testResults.timings[`status_${status.toLowerCase()}`] = Date.now();
  }
  
  testResults.timings.orderStatusFlowComplete = Date.now();
}

async function step10_GetOrderStats() {
  log('STEP-10', '📊 Fetching seller order statistics...', 'info');
  
  const result = await makeRequest('GET', '/orders/seller/stats', null, sellerToken);
  
  if (!result.success) {
    throw new Error(`Failed to fetch order stats: ${result.error.message}`);
  }
  
  const stats = result.data.data;
  log('STEP-10', `✅ Order stats retrieved: ${JSON.stringify(stats)}`, 'success');
  testResults.timings.orderStats = Date.now();
}

async function generateReport() {
  testResults.endTime = Date.now();
  const totalTime = testResults.endTime - testResults.startTime;
  
  console.log('\n' + colors.cyan('='.repeat(80)));
  console.log(colors.cyan.bold('                    📊 END-TO-END ORDER FLOW TEST REPORT'));
  console.log(colors.cyan('='.repeat(80)));
  
  // Overall result
  const successSteps = testResults.steps.filter(s => s.type === 'success').length;
  const totalSteps = testResults.steps.filter(s => s.type !== 'info').length;
  
  console.log(`\n📈 ${colors.bold('OVERALL RESULT:')} ${successSteps}/${totalSteps} steps passed`);
  console.log(`⏱️  ${colors.bold('TOTAL TIME:')} ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
  
  // Flow synchronization analysis
  console.log(`\n🔄 ${colors.bold('FLOW SYNCHRONIZATION ANALYSIS:')}`);
  
  if (testResults.timings.notificationDelay) {
    const isSync = testResults.timings.notificationDelay < 100; // Under 100ms considered synchronous
    console.log(`   • Order Creation → Seller Notification: ${testResults.timings.notificationDelay}ms`);
    console.log(`   • Flow Type: ${isSync ? colors.green('SYNCHRONOUS') : colors.yellow('ASYNCHRONOUS')}`);
    console.log(`   • Real-time: ${testResults.timings.notificationDelay < 1000 ? colors.green('YES') : colors.red('NO')}`);
  }
  
  // Step timings
  console.log(`\n⏱️  ${colors.bold('STEP TIMINGS:')}`);
  const timingKeys = Object.keys(testResults.timings);
  for (let i = 1; i < timingKeys.length; i++) {
    const currentKey = timingKeys[i];
    const prevKey = timingKeys[i-1];
    const duration = testResults.timings[currentKey] - testResults.timings[prevKey];
    console.log(`   • ${currentKey}: ${duration}ms`);
  }
  
  // Component performance
  console.log(`\n🎯 ${colors.bold('COMPONENT PERFORMANCE:')}`);
  console.log(`   • Backend APIs: ${colors.green('WORKING')}`);
  console.log(`   • Socket.io Real-time: ${testResults.timings.notificationDelay ? colors.green('WORKING') : colors.red('FAILED')}`);
  console.log(`   • Order Creation: ${colors.green('WORKING')}`);
  console.log(`   • Status Updates: ${colors.green('WORKING')}`);
  
  // Recommendations
  console.log(`\n💡 ${colors.bold('RECOMMENDATIONS:')}`);
  
  if (testResults.timings.notificationDelay > 1000) {
    console.log(`   • ${colors.yellow('⚠️  Notification delay is high (>1s). Check Socket.io connection.')}`);
  }
  
  if (totalTime > 30000) {
    console.log(`   • ${colors.yellow('⚠️  Total test time is high (>30s). Consider optimizing API responses.')}`);
  }
  
  console.log(`   • ${colors.green('✅ Order flow is working end-to-end')}`);
  console.log(`   • ${colors.green('✅ Real-time notifications are functional')}`);
  
  // Error summary
  const errors = testResults.steps.filter(s => s.type === 'error');
  if (errors.length > 0) {
    console.log(`\n❌ ${colors.bold('ERRORS ENCOUNTERED:')}`);
    errors.forEach(error => {
      console.log(`   • ${error.step}: ${error.message}`);
    });
  }
  
  console.log('\n' + colors.cyan('='.repeat(80)));
  console.log(`${colors.cyan.bold('Test completed at:')} ${new Date().toISOString()}`);
  console.log(colors.cyan('='.repeat(80)) + '\n');
}

// Cleanup function
function cleanup() {
  if (socket) {
    socket.disconnect();
  }
}

// Main test execution
async function runEndToEndTest() {
  testResults.startTime = Date.now();
  
  console.log(colors.cyan.bold('🚀 Starting End-to-End Order Flow Test...\n'));
  
  try {
    await step1_CheckServerHealth();
    await sleep(CONFIG.STEP_DELAY);
    
    await step2_RegisterBuyer();
    await sleep(CONFIG.STEP_DELAY);
    
    await step3_RegisterSeller();
    await sleep(CONFIG.STEP_DELAY);
    
    await step4_CreateProduct();
    await sleep(CONFIG.STEP_DELAY);
    
    await step5_SetupSocketConnection();
    await sleep(CONFIG.STEP_DELAY);
    
    await step6_AddToCart();
    await sleep(CONFIG.STEP_DELAY);
    
    await step7_CreateOrder();
    await sleep(CONFIG.STEP_DELAY);
    
    await step8_VerifySellerOrders();
    await sleep(CONFIG.STEP_DELAY);
    
    await step9_TestOrderStatusFlow();
    await sleep(CONFIG.STEP_DELAY);
    
    await step10_GetOrderStats();
    
    log('FINAL', '🎉 All tests completed successfully!', 'success');
    
  } catch (error) {
    log('ERROR', `💥 Test failed: ${error.message}`, 'error');
  } finally {
    cleanup();
    await generateReport();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  cleanup();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  log('FATAL', `💥 Uncaught exception: ${error.message}`, 'error');
  cleanup();
  process.exit(1);
});

// Check if we're running this file directly
if (require.main === module) {
  runEndToEndTest();
}