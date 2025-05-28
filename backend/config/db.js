const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('🔌 Attempting to connect to MongoDB...');
    
    // 🎯 FIXED: Updated connection options compatible with MongoDB Driver v6+
    const connectionOptions = {
      // Connection Pool Settings
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      
      // Retry Configuration
      retryWrites: true,
      retryReads: true,
      
      // Heartbeat Settings
      heartbeatFrequencyMS: 10000,
      
      // Family setting for IPv4/IPv6
      family: 4 // Force IPv4
    };

    // 🎯 IMPROVED: Enhanced error handling and logging
    mongoose.connection.on('connecting', () => {
      console.log('📡 Connecting to MongoDB Atlas...');
    });

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB Atlas connected successfully');
      console.log(`📍 Connected to: ${mongoose.connection.host}:${mongoose.connection.port}`);
      console.log(`📊 Database: ${mongoose.connection.name}`);
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error.message);
      console.error('🔍 Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        codeName: error.codeName
      });
      
      // 🎯 ADDED: Specific error handling for common issues
      if (error.message.includes('authentication failed')) {
        console.error('🚨 Authentication Error! Check:');
        console.error('1. Username and password in connection string');
        console.error('2. Database user permissions');
        console.error('3. IP whitelist configuration');
      } else if (error.message.includes('getaddrinfo ENOTFOUND')) {
        console.error('🚨 Network Error! Check:');
        console.error('1. Internet connection');
        console.error('2. MongoDB Atlas cluster status');
        console.error('3. DNS resolution');
      }
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // 🎯 ENHANCED: Connection with retry logic
    const connectWithRetry = async (retryCount = 0) => {
      const maxRetries = 3;
      
      try {
        const mongoURI = process.env.MONGO_URI;
        
        if (!mongoURI) {
          throw new Error('MONGO_URI environment variable is not defined');
        }

        console.log(`🔗 Connection attempt ${retryCount + 1}/${maxRetries + 1}`);
        console.log(`🌐 Connecting to: ${mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

        await mongoose.connect(mongoURI, connectionOptions);
        
        console.log('🎉 MongoDB Atlas connection established successfully!');
        return true;

      } catch (error) {
        console.error(`❌ Connection attempt ${retryCount + 1} failed:`, error.message);
        
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 2000; // Exponential backoff
          console.log(`⏳ Retrying in ${delay/1000} seconds...`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return connectWithRetry(retryCount + 1);
        } else {
          console.error('🚨 All connection attempts failed. Please check:');
          console.error('1. Internet connection');
          console.error('2. MongoDB Atlas cluster status');
          console.error('3. Connection string accuracy');
          console.error('4. IP whitelist configuration');
          console.error('5. Database user permissions');
          
          throw error;
        }
      }
    };

    await connectWithRetry();

  } catch (error) {
    console.error('💥 Fatal MongoDB connection error:', error);
    
    // 🎯 ADDED: Environment-specific error handling
    if (process.env.NODE_ENV === 'production') {
      console.error('🔧 Production environment detected. Consider:');
      console.error('- Checking environment variables');
      console.error('- Verifying network policies');
      console.error('- Reviewing MongoDB Atlas logs');
    } else {
      console.error('🛠️ Development environment detected. Try:');
      console.error('- Updating dependencies: npm update');
      console.error('- Checking .env file configuration');
      console.error('- Testing connection string manually');
    }
    
    // Don't exit the process, let the application handle the error
    throw error;
  }
};

// 🎯 ADDED: Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Graceful shutdown...');
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM. Graceful shutdown...');
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
});

module.exports = connectDB;