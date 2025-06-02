const jwt = require('jsonwebtoken');

// Generate JWT token with proper error handling
const generateToken = (id) => {
  try {
    if (!id) {
      throw new Error('User ID is required for token generation');
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    console.log('🔑 Generating JWT token for user:', id);
    
    const token = jwt.sign(
      { id: id.toString() }, // Ensure ID is string
      process.env.JWT_SECRET,
      {
        expiresIn: '30d',
        issuer: 'zammer-app',
        algorithm: 'HS256'
      }
    );

    console.log('✅ JWT token generated successfully');
    
    // Verify the token immediately to ensure it's valid
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verification successful:', { userId: decoded.id });
    
    return token;
  } catch (error) {
    console.error('❌ JWT Token generation error:', error);
    throw new Error(`Token generation failed: ${error.message}`);
  }
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    if (!token) {
      throw new Error('Token is required');
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { success: true, decoded };
  } catch (error) {
    console.error('❌ Token verification error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { generateToken, verifyToken };