// backend/setup-review-test.js
// 🎯 Setup script to ensure test dependencies are available

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Review System Test...\n');

// Check if axios is installed
try {
  require('axios');
  console.log('✅ axios is already installed');
} catch (error) {
  console.log('❌ axios is not installed');
  console.log('📦 Installing axios...');
  
  const { execSync } = require('child_process');
  try {
    execSync('npm install axios', { stdio: 'inherit' });
    console.log('✅ axios installed successfully');
  } catch (installError) {
    console.error('❌ Failed to install axios:', installError.message);
    console.log('\n💡 Please run: npm install axios');
    process.exit(1);
  }
}

// Check if test files exist
const testFiles = [
  'test-review-system.js',
  'run-review-test.js',
  'REVIEW_TEST_README.md'
];

console.log('\n📁 Checking test files...');
testFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

console.log('\n🎯 Setup complete! You can now run the test:');
console.log('   node run-review-test.js');
console.log('\n📖 For detailed instructions, see: REVIEW_TEST_README.md');


