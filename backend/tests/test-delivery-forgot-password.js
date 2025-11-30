/**
 * Test Script: Delivery Agent Forgot Password Flow
 * Tests:
 * - POST /api/delivery/forgot-password
 * - POST /api/delivery/verify-forgot-password-otp
 * - PUT /api/delivery/reset-password/:resetToken
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5001/api';
let resetToken = '';
let testPhoneNumber = '';
let testOtp = '';

// Test data - Update with real delivery agent credentials
const testDeliveryAgent = {
  email: 'delivery@example.com',
  phoneNumber: '9876543210' // Update with real phone number for OTP testing
};

async function testDeliveryForgotPassword() {
  console.log('\n🧪 ============================================');
  console.log('TEST 3: Delivery Agent Forgot Password Flow');
  console.log('============================================\n');

  try {
    // Step 1: Test forgot password with email
    console.log('📝 Step 1: Requesting password reset via email...');
    console.log(`   URL: ${BASE_URL}/delivery/forgot-password`);
    console.log(`   Email: ${testDeliveryAgent.email}`);
    
    try {
      const forgotResponse = await axios.post(
        `${BASE_URL}/delivery/forgot-password`,
        { email: testDeliveryAgent.email }
      );

      if (forgotResponse.data.success) {
        console.log('✅ Forgot password request successful');
        console.log('   Response:', JSON.stringify(forgotResponse.data, null, 2));
        testPhoneNumber = testDeliveryAgent.phoneNumber;
      } else {
        console.log('⚠️  Request returned non-success response:');
        console.log('   Response:', JSON.stringify(forgotResponse.data, null, 2));
      }
    } catch (error) {
      if (error.response) {
        if (error.response.status === 200) {
          console.log('✅ Request processed (even if agent not found - security measure)');
        } else {
          console.error('❌ Error response:');
          console.error('   Status:', error.response.status);
          console.error('   Response:', JSON.stringify(error.response.data, null, 2));
        }
      } else if (error.request) {
        console.error('❌ Network error - Server may not be running');
        console.error('   Error:', error.message);
        console.error(`   Check if server is running on: ${BASE_URL}`);
      } else {
        console.error('❌ Error:', error.message);
      }
    }

    // Step 2: Test forgot password with phone number
    console.log('\n📝 Step 2: Requesting password reset via phone number...');
    console.log(`   URL: ${BASE_URL}/delivery/forgot-password`);
    console.log(`   Phone: ${testDeliveryAgent.phoneNumber}`);
    
    try {
      const forgotPhoneResponse = await axios.post(
        `${BASE_URL}/delivery/forgot-password`,
        { phoneNumber: testDeliveryAgent.phoneNumber }
      );

      if (forgotPhoneResponse.data.success) {
        console.log('✅ OTP sent to phone number');
        console.log('   Phone:', forgotPhoneResponse.data.data.phoneNumber);
        console.log('\n⚠️  MANUAL STEP REQUIRED:');
        console.log('   1. Check your phone for OTP');
        console.log('   2. Update testOtp variable in the script');
        console.log('   3. Re-run the script to continue testing');
        return; // Exit here to allow manual OTP entry
      }
    } catch (error) {
      if (error.response) {
        if (error.response.status === 200) {
          console.log('✅ Request processed (even if agent not found - security measure)');
        } else {
          console.error('❌ Error response:');
          console.error('   Status:', error.response.status);
          console.error('   Response:', JSON.stringify(error.response.data, null, 2));
          console.error('\n   💡 TIP: Update testDeliveryAgent credentials in the test script');
        }
      } else if (error.request) {
        console.error('❌ Network error - Server may not be running');
        console.error('   Error:', error.message);
      } else {
        console.error('❌ Error:', error.message);
      }
    }

    // Step 3: Verify OTP (requires manual OTP input)
    if (testOtp) {
      console.log('\n📝 Step 3: Verifying OTP...');
      try {
        const verifyResponse = await axios.post(
          `${BASE_URL}/delivery/verify-forgot-password-otp`,
          {
            phoneNumber: testDeliveryAgent.phoneNumber,
            otp: testOtp
          }
        );

        if (verifyResponse.data.success && verifyResponse.data.data.resetToken) {
          resetToken = verifyResponse.data.data.resetToken;
          console.log('✅ OTP verified successfully');
          console.log('Reset token obtained');
        } else {
          console.log('❌ OTP verification failed');
          console.log('Response:', verifyResponse.data);
        }
      } catch (error) {
        if (error.response) {
          console.log('Status:', error.response.status);
          console.log('Response:', error.response.data);
        } else {
          console.error('Error:', error.message);
        }
      }
    } else {
      console.log('\n⚠️  Step 3 Skipped: OTP required');
      console.log('To test Step 3:');
      console.log('1. Check your phone for OTP');
      console.log('2. Update testOtp variable in this script');
      console.log('3. Re-run the script');
    }

    // Step 4: Reset password with token
    if (resetToken) {
      console.log('\n📝 Step 4: Resetting password with token...');
      const newPassword = 'newPassword123';

      try {
        const resetResponse = await axios.put(
          `${BASE_URL}/delivery/reset-password/${resetToken}`,
          { newPassword }
        );

        if (resetResponse.data.success) {
          console.log('✅ Password reset successful');
          console.log('New token:', resetResponse.data.data.token ? 'Received' : 'Not received');
        } else {
          console.log('❌ Password reset failed');
          console.log('Response:', resetResponse.data);
        }
      } catch (error) {
        if (error.response) {
          console.log('Status:', error.response.status);
          console.log('Response:', error.response.data);
        } else {
          console.error('Error:', error.message);
        }
      }
    } else {
      console.log('\n⚠️  Step 4 Skipped: Reset token required');
    }

    // Step 5: Test validation
    console.log('\n📝 Step 5: Testing validation (missing fields)...');
    try {
      await axios.post(`${BASE_URL}/delivery/forgot-password`, {});
      console.log('❌ Validation failed - should require email or phone');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Validation working - correctly rejected empty request');
      }
    }

    console.log('\n✅ Test 3 Complete\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

module.exports = testDeliveryForgotPassword;

if (require.main === module) {
  testDeliveryForgotPassword()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

