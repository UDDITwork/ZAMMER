const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const getAdminToken = () => {
  try {
    const adminAuth = JSON.parse(localStorage.getItem('adminAuth') || '{}');
    return adminAuth.token || localStorage.getItem('adminToken') || '';
  } catch {
    return '';
  }
};

const brandProductSeedService = {
  // Seed all 52 brand products
  async seedBrandProducts() {
    const response = await fetch(`${API_BASE_URL}/brand-products/seed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAdminToken()}`
      }
    });
    return response.json();
  },

  // Clear all seeded brand products
  async clearBrandProducts() {
    const response = await fetch(`${API_BASE_URL}/brand-products/clear`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAdminToken()}`
      }
    });
    return response.json();
  },

  // Get current seed status
  async getBrandSeedStatus() {
    const response = await fetch(`${API_BASE_URL}/brand-products/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAdminToken()}`
      }
    });
    return response.json();
  }
};

export default brandProductSeedService;
