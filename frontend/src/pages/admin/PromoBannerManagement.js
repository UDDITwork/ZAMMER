import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiUpload, FiEdit2, FiTrash2, FiImage, FiCheck, FiX, FiEye, FiEyeOff, FiDatabase, FiAlertCircle, FiLink, FiTag } from 'react-icons/fi';
import { getAllPromoBannersAdmin, createPromoBanner, updatePromoBanner, deletePromoBanner, seedPromoBanners } from '../../services/promoBannerService';

const PromoBannerManagement = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [seedingProgress, setSeedingProgress] = useState(null);

  const initialFormData = {
    title: '',
    subtitle: '',
    discountText: '',
    ctaText: 'SHOP NOW',
    linkUrl: '/user/shop',
    displayOrder: 0,
    showOnHomePage: true,
    showOnDashboard: true,
    targetGender: 'all',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllPromoBannersAdmin();
      if (response.success) {
        setBanners(response.data || []);
      }
    } catch (error) {
      toast.error('Failed to fetch promo banners');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const resetForm = () => {
    setFormData(initialFormData);
    setPreviewImage(null);
    setImageBase64(null);
    setEditingBanner(null);
    setShowForm(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
      setImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!editingBanner && !imageBase64) {
      toast.error('Image is required');
      return;
    }

    setUploading(true);
    try {
      const payload = {
        ...formData,
      };

      if (imageBase64) {
        payload.image = imageBase64;
      }

      if (editingBanner) {
        await updatePromoBanner(editingBanner._id, payload);
        toast.success('Promo banner updated successfully');
      } else {
        await createPromoBanner(payload);
        toast.success('Promo banner created successfully');
      }

      resetForm();
      fetchBanners();
    } catch (error) {
      toast.error(editingBanner ? 'Failed to update promo banner' : 'Failed to create promo banner');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      discountText: banner.discountText || '',
      ctaText: banner.ctaText || 'SHOP NOW',
      linkUrl: banner.linkUrl || '/user/shop',
      displayOrder: banner.displayOrder || 0,
      showOnHomePage: banner.showOnHomePage !== false,
      showOnDashboard: banner.showOnDashboard !== false,
      targetGender: banner.targetGender || 'all',
    });
    setPreviewImage(banner.imageUrl);
    setImageBase64(null);
    setShowForm(true);
  };

  const handleToggleActive = async (banner) => {
    try {
      await updatePromoBanner(banner._id, { isActive: !banner.isActive });
      toast.success(`Banner ${banner.isActive ? 'hidden' : 'shown'}`);
      fetchBanners();
    } catch (error) {
      toast.error('Failed to toggle banner');
    }
  };

  const handleDelete = async (banner) => {
    if (!window.confirm(`Delete "${banner.title}"? This cannot be undone.`)) return;

    try {
      await deletePromoBanner(banner._id);
      toast.success('Promo banner deleted');
      fetchBanners();
    } catch (error) {
      toast.error('Failed to delete promo banner');
    }
  };

  const handleSeed = async () => {
    if (!window.confirm('Seed promo banners from embedded data? This will clear existing promo banners and insert new ones.')) return;

    setSeeding(true);
    setSeedingProgress({ status: 'starting', message: 'Starting seed process...' });

    try {
      setSeedingProgress({ status: 'seeding', message: 'Seeding promo banners...' });
      const response = await seedPromoBanners(true);

      if (response.success) {
        setSeedingProgress({
          status: 'success',
          message: 'Promo banners seeded successfully!',
          data: response.data,
        });
        fetchBanners();
        setTimeout(() => setSeedingProgress(null), 5000);
      } else {
        setSeedingProgress({
          status: 'error',
          message: response.message || 'Seeding failed',
        });
      }
    } catch (error) {
      setSeedingProgress({
        status: 'error',
        message: error?.response?.data?.message || 'Failed to seed promo banners',
      });
    } finally {
      setSeeding(false);
    }
  };

  const genderLabels = { men: 'Men', women: 'Women', kids: 'Kids', all: 'All' };
  const genderColors = { men: 'bg-blue-100 text-blue-700', women: 'bg-pink-100 text-pink-700', kids: 'bg-green-100 text-green-700', all: 'bg-gray-100 text-gray-700' };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promo Banner Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage discount & promotional banners shown on HomePage and Dashboard</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <FiDatabase className="w-4 h-4" />
            {seeding ? 'Seeding...' : 'Seed from JSON'}
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors"
          >
            <FiImage className="w-4 h-4" />
            Add Promo Banner
          </button>
        </div>
      </div>

      {/* Seeding Progress */}
      {seedingProgress && (
        <div className={`mb-6 p-4 rounded-xl border ${
          seedingProgress.status === 'success' ? 'bg-green-50 border-green-200' :
          seedingProgress.status === 'error' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {seedingProgress.status === 'success' ? (
              <FiCheck className="w-5 h-5 text-green-600" />
            ) : seedingProgress.status === 'error' ? (
              <FiAlertCircle className="w-5 h-5 text-red-600" />
            ) : (
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
            <span className={`font-medium text-sm ${
              seedingProgress.status === 'success' ? 'text-green-700' :
              seedingProgress.status === 'error' ? 'text-red-700' :
              'text-blue-700'
            }`}>
              {seedingProgress.message}
            </span>
          </div>
          {seedingProgress.data && (
            <div className="text-sm text-gray-600 space-y-1 mt-2">
              <p>Deleted: {seedingProgress.data.deletedCount} | Inserted: {seedingProgress.data.insertedCount}</p>
              <p>Active in database: {seedingProgress.data.totalActive}</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-8 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingBanner ? 'Edit Promo Banner' : 'Add New Promo Banner'}
            </h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title & Subtitle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. NEW Drop"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. Fresh Styles Just In"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Discount Text & CTA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Text</label>
                <input
                  type="text"
                  value={formData.discountText}
                  onChange={(e) => setFormData({ ...formData, discountText: e.target.value })}
                  placeholder="e.g. UPTO 70% OFF"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA Text</label>
                <input
                  type="text"
                  value={formData.ctaText}
                  onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                  placeholder="e.g. SHOP NOW"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Link URL & Target Gender */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
                <div className="relative">
                  <FiLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.linkUrl}
                    onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                    placeholder="/user/browse/Men%20Fashion"
                    className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Gender</label>
                <select
                  value={formData.targetGender}
                  onChange={(e) => setFormData({ ...formData, targetGender: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="men">Men</option>
                  <option value="women">Women</option>
                  <option value="kids">Kids</option>
                </select>
              </div>
            </div>

            {/* Display Order & Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-6 md:col-span-2 pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showOnHomePage}
                    onChange={(e) => setFormData({ ...formData, showOnHomePage: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Show on HomePage</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showOnDashboard}
                    onChange={(e) => setFormData({ ...formData, showOnDashboard: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Show on Dashboard</span>
                </label>
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banner Image {editingBanner ? '(leave empty to keep current)' : '*'}
              </label>
              <div className="flex items-center gap-4">
                <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl px-4 py-6 cursor-pointer hover:border-orange-400 transition-colors">
                  <FiUpload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-500">Click to upload (PNG/JPEG, max 10MB)</span>
                  <input type="file" accept="image/png,image/jpeg" onChange={handleImageUpload} className="hidden" />
                </label>
                {previewImage && (
                  <img src={previewImage} alt="Preview" className="w-20 h-20 object-cover rounded-xl border" />
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={uploading}
                className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiCheck className="w-4 h-4" />
                )}
                {editingBanner ? 'Update Banner' : 'Create Banner'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Banner Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : banners.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((banner) => (
            <div key={banner._id} className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all ${!banner.isActive ? 'opacity-60 border-gray-200' : 'border-gray-200 hover:shadow-md'}`}>
              {/* Image */}
              <div className="relative h-48 bg-gray-100">
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />

                {/* Badges */}
                {banner.discountText && (
                  <span className="absolute top-3 left-3 bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
                    {banner.discountText}
                  </span>
                )}
                <span className={`absolute top-3 right-3 text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded ${genderColors[banner.targetGender] || genderColors.all}`}>
                  {genderLabels[banner.targetGender] || 'All'}
                </span>
                {!banner.isActive && (
                  <span className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold uppercase px-2 py-1 rounded">
                    Inactive
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{banner.title}</h3>
                {banner.subtitle && <p className="text-gray-500 text-xs mb-2">{banner.subtitle}</p>}

                <div className="flex items-center gap-1 text-gray-400 text-xs mb-3">
                  <FiLink className="w-3 h-3" />
                  <span className="truncate">{banner.linkUrl}</span>
                </div>

                {/* Page visibility badges */}
                <div className="flex gap-2 mb-3">
                  {banner.showOnHomePage && (
                    <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 text-[10px] font-medium px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                      HomePage
                    </span>
                  )}
                  {banner.showOnDashboard && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-medium px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      Dashboard
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                  <FiTag className="w-3 h-3" />
                  <span>Order: {banner.displayOrder}</span>
                  {banner.ctaText && <span className="ml-2">CTA: {banner.ctaText}</span>}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleEdit(banner)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-orange-600 bg-orange-50 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors"
                  >
                    <FiEdit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(banner)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-blue-600 bg-blue-50 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                  >
                    {banner.isActive ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}
                    {banner.isActive ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => handleDelete(banner)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-red-600 bg-red-50 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
          <FiImage className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No promo banners yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create promotional banners to show discount offers on HomePage and Dashboard</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors"
          >
            Add First Promo Banner
          </button>
        </div>
      )}
    </div>
  );
};

export default PromoBannerManagement;
