// Save this file in your backend directory and run with: node check-server.js
const http = require('http');

console.log('Checking if server is running on port 5000...');

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/',
  method: 'GET',
  timeout: 3000 // 3 second timeout
}, (res) => {
  console.log(`✅ Server is running! Status code: ${res.statusCode}`);
  console.log('Port 5000 is actively accepting connections.');
  process.exit(0);
});

req.on('error', (error) => {
  console.error('❌ Server check failed!');
  
  if (error.code === 'ECONNREFUSED') {
    console.error('ECONNREFUSED: No process is listening on port 5000.');
    console.error('\nPossible causes:');
    console.error('1. Backend server is not running');
    console.error('2. Backend server crashed during startup');
    console.error('3. Backend server is running on a different port');
    console.error('4. Port 5000 is blocked by another process');
    
    console.error('\nSuggested actions:');
    console.error('1. Start your backend server with: npm start');
    console.error('2. Check for errors during backend startup');
    console.error('3. Try using a different port in your .env file');
    console.error('4. Check if another process is using port 5000');
  } else {
    console.error(`Error code: ${error.code}`);
    console.error(`Error message: ${error.message}`);
  }
  
  process.exit(1);
});

req.on('timeout', () => {
  console.error('❌ Connection timeout!');
  console.error('The server did not respond within 3 seconds.');
  req.destroy();
  process.exit(1);
});

req.end();