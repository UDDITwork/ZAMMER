const Banner = require('../models/Banner');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const fs = require('fs');
const path = require('path');

// GET /api/banners - Public: fetch banners by level and category filters
const getBanners = async (req, res) => {
  try {
    const { level, categoryLevel1, categoryLevel2, categoryLevel3 } = req.query;
    const filter = { isActive: true };

    if (level) filter.level = parseInt(level);
    if (categoryLevel1) filter.categoryLevel1 = categoryLevel1;
    if (categoryLevel2) filter.categoryLevel2 = categoryLevel2;
    if (categoryLevel3) filter.categoryLevel3 = categoryLevel3;

    const banners = await Banner.find(filter).sort({ displayOrder: 1, createdAt: -1 });

    res.json({ success: true, data: banners });
  } catch (error) {
    console.error('[BannerController] getBanners error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch banners' });
  }
};

// GET /api/banners/admin/all - Admin: fetch all banners grouped by level
const getAllBannersAdmin = async (req, res) => {
  try {
    const banners = await Banner.find({}).sort({ level: 1, displayOrder: 1, createdAt: -1 });

    const grouped = {
      level1: banners.filter(b => b.level === 1),
      level2: banners.filter(b => b.level === 2),
      level3: banners.filter(b => b.level === 3),
    };

    res.json({ success: true, data: grouped });
  } catch (error) {
    console.error('[BannerController] getAllBannersAdmin error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch banners' });
  }
};

// POST /api/banners - Admin: create a new banner
const createBanner = async (req, res) => {
  try {
    const { level, categoryLevel1, categoryLevel2, categoryLevel3, title, subtitle, image, imageUrl, cloudinaryPublicId, displayOrder } = req.body;

    // Validate level-specific required fields
    if (!level || !categoryLevel1) {
      return res.status(400).json({ success: false, message: 'level and categoryLevel1 are required' });
    }
    if (level >= 2 && !categoryLevel2) {
      return res.status(400).json({ success: false, message: 'categoryLevel2 is required for level 2+ banners' });
    }
    if (level === 3 && !categoryLevel3) {
      return res.status(400).json({ success: false, message: 'categoryLevel3 is required for level 3 banners' });
    }

    let finalImageUrl = imageUrl;
    let finalPublicId = cloudinaryPublicId;

    // If base64 image provided, upload to Cloudinary
    if (image && !imageUrl) {
      const uploadResult = await uploadToCloudinary(image, 'zammer_banners');
      finalImageUrl = uploadResult.url;
      finalPublicId = uploadResult.public_id;
    }

    if (!finalImageUrl || !finalPublicId) {
      return res.status(400).json({ success: false, message: 'Image is required (provide image as base64 or imageUrl + cloudinaryPublicId)' });
    }

    const banner = await Banner.create({
      level: parseInt(level),
      categoryLevel1,
      categoryLevel2: categoryLevel2 || null,
      categoryLevel3: categoryLevel3 || null,
      imageUrl: finalImageUrl,
      cloudinaryPublicId: finalPublicId,
      title: title || '',
      subtitle: subtitle || '',
      displayOrder: displayOrder || 0,
    });

    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    console.error('[BannerController] createBanner error:', error);
    res.status(500).json({ success: false, message: 'Failed to create banner' });
  }
};

// PUT /api/banners/:id - Admin: update a banner
const updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    const { title, subtitle, image, isActive, displayOrder } = req.body;

    // If new image provided, upload and delete old
    if (image) {
      const uploadResult = await uploadToCloudinary(image, 'zammer_banners');
      // Delete old image
      if (banner.cloudinaryPublicId) {
        await deleteFromCloudinary(banner.cloudinaryPublicId);
      }
      banner.imageUrl = uploadResult.url;
      banner.cloudinaryPublicId = uploadResult.public_id;
    }

    if (title !== undefined) banner.title = title;
    if (subtitle !== undefined) banner.subtitle = subtitle;
    if (isActive !== undefined) banner.isActive = isActive;
    if (displayOrder !== undefined) banner.displayOrder = displayOrder;

    await banner.save();

    res.json({ success: true, data: banner });
  } catch (error) {
    console.error('[BannerController] updateBanner error:', error);
    res.status(500).json({ success: false, message: 'Failed to update banner' });
  }
};

