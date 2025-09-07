// Emergency password fix script
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('./backend/models/User');

async function fixPasswordIssue() {
  try {
    console.log('🔧 Fixing password issue...\n');

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
    console.log('🔍 Current password hash:', user.password.substring(0, 20) + '...\n');

    // Test current passwords
    const testPasswords = ['jpmc123', 'jpmcA123'];
    
    for (const password of testPasswords) {
      const isValid = await bcrypt.compare(password, user.password);
      console.log(`🔐 Testing password "${password}": ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    }

    console.log('\n🛠️  Setting password to a known working value...');
    
    // Set password to a known working value
    const newPassword = 'jpmc123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    user.password = hashedPassword;
    await user.save();
    
    console.log('✅ Password reset to:', newPassword);
    console.log('🔍 New password hash:', user.password.substring(0, 20) + '...\n');

    // Verify the new password works
    const verification = await bcrypt.compare(newPassword, user.password);
    console.log('✅ Password verification:', verification ? 'SUCCESS' : 'FAILED');

    console.log('\n🎉 Password fix completed!');
    console.log('📧 Email:', userEmail);
    console.log('🔑 Password:', newPassword);
    console.log('\nYou can now login with these credentials.');

  } catch (error) {
    console.error('❌ Error fixing password:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the fix
fixPasswordIssue();
