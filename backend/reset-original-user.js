// Reset original user account
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('./models/User');

async function resetOriginalUser() {
  try {
    console.log('🔄 Resetting original user account...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/zammer');
    console.log('✅ Connected to database\n');

    const userEmail = 'udditkantsinha2@gmail.com';
    
    // Delete the existing user
    console.log('🗑️  Deleting existing user...');
    const deleteResult = await User.deleteOne({ email: userEmail });
    console.log('✅ Delete result:', deleteResult);

    // Create a fresh user with the same details
    console.log('\n🆕 Creating fresh user account...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('jpmc123', salt);
    
    const newUser = new User({
      name: 'MANOHAR LAL',
      email: userEmail,
      password: hashedPassword,
      mobileNumber: '9876543211', // Unique mobile number
      location: {
        address: 'Your Address' // You can update this
      }
    });

    await newUser.save();
    console.log('✅ Fresh user created successfully!');
    console.log('👤 Name:', newUser.name);
    console.log('📧 Email:', newUser.email);
    console.log('🔑 Password: jpmc123');

    // Test the password
    const passwordTest = await bcrypt.compare('jpmc123', newUser.password);
    console.log('✅ Password test:', passwordTest ? 'SUCCESS' : 'FAILED');

    console.log('\n🎉 Original user account reset completed!');
    console.log('📧 Email:', userEmail);
    console.log('🔑 Password: jpmc123');
    console.log('\nYou can now login with these credentials.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

resetOriginalUser();
