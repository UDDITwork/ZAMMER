const axios = require('axios');
require('dotenv').config();

const ALPHABAKE_API_KEY = process.env.ALPHABAKE_API_KEY;
const ALPHABAKE_BASE_URL = 'https://api.alphabake.io/api/v2';

async function testAlphaBakeIntegration() {
  console.log('🔍 Testing AlphaBake API Integration...');
  console.log('🔍 API Key:', ALPHABAKE_API_KEY ? 'Present' : 'Missing');
  console.log('🔍 Base URL:', ALPHABAKE_BASE_URL);

  try {
    // Test 1: Get pre-signed URL for human image
    console.log('\n📤 Test 1: Getting pre-signed URL for human image...');
    const presignedResponse = await axios.post(
      `${ALPHABAKE_BASE_URL}/pre-signed-url/`,
      { type: 'human' },
      {
        headers: {
          'Authorization': `Bearer ${ALPHABAKE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ Pre-signed URL response:', {
      status: presignedResponse.status,
      data: presignedResponse.data
    });

    // Test 2: Check if we can create a try-on request with a dummy human ID
    console.log('\n🎯 Test 2: Testing try-on request creation...');
    const testHumanId = 'human/test-id.jpg';
    const testGarmentUrl = 'https://res.cloudinary.com/dr17ap4sb/image/upload/v1756039358/zammer_uploads/fzacbtdyqgmbkraunuw3.jpg';
    
    try {
      const tryOnResponse = await axios.post(
        `${ALPHABAKE_BASE_URL}/tryon/`,
        {
          human_id: testHumanId,
          garment_url: testGarmentUrl,
          garment_type: 'full',
          mode: 'fast',
          garment_guidance: 0.5,
          process_asset: 'tryon',
          human_zoom_in: 'true',
          retain_pose: 'true',
          is_offline: 'false'
        },
        {
          headers: {
            'Authorization': `Bearer ${ALPHABAKE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('✅ Try-on request response:', {
        status: tryOnResponse.status,
        data: tryOnResponse.data
      });
    } catch (tryOnError) {
      console.log('❌ Try-on request failed (expected for dummy ID):', {
        status: tryOnError.response?.status,
        message: tryOnError.response?.data?.message || tryOnError.message
      });
    }

    // Test 3: Test human ID verification with the actual key from Test 1
    console.log('\n🔍 Test 3: Testing human ID verification...');
    const actualHumanId = presignedResponse.data.key;
    console.log('🔍 Using actual human ID from Test 1:', actualHumanId);
    
    try {
      const verifyResponse = await axios.get(
        `${ALPHABAKE_BASE_URL}/human/${encodeURIComponent(actualHumanId)}`,
        {
          headers: {
            'Authorization': `Bearer ${ALPHABAKE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      console.log('✅ Human ID verification response:', {
        status: verifyResponse.status,
        data: verifyResponse.data
      });
    } catch (verifyError) {
      console.log('❌ Human ID verification failed:', {
        status: verifyError.response?.status,
        message: verifyError.response?.data?.message || verifyError.message
      });
    }

    // Test 4: Check API health/status
    console.log('\n🏥 Test 4: Checking API health...');
    try {
      const healthResponse = await axios.get(
        `${ALPHABAKE_BASE_URL.replace('/api/v2', '')}/health`,
        { timeout: 10000 }
      );
      console.log('✅ Health check response:', {
        status: healthResponse.status,
        data: healthResponse.data
      });
    } catch (healthError) {
      console.log('⚠️ Health check failed:', healthError.message);
    }

    console.log('\n✅ AlphaBake integration test completed');

  } catch (error) {
    console.error('❌ AlphaBake integration test failed:', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

// Run the test
testAlphaBakeIntegration();
