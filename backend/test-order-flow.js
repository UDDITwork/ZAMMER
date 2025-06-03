// TEST SCRIPT: Save this as test-order-flow.js in your backend folder
// Run with: node test-order-flow.js

const io = require('socket.io-client');

// Test Socket.io connection and order notification
async function testOrderNotificationFlow() {
  console.log('🧪 Testing Order Notification Flow...\n');

  // 1. Test Socket connection
  console.log('1️⃣ Testing Socket.io connection...');
  const socket = io('http://localhost:5000', {
    withCredentials: true,
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected successfully:', socket.id);
    
    // 2. Test seller joining room
    console.log('\n2️⃣ Testing seller room join...');
    const testSellerId = 'test-seller-123';
    socket.emit('seller-join', testSellerId);
  });

  socket.on('seller-joined', (data) => {
    console.log('✅ Seller joined room successfully:', data);
    
    // 3. Test ping/pong
    console.log('\n3️⃣ Testing ping/pong...');
    socket.emit('ping');
  });

  socket.on('pong', (data) => {
    console.log('✅ Pong received:', data);
    
    // 4. Simulate new order notification
    console.log('\n4️⃣ Simulating new order notification...');
    
    // This would normally be sent from the order creation endpoint
    socket.emit('test-new-order', {
      success: true,
      message: 'You have a new order!',
      data: {
        _id: 'test-order-123',
        orderNumber: 'ZAM25060200001',
        status: 'Pending',
        totalPrice: 1599,
        user: {
          name: 'Test Customer',
          email: 'customer@test.com'
        },
        orderItems: [
          {
            name: 'Test Product',
            quantity: 1,
            price: 1599
          }
        ],
        createdAt: new Date().toISOString()
      }
    });
  });

  socket.on('new-order', (data) => {
    console.log('✅ New order notification received:', data);
    console.log('\n🎉 All tests passed! Order notification flow is working.');
    
    socket.disconnect();
    process.exit(0);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error);
    process.exit(1);
  });

  // Timeout after 10 seconds
  setTimeout(() => {
    console.error('❌ Test timeout - check if server is running');
    socket.disconnect();
    process.exit(1);
  }, 10000);
}

// Manual test for API endpoints
function testAPIEndpoints() {
  console.log('\n📋 API Endpoints to test manually:\n');
  
  console.log('🔗 Seller Authentication:');
  console.log('POST http://localhost:5000/api/sellers/login');
  console.log('Headers: Content-Type: application/json');
  console.log('Body: { "email": "seller@test.com", "password": "password123" }\n');
  
  console.log('🔗 Get Seller Orders:');
  console.log('GET http://localhost:5000/api/orders/seller');
  console.log('Headers: Authorization: Bearer <seller_token>\n');
  
  console.log('🔗 Update Order Status:');
  console.log('PUT http://localhost:5000/api/orders/<order_id>/status');
  console.log('Headers: Authorization: Bearer <seller_token>');
  console.log('Body: { "status": "Processing" }\n');
  
  console.log('🔗 Get Order Stats:');
  console.log('GET http://localhost:5000/api/orders/seller/stats');
  console.log('Headers: Authorization: Bearer <seller_token>\n');
  
  console.log('📱 Frontend URLs to test:');
  console.log('- http://localhost:3000/seller/dashboard');
  console.log('- http://localhost:3000/seller/orders');
  console.log('- Test order creation from buyer side to trigger notifications\n');
}

// Check if server is running
const http = require('http');

function checkServer() {
  const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET'
  }, (res) => {
    if (res.statusCode === 200) {
      console.log('✅ Server is running on port 5000');
      testOrderNotificationFlow();
    } else {
      console.error('❌ Server responded with status:', res.statusCode);
      process.exit(1);
    }
  });

  req.on('error', (error) => {
    console.error('❌ Server not running on port 5000');
    console.log('📋 Please start your server first:');
    console.log('   cd backend');
    console.log('   npm run dev\n');
    testAPIEndpoints();
    process.exit(1);
  });

  req.end();
}

// Run the test
console.log('🚀 Starting Order Notification Flow Test...\n');
checkServer();