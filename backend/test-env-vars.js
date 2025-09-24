// Test environment variables loading
require('dotenv').config();

console.log('Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('CASHFREE_PAYOUT_CLIENT_ID_DEV:', process.env.CASHFREE_PAYOUT_CLIENT_ID_DEV);
console.log('CASHFREE_PAYOUT_SECRET_KEY_DEV:', process.env.CASHFREE_PAYOUT_SECRET_KEY_DEV);
console.log('CASHFREE_PAYOUT_WEBHOOK_SECRET_DEV:', process.env.CASHFREE_PAYOUT_WEBHOOK_SECRET_DEV);
console.log('CASHFREE_PAYOUT_PUBLIC_KEY_DEV:', process.env.CASHFREE_PAYOUT_PUBLIC_KEY_DEV);

// Test the config
try {
  const { getConfig } = require('./config/cashfree');
  const config = getConfig();
  console.log('Config loaded successfully:', config);
} catch (error) {
  console.error('Config loading failed:', error.message);
}
