/**
 * Support Service
 * Handles all support ticket related API calls
 */

import api from './api';

/**
 * Create a new support ticket
 * @param {Object} ticketData - Ticket data including userType, category, description, attachments
 * @returns {Promise<Object>} - Created ticket data
 */
export const createTicket = async (ticketData) => {
  try {
    console.log('🎫 Creating support ticket:', {
      userType: ticketData.userType,
      category: ticketData.category,
      hasDescription: !!ticketData.description,
      attachmentsCount: ticketData.attachments?.length || 0
    });

    const response = await api.post('/support/tickets', ticketData);

    console.log('✅ Ticket created successfully:', {
      ticketNumber: response.data.data?.ticketNumber,
      ticketId: response.data.data?.ticketId
    });

    return response.data;
  } catch (error) {
    console.error('❌ Error creating ticket:', error.response?.data || error);
    throw error.response?.data || error;
  }
};

/**
 * Get user's tickets with filters
 * @param {Object} filters - Filter options (status, category, startDate, endDate, page, limit)
 * @returns {Promise<Object>} - Tickets list with pagination
 */
export const getUserTickets = async (filters = {}) => {
  try {
    console.log('📋 Fetching user tickets with filters:', filters);

    const queryParams = new URLSearchParams();
    
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.category) queryParams.append('category', filters.category);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);

    const response = await api.get(`/support/tickets?${queryParams.toString()}`);

    console.log('✅ Tickets fetched:', {
      count: response.data.data?.tickets?.length || 0,
      total: response.data.data?.pagination?.total || 0
    });

    return response.data;
  } catch (error) {
    console.error('❌ Error fetching tickets:', error.response?.data || error);
    throw error.response?.data || error;
  }
};

/**
 * Get single ticket with conversation thread
 * @param {String} ticketId - Ticket ID
 * @returns {Promise<Object>} - Ticket data with messages
 */
export const getTicket = async (ticketId) => {
  try {
    console.log('🔍 Fetching ticket:', ticketId);

    const response = await api.get(`/support/tickets/${ticketId}`);

    console.log('✅ Ticket fetched:', {
      ticketNumber: response.data.data?.ticket?.ticketNumber,
      messagesCount: response.data.data?.messages?.length || 0
    });

    return response.data;
  } catch (error) {
    console.error('❌ Error fetching ticket:', error.response?.data || error);
    throw error.response?.data || error;
  }
};

/**
 * Add message to ticket
 * @param {String} ticketId - Ticket ID
 * @param {Object} messageData - Message data (message, attachments)
 * @returns {Promise<Object>} - Created message
 */
export const addMessage = async (ticketId, messageData) => {
  try {
    console.log('💬 Adding message to ticket:', ticketId);

    const response = await api.post(`/support/tickets/${ticketId}/messages`, messageData);

    console.log('✅ Message added successfully');

    return response.data;
  } catch (error) {
    console.error('❌ Error adding message:', error.response?.data || error);
    throw error.response?.data || error;
  }
};

/**
 * Get categories for user type
 * @param {String} userType - User type (buyer, seller, delivery)
 * @returns {Promise<Object>} - Categories list
 */
export const getCategories = async (userType) => {
  try {
    console.log('📂 Fetching categories for:', userType);

    const response = await api.get(`/support/categories/${userType}`);

    console.log('✅ Categories fetched:', {
      count: response.data.data?.length || 0
    });

    return response.data;
  } catch (error) {
    console.error('❌ Error fetching categories:', error.response?.data || error);
    throw error.response?.data || error;
  }
};

/**
 * Upload image to Cloudinary (reuse existing upload endpoint)
 * @param {File} file - Image file to upload
 * @returns {Promise<Object>} - Upload result with url and public_id
 */
export const uploadImage = async (file) => {
  try {
    console.log('📤 Uploading image to Cloudinary:', file.name);

    const formData = new FormData();
    formData.append('image', file);

    // Get API URL
    const apiUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || '';
    
    const response = await fetch(`${apiUrl}/api/support/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('userToken') || localStorage.getItem('sellerToken') || localStorage.getItem('deliveryAgentToken')}`
      }
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Upload failed');
    }

    console.log('✅ Image uploaded:', data.data.url);

    return {
      url: data.data.url,
      public_id: data.data.public_id
    };
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    throw error;
  }
};

/**
 * Upload multiple images to Cloudinary
 * @param {File[]} files - Array of image files
 * @returns {Promise<Array>} - Array of upload results
 */
export const uploadMultipleImages = async (files) => {
  try {
    console.log('📤 Uploading multiple images:', files.length);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });

    // Get API URL
    const apiUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || '';
    
    const response = await fetch(`${apiUrl}/api/support/upload/multiple`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('userToken') || localStorage.getItem('sellerToken') || localStorage.getItem('deliveryAgentToken')}`
      }
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Upload failed');
    }

    console.log('✅ Images uploaded:', data.data.length);

    return data.data.map(item => ({
      url: item.url,
      public_id: item.public_id
    }));
  } catch (error) {
    console.error('❌ Error uploading images:', error);
    throw error;
  }
};

export default {
  createTicket,
  getUserTickets,
  getTicket,
  addMessage,
  getCategories,
  uploadImage,
  uploadMultipleImages
};

