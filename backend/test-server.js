// Save this file in your backend directory and run with: node test-server.js
const express = require('express');
const cors = require('cors');

// Create a minimal express app
const app = express();
app.use(cors());
app.use(express.json());

// Add a simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Test server is running!' });
});

// Add test endpoints matching your problematic routes
app.get('/api/products/marketplace', (req, res) => {
  res.json({
    success: true,
    products: [
      { id: 1, name: 'Test Product 1', price: 99 },
      { id: 2, name: 'Test Product 2', price: 199 }
    ],
    page: req.query.page || 1,
    limit: req.query.limit || 10,
    totalPages: 1,
  });
});

app.get('/api/users/nearby-shops', (req, res) => {
  res.json({
    success: true,
    shops: [
      { id: 1, name: 'Test Shop 1', distance: '0.5 km' },
      { id: 2, name: 'Test Shop 2', distance: '1.2 km' }
    ]
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Test server running on port ${PORT}`);
  console.log(`Try these URLs in your browser:`);
  console.log(`  • http://localhost:${PORT}/api/health`);
  console.log(`  • http://localhost:${PORT}/api/products/marketplace?page=1&limit=8`);
  console.log(`  • http://localhost:${PORT}/api/users/nearby-shops`);
});