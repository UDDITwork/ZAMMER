import api from './api';

// Public: fetch active promo banners for a specific page
export const getPromoBanners = async (params) => {
  try {
    const response = await api.get('/promo-banners', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching promo banners:', error);
    return { success: false, data: [] };
  }
};

// Admin: fetch all promo banners
export const getAllPromoBannersAdmin = async () => {
  try {
    const response = await api.get('/promo-banners/admin/all');
    return response.data;
  } catch (error) {
    console.error('Error fetching admin promo banners:', error);
    return { success: false, data: [] };
  }
};

// Admin: create promo banner
export const createPromoBanner = async (bannerData) => {
  try {
    const response = await api.post('/promo-banners', bannerData);
    return response.data;
  } catch (error) {
    console.error('Error creating promo banner:', error);
    throw error;
  }
};

// Admin: update promo banner
export const updatePromoBanner = async (id, bannerData) => {
  try {
    const response = await api.put(`/promo-banners/${id}`, bannerData);
    return response.data;
  } catch (error) {
    console.error('Error updating promo banner:', error);
    throw error;
  }
};

// Admin: delete promo banner
export const deletePromoBanner = async (id) => {
  try {
    const response = await api.delete(`/promo-banners/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting promo banner:', error);
    throw error;
  }
};

// Admin: seed promo banners from embedded data
export const seedPromoBanners = async (clearExisting = false) => {
  try {
    const response = await api.post(`/promo-banners/seed?clear=${clearExisting}`);
    return response.data;
  } catch (error) {
    console.error('Error seeding promo banners:', error);
    throw error;
  }
};
