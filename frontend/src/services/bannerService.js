import api from './api';

// Public: fetch banners by level and category filters
export const getBanners = async (params) => {
  try {
    const response = await api.get('/banners', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching banners:', error);
    return { success: false, data: [] };
  }
};

// Admin: fetch all banners grouped by level
export const getAllBannersAdmin = async () => {
  try {
    const response = await api.get('/banners/admin/all');
    return response.data;
  } catch (error) {
    console.error('Error fetching admin banners:', error);
    return { success: false, data: {} };
  }
};

// Admin: create banner with image upload
export const createBanner = async (bannerData) => {
  try {
    const response = await api.post('/banners', bannerData);
    return response.data;
  } catch (error) {
    console.error('Error creating banner:', error);
    throw error;
  }
};

// Admin: update banner
export const updateBanner = async (id, bannerData) => {
  try {
    const response = await api.put(`/banners/${id}`, bannerData);
    return response.data;
  } catch (error) {
    console.error('Error updating banner:', error);
    throw error;
  }
};

// Admin: delete banner
export const deleteBanner = async (id) => {
  try {
    const response = await api.delete(`/banners/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting banner:', error);
    throw error;
  }
};

// Admin: seed banners from banner_urls.json
export const seedBanners = async (clearExisting = false) => {
  try {
    const response = await api.post(`/banners/seed?clear=${clearExisting}`);
    return response.data;
  } catch (error) {
    console.error('Error seeding banners:', error);
    throw error;
  }
};

export default {
  getBanners,
  getAllBannersAdmin,
  createBanner,
  updateBanner,
  deleteBanner,
  seedBanners,
};
