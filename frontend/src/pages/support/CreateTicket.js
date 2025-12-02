import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import supportService from '../../services/supportService';
import ImageUpload from '../../components/support/ImageUpload';

const CreateTicket = () => {
  const navigate = useNavigate();
  const { sellerAuth, userAuth, deliveryAgentAuth } = useContext(AuthContext);
  const [userType, setUserType] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    category: '',
    customReason: '',
    description: '',
    attachments: []
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Determine user type from auth context
    if (userAuth.isAuthenticated) {
      setUserType('buyer');
    } else if (sellerAuth.isAuthenticated) {
      setUserType('seller');
    } else if (deliveryAgentAuth.isAuthenticated) {
      setUserType('delivery');
    } else {
      // Not authenticated, redirect to login
      toast.error('Please login to create a support ticket');
      navigate('/');
      return;
    }

    // Load categories
    loadCategories();
  }, [userAuth, sellerAuth, deliveryAgentAuth, navigate]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const currentUserType = userAuth.isAuthenticated ? 'buyer' : 
                             sellerAuth.isAuthenticated ? 'seller' : 'delivery';
      const response = await supportService.getCategories(currentUserType);
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImagesChange = (images) => {
    setFormData(prev => ({
      ...prev,
      attachments: images
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    if (formData.category === 'OTHER' && !formData.customReason.trim()) {
      newErrors.customReason = 'Please describe your issue';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }

    try {
      setSubmitting(true);

      const ticketData = {
        userType,
        category: formData.category,
        customReason: formData.category === 'OTHER' ? formData.customReason : '',
        description: formData.description.trim(),
        attachments: formData.attachments
      };

      const response = await supportService.createTicket(ticketData);

      if (response.success) {
        toast.success(`Ticket created successfully! Ticket Number: ${response.data.ticketNumber}`);
        
        // Copy ticket number to clipboard
        if (navigator.clipboard) {
          navigator.clipboard.writeText(response.data.ticketNumber);
        }

        // Redirect to ticket detail page
        navigate(`/support/tickets/${response.data.ticketId}`);
      } else {
        throw new Error(response.message || 'Failed to create ticket');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error(error.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  const selectedCategory = categories.find(cat => cat.categoryCode === formData.category);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create Support Ticket</h1>
        <p className="text-gray-600 mt-2">
          Describe your issue and we'll help you resolve it within 24 hours
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Category Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
              errors.category ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={submitting}
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.categoryCode} value={category.categoryCode}>
                {category.categoryName}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1 text-sm text-red-600">{errors.category}</p>
          )}
          {selectedCategory && selectedCategory.description && (
            <p className="mt-1 text-sm text-gray-500">{selectedCategory.description}</p>
          )}
        </div>

        {/* Custom Reason (if Other selected) */}
        {formData.category === 'OTHER' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Please describe your issue *
            </label>
            <input
              type="text"
              name="customReason"
              value={formData.customReason}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                errors.customReason ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Describe your issue"
              disabled={submitting}
            />
            {errors.customReason && (
              <p className="mt-1 text-sm text-red-600">{errors.customReason}</p>
            )}
          </div>
        )}

        {/* Description */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={6}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
              errors.description ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Please provide detailed information about your issue..."
            disabled={submitting}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            {formData.description.length} characters (minimum 10)
          </p>
        </div>

        {/* Image Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Attachments (Optional)
          </label>
          <ImageUpload
            maxImages={5}
            onImagesChange={handleImagesChange}
            existingImages={formData.attachments}
          />
          <p className="mt-2 text-sm text-gray-500">
            Upload images to help us understand your issue better. Maximum 5 images, 10MB each.
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              'Create Ticket'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTicket;

