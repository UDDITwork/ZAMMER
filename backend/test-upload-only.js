const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const ALPHABAKE_API_KEY = process.env.ALPHABAKE_API_KEY;
const ALPHABAKE_BASE_URL = 'https://api.alphabake.io/api/v2';

async function testUploadOnly() {
  console.log('🔍 Testing AlphaBake Upload Only...');
  console.log('🔍 API Key:', ALPHABAKE_API_KEY ? 'Present' : 'Missing');
  console.log('🔍 Base URL:', ALPHABAKE_BASE_URL);

  try {
    // Step 1: Get pre-signed URL
    console.log('\n📤 Step 1: Getting pre-signed URL...');
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

    // Step 2: Create a test image (1x1 pixel JPEG)
    console.log('\n📸 Step 2: Creating test image...');
    const testImagePath = 'test-image.jpg';
    
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
      0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x80, 0xFF, 0xD9
    ]);
    
    fs.writeFileSync(testImagePath, jpegHeader);
    console.log('✅ Test image created:', testImagePath);

    // Step 3: Upload the test image
    console.log('\n📤 Step 3: Uploading test image...');
    const imageBuffer = fs.readFileSync(testImagePath);
    
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

    console.log('✅ Upload response:', {
      status: uploadResponse.status,
      statusText: uploadResponse.statusText,
      headers: uploadResponse.headers
    });

    if (uploadResponse.status === 200) {
      console.log('🎉 Upload successful!');
      console.log('🔍 Human ID:', presignedResponse.data.key);
      console.log('🔍 View URL:', presignedResponse.data.presigned_url_view);
    } else {
      console.log('❌ Upload failed');
    }

    // Clean up
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      console.log('🧹 Test image cleaned up');
    }

  } catch (error) {
    console.error('❌ Test failed:', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testUploadOnly();
