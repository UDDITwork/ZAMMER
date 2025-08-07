// backend/createAdmin.js - Create Admin User Script
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

const createAdmin = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    console.log('🔍 Environment check:');
    console.log('   NODE_ENV:', process.env.NODE_ENV || 'not set');
    console.log('   MONGODB_URI exists:', !!process.env.MONGODB_URI);
    
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

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@zammer.com' });
    
    if (existingAdmin) {
      console.log('⚠️ Admin user already exists with email: admin@zammer.com');
      console.log('📧 Admin Details:', {
        id: existingAdmin._id,
        name: existingAdmin.name,
        email: existingAdmin.email,
        role: existingAdmin.role,
        isActive: existingAdmin.isActive,
        createdAt: existingAdmin.createdAt
      });
      
      // Update password to ensure it's correct
      console.log('🔄 Updating password for existing admin...');
      existingAdmin.password = 'admin123';
      await existingAdmin.save();
      console.log('✅ Password updated successfully');
      
      console.log('\n🔑 Login Credentials:');
      console.log('   Email: admin@zammer.com');
      console.log('   Password: admin123');
      // Dynamic frontend URL based on environment
      const getFrontendUrl = () => {
        if (process.env.NODE_ENV === 'production') {
          return process.env.FRONTEND_URL_PROD || 'https://zammer2.uc.r.appspot.com';
        }
        return process.env.FRONTEND_URL_LOCAL || 'http://localhost:3000';
      };
      
      console.log('🌐 Login at:', `${getFrontendUrl()}/admin/login`);
      
      process.exit(0);
    }

    // Create new admin user
    const adminData = {
      name: 'ZAMMER Admin',
      email: 'admin@zammer.com',
      password: 'admin123', // This will be hashed by the pre-save middleware
      role: 'super_admin',
      permissions: {
        canViewSellers: true,
        canViewUsers: true,
        canManageProducts: true,
        canManageOrders: true
      },
      isActive: true
    };

    console.log('🔧 Creating new admin user...');
    const admin = new Admin(adminData);
    await admin.save();

    console.log('✅ Admin user created successfully!');
    console.log('📧 Admin Details:', {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
      isActive: admin.isActive,
      createdAt: admin.createdAt
    });
    
    console.log('\n🔑 Login Credentials:');
    console.log('   Email: admin@zammer.com');
    console.log('   Password: admin123');
    console.log('🌐 Login at:', `${getFrontendUrl()}/admin/login`);

  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    console.error('Full error:', error);
  } finally {
    try {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    } catch (closeError) {
      console.error('❌ Error closing database connection:', closeError.message);
    }
    process.exit(0);
  }
};

// Run the script
createAdmin();