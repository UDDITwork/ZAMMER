// Debug password issue
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('./backend/models/User');

async function debugPassword() {
  try {
    console.log('🔍 Debugging password issue...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/zammer');
    console.log('✅ Connected to database\n');

    // Find the user
    const userEmail = 'udditkantSinha2@gmail.com';
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      console.log('❌ User not found with email:', userEmail);
      return;
    }

    console.log('👤 Found user:', user.name, user.email);
    console.log('🔍 Current password hash:', user.password);
    console.log('📅 User created:', user.createdAt);
    console.log('📅 User updated:', user.updatedAt);

    // Test different passwords
    const testPasswords = ['jpmc123', 'jpmcA123', 'password123'];
    
    console.log('\n🔐 Testing passwords:');
    for (const password of testPasswords) {
      const isValid = await bcrypt.compare(password, user.password);
      console.log(`  "${password}": ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    }

    // Try to create a fresh hash
    console.log('\n🛠️  Creating fresh password hash...');
    const newPassword = 'jpmc123';
    const salt = await bcrypt.genSalt(10);
    const freshHash = await bcrypt.hash(newPassword, salt);
    
    console.log('🔍 Fresh hash:', freshHash);
    
    // Test the fresh hash
    const freshTest = await bcrypt.compare(newPassword, freshHash);
    console.log('✅ Fresh hash test:', freshTest ? 'SUCCESS' : 'FAILED');

    // Update user with fresh hash
    console.log('\n💾 Updating user with fresh hash...');
    user.password = freshHash;
    await user.save();
    
    console.log('✅ User updated');
    console.log('🔍 New password hash:', user.password);

    // Test login with fresh hash
    const finalTest = await bcrypt.compare(newPassword, user.password);
    console.log('✅ Final test:', finalTest ? 'SUCCESS' : 'FAILED');

    console.log('\n🎉 Password debug completed!');
    console.log('📧 Email:', userEmail);
    console.log('🔑 Password:', newPassword);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

debugPassword();
