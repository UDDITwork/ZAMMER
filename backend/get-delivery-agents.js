// backend/get-delivery-agents.js - Get Delivery Agent Login Credentials
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB Atlas with proper options
async function connectToDatabase() {
  try {
    // MongoDB Atlas connection string format
    const mongoURI = process.env.MONGO_URI;
    
    if (!mongoURI) {
      console.error('❌ MONGO_URI not found in .env file');
      console.log('\n💡 Please add this to your .env file:');
      console.log('   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/zammer?retryWrites=true&w=majority');
      console.log('\n   Replace:');
      console.log('   - username: your MongoDB Atlas username');
      console.log('   - password: your MongoDB Atlas password');
      console.log('   - cluster: your actual cluster name');
      console.log('   - zammer: your database name');
      return false;
    }
    
    console.log('🔌 MongoDB Atlas se connect kar raha hun...');
    console.log('📍 URI:', mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials in log
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ MongoDB Atlas se connect ho gaya!\n');
    return true;
  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Connection Error: Cluster not found');
      console.log('   Check your cluster name in the connection string');
      console.log('   Make sure you have internet connection');
    } else if (error.message.includes('Authentication failed')) {
      console.log('\n💡 Authentication Error: Wrong username/password');
      console.log('   Check your MongoDB Atlas credentials');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Connection Refused: Check your network/firewall');
    }
    
    return false;
  }
}

// Import DeliveryAgent model
const DeliveryAgent = require('./models/DeliveryAgent');

async function getDeliveryAgentCredentials() {
  try {
    console.log('🔍 Delivery Agent Credentials Fetch kar raha hun...\n');
    
    // Saare delivery agents ko fetch karo
    const agents = await DeliveryAgent.find({}, {
      name: 1,
      email: 1,
      mobileNumber: 1,
      isActive: 1,
      status: 1,
      createdAt: 1
    }).sort({ createdAt: -1 });

    if (agents.length === 0) {
      console.log('❌ Database mein koi delivery agent nahi mila');
      return;
    }

    console.log(`✅ Total ${agents.length} delivery agent(s) mile:\n`);
    console.log('='.repeat(80));
    
    agents.forEach((agent, index) => {
      console.log(`\n${index + 1}. DELIVERY AGENT KI DETAILS:`);
      console.log(`   Name: ${agent.name}`);
      console.log(`   Email: ${agent.email}`);
      console.log(`   Mobile: ${agent.mobileNumber}`);
      console.log(`   Status: ${agent.status || 'N/A'}`);
      console.log(`   Active: ${agent.isActive ? '✅ Yes' : '❌ No'}`);
      console.log(`   Created: ${agent.createdAt.toLocaleDateString()}`);
      console.log('   ' + '-'.repeat(40));
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n📋 LOGIN KE LIYE YE USE KARO:');
    console.log('   In email addresses ko delivery portal mein login karne ke liye use karo');
    console.log('   Passwords hashed hain, retrieve nahi kar sakte');
    console.log('   Password reset karne ke liye forgot password feature use karo\n');

    // Sirf email addresses dikhao easy copying ke liye
    console.log('📧 EMAIL ADDRESSES (Login ke liye):');
    agents.forEach((agent, index) => {
      console.log(`   ${index + 1}. ${agent.email}`);
    });

    console.log('\n🔑 PASSWORD RESET KE LIYE:');
    console.log('   1. Delivery portal mein "Forgot Password" click karo');
    console.log('   2. Email address enter karo');
    console.log('   3. Reset link check karo email mein');

  } catch (error) {
    console.error('❌ Error aaya delivery agents fetch karne mein:', error.message);
    console.error('🔍 Full error:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 Database connection band kar diya');
    }
  }
}

// Main function
async function main() {
  try {
    const connected = await connectToDatabase();
    if (connected) {
      await getDeliveryAgentCredentials();
    }
  } catch (error) {
    console.error('❌ Main error:', error.message);
  } finally {
    process.exit(0);
  }
}

// Script ko run karo
main();
