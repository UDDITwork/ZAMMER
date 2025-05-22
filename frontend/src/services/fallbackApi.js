// Mock API service for testing purposes
const fallbackApi = {
  // Mock user login
  loginUser: async (credentials) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check for test credentials
    if (credentials.email === 'test@example.com' && credentials.password === 'password123') {
      return {
        success: true,
        data: {
          _id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          mobileNumber: '1234567890',
          token: 'test-token-123',
          location: {
            coordinates: [0, 0],
            address: 'Test Address'
          }
        }
      };
    }

    // Return error for invalid credentials
    return {
      success: false,
      message: 'Invalid credentials'
    };
  },

  // Mock user registration
  registerUser: async (userData) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if email is already taken
    if (userData.email === 'test@example.com') {
      return {
        success: false,
        message: 'User already exists'
      };
    }

    // Return success for new registration
    return {
      success: true,
      data: {
        _id: 'new-user-id',
        name: userData.name,
        email: userData.email,
        mobileNumber: userData.mobileNumber,
        token: 'new-user-token-123',
        location: userData.location || {
          coordinates: [0, 0],
          address: ''
        }
      }
    };
  },

  // Mock password reset token verification
  verifyResetToken: async (token) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check for test token
    if (token === 'test-reset-token') {
      return {
        success: true,
        message: 'Token is valid'
      };
    }

    return {
      success: false,
      message: 'Invalid or expired token'
    };
  },

  // Mock password reset
  resetPassword: async (token, newPassword) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check for test token
    if (token === 'test-reset-token') {
      return {
        success: true,
        message: 'Password reset successful'
      };
    }

    return {
      success: false,
      message: 'Invalid or expired token'
    };
  }
};

export default fallbackApi; 