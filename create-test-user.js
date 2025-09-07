// Create a fresh test user
const axios = require('axios');

async function createTestUser() {
  try {
    console.log('🧪 Creating fresh test user...\n');
    
    const testUser = {
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'test123',
      mobileNumber: '9876543210'
    };

    console.log('📝 Registering new user...');
    const registerResponse = await axios.post('http://localhost:5001/api/users/register', testUser);

    if (registerResponse.data.success) {
      console.log('✅ User registered successfully!');
      console.log('👤 Name:', registerResponse.data.data.name);
      console.log('📧 Email:', registerResponse.data.data.email);
      console.log('🔑 Token:', registerResponse.data.data.token ? 'Received' : 'Not received');
      
      console.log('\n🧪 Testing login with new user...');
      const loginResponse = await axios.post('http://localhost:5001/api/users/login', {
        email: testUser.email,
        password: testUser.password
      });

      if (loginResponse.data.success) {
        console.log('✅ Login successful with new user!');
        console.log('🎉 System is working correctly!');
        
        console.log('\n📋 Test User Credentials:');
        console.log('📧 Email:', testUser.email);
        console.log('🔑 Password:', testUser.password);
        console.log('\nYou can use these credentials to test the system.');
        
      } else {
        console.log('❌ Login failed with new user:', loginResponse.data.message);
      }
      
    } else {
      console.log('❌ Registration failed:', registerResponse.data.message);
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.response) {
      console.log('Response:', error.response.data);
    }
  }
}

createTestUser();
