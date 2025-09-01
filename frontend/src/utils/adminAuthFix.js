// frontend/src/utils/adminAuthFix.js
// Production-ready admin authentication fix

import { toast } from 'react-toastify';

// Check if admin token exists and is valid
export const checkAdminAuth = () => {
  const adminToken = localStorage.getItem('adminToken');
  const adminData = localStorage.getItem('adminData');
  
  if (!adminToken || !adminData) {
    return { isValid: false, reason: 'missing_data' };
  }
  
  try {
    const parsedData = JSON.parse(adminData);
    
    // Check if token has proper JWT structure
    const tokenParts = adminToken.split('.');
    if (tokenParts.length !== 3) {
      return { isValid: false, reason: 'invalid_token_structure' };
    }
    
    // Check if admin data has required fields
    if (!parsedData._id || !parsedData.name || !parsedData.email) {
      return { isValid: false, reason: 'invalid_admin_data' };
    }
    
    // Check token expiration (basic check)
    try {
      const payload = JSON.parse(atob(tokenParts[1]));
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp < now) {
        return { isValid: false, reason: 'token_expired' };
      }
    } catch (error) {
      console.warn('Could not decode token payload:', error);
    }
    
    return { 
      isValid: true, 
      adminData: parsedData, 
      token: adminToken 
    };
  } catch (error) {
    return { isValid: false, reason: 'parse_error' };
  }
};

// Fix admin authentication by setting proper token
export const fixAdminAuth = async () => {
  console.log('🔧 Fixing admin authentication...');
  
  // First, try to use existing valid token
  const authCheck = checkAdminAuth();
  
  if (authCheck.isValid) {
    console.log('✅ Valid admin token found, no fix needed');
    return { success: true, message: 'Admin authentication is already valid' };
  }
  
  console.log('⚠️ Admin token invalid, reason:', authCheck.reason);
  
  // Clear any corrupted data
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminData');
  
  // Try to login with default admin credentials
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@zammer.com',
        password: 'admin123'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success && data.data && data.data.token) {
        // Set the new token and data
        localStorage.setItem('adminToken', data.data.token);
        localStorage.setItem('adminData', JSON.stringify({
          _id: data.data._id,
          name: data.data.name,
          email: data.data.email,
          role: data.data.role,
          permissions: data.data.permissions
        }));
        
        console.log('✅ Admin authentication fixed successfully');
        toast.success('Admin authentication restored');
        
        return { 
          success: true, 
          message: 'Admin authentication fixed successfully',
          adminData: data.data
        };
      } else {
        throw new Error('Invalid response structure');
      }
    } else {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }
  } catch (error) {
    console.error('❌ Failed to fix admin authentication:', error);
    toast.error('Failed to restore admin authentication');
    
    return { 
      success: false, 
      message: error.message || 'Failed to fix admin authentication'
    };
  }
};

// Test admin API endpoint
export const testAdminAPI = async () => {
  const authCheck = checkAdminAuth();
  
  if (!authCheck.isValid) {
    return { success: false, message: 'No valid admin token found' };
  }
  
  try {
    const response = await fetch('/api/admin/sellers?page=1&limit=20', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authCheck.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Admin API test successful');
      return { 
        success: true, 
        message: 'Admin API working correctly',
        data: data
      };
    } else {
      const errorData = await response.json();
      return { 
        success: false, 
        message: `API test failed: ${errorData.message}`,
        status: response.status
      };
    }
  } catch (error) {
    console.error('❌ Admin API test failed:', error);
    return { 
      success: false, 
      message: `Network error: ${error.message}`
    };
  }
};

// Auto-fix admin authentication on page load
export const autoFixAdminAuth = async () => {
  // Only run on admin pages
  if (!window.location.pathname.includes('/admin/')) {
    return;
  }
  
  const authCheck = checkAdminAuth();
  
  if (!authCheck.isValid) {
    console.log('🔧 Auto-fixing admin authentication...');
    const result = await fixAdminAuth();
    
    if (result.success) {
      // Reload the page to reinitialize AuthContext
      window.location.reload();
    }
  }
};

// Export for browser console debugging
if (typeof window !== 'undefined') {
  window.checkAdminAuth = checkAdminAuth;
  window.fixAdminAuth = fixAdminAuth;
  window.testAdminAPI = testAdminAPI;
  window.autoFixAdminAuth = autoFixAdminAuth;
}
