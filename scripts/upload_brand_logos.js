const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

cloudinary.config({
  cloud_name: 'dr17ap4sb',
  api_key: '826141828894487',
  api_secret: 'RYIjPUnsL6ooJ89KUWyqzSWe5bQ'
});

const LOGOS_DIR = path.join(__dirname, '..', 'brand_logos');

const LOGOS_TO_UPLOAD = [
  { file: 'Gucci.png', publicId: 'gucci' },
  { file: 'Supreme.svg', publicId: 'supreme' },
  { file: 'Off_White.png', publicId: 'offwhite' },
  { file: 'Tommy_Hilfiger.png', publicId: 'tommy_hilfiger' },
  { file: 'Meesho.png', publicId: 'meesho' },
  { file: 'Van_Heusen.jpg', publicId: 'vanheusen_new' },
  { file: 'Louis_Vuitton.svg', publicId: 'louis_vuitton' },
  { file: 'Uniqlo.png', publicId: 'uniqlo_new' },
  { file: 'Nike.jpg', publicId: 'nike_new' },
  { file: 'Adidas.svg', publicId: 'adidas_new' },
  { file: 'Zara.svg', publicId: 'zara_new' },
  { file: 'HM_Mango_Zara_banner.jpg', publicId: 'hm_mango_zara_banner' },
];

async function uploadAll() {
  const results = {};
  for (const logo of LOGOS_TO_UPLOAD) {
    const filePath = path.join(LOGOS_DIR, logo.file);
    if (!fs.existsSync(filePath)) {
      console.log(`SKIP: ${logo.file} not found`);
      continue;
    }
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'zammer_banners/brand_logos',
        public_id: logo.publicId,
        overwrite: true,
        resource_type: 'image',
      });
      results[logo.publicId] = result.secure_url;
      console.log(`OK: ${logo.file} -> ${result.secure_url}`);
    } catch (err) {
      console.log(`FAIL: ${logo.file} - ${err.message}`);
    }
  }
  console.log('\n=== RESULTS JSON ===');
  console.log(JSON.stringify(results, null, 2));
}

uploadAll();
