const jwt = require('jsonwebtoken');

// 🔑 ENHANCED JWT TOKEN UTILITY WITH ROLE SUPPORT

// Generate JWT token with proper error handling and role support
const generateToken = (id, userType = 'user') => {
  try {
    if (!id) {
      throw new Error('User ID is required for token generation');
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    console.log(`🔑 Generating JWT token for ${userType}:`, id);
    
    // 🎯 FIXED: Use consistent secret based on user type
    let jwtSecret = process.env.JWT_SECRET;
    
    // Use specific secrets if available, otherwise fall back to main secret
    switch (userType) {
      case 'delivery':
      case 'deliveryAgent':
        jwtSecret = process.env.DELIVERY_AGENT_JWT_SECRET || process.env.JWT_SECRET;
        break;
      case 'admin':
        jwtSecret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
        break;
      case 'seller':
      case 'user':
      default:
        jwtSecret = process.env.JWT_SECRET;
        break;
    }

    console.log(`🔐 Using JWT secret for ${userType} (length: ${jwtSecret?.length || 0})`);
    
    const token = jwt.sign(
      { 
        id: id.toString(), // Ensure ID is string
        userType // Include user type in token for verification
      },
      jwtSecret,
      {
        expiresIn: '30d',
        issuer: 'zammer-app',
        algorithm: 'HS256'
      }
    );

    console.log(`✅ JWT token generated successfully for ${userType}`);
    
    // Verify the token immediately to ensure it's valid
    const decoded = jwt.verify(token, jwtSecret);
    console.log('✅ Token verification successful:', { 
      userId: decoded.id, 
      userType: decoded.userType 
    });
    
    return token;
  } catch (error) {
    console.error(`❌ JWT Token generation error for ${userType}:`, error);
    throw new Error(`Token generation failed: ${error.message}`);
  }
};

// 🔍 ENHANCED TOKEN VERIFICATION WITH ROLE SUPPORT
const verifyToken = (token, userType = 'user') => {
  try {
    if (!token) {
      throw new Error('Token is required');
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    console.log(`🔍 Verifying token for ${userType}...`);

    // 🎯 FIXED: Use same secret logic as generation
    let jwtSecret = process.env.JWT_SECRET;
    
    switch (userType) {
      case 'delivery':
      case 'deliveryAgent':
        jwtSecret = process.env.DELIVERY_AGENT_JWT_SECRET || process.env.JWT_SECRET;
        break;
      case 'admin':
        jwtSecret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
        break;
      case 'seller':
      case 'user':
      default:
        jwtSecret = process.env.JWT_SECRET;
        break;
    }

    const decoded = jwt.verify(token, jwtSecret);
    
    console.log(`✅ Token verification successful for ${userType}:`, { 
      userId: decoded.id, 
      tokenUserType: decoded.userType 
    });
    
    return { success: true, decoded };
  } catch (error) {
    console.error(`❌ Token verification error for ${userType}:`, error);
    return { success: false, error: error.message };
  }
};

// 🚚 DELIVERY AGENT SPECIFIC TOKEN FUNCTIONS
const generateDeliveryAgentToken = (agentId) => {
  console.log('🚚 [TOKEN] Generating delivery agent token for:', agentId);
  return generateToken(agentId, 'deliveryAgent');
};

const verifyDeliveryAgentToken = (token) => {
  console.log('🚚 [TOKEN] Verifying delivery agent token...');
  return verifyToken(token, 'deliveryAgent');
};

// 🏪 SELLER SPECIFIC TOKEN FUNCTIONS  
const generateSellerToken = (sellerId) => {
  console.log('🏪 [TOKEN] Generating seller token for:', sellerId);
  return generateToken(sellerId, 'seller');
};

// 👤 USER SPECIFIC TOKEN FUNCTIONS
const generateUserToken = (userId) => {
  console.log('👤 [TOKEN] Generating user token for:', userId);
  return generateToken(userId, 'user');
};

// 🔧 ADMIN SPECIFIC TOKEN FUNCTIONS
const generateAdminToken = (adminId) => {
  console.log('🔧 [TOKEN] Generating admin token for:', adminId);
  return generateToken(adminId, 'admin');
};

// 🎯 SMART TOKEN VERIFICATION (tries different secrets)
const verifyTokenSmart = (token) => {
  console.log('🎯 [TOKEN] Smart token verification starting...');
  
  const userTypes = ['user', 'seller', 'admin', 'deliveryAgent'];
  
  for (const userType of userTypes) {
    try {
      const result = verifyToken(token, userType);
      if (result.success) {
        console.log(`✅ [TOKEN] Smart verification successful as ${userType}`);
        return { ...result, userType };
      }
    } catch (error) {
      // Continue to next user type
      continue;
    }
  }
  
  console.log('❌ [TOKEN] Smart verification failed for all user types');
  return { 
    success: false, 
    error: 'Token verification failed for all user types' 
  };
};

// 📋 TOKEN DEBUGGING UTILITY
const debugToken = (token) => {
  try {
    if (!token) {
      return { error: 'No token provided' };
    }

    // Decode without verification to see payload
    const decoded = jwt.decode(token, { complete: true });
    
    return {
      success: true,
      header: decoded?.header,
      payload: decoded?.payload,
      signature: token.split('.')[2]?.substring(0, 10) + '...',
      tokenLength: token.length,
      issuedAt: decoded?.payload?.iat ? new Date(decoded.payload.iat * 1000) : 'Unknown',
      expiresAt: decoded?.payload?.exp ? new Date(decoded.payload.exp * 1000) : 'Unknown',
      userType: decoded?.payload?.userType || 'Not specified'
    };
  } catch (error) {
    return { error: error.message };
  }
};

module.exports = { 
  generateToken,
  verifyToken,
  generateDeliveryAgentToken,
  verifyDeliveryAgentToken,
  generateSellerToken,
  generateUserToken,
  generateAdminToken,
  verifyTokenSmart,
  debugToken
};