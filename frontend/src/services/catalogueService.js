/**
 * Catalogue Service for ZAMMER Marketplace
 * Handles all catalogue-related API calls
 */

import api from './api';

// Create a new catalogue (draft or submitted)
export const createCatalogue = async (catalogueData) => {
  try {
    const response = await api.post('/catalogues', catalogueData);
    return response.data;
  } catch (error) {
    console.error('Create catalogue error:', error);
    throw error.response?.data || { success: false, message: 'Failed to create catalogue' };
  }
};

// Save catalogue as draft
export const saveCatalogueDraft = async (catalogueData) => {
  try {
    const response = await api.post('/catalogues', { ...catalogueData, status: 'draft' });
    return response.data;
  } catch (error) {
    console.error('Save draft error:', error);
    throw error.response?.data || { success: false, message: 'Failed to save draft' };
  }
};

// Submit catalogue for processing
export const submitCatalogue = async (catalogueId) => {
  try {
    const response = await api.post(`/catalogues/${catalogueId}/submit`);
    return response.data;
  } catch (error) {
    console.error('Submit catalogue error:', error);
    throw error.response?.data || { success: false, message: 'Failed to submit catalogue' };
  }
};

// Get all catalogues for the seller
export const getSellerCatalogues = async (params = {}) => {
  try {
    const response = await api.get('/catalogues', { params });
    return response.data;
  } catch (error) {
    console.error('Get catalogues error:', error);
    throw error.response?.data || { success: false, message: 'Failed to fetch catalogues' };
  }
};

// Get a single catalogue by ID
export const getCatalogueById = async (catalogueId) => {
  try {
    const response = await api.get(`/catalogues/${catalogueId}`);
    return response.data;
  } catch (error) {
    console.error('Get catalogue error:', error);
    throw error.response?.data || { success: false, message: 'Failed to fetch catalogue' };
  }
};

// Update a draft catalogue
export const updateCatalogue = async (catalogueId, catalogueData) => {
  try {
    const response = await api.put(`/catalogues/${catalogueId}`, catalogueData);
    return response.data;
  } catch (error) {
    console.error('Update catalogue error:', error);
    throw error.response?.data || { success: false, message: 'Failed to update catalogue' };
  }
};

// Delete a catalogue
export const deleteCatalogue = async (catalogueId, deleteProducts = false) => {
  try {
    const response = await api.delete(`/catalogues/${catalogueId}`, {
      params: { deleteProducts }
    });
    return response.data;
  } catch (error) {
    console.error('Delete catalogue error:', error);
    throw error.response?.data || { success: false, message: 'Failed to delete catalogue' };
  }
};

// Upload image for catalogue product
export const uploadCatalogueImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Upload image error:', error);
    throw error.response?.data || { success: false, message: 'Failed to upload image' };
  }
};

// Helper function to prepare catalogue data for submission
export const prepareCatalogueData = (category, products, options = {}) => {
  return {
    category: {
      level1: category.level1,
      level2: category.level2,
      level3: category.level3,
      level4: category.level4 || '',
      path: category.path || `${category.level1} > ${category.level2} > ${category.level3}${category.level4 ? ' > ' + category.level4 : ''}`
    },
    products: products.map(product => ({
      name: product.name,
      description: product.description || '',
      zammerPrice: Number(product.zammerPrice),
      mrp: Number(product.mrp),
      images: product.images || [],
      variants: product.variants || [{ size: 'M', color: 'Black', colorCode: '#000000', quantity: 1 }],
      fabricType: product.fabricType || ''
    })),
    gst: options.gst || '',
    hsnCode: options.hsnCode || '',
    name: options.name || `Catalogue ${new Date().toLocaleDateString()}`,
    status: options.status || 'draft'
  };
};

export default {
  createCatalogue,
  saveCatalogueDraft,
  submitCatalogue,
  getSellerCatalogues,
  getCatalogueById,
  updateCatalogue,
  deleteCatalogue,
  uploadCatalogueImage,
  prepareCatalogueData
};
