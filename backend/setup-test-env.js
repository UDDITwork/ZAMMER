// File: /backend/setup-test-env.js - Environment setup for testing

const fs = require('fs');
const path = require('path');

console.log('🔧 ZAMMER Authentication Logging Test Setup');
console.log('==========================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found');
  
  if (fs.existsSync(envExamplePath)) {
    console.log('📋 Found .env.example file');
    console.log('💡 Please copy .env.example to .env and configure your settings');
    console.log('💡 Command: cp .env.example .env');
  } else {
    console.log('📝 Creating sample .env file...');
    
    const sampleEnv = `# ZAMMER Environment Configuration
# Copy this file to .env and update with your actual values

# Database
MONGODB_URI=mongodb://localhost:27017/zammer

# JWT Secret (generate a strong secret for production)
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production

# Environment
NODE_ENV=development

# Optional: Other services
# SMEPAY_API_KEY=your_smepay_api_key
# TWILIO_ACCOUNT_SID=your_twilio_sid
# TWILIO_AUTH_TOKEN=your_twilio_token
`;

    fs.writeFileSync(envPath, sampleEnv);
    console.log('✅ Created sample .env file');
    console.log('⚠️  Please update the values in .env with your actual configuration');
  }
} else {
  console.log('✅ .env file found');
}

// Check MongoDB URI
require('dotenv').config();

if (!process.env.MONGODB_URI) {
  console.log('\n❌ MONGODB_URI not found in environment');
  console.log('💡 Please add MONGODB_URI to your .env file');
  console.log('💡 Example: MONGODB_URI=mongodb://localhost:27017/zammer');
} else {
  console.log('✅ MONGODB_URI found in environment');
  console.log(`📍 URI: ${process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`);
}

if (!process.env.JWT_SECRET) {
  console.log('\n❌ JWT_SECRET not found in environment');
  console.log('💡 Please add JWT_SECRET to your .env file');
  console.log('💡 Generate a strong secret: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
} else {
  console.log('✅ JWT_SECRET found in environment');
}

console.log('\n🚀 Setup complete! You can now run:');
console.log('   node test-auth-logging.js');
console.log('\n📋 Make sure MongoDB is running before testing');
