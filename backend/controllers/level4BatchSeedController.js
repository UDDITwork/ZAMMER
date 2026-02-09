const Banner = require('../models/Banner');

// Level 4 banner data from banner_urls_level4.json
// This will be populated with the actual data
const LEVEL4_BANNERS = require('../../scripts/banner_urls_level4.json').level4;

// POST /api/banners/seed-level4-batch - Seed Level 4 banners in batches
const seedLevel4Batch = async (req, res) => {
  const { batchNumber = 1, batchSize = 50 } = req.body;

  try {
    // Calculate batch range
    const startIdx = (batchNumber - 1) * batchSize;
    const endIdx = Math.min(startIdx + batchSize, LEVEL4_BANNERS.length);
    const batchData = LEVEL4_BANNERS.slice(startIdx, endIdx);

    if (batchData.length === 0) {
      return res.json({
        success: true,
        message: 'No more banners to seed',
        data: {
          batchNumber,
          processed: 0,
          totalBanners: LEVEL4_BANNERS.length,
          progress: 100,
          isComplete: true
        }
      });
    }

    // Prepare banner documents
    const bannerDocuments = batchData.map((banner, idx) => ({
      level: 4,
      categoryLevel1: banner.categoryLevel1,
      categoryLevel2: banner.categoryLevel2,
      categoryLevel3: banner.categoryLevel3,
      categoryLevel4: banner.categoryLevel4,
      imageUrl: banner.imageUrl,
      cloudinaryPublicId: banner.cloudinaryPublicId,
      title: banner.title || banner.categoryLevel4,
      subtitle: banner.subtitle || `Explore ${banner.categoryLevel4}`,
      isActive: true,
      displayOrder: startIdx + idx + 1,
    }));

    // Insert batch
    const inserted = await Banner.insertMany(bannerDocuments);

    // Calculate progress
    const totalProcessed = endIdx;
    const progress = Math.round((totalProcessed / LEVEL4_BANNERS.length) * 100);
    const isComplete = endIdx >= LEVEL4_BANNERS.length;

    // Get current count in database
    const currentCount = await Banner.countDocuments({ level: 4 });

    res.json({
      success: true,
      message: `Batch ${batchNumber} seeded successfully`,
      data: {
        batchNumber,
        processed: inserted.length,
        totalProcessed,
        totalBanners: LEVEL4_BANNERS.length,
        currentCount,
        progress,
        isComplete,
        nextBatch: isComplete ? null : batchNumber + 1
      }
    });
  } catch (error) {
    console.error('[Level4BatchSeed] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed batch',
      error: error.message
    });
  }
};

// DELETE /api/banners/clear-level4 - Clear all Level 4 banners before batch seeding
const clearLevel4Banners = async (req, res) => {
  try {
    const result = await Banner.deleteMany({ level: 4 });
    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} Level 4 banners`,
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    console.error('[Level4BatchSeed] Clear error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear Level 4 banners',
      error: error.message
    });
  }
};

// GET /api/banners/level4-seed-status - Get current seeding status
const getLevel4SeedStatus = async (req, res) => {
  try {
    const currentCount = await Banner.countDocuments({ level: 4 });
    const totalBanners = LEVEL4_BANNERS.length;
    const progress = Math.round((currentCount / totalBanners) * 100);
    const isComplete = currentCount >= totalBanners;

    res.json({
      success: true,
      data: {
        currentCount,
        totalBanners,
        progress,
        isComplete,
        remainingBanners: Math.max(0, totalBanners - currentCount)
      }
    });
  } catch (error) {
    console.error('[Level4BatchSeed] Status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get status',
      error: error.message
    });
  }
};

module.exports = {
  seedLevel4Batch,
  clearLevel4Banners,
  getLevel4SeedStatus
};