// DELETE /api/banners/:id - Admin: delete a banner
const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    // Delete from Cloudinary
    if (banner.cloudinaryPublicId) {
      await deleteFromCloudinary(banner.cloudinaryPublicId);
    }

    await Banner.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Banner deleted successfully' });
  } catch (error) {
    console.error('[BannerController] deleteBanner error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete banner' });
  }
};

// POST /api/banners/seed - Admin: seed banners from banner_urls.json
const seedBanners = async (req, res) => {
  try {
    const bannerUrlsPath = path.join(__dirname, '../../scripts/banner_urls.json');

    // Check if file exists
    if (!fs.existsSync(bannerUrlsPath)) {
      return res.status(404).json({
        success: false,
        message: 'banner_urls.json not found. Please run the image generation script first.'
      });
    }

    // Read the JSON file
    const bannerData = JSON.parse(fs.readFileSync(bannerUrlsPath, 'utf-8'));

    if (!bannerData.level1 && !bannerData.level2 && !bannerData.level3) {
      return res.status(400).json({
        success: false,
        message: 'Invalid banner_urls.json format'
      });
    }

    // Clear existing banners (optional - controlled by query param)
    const clearExisting = req.query.clear === 'true';
    let deletedCount = 0;

    if (clearExisting) {
      const deleteResult = await Banner.deleteMany({});
      deletedCount = deleteResult.deletedCount;
    }

    // Prepare banner documents
    const bannerDocuments = [];

    // Level 1 banners
    (bannerData.level1 || []).forEach((banner, idx) => {
      bannerDocuments.push({
        level: 1,
        categoryLevel1: banner.categoryLevel1,
        categoryLevel2: null,
        categoryLevel3: null,
        imageUrl: banner.imageUrl,
        cloudinaryPublicId: banner.cloudinaryPublicId,
        title: banner.title || banner.categoryLevel1,
        subtitle: banner.subtitle || `Explore ${banner.categoryLevel1} collection`,
        isActive: true,
        displayOrder: idx + 1,
      });
    });

    // Level 2 banners
    (bannerData.level2 || []).forEach((banner, idx) => {
      bannerDocuments.push({
        level: 2,
        categoryLevel1: banner.categoryLevel1,
        categoryLevel2: banner.categoryLevel2,
        categoryLevel3: null,
        imageUrl: banner.imageUrl,
        cloudinaryPublicId: banner.cloudinaryPublicId,
        title: banner.title || banner.categoryLevel2,
        subtitle: banner.subtitle || `Discover ${banner.categoryLevel2}`,
        isActive: true,
        displayOrder: idx + 1,
      });
    });

    // Level 3 banners
    (bannerData.level3 || []).forEach((banner, idx) => {
      bannerDocuments.push({
        level: 3,
        categoryLevel1: banner.categoryLevel1,
        categoryLevel2: banner.categoryLevel2,
        categoryLevel3: banner.categoryLevel3,
        imageUrl: banner.imageUrl,
        cloudinaryPublicId: banner.cloudinaryPublicId,
        title: banner.title || banner.categoryLevel3,
        subtitle: banner.subtitle || `Shop ${banner.categoryLevel3}`,
        isActive: true,
        displayOrder: idx + 1,
      });
    });

    // Insert all banners
    let insertedBanners = [];
    if (bannerDocuments.length > 0) {
      insertedBanners = await Banner.insertMany(bannerDocuments);
    }

    // Verify counts
    const counts = {
      level1: await Banner.countDocuments({ level: 1, isActive: true }),
      level2: await Banner.countDocuments({ level: 2, isActive: true }),
      level3: await Banner.countDocuments({ level: 3, isActive: true }),
    };

    res.json({
      success: true,
      message: 'Banners seeded successfully',
      data: {
        deletedCount,
        insertedCount: insertedBanners.length,
        counts,
        source: {
          level1: (bannerData.level1 || []).length,
          level2: (bannerData.level2 || []).length,
          level3: (bannerData.level3 || []).length,
        }
      }
    });
  } catch (error) {
    console.error('[BannerController] seedBanners error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed banners',
      error: error.message
    });
  }
};

module.exports = {
  getBanners,
  getAllBannersAdmin,
  createBanner,
  updateBanner,
  deleteBanner,
  seedBanners,
};
