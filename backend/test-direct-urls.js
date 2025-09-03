const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const ALPHABAKE_API_KEY = process.env.ALPHABAKE_API_KEY;
const ALPHABAKE_BASE_URL = 'https://api.alphabake.io/api/v2';

async function testDirectUrls() {
  console.log('🔍 Testing AlphaBake Direct URLs Approach...');
  console.log('🔍 API Key:', ALPHABAKE_API_KEY ? 'Present' : 'Missing');

  try {
    // Step 1: Create a test image and convert to base64
    console.log('\n📸 Step 1: Creating test image and converting to base64...');
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
    const imageBuffer = fs.readFileSync(testImagePath);
    const humanImageBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    
    console.log('✅ Test image created and converted to base64');
    console.log('🔍 Base64 size:', humanImageBase64.length);

    // Clean up test image
    fs.unlinkSync(testImagePath);

    // Step 2: Test try-on with direct URLs
    console.log('\n🎯 Step 2: Testing try-on with direct URLs...');
    const garmentUrl = 'https://res.cloudinary.com/dr17ap4sb/image/upload/v1756039358/zammer_uploads/fzacbtdyqgmbkraunuw3.jpg';
    
    console.log('🔍 Using:', {
      humanImageSize: humanImageBase64.length,
      garmentUrl,
      garmentType: 'full'
    });

    const tryOnResponse = await axios.post(
      `${ALPHABAKE_BASE_URL}/tryon/`,
      {
        human_url: humanImageBase64,
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

    console.log('🎉 SUCCESS! Try-on request created with direct URLs');
    console.log('Response:', {
      status: tryOnResponse.status,
      data: tryOnResponse.data
    });

    // Step 3: Check status
    if (tryOnResponse.data.tryon_id) {
      console.log('\n📊 Step 3: Checking try-on status...');
      console.log('🔍 Try-on ID:', tryOnResponse.data.tryon_id);
      
      // Wait a bit before checking status
      console.log('⏳ Waiting 5 seconds before checking status...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const statusResponse = await axios.post(
        `${ALPHABAKE_BASE_URL}/tryon_status/`,
        { tryon_id: tryOnResponse.data.tryon_id },
        {
          headers: {
            'Authorization': `Bearer ${ALPHABAKE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      
      console.log('✅ Status check successful:', {
        status: statusResponse.data.status,
        message: statusResponse.data.message
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testDirectUrls();
