// backend/tests/setup.js
// Jest setup file for backend tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/zammer_test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_only';

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
});

// Global test cleanup
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
