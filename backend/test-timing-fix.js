const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const ALPHABAKE_API_KEY = process.env.ALPHABAKE_API_KEY;
const ALPHABAKE_BASE_URL = 'https://api.alphabake.io/api/v2';

async function testTimingFix() {
  console.log('🔍 Testing AlphaBake Timing Fix...');
  console.log('🔍 API Key:', ALPHABAKE_API_KEY ? 'Present' : 'Missing');

  try {
    // Step 1: Upload image
    console.log('\n📤 Step 1: Uploading image...');
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

    // Create test image
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
    
    // Upload
    await axios.put(
      presignedResponse.data.presigned_url_upload,
      imageBuffer,
      {
        headers: { 'Content-Type': 'image/jpeg' },
        timeout: 60000
      }
    );

    console.log('✅ Upload successful');
    console.log('🔍 Human ID:', presignedResponse.data.key);

    // Clean up
    fs.unlinkSync(testImagePath);

         // Step 2: Test with progressive delays
     console.log('\n🎯 Step 2: Testing try-on with progressive delays...');
     const humanId = presignedResponse.data.key;
     const garmentUrl = 'https://res.cloudinary.com/dr17ap4sb/image/upload/v1756039358/zammer_uploads/fzacbtdyqgmbkraunuw3.jpg';
     
     // Initial wait for AlphaBake to process the image
     console.log('\n⏳ Waiting 30 seconds for AlphaBake to process the uploaded image...');
     await new Promise(resolve => setTimeout(resolve, 30000));
     
     const maxAttempts = 6;
     const baseDelay = 15000; // 15 seconds between attempts
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`\n🔄 Attempt ${attempt}/${maxAttempts}...`);
      
      try {
        const tryOnResponse = await axios.post(
          `${ALPHABAKE_BASE_URL}/tryon/`,
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

        console.log(`🎉 SUCCESS on attempt ${attempt}!`);
        console.log('Response:', {
          status: tryOnResponse.status,
          data: tryOnResponse.data
        });
        return;

      } catch (error) {
        console.log(`❌ Attempt ${attempt} failed:`, {
          status: error.response?.status,
          message: error.response?.data?.message || error.message
        });
        
                 if (attempt < maxAttempts) {
           const waitTime = baseDelay * attempt;
           console.log(`⏳ Waiting ${waitTime}ms before next attempt (AlphaBake needs significant time to process the image)...`);
           await new Promise(resolve => setTimeout(resolve, waitTime));
         }
      }
    }

    console.log('\n❌ All attempts failed');

  } catch (error) {
    console.error('❌ Test failed:', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testTimingFix();
