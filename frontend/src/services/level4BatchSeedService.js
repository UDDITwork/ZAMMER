import api from './api';

// Seed a batch of Level 4 banners
export const seedLevel4Batch = async (batchNumber = 1, batchSize = 50) => {
  try {
    const response = await api.post('/level4-batch/seed', { batchNumber, batchSize });
    return response.data;
  } catch (error) {
    console.error('Error seeding Level 4 batch:', error);
    throw error;
  }
};

// Clear all Level 4 banners before batch seeding
export const clearLevel4Banners = async () => {
  try {
    const response = await api.delete('/level4-batch/clear');
    return response.data;
  } catch (error) {
    console.error('Error clearing Level 4 banners:', error);
    throw error;
  }
};

// Get current Level 4 seeding status
export const getLevel4SeedStatus = async () => {
  try {
    const response = await api.get('/level4-batch/status');
    return response.data;
  } catch (error) {
    console.error('Error getting Level 4 seed status:', error);
    throw error;
  }
};
