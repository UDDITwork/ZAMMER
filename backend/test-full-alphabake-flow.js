const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const ALPHABAKE_API_KEY = process.env.ALPHABAKE_API_KEY;
const ALPHABAKE_BASE_URL = 'https://api.alphabake.io/api/v2';

async function testFullAlphaBakeFlow() {
  console.log('🔍 Testing Full AlphaBake Flow...');
  console.log('🔍 API Key:', ALPHABAKE_API_KEY ? 'Present' : 'Missing');
  console.log('🔍 Base URL:', ALPHABAKE_BASE_URL);

  try {
    // Step 1: Get pre-signed URL for human image
    console.log('\n📤 Step 1: Getting pre-signed URL for human image...');
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

    const humanId = presignedResponse.data.key;
    const presignedUrl = presignedResponse.data.presigned_url_upload;

    // Step 2: Create a test image file (1x1 pixel JPEG)
    console.log('\n🖼️ Step 2: Creating test image...');
    const testImagePath = path.join(__dirname, 'test-image.jpg');
    
    // Create a minimal JPEG file (1x1 pixel)
    const jpegHeader = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
      0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
      0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x8A, 0xFF, 0xD9
    ]);
    
    fs.writeFileSync(testImagePath, jpegHeader);
    console.log('✅ Test image created:', testImagePath);

    // Step 3: Upload image to AlphaBake
    console.log('\n📤 Step 3: Uploading image to AlphaBake...');
    const imageBuffer = fs.readFileSync(testImagePath);
    
    const uploadResponse = await axios.put(
      presignedUrl,
      imageBuffer,
      {
        headers: {
          'Content-Type': 'image/jpeg'
        },
        timeout: 60000
      }
    );

    console.log('✅ Image upload response:', {
      status: uploadResponse.status,
      statusText: uploadResponse.statusText
    });

    // Step 4: Wait for processing
    console.log('\n⏳ Step 4: Waiting 5 seconds for AlphaBake to process image...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 5: Verify human ID exists
    console.log('\n🔍 Step 5: Verifying human ID exists...');
    try {
      const verifyResponse = await axios.get(
        `${ALPHABAKE_BASE_URL}/human/${encodeURIComponent(humanId)}`,
        {
          headers: {
            'Authorization': `Bearer ${ALPHABAKE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      console.log('✅ Human ID verification successful:', {
        status: verifyResponse.status,
        data: verifyResponse.data
      });
    } catch (verifyError) {
      console.log('❌ Human ID verification failed:', {
        status: verifyError.response?.status,
        message: verifyError.response?.data?.message || verifyError.message
      });
    }

    // Step 6: Test try-on request creation
    console.log('\n🎯 Step 6: Testing try-on request creation...');
    const testGarmentUrl = 'https://res.cloudinary.com/dr17ap4sb/image/upload/v1756039358/zammer_uploads/fzacbtdyqgmbkraunuw3.jpg';
    
    try {
      const tryOnResponse = await axios.post(
        `${ALPHABAKE_BASE_URL}/tryon/`,
        {
          human_id: humanId,
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

      console.log('✅ Try-on request created successfully:', {
        status: tryOnResponse.status,
        data: tryOnResponse.data
      });
    } catch (tryOnError) {
      console.log('❌ Try-on request failed:', {
        status: tryOnError.response?.status,
        message: tryOnError.response?.data?.message || tryOnError.message,
        response: tryOnError.response?.data
      });
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test files...');
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      console.log('✅ Test image deleted');
    }

    console.log('\n✅ Full AlphaBake flow test completed');

  } catch (error) {
    console.error('❌ Full AlphaBake flow test failed:', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

// Run the test
testFullAlphaBakeFlow();
