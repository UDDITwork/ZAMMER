require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const createAdmin = async () => {
  try {
    // Wait for connection
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await mongoose.connection.db.collection('admins').insertOne({
      name: "Super Admin",
      email: "admin@zammer.com", 
      password: hashedPassword,
      role: "super_admin",
      permissions: {
        canViewSellers: true,
        canViewUsers: true,
        canManageProducts: true,
        canManageOrders: true
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Admin created successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createAdmin();