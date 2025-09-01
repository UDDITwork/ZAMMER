// create-test-delivery-agent.js - Create Test Delivery Agent for Order Sync Testing
const mongoose = require('mongoose');
const DeliveryAgent = require('./backend/models/DeliveryAgent');
require('dotenv').config();

const createTestDeliveryAgent = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    
    // Use the same connection string from your .env file
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables. Please check your .env file.');
    }
    
    // Log connection attempt (hide password)
    const safeUri = mongoUri.replace(/:([^:@]+)@/, ':****@');
    console.log('🔗 Connecting to:', safeUri);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully');

    // Check if test delivery agent already exists
    const existingAgent = await DeliveryAgent.findOne({ email: 'testagent@zammer.com' });
    
    if (existingAgent) {
      console.log('⚠️ Test delivery agent already exists with email: testagent@zammer.com');
      console.log('📧 Agent Details:', {
        id: existingAgent._id,
        name: existingAgent.name,
        email: existingAgent.email,
        status: existingAgent.status,
        isActive: existingAgent.isActive,
        createdAt: existingAgent.createdAt
      });
      
      // Update password to ensure it's correct
      console.log('🔄 Updating password for existing test agent...');
      existingAgent.password = 'agent123';
      await existingAgent.save();
      console.log('✅ Password updated successfully');
      
      console.log('\n🔑 Test Login Credentials:');
      console.log('   Email: testagent@zammer.com');
      console.log('   Password: agent123');
      
      process.exit(0);
    }

    // Create new test delivery agent
    const agentData = {
      name: 'Test Delivery Agent',
      email: 'testagent@zammer.com',
      password: 'agent123',
      mobileNumber: '9999999999',
      address: '123 Test Street, Test City, Test State',
      vehicleType: 'Bicycle',
      vehicleModel: 'Test Bike',
      vehicleRegistration: 'TEST123',
      licenseNumber: 'TEST123456',
      workingAreas: 'Test Area 1, Test Area 2',
      emergencyContact: 'Emergency: 9999999998',
      status: 'available',
      isActive: true
    };

    console.log('🔧 Creating new test delivery agent...');
    const agent = new DeliveryAgent(agentData);
    await agent.save();

    console.log('✅ Test delivery agent created successfully!');
    console.log('📧 Agent Details:', {
      id: agent._id,
      name: agent.name,
      email: agent.email,
      status: agent.status,
      isActive: agent.isActive,
      createdAt: agent.createdAt
    });
    
    console.log('\n🔑 Test Login Credentials:');
    console.log('   Email: testagent@zammer.com');
    console.log('   Password: agent123');
    console.log('   Status: available');
    console.log('   Active: Yes');

  } catch (error) {
    console.error('❌ Error creating test delivery agent:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
};

// Run the script
createTestDeliveryAgent();
