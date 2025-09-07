// Test script for change password functionality
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test user credentials
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

const newPassword = 'newpassword456';

async function testChangePassword() {
  try {
    console.log('🧪 Testing Change Password Functionality...\n');

    // Step 1: Login to get token
    console.log('1️⃣ Logging in user...');
    const loginResponse = await axios.post(`${API_BASE_URL}/users/login`, testUser);
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + loginResponse.data.message);
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, token received\n');

    // Step 2: Test change password
    console.log('2️⃣ Testing change password...');
    const changePasswordData = {
      currentPassword: testUser.password,
      newPassword: newPassword
    };

    const changePasswordResponse = await axios.put(
      `${API_BASE_URL}/users/change-password`,
      changePasswordData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!changePasswordResponse.data.success) {
      throw new Error('Change password failed: ' + changePasswordResponse.data.message);
    }

    console.log('✅ Password changed successfully\n');

    // Step 3: Test login with new password
    console.log('3️⃣ Testing login with new password...');
    const newLoginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
      email: testUser.email,
      password: newPassword
    });

    if (!newLoginResponse.data.success) {
      throw new Error('Login with new password failed: ' + newLoginResponse.data.message);
    }

    console.log('✅ Login with new password successful\n');

    // Step 4: Test login with old password (should fail)
    console.log('4️⃣ Testing login with old password (should fail)...');
    try {
      await axios.post(`${API_BASE_URL}/users/login`, testUser);
      console.log('❌ ERROR: Login with old password should have failed but succeeded');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Login with old password correctly failed\n');
      } else {
        throw error;
      }
    }

    // Step 5: Reset password back to original for future tests
    console.log('5️⃣ Resetting password back to original...');
    const resetPasswordData = {
      currentPassword: newPassword,
      newPassword: testUser.password
    };

    const resetResponse = await axios.put(
      `${API_BASE_URL}/users/change-password`,
      resetPasswordData,
      {
        headers: {
          'Authorization': `Bearer ${newLoginResponse.data.data.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!resetResponse.data.success) {
      throw new Error('Reset password failed: ' + resetResponse.data.message);
    }

    console.log('✅ Password reset to original successful\n');

    console.log('🎉 All change password tests passed!');
    console.log('\n📋 Test Summary:');
    console.log('✅ User login with original password');
    console.log('✅ Password change with correct current password');
    console.log('✅ Login with new password');
    console.log('✅ Login with old password correctly fails');
    console.log('✅ Password reset to original');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testChangePassword();
