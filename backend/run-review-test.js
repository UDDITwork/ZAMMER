// backend/run-review-test.js
// 🎯 Simple script to run the review system test

const { runTests } = require('./test-review-system');

console.log('🚀 Starting Review System Test...\n');

runTests()
  .then(() => {
    console.log('\n✅ Test execution completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  });


