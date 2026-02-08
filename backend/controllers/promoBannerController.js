const PromoBanner = require('../models/PromoBanner');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

// Embedded promo banner data (AI-generated images from Cloudinary)
// Will be populated after running scripts/generate_promo_banners.py
const PROMO_BANNER_DATA = [];

// GET /api/promo-banners - Public: fetch active promo banners
const getActivePromoBanners = async (req, res) => {
  try {
    const { page, gender } = req.query;

    const filter = { isActive: true };

    if (page === 'homepage') {
      filter.showOnHomePage = true;
    } else if (page === 'dashboard') {
      filter.showOnDashboard = true;
    }

    if (gender && gender !== 'all') {
      filter.targetGender = { $in: [gender, 'all'] };
    }

    const banners = await PromoBanner.find(filter).sort({ displayOrder: 1, createdAt: -1 });

    res.json({ success: true, data: banners, count: banners.length });
  } catch (error) {
    console.error('[PromoBannerController] getActivePromoBanners error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch promo banners' });
  }
};

// GET /api/promo-banners/admin/all - Admin: fetch all promo banners
const getAllPromoBannersAdmin = async (req, res) => {
  try {
    const banners = await PromoBanner.find({}).sort({ displayOrder: 1, createdAt: -1 });

    res.json({ success: true, data: banners, count: banners.length });
  } catch (error) {
    console.error('[PromoBannerController] getAllPromoBannersAdmin error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch promo banners' });
  }
};

// POST /api/promo-banners - Admin: create a promo banner
const createPromoBanner = async (req, res) => {
  try {
    const { title, subtitle, discountText, ctaText, linkUrl, image, imageUrl, cloudinaryPublicId, displayOrder, showOnHomePage, showOnDashboard, targetGender } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    let finalImageUrl = imageUrl;
    let finalPublicId = cloudinaryPublicId;

    // If base64 image provided, upload to Cloudinary
    if (image && !imageUrl) {
      const uploadResult = await uploadToCloudinary(image, 'zammer_banners/promo');
      finalImageUrl = uploadResult.url;
      finalPublicId = uploadResult.public_id;
    }

    if (!finalImageUrl || !finalPublicId) {
      return res.status(400).json({ success: false, message: 'Image is required (provide image as base64 or imageUrl + cloudinaryPublicId)' });
    }

    const banner = await PromoBanner.create({
      imageUrl: finalImageUrl,
      cloudinaryPublicId: finalPublicId,
      linkUrl: linkUrl || '/user/shop',
      title,
      subtitle: subtitle || '',
      discountText: discountText || '',
      ctaText: ctaText || 'SHOP NOW',
      displayOrder: displayOrder || 0,
      showOnHomePage: showOnHomePage !== undefined ? showOnHomePage : true,
      showOnDashboard: showOnDashboard !== undefined ? showOnDashboard : true,
      targetGender: targetGender || 'all',
    });

    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    console.error('[PromoBannerController] createPromoBanner error:', error);
    res.status(500).json({ success: false, message: 'Failed to create promo banner' });
  }
};

// PUT /api/promo-banners/:id - Admin: update a promo banner
const updatePromoBanner = async (req, res) => {
  try {
    const banner = await PromoBanner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Promo banner not found' });
    }

    const { title, subtitle, discountText, ctaText, linkUrl, image, isActive, displayOrder, showOnHomePage, showOnDashboard, targetGender } = req.body;

    // If new image provided, upload and delete old
    if (image) {
      const uploadResult = await uploadToCloudinary(image, 'zammer_banners/promo');
      if (banner.cloudinaryPublicId) {
        await deleteFromCloudinary(banner.cloudinaryPublicId);
      }
      banner.imageUrl = uploadResult.url;
      banner.cloudinaryPublicId = uploadResult.public_id;
    }

    if (title !== undefined) banner.title = title;
    if (subtitle !== undefined) banner.subtitle = subtitle;
    if (discountText !== undefined) banner.discountText = discountText;
    if (ctaText !== undefined) banner.ctaText = ctaText;
    if (linkUrl !== undefined) banner.linkUrl = linkUrl;
    if (isActive !== undefined) banner.isActive = isActive;
    if (displayOrder !== undefined) banner.displayOrder = displayOrder;
    if (showOnHomePage !== undefined) banner.showOnHomePage = showOnHomePage;
    if (showOnDashboard !== undefined) banner.showOnDashboard = showOnDashboard;
    if (targetGender !== undefined) banner.targetGender = targetGender;

    await banner.save();

    res.json({ success: true, data: banner });
  } catch (error) {
    console.error('[PromoBannerController] updatePromoBanner error:', error);
    res.status(500).json({ success: false, message: 'Failed to update promo banner' });
  }
};

// DELETE /api/promo-banners/:id - Admin: delete a promo banner
const deletePromoBanner = async (req, res) => {
  try {
    const banner = await PromoBanner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Promo banner not found' });
    }

    // Delete from Cloudinary
    if (banner.cloudinaryPublicId) {
      await deleteFromCloudinary(banner.cloudinaryPublicId);
    }

    await PromoBanner.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Promo banner deleted successfully' });
  } catch (error) {
    console.error('[PromoBannerController] deletePromoBanner error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete promo banner' });
  }
};

// POST /api/promo-banners/seed - Admin: seed promo banners from embedded data
const seedPromoBanners = async (req, res) => {
  try {
    const bannerData = PROMO_BANNER_DATA;

    if (!bannerData || bannerData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No promo banner data available. Run the generation script first and embed the data.'
      });
    }

    // Clear existing promo banners (optional - controlled by query param)
    const clearExisting = req.query.clear === 'true';
    let deletedCount = 0;

    if (clearExisting) {
      const deleteResult = await PromoBanner.deleteMany({});
      deletedCount = deleteResult.deletedCount;
    }

    // Prepare banner documents
    const bannerDocuments = bannerData.map((banner, idx) => ({
      imageUrl: banner.imageUrl,
      cloudinaryPublicId: banner.cloudinaryPublicId,
      linkUrl: banner.linkUrl || '/user/shop',
      title: banner.title || 'Promo',
      subtitle: banner.subtitle || '',
      discountText: banner.discountText || '',
      ctaText: banner.ctaText || 'SHOP NOW',
      isActive: true,
      showOnHomePage: banner.showOnHomePage !== undefined ? banner.showOnHomePage : true,
      showOnDashboard: banner.showOnDashboard !== undefined ? banner.showOnDashboard : true,
      displayOrder: banner.displayOrder || idx + 1,
      targetGender: banner.targetGender || 'all',
    }));

    // Insert all promo banners
    let insertedBanners = [];
    if (bannerDocuments.length > 0) {
      insertedBanners = await PromoBanner.insertMany(bannerDocuments);
    }

    // Verify count
    const totalCount = await PromoBanner.countDocuments({ isActive: true });

    res.json({
      success: true,
      message: 'Promo banners seeded successfully',
      data: {
        deletedCount,
        insertedCount: insertedBanners.length,
        totalActive: totalCount,
        source: { total: bannerData.length },
      }
    });
  } catch (error) {
    console.error('[PromoBannerController] seedPromoBanners error:', error);
    res.status(500).json({ success: false, message: 'Failed to seed promo banners' });
  }
};

module.exports = {
  getActivePromoBanners,
  getAllPromoBannersAdmin,
  createPromoBanner,
  updatePromoBanner,
  deletePromoBanner,
  seedPromoBanners,
};
