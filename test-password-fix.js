// Test script to verify password fix
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testPasswordFix() {
  try {
    console.log('🧪 Testing Password Fix...\n');

    // Test login with the fixed password
    console.log('1️⃣ Testing login with fixed password...');
    const loginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
      email: 'udditkantSinha2@gmail.com',
      password: 'jpmc123'
    });

    if (loginResponse.data.success) {
      console.log('✅ Login successful with fixed password!');
      console.log('👤 User:', loginResponse.data.data.name);
      console.log('📧 Email:', loginResponse.data.data.email);
    } else {
      console.log('❌ Login failed:', loginResponse.data.message);
    }

    console.log('\n2️⃣ Testing change password functionality...');
    
    // Test change password with correct current password
    const changePasswordData = {
      currentPassword: 'jpmc123',
      newPassword: 'jpmcA123'
    };

    const changeResponse = await axios.put(
      `${API_BASE_URL}/users/change-password`,
      changePasswordData,
      {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.data.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (changeResponse.data.success) {
      console.log('✅ Password change successful!');
      
      // Test login with new password
      console.log('\n3️⃣ Testing login with new password...');
      const newLoginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
        email: 'udditkantSinha2@gmail.com',
        password: 'jpmcA123'
      });

      if (newLoginResponse.data.success) {
        console.log('✅ Login with new password successful!');
      } else {
        console.log('❌ Login with new password failed:', newLoginResponse.data.message);
      }

      // Test that old password no longer works
      console.log('\n4️⃣ Testing that old password no longer works...');
      try {
        await axios.post(`${API_BASE_URL}/users/login`, {
          email: 'udditkantSinha2@gmail.com',
          password: 'jpmc123'
        });
        console.log('❌ ERROR: Old password still works (this should not happen)');
      } catch (error) {
        if (error.response && error.response.status === 400) {
          console.log('✅ Old password correctly no longer works');
        } else {
          console.log('❌ Unexpected error:', error.message);
        }
      }

    } else {
      console.log('❌ Password change failed:', changeResponse.data.message);
    }

    console.log('\n🎉 Password fix test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testPasswordFix();
