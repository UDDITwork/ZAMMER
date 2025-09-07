// Simple login test
const axios = require('axios');

async function testLogin() {
  try {
    console.log('🧪 Testing login with fixed password...\n');
    
    const response = await axios.post('http://localhost:5001/api/users/login', {
      email: 'udditkantsinha2@gmail.com',
      password: 'jpmc123'
    });

    if (response.data.success) {
      console.log('✅ LOGIN SUCCESSFUL!');
      console.log('👤 User:', response.data.data.name);
      console.log('📧 Email:', response.data.data.email);
      console.log('🔑 Token received:', response.data.data.token ? 'YES' : 'NO');
    } else {
      console.log('❌ Login failed:', response.data.message);
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.response) {
      console.log('Response:', error.response.data);
    }
  }
}

testLogin();
