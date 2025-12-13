#!/usr/bin/env node

/**
 * 🗑️ User Deletion Script
 * 
 * This script deletes users by phone number from DocumentDB
 * 
 * Usage: node backend/scripts/delete-users.js
 * 
 * Target phone numbers:
 * - 7456886877 (Buyer)
 * - 8368824707 (User)
 * 
 * ⚠️  WARNING: This script permanently deletes users from the database!
 * 
 * Prerequisites:
 * - SSH tunnel must be active (see migration report for setup)
 * - MONGO_URI must be configured in backend/.env
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const User = require('../models/User');

// Phone numbers to delete
const PHONE_NUMBERS_TO_DELETE = [
  '7456886877',  // Buyer
  '8368824707'   // User
];

/**
 * Generate all possible phone number variants
 * (matches the logic used in userController.js)
 */
function generatePhoneVariants(phoneNumber) {
  const cleanedPhone = phoneNumber.trim().replace(/\D/g, '');
  const variants = [
    cleanedPhone,
    cleanedPhone.length === 10 ? `91${cleanedPhone}` : null,
    cleanedPhone.startsWith('91') ? cleanedPhone : `91${cleanedPhone}`,
    cleanedPhone.replace(/^91/, '')
  ].filter(Boolean);
  
  // Remove duplicates
  return [...new Set(variants)];
}

/**
 * Find and delete users by phone number
 */
async function deleteUsersByPhone() {
  try {
    // Check if MONGO_URI is set
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not defined. Please check your backend/.env file.');
    }

    console.log('🔗 Connecting to DocumentDB...');
    console.log(`🌐 Connection string: ${process.env.MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

    // Check if SSH tunnel is active (port 27017 should be listening)
    const net = require('net');
    const testConnection = new Promise((resolve) => {
      const testSocket = new net.Socket();
      testSocket.setTimeout(2000);
      testSocket.on('connect', () => {
        testSocket.destroy();
        resolve(true);
      });
      testSocket.on('timeout', () => {
        testSocket.destroy();
        resolve(false);
      });
      testSocket.on('error', () => {
        resolve(false);
      });
      testSocket.connect(27017, '127.0.0.1');
    });

    const tunnelActive = await testConnection;
    if (!tunnelActive) {
      throw new Error('❌ SSH tunnel is not active! Port 27017 is not listening.\n   Please ensure the SSH tunnel is running in another terminal.');
    }
    console.log('✅ SSH tunnel verified - port 27017 is active\n');

    // Connection options for DocumentDB with TLS
    const connectionOptions = {
      tls: true,
      tlsAllowInvalidHostnames: true,
      tlsAllowInvalidCertificates: true,
      retryWrites: false,
      readPreference: 'secondaryPreferred',
      directConnection: true,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      maxPoolSize: 1,
      minPoolSize: 1
    };

    console.log('🔄 Attempting database connection...');
    
    // Try connecting with retry logic
    let connected = false;
    let lastError = null;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   Attempt ${attempt}/${maxRetries}...`);
        await mongoose.connect(process.env.MONGO_URI, connectionOptions);
        connected = true;
        break;
      } catch (connectError) {
        lastError = connectError;
        console.error(`   ❌ Attempt ${attempt} failed:`, connectError.message);
        
        if (attempt < maxRetries) {
          console.log(`   ⏳ Waiting 2 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Close any partial connection
          if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
          }
        }
      }
    }
    
    if (!connected) {
      console.error('\n❌ Connection Error Details:');
      console.error('   Error Type:', lastError.constructor.name);
      console.error('   Error Message:', lastError.message);
      if (lastError.reason) {
        console.error('   Reason:', lastError.reason.message || lastError.reason);
      }
      if (lastError.stack) {
        console.error('\n   Stack trace:', lastError.stack.split('\n').slice(0, 5).join('\n'));
      }
      throw lastError;
    }
    console.log('✅ Connected to DocumentDB successfully!\n');

    let totalDeleted = 0;
    let totalNotFound = 0;

    // Process each phone number
    for (const phoneNumber of PHONE_NUMBERS_TO_DELETE) {
      console.log(`\n📱 Processing phone number: ${phoneNumber}`);
      
      // Generate all possible variants
      const variants = generatePhoneVariants(phoneNumber);
      console.log(`   Searching for variants: ${variants.join(', ')}`);

      // Find users matching any variant
      const users = await User.find({
        mobileNumber: { $in: variants }
      });

      if (users.length === 0) {
        console.log(`   ⚠️  No users found with phone number ${phoneNumber}`);
        totalNotFound++;
        continue;
      }

      // Display found users before deletion
      console.log(`   📋 Found ${users.length} user(s):`);
      users.forEach((user, index) => {
        console.log(`      ${index + 1}. ID: ${user._id}`);
        console.log(`         Name: ${user.name}`);
        console.log(`         Email: ${user.email}`);
        console.log(`         Mobile: ${user.mobileNumber}`);
        console.log(`         Created: ${user.createdAt}`);
      });

      // Delete all matching users
      const deleteResult = await User.deleteMany({
        mobileNumber: { $in: variants }
      });

      console.log(`   ✅ Deleted ${deleteResult.deletedCount} user(s) with phone number ${phoneNumber}`);
      totalDeleted += deleteResult.deletedCount;
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 DELETION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Total users deleted: ${totalDeleted}`);
    console.log(`⚠️  Phone numbers not found: ${totalNotFound}`);
    console.log(`📱 Total phone numbers processed: ${PHONE_NUMBERS_TO_DELETE.length}`);
    console.log('='.repeat(60));

    // Close connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed.');
    console.log('✨ Script completed successfully!');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error occurred:');
    console.error(error.message);
    console.error(error.stack);

    // Close connection if open
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 Database connection closed.');
    }

    process.exit(1);
  }
}

// Run the script
console.log('🚀 Starting user deletion script...');
console.log('⚠️  WARNING: This will permanently delete users from the database!');
console.log(`📱 Target phone numbers: ${PHONE_NUMBERS_TO_DELETE.join(', ')}\n`);

deleteUsersByPhone();

