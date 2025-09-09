const axios = require('axios');

// Test script for review notification system
const API_URL = 'http://localhost:5000/api';

// Test data
const testData = {
  user: {
    email: 'testuser@example.com',
    password: 'password123'
  },
  seller: {
    email: 'testseller@example.com', 
    password: 'password123'
  },
  product: {
    name: 'Test Product for Reviews',
    description: 'A test product to verify review notifications',
    price: 100,
    category: 'Test'
  }
};

async function testReviewNotifications() {
  console.log('🧪 Testing Review Notification System...\n');

  try {
    // Step 1: Login as user
    console.log('1️⃣ Logging in as user...');
    const userLoginResponse = await axios.post(`${API_URL}/users/login`, {
      email: testData.user.email,
      password: testData.user.password
    });
    
    if (!userLoginResponse.data.success) {
      throw new Error('User login failed');
    }
    
    const userToken = userLoginResponse.data.token;
    console.log('✅ User logged in successfully');

    // Step 2: Login as seller
    console.log('\n2️⃣ Logging in as seller...');
    const sellerLoginResponse = await axios.post(`${API_URL}/sellers/login`, {
      email: testData.seller.email,
      password: testData.seller.password
    });
    
    if (!sellerLoginResponse.data.success) {
      throw new Error('Seller login failed');
    }
    
    const sellerToken = sellerLoginResponse.data.token;
    const sellerId = sellerLoginResponse.data.seller._id;
    console.log('✅ Seller logged in successfully');

    // Step 3: Create a test product
    console.log('\n3️⃣ Creating test product...');
    const productResponse = await axios.post(`${API_URL}/products`, {
      ...testData.product,
      seller: sellerId
    }, {
      headers: {
        'Authorization': `Bearer ${sellerToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!productResponse.data.success) {
      throw new Error('Product creation failed');
    }
    
    const productId = productResponse.data.data._id;
    console.log('✅ Test product created:', productId);

    // Step 4: Create a test order (simulate purchase)
    console.log('\n4️⃣ Creating test order...');
    const orderResponse = await axios.post(`${API_URL}/orders`, {
      orderItems: [{
        product: productId,
        name: testData.product.name,
        quantity: 1,
        price: testData.product.price
      }],
      shippingAddress: {
        address: 'Test Address',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        country: 'Test Country'
      },
      paymentMethod: 'test',
      totalPrice: testData.product.price
    }, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!orderResponse.data.success) {
      throw new Error('Order creation failed');
    }
    
    const orderId = orderResponse.data.data._id;
    console.log('✅ Test order created:', orderId);

    // Step 5: Simulate payment completion
    console.log('\n5️⃣ Simulating payment completion...');
    const paymentResponse = await axios.put(`${API_URL}/orders/${orderId}/payment`, {
      paymentStatus: 'completed',
      isPaid: true
    }, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!paymentResponse.data.success) {
      throw new Error('Payment simulation failed');
    }
    
    console.log('✅ Payment simulated successfully');

    // Step 6: Check if user can review
    console.log('\n6️⃣ Checking review eligibility...');
    const eligibilityResponse = await axios.get(`${API_URL}/reviews/check/${productId}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!eligibilityResponse.data.success) {
      throw new Error('Review eligibility check failed');
    }
    
    console.log('✅ Review eligibility:', eligibilityResponse.data.data);

    // Step 7: Create a review (this should trigger seller notification)
    console.log('\n7️⃣ Creating review (should trigger seller notification)...');
    const reviewResponse = await axios.post(`${API_URL}/reviews`, {
      product: productId,
      rating: 5,
      review: 'This is a test review to verify the notification system works correctly!'
    }, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!reviewResponse.data.success) {
      throw new Error('Review creation failed');
    }
    
    console.log('✅ Review created successfully:', reviewResponse.data.data._id);

    // Step 8: Verify seller can see the review
    console.log('\n8️⃣ Verifying seller can see the review...');
    const sellerReviewsResponse = await axios.get(`${API_URL}/reviews/seller`, {
      headers: {
        'Authorization': `Bearer ${sellerToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!sellerReviewsResponse.data.success) {
      throw new Error('Failed to fetch seller reviews');
    }
    
    console.log('✅ Seller reviews fetched:', {
      totalReviews: sellerReviewsResponse.data.totalReviews,
      averageRating: sellerReviewsResponse.data.averageRating,
      reviewsCount: sellerReviewsResponse.data.data.length
    });

    // Step 9: Verify public can see the review
    console.log('\n9️⃣ Verifying public can see the review...');
    const publicReviewsResponse = await axios.get(`${API_URL}/reviews/product/${productId}`);
    
    if (!publicReviewsResponse.data.success) {
      throw new Error('Failed to fetch public reviews');
    }
    
    console.log('✅ Public reviews fetched:', {
      totalReviews: publicReviewsResponse.data.totalReviews,
      averageRating: publicReviewsResponse.data.averageRating,
      reviewsCount: publicReviewsResponse.data.data.length
    });

    console.log('\n🎉 Review Notification System Test Completed Successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ User authentication');
    console.log('✅ Seller authentication');
    console.log('✅ Product creation');
    console.log('✅ Order creation and payment simulation');
    console.log('✅ Review eligibility verification');
    console.log('✅ Review creation (triggers seller notification)');
    console.log('✅ Seller can view reviews');
    console.log('✅ Public can view reviews');
    
    console.log('\n🔔 Seller Notification:');
    console.log('The seller should have received a real-time notification about the new review.');
    console.log('Check the seller dashboard for the notification and review display.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testReviewNotifications();
