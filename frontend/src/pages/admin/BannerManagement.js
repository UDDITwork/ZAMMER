import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiUpload, FiEdit2, FiTrash2, FiImage, FiCheck, FiX, FiChevronDown, FiEye, FiEyeOff, FiDatabase, FiAlertCircle } from 'react-icons/fi';
import { getAllBannersAdmin, createBanner, updateBanner, deleteBanner, seedBanners } from '../../services/bannerService';
import { getLevel1Options, getLevel2Options, getLevel3Options } from '../../data/categoryHierarchy';

const BannerManagement = () => {
  const [banners, setBanners] = useState({ level1: [], level2: [], level3: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);

  // Seeding state
  const [seeding, setSeeding] = useState(false);
  const [seedingProgress, setSeedingProgress] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    categoryLevel1: '',
    categoryLevel2: '',
    categoryLevel3: '',
    title: '',
    subtitle: '',
    displayOrder: 0,
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);

  const level1Options = getLevel1Options();

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAllBannersAdmin();
      if (response.success) {
        setBanners(response.data);
      }
    } catch (error) {
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const resetForm = () => {
    setFormData({
      categoryLevel1: '',
      categoryLevel2: '',
      categoryLevel3: '',
      title: '',
      subtitle: '',
      displayOrder: 0,
    });
    setPreviewImage(null);
    setImageBase64(null);
    setEditingBanner(null);
    setShowForm(false);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG or JPEG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewImage(event.target.result);
      setImageBase64(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      if (editingBanner) {
        const updateData = {
          title: formData.title,
          subtitle: formData.subtitle,
          displayOrder: formData.displayOrder,
        };
        if (imageBase64) {
          updateData.image = imageBase64;
        }
        await updateBanner(editingBanner._id, updateData);
        toast.success('Banner updated successfully');
      } else {
        if (!imageBase64) {
          toast.error('Please select an image');
          setUploading(false);
          return;
        }
        await createBanner({
          level: activeTab,
          categoryLevel1: formData.categoryLevel1,
          categoryLevel2: activeTab >= 2 ? formData.categoryLevel2 : undefined,
          categoryLevel3: activeTab === 3 ? formData.categoryLevel3 : undefined,
          title: formData.title,
          subtitle: formData.subtitle,
          displayOrder: formData.displayOrder,
          image: imageBase64,
        });
        toast.success('Banner created successfully');
      }
      resetForm();
      fetchBanners();
    } catch (error) {
      toast.error(editingBanner ? 'Failed to update banner' : 'Failed to create banner');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      categoryLevel1: banner.categoryLevel1,
      categoryLevel2: banner.categoryLevel2 || '',
      categoryLevel3: banner.categoryLevel3 || '',
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      displayOrder: banner.displayOrder || 0,
    });
    setPreviewImage(banner.imageUrl);
    setImageBase64(null);
    setShowForm(true);
  };

  const handleDelete = async (bannerId) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    try {
      await deleteBanner(bannerId);
      toast.success('Banner deleted');
      fetchBanners();
    } catch (error) {
      toast.error('Failed to delete banner');
    }
  };

  const handleToggleActive = async (banner) => {
    try {
      await updateBanner(banner._id, { isActive: !banner.isActive });
      toast.success(banner.isActive ? 'Banner deactivated' : 'Banner activated');
      fetchBanners();
    } catch (error) {
      toast.error('Failed to toggle banner status');
    }
  };

  const handleSeedBanners = async () => {
    const confirmMessage = banners.level1.length > 0 || banners.level2.length > 0 || banners.level3.length > 0
      ? 'This will replace all existing banners with AI-generated banners from banner_urls.json. Continue?'
      : 'This will seed the database with AI-generated banners from banner_urls.json. Continue?';

    if (!window.confirm(confirmMessage)) return;

    setSeeding(true);
    setSeedingProgress({ status: 'starting', message: 'Connecting to database...' });

    try {
      const clearExisting = banners.level1.length > 0 || banners.level2.length > 0 || banners.level3.length > 0;
      setSeedingProgress({ status: 'seeding', message: 'Reading banner_urls.json and inserting banners...' });

      const response = await seedBanners(clearExisting);

      if (response.success) {
        setSeedingProgress({
          status: 'success',
          message: 'Database seeded successfully!',
          data: response.data
        });
        toast.success(`Successfully seeded ${response.data.insertedCount} banners!`);
        fetchBanners();

        // Clear success message after 5 seconds
        setTimeout(() => {
          setSeedingProgress(null);
        }, 5000);
      } else {
        throw new Error(response.message || 'Seeding failed');
      }
    } catch (error) {
      console.error('Seeding error:', error);
      setSeedingProgress({
        status: 'error',
        message: error.response?.data?.message || error.message || 'Failed to seed banners. Make sure banner_urls.json exists in the scripts folder.'
      });
      toast.error('Failed to seed banners');
    } finally {
      setSeeding(false);
    }
  };

  const currentBanners = banners[`level${activeTab}`] || [];

  const getLevel2OptionsForForm = () => {
    if (!formData.categoryLevel1) return [];
    return getLevel2Options(formData.categoryLevel1);
  };

  const getLevel3OptionsForForm = () => {
    if (!formData.categoryLevel1 || !formData.categoryLevel2) return [];
    return getLevel3Options(formData.categoryLevel1, formData.categoryLevel2);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Banner Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage homepage banners and category posters across all 3 levels
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSeedBanners}
            disabled={seeding}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Seed database from banner_urls.json (production-ready)"
          >
            {seeding ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Seeding...</span>
              </>
            ) : (
              <>
                <FiDatabase className="w-4 h-4" />
                <span>Seed from JSON</span>
              </>
            )}
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <FiUpload className="w-4 h-4" />
            <span>Add Banner</span>
          </button>
        </div>
      </div>

      {/* Seeding Progress */}
      {seedingProgress && (
        <div className={`border rounded-xl p-4 ${
          seedingProgress.status === 'success' ? 'bg-green-50 border-green-200' :
          seedingProgress.status === 'error' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start space-x-3">
            {seedingProgress.status === 'success' ? (
              <FiCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : seedingProgress.status === 'error' ? (
              <FiAlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            ) : (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                seedingProgress.status === 'success' ? 'text-green-900' :
                seedingProgress.status === 'error' ? 'text-red-900' :
                'text-blue-900'
              }`}>
                {seedingProgress.message}
              </p>
              {seedingProgress.data && (
                <div className="mt-2 text-xs text-gray-700 space-y-1">
                  <p>✓ Deleted: {seedingProgress.data.deletedCount} existing banners</p>
                  <p>✓ Inserted: {seedingProgress.data.insertedCount} new banners</p>
                  <p>✓ Database counts - L1: {seedingProgress.data.counts.level1}, L2: {seedingProgress.data.counts.level2}, L3: {seedingProgress.data.counts.level3}</p>
                  <p>✓ Source file - L1: {seedingProgress.data.source.level1}, L2: {seedingProgress.data.source.level2}, L3: {seedingProgress.data.source.level3}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Level Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {[1, 2, 3].map((level) => (
          <button
            key={level}
            onClick={() => setActiveTab(level)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === level
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Level {level}
            {level === 1 && ' - Main Banners'}
            {level === 2 && ' - Category Posters'}
            {level === 3 && ' - Subcategory Posters'}
            <span className="ml-2 text-xs opacity-75">
              ({(banners[`level${level}`] || []).length})
            </span>
          </button>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingBanner ? 'Edit Banner' : `Add Level ${activeTab} Banner`}
            </h3>
            <button onClick={resetForm} className="p-2 text-gray-400 hover:text-gray-600">
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category Dropdowns */}
            {!editingBanner && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Level 1 Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category (Level 1)</label>
                  <div className="relative">
                    <select
                      value={formData.categoryLevel1}
                      onChange={(e) => setFormData({ ...formData, categoryLevel1: e.target.value, categoryLevel2: '', categoryLevel3: '' })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none"
                      required
                    >
                      <option value="">Select...</option>
                      {level1Options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <FiChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Level 2 Category (for level 2+ banners) */}
                {activeTab >= 2 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory (Level 2)</label>
                    <div className="relative">
                      <select
                        value={formData.categoryLevel2}
                        onChange={(e) => setFormData({ ...formData, categoryLevel2: e.target.value, categoryLevel3: '' })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none"
                        required={activeTab >= 2}
                        disabled={!formData.categoryLevel1}
                      >
                        <option value="">Select...</option>
                        {getLevel2OptionsForForm().map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <FiChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Level 3 Category (for level 3 banners) */}
                {activeTab === 3 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Group (Level 3)</label>
                    <div className="relative">
                      <select
                        value={formData.categoryLevel3}
                        onChange={(e) => setFormData({ ...formData, categoryLevel3: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none"
                        required={activeTab === 3}
                        disabled={!formData.categoryLevel2}
                      >
                        <option value="">Select...</option>
                        {getLevel3OptionsForForm().map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <FiChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Title and Subtitle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Banner title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle (optional)</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Banner subtitle..."
                />
              </div>
            </div>

            {/* Display Order */}
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                min="0"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banner Image {editingBanner ? '(leave empty to keep current)' : ''}
              </label>
              <div className="flex items-start space-x-4">
                <div className="flex-1">
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                    <FiImage className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Click to upload PNG or JPEG</span>
                    <span className="text-xs text-gray-400 mt-1">Max 10MB</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                </div>
                {previewImage && (
                  <div className="w-40 h-40 rounded-xl overflow-hidden border border-gray-200">
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="submit"
                disabled={uploading}
                className="flex items-center space-x-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <FiCheck className="w-4 h-4" />
                    <span>{editingBanner ? 'Update Banner' : 'Create Banner'}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Banners Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-gray-200 border-t-orange-600" />
        </div>
      ) : currentBanners.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentBanners.map((banner) => (
            <div
              key={banner._id}
              className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md ${
                banner.isActive ? 'border-gray-200' : 'border-red-200 opacity-60'
              }`}
            >
              {/* Image */}
              <div className="relative h-48 bg-gray-100">
                <img
                  src={banner.imageUrl}
                  alt={banner.title || banner.categoryLevel1}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                {!banner.isActive && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-red-600 text-white text-xs rounded-full font-medium">
                    Inactive
                  </div>
                )}
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded-full">
                  Level {banner.level}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {banner.categoryLevel1}
                  {banner.categoryLevel2 && ` > ${banner.categoryLevel2}`}
                  {banner.categoryLevel3 && ` > ${banner.categoryLevel3}`}
                </div>
                {banner.title && (
                  <p className="text-sm text-gray-600">{banner.title}</p>
                )}
                {banner.subtitle && (
                  <p className="text-xs text-gray-400">{banner.subtitle}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">Order: {banner.displayOrder}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center border-t border-gray-100 divide-x divide-gray-100">
                <button
                  onClick={() => handleEdit(banner)}
                  className="flex-1 flex items-center justify-center space-x-1 py-2 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                >
                  <FiEdit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleToggleActive(banner)}
                  className="flex-1 flex items-center justify-center space-x-1 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  {banner.isActive ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}
                  <span>{banner.isActive ? 'Hide' : 'Show'}</span>
                </button>
                <button
                  onClick={() => handleDelete(banner._id)}
                  className="flex-1 flex items-center justify-center space-x-1 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <FiTrash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
          <FiImage className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No Level {activeTab} Banners</h3>
          <p className="text-sm text-gray-500 mb-4">
            {activeTab === 1 && 'Add homepage sliding banners for Men, Women, and Kids Fashion'}
            {activeTab === 2 && 'Add category poster images for Level 2 subcategories'}
            {activeTab === 3 && 'Add product group poster images for Level 3 subcategories'}
          </p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <FiUpload className="w-4 h-4" />
            <span>Add First Banner</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default BannerManagement;
