// File: /backend/utils/passwordDebug.js - Password debugging utility

const bcrypt = require('bcryptjs');
const User = require('../models/User');

const passwordDebug = {
  
  // Test password hashing consistency
  async testHashing(plainPassword) {
    console.log('\n🔐 TESTING PASSWORD HASHING');
    console.log('================================');
    
    try {
      // Test with different salt rounds
      const rounds = [10, 12];
      
      for (const saltRounds of rounds) {
        console.log(`\n📊 Testing with ${saltRounds} salt rounds:`);
        
        const salt = await bcrypt.genSalt(saltRounds);
        const hash1 = await bcrypt.hash(plainPassword, salt);
        const hash2 = await bcrypt.hash(plainPassword, saltRounds);
        
        console.log(`Salt: ${salt}`);
        console.log(`Hash 1 (with salt): ${hash1}`);
        console.log(`Hash 2 (direct): ${hash2}`);
        
        // Test comparison
        const match1 = await bcrypt.compare(plainPassword, hash1);
        const match2 = await bcrypt.compare(plainPassword, hash2);
        
        console.log(`Hash 1 matches: ${match1}`);
        console.log(`Hash 2 matches: ${match2}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Hashing test failed:', error);
      return false;
    }
  },

  // Test a specific user's password
  async testUserPassword(email, testPassword) {
    console.log('\n👤 TESTING USER PASSWORD');
    console.log('==========================');
    console.log(`Email: ${email}`);
    console.log(`Test Password: ${testPassword}`);
    
    try {
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        console.log('❌ User not found');
        return false;
      }
      
      console.log(`\n📋 User Info:`);
      console.log(`ID: ${user._id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Password length: ${user.password.length}`);
      console.log(`Password format: ${user.password.substring(0, 10)}...`);
      console.log(`Is hashed format: ${user.password.startsWith('$2')}`);
      console.log(`Account active: ${user.isActive}`);
      console.log(`Account locked: ${user.isLocked}`);
      console.log(`Login attempts: ${user.loginAttempts || 0}`);
      
      // Test password matching
      console.log(`\n🔍 Password Testing:`);
      
      // Method 1: Using user's matchPassword method
      const match1 = await user.matchPassword(testPassword);
      console.log(`User.matchPassword(): ${match1}`);
      
      // Method 2: Direct bcrypt comparison
      const match2 = await bcrypt.compare(testPassword, user.password);
      console.log(`Direct bcrypt.compare(): ${match2}`);
      
      // Method 3: Test with different variations
      const variations = [
        testPassword,
        testPassword.trim(),
        testPassword.toLowerCase(),
        testPassword.toUpperCase()
      ];
      
      console.log(`\n🔄 Testing variations:`);
      for (const variation of variations) {
        const match = await bcrypt.compare(variation, user.password);
        console.log(`"${variation}": ${match}`);
      }
      
      return { match1, match2, user };
      
  } catch (error) {
      console.error('❌ User password test failed:', error);
      return false;
    }
  },

  // Create a test user with known password
  async createTestUser() {
    console.log('\n🆕 CREATING TEST USER');
    console.log('======================');
    
    const testUserData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      mobileNumber: '+1234567890'
    };
    
    try {
      // Delete existing test user
      await User.deleteOne({ email: testUserData.email });
      console.log('🗑️ Deleted existing test user');
      
      // Create new test user
      const user = await User.create(testUserData);
      console.log('✅ Test user created successfully');
      console.log(`ID: ${user._id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Password length: ${user.password.length}`);
      console.log(`Password format: ${user.password.substring(0, 10)}...`);
      
      // Test the password immediately
      const match = await user.matchPassword('password123');
      console.log(`Password test: ${match}`);
      
      return user;
      
    } catch (error) {
      console.error('❌ Test user creation failed:', error);
      return false;
    }
  },

  // Reset a user's password manually
  async resetUserPassword(email, newPassword) {
    console.log('\n🔄 RESETTING USER PASSWORD');
    console.log('============================');
    console.log(`Email: ${email}`);
    console.log(`New Password: ${newPassword}`);
    
    try {
      const user = await User.findOne({ email });
      
      if (!user) {
        console.log('❌ User not found');
      return false;
    }
    
      console.log(`Found user: ${user.name}`);
      console.log(`Old password length: ${user.password.length}`);
      
      // Update password (will trigger pre-save hashing)
      user.password = newPassword;
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      
      await user.save();
      
      console.log(`✅ Password updated successfully`);
      console.log(`New password length: ${user.password.length}`);
      
      // Test new password
      const match = await user.matchPassword(newPassword);
      console.log(`New password test: ${match}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Password reset failed:', error);
      return false;
    }
  },

  // Comprehensive password audit
  async auditAllUsers() {
    console.log('\n🔍 AUDITING ALL USER PASSWORDS');
    console.log('================================');
    
    try {
      const users = await User.find({}).select('+password').limit(10);
      
      console.log(`Found ${users.length} users to audit`);
      
      for (const user of users) {
        console.log(`\n👤 ${user.email}:`);
        console.log(`  Password length: ${user.password.length}`);
        console.log(`  Is hashed: ${user.password.startsWith('$2')}`);
        console.log(`  Account active: ${user.isActive}`);
        console.log(`  Login attempts: ${user.loginAttempts || 0}`);
        console.log(`  Last login: ${user.lastLogin || 'Never'}`);
      }
      
      return users;
      
  } catch (error) {
      console.error('❌ User audit failed:', error);
    return false;
    }
  },

  // Test the complete login flow
  async testLoginFlow(email, password) {
    console.log('\n🚪 TESTING COMPLETE LOGIN FLOW');
    console.log('================================');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    
    try {
      // Step 1: Find user
      console.log('\n1️⃣ Finding user...');
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        console.log('❌ User not found');
        return { success: false, step: 'user_not_found' };
      }
      
      console.log('✅ User found');
      
      // Step 2: Check account status
      console.log('\n2️⃣ Checking account status...');
      if (user.isLocked) {
        console.log('❌ Account is locked');
        return { success: false, step: 'account_locked' };
      }
      
      if (!user.isActive) {
        console.log('❌ Account is inactive');
        return { success: false, step: 'account_inactive' };
      }
      
      console.log('✅ Account status OK');
      
      // Step 3: Verify password
      console.log('\n3️⃣ Verifying password...');
      const isMatch = await user.matchPassword(password);
      
      if (!isMatch) {
        console.log('❌ Password does not match');
        return { success: false, step: 'password_mismatch' };
      }
      
      console.log('✅ Password matches');
      
      // Step 4: Login success
      console.log('\n4️⃣ Login successful!');
      return { 
        success: true, 
        user: {
          _id: user._id,
          name: user.name,
          email: user.email
        }
      };
      
    } catch (error) {
      console.error('❌ Login flow test failed:', error);
      return { success: false, step: 'error', error: error.message };
    }
  }
};

module.exports = passwordDebug;