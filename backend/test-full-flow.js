const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const ALPHABAKE_API_KEY = process.env.ALPHABAKE_API_KEY;
const ALPHABAKE_BASE_URL = 'https://api.alphabake.io/api/v2';

async function testFullFlow() {
  console.log('🔍 Testing Full AlphaBake Flow...');
  console.log('🔍 API Key:', ALPHABAKE_API_KEY ? 'Present' : 'Missing');
  console.log('🔍 Base URL:', ALPHABAKE_BASE_URL);

  try {
    // Step 1: Get pre-signed URL and upload image
    console.log('\n📤 Step 1: Getting pre-signed URL and uploading image...');
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

    if (!presignedResponse.data.presigned_url_upload) {
      throw new Error('No presigned URL received');
    }

    // Create a test image
    const testImagePath = 'test-image.jpg';
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
      0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x80, 0xFF, 0xD9
    ]);
    
    fs.writeFileSync(testImagePath, jpegHeader);
    const imageBuffer = fs.readFileSync(testImagePath);
    
    // Upload the image
    const uploadResponse = await axios.put(
      presignedResponse.data.presigned_url_upload,
      imageBuffer,
      {
        headers: {
          'Content-Type': 'image/jpeg'
        },
        timeout: 60000
      }
    );

    console.log('✅ Upload successful:', {
      status: uploadResponse.status,
      humanId: presignedResponse.data.key
    });

    // Clean up test image
    fs.unlinkSync(testImagePath);

    // Step 2: Wait for processing
    console.log('\n⏳ Step 2: Waiting 10 seconds for AlphaBake to process the image...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Step 3: Try different try-on endpoints
    const humanId = presignedResponse.data.key;
    const garmentUrl = 'https://res.cloudinary.com/dr17ap4sb/image/upload/v1756039358/zammer_uploads/fzacbtdyqgmbkraunuw3.jpg';
    
    console.log('\n🎯 Step 3: Testing try-on request...');
    console.log('🔍 Using:', {
      humanId,
      garmentUrl,
      garmentType: 'full'
    });

    // Try different endpoint variations
    const endpoints = [
      `${ALPHABAKE_BASE_URL}/tryon/`,
      `${ALPHABAKE_BASE_URL}/tryon`,
      `${ALPHABAKE_BASE_URL}/try-on/`,
      `${ALPHABAKE_BASE_URL}/try-on`,
      `${ALPHABAKE_BASE_URL}/virtual-tryon/`,
      `${ALPHABAKE_BASE_URL}/virtual-tryon`
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`\n🔄 Trying endpoint: ${endpoint}`);
        
        const tryOnResponse = await axios.post(
          endpoint,
          {
            human_id: humanId,
            garment_url: garmentUrl,
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

        console.log(`✅ SUCCESS with endpoint: ${endpoint}`);
        console.log('Response:', {
          status: tryOnResponse.status,
          data: tryOnResponse.data
        });
        return; // Exit on first success

      } catch (error) {
        console.log(`❌ Failed with endpoint: ${endpoint}`);
        console.log('Error:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message
        });
      }
    }

    console.log('\n❌ All try-on endpoints failed');

  } catch (error) {
    console.error('❌ Test failed:', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testFullFlow();
