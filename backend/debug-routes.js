// Create this file as debug-routes.js in your backend folder
const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

console.log('Testing route files one by one...\n');

// Test each route file individually
const routeFiles = [
  { name: 'productRoutes', path: './routes/productRoutes' },
  { name: 'userRoutes', path: './routes/userRoutes' },
  { name: 'sellerRoutes', path: './routes/sellerRoutes' },
  { name: 'reviewRoutes', path: './routes/reviewRoutes' },
  { name: 'uploadRoutes', path: './routes/uploadRoutes' },
  { name: 'cartRoutes', path: './routes/cartRoutes' }
];

async function testRoutes() {
  for (const route of routeFiles) {
    try {
      console.log(`✓ Testing ${route.name}...`);
      const routeModule = require(route.path);
      
      // Try to use the route
      app.use(`/test/${route.name}`, routeModule);
      console.log(`✓ ${route.name} loaded successfully`);
      
    } catch (error) {
      console.error(`❌ ERROR in ${route.name}:`);
      console.error(`   ${error.message}`);
      console.error(`   This is likely the problematic route file!\n`);
      
      // Exit after finding the first error
      process.exit(1);
    }
  }
  
  console.log('\n✅ All route files loaded successfully!');
  console.log('The issue might be in how routes are being used in app.js');
}

testRoutes();