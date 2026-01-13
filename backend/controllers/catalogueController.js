/**
 * Catalogue Controller for ZAMMER Marketplace
 * Handles all catalogue-related operations
 */

const Catalogue = require('../models/Catalogue');
const Product = require('../models/Product');

// @desc    Create a new catalogue (draft or submit)
// @route   POST /api/catalogues
// @access  Private (Seller)
exports.createCatalogue = async (req, res) => {
  try {
    const { category, products, gst, hsnCode, name, status = 'draft' } = req.body;

    // Validate category
    if (!category || !category.level1 || !category.level2 || !category.level3) {
      return res.status(400).json({
        success: false,
        message: 'Category level 1, 2, and 3 are required'
      });
    }

    // Validate products count (1-9)
    if (!products || products.length < 1 || products.length > 9) {
      return res.status(400).json({
        success: false,
        message: 'Catalogue must contain between 1 and 9 products'
      });
    }

    // Create catalogue
    const catalogue = await Catalogue.create({
      seller: req.seller._id,
      name: name || `Catalogue ${new Date().toLocaleDateString()}`,
      category: {
        level1: category.level1,
        level2: category.level2,
        level3: category.level3,
        level4: category.level4 || '',
        path: category.path || `${category.level1} > ${category.level2} > ${category.level3}${category.level4 ? ' > ' + category.level4 : ''}`
      },
      products: products.map(p => ({
        name: p.name,
        description: p.description || '',
        zammerPrice: p.zammerPrice,
        mrp: p.mrp,
        images: p.images || [],
        variants: p.variants || [{ size: 'M', color: 'Black', colorCode: '#000000', quantity: 1 }],
        fabricType: p.fabricType || '',
        status: 'pending'
      })),
      gst: gst || '',
      hsnCode: hsnCode || '',
      status: status
    });

    // If status is 'submitted', process the catalogue
    if (status === 'submitted') {
      await processCatalogue(catalogue, req.seller._id);
    }

    res.status(201).json({
      success: true,
      message: status === 'submitted' ? 'Catalogue submitted successfully' : 'Catalogue saved as draft',
      data: catalogue
    });
  } catch (error) {
    console.error('Create catalogue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create catalogue',
      error: error.message
    });
  }
};

// @desc    Get all catalogues for a seller
// @route   GET /api/catalogues
// @access  Private (Seller)
exports.getSellerCatalogues = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { seller: req.seller._id };
    if (status) {
      query.status = status;
    }

    const catalogues = await Catalogue.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('products.product', 'name images status');

    const total = await Catalogue.countDocuments(query);

    res.status(200).json({
      success: true,
      data: catalogues,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get catalogues error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch catalogues',
      error: error.message
    });
  }
};

// @desc    Get single catalogue by ID
// @route   GET /api/catalogues/:id
// @access  Private (Seller)
exports.getCatalogueById = async (req, res) => {
  try {
    const catalogue = await Catalogue.findOne({
      _id: req.params.id,
      seller: req.seller._id
    }).populate('products.product');

    if (!catalogue) {
      return res.status(404).json({
        success: false,
        message: 'Catalogue not found'
      });
    }

    res.status(200).json({
      success: true,
      data: catalogue
    });
  } catch (error) {
    console.error('Get catalogue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch catalogue',
      error: error.message
    });
  }
};

// @desc    Update a draft catalogue
// @route   PUT /api/catalogues/:id
// @access  Private (Seller)
exports.updateCatalogue = async (req, res) => {
  try {
    const catalogue = await Catalogue.findOne({
      _id: req.params.id,
      seller: req.seller._id,
      status: 'draft'
    });

    if (!catalogue) {
      return res.status(404).json({
        success: false,
        message: 'Draft catalogue not found or cannot be edited'
      });
    }

    const { category, products, gst, hsnCode, name } = req.body;

    // Update fields
    if (category) {
      catalogue.category = {
        level1: category.level1 || catalogue.category.level1,
        level2: category.level2 || catalogue.category.level2,
        level3: category.level3 || catalogue.category.level3,
        level4: category.level4 || catalogue.category.level4,
        path: category.path || catalogue.category.path
      };
    }

    if (products) {
      catalogue.products = products.map(p => ({
        name: p.name,
        description: p.description || '',
        zammerPrice: p.zammerPrice,
        mrp: p.mrp,
        images: p.images || [],
        variants: p.variants || [{ size: 'M', color: 'Black', colorCode: '#000000', quantity: 1 }],
        fabricType: p.fabricType || '',
        status: 'pending'
      }));
    }

    if (gst !== undefined) catalogue.gst = gst;
    if (hsnCode !== undefined) catalogue.hsnCode = hsnCode;
    if (name) catalogue.name = name;

    await catalogue.save();

    res.status(200).json({
      success: true,
      message: 'Catalogue updated successfully',
      data: catalogue
    });
  } catch (error) {
    console.error('Update catalogue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update catalogue',
      error: error.message
    });
  }
};

// @desc    Delete a catalogue
// @route   DELETE /api/catalogues/:id
// @access  Private (Seller)
exports.deleteCatalogue = async (req, res) => {
  try {
    const { deleteProducts = false } = req.query;

    const catalogue = await Catalogue.findOne({
      _id: req.params.id,
      seller: req.seller._id
    });

    if (!catalogue) {
      return res.status(404).json({
        success: false,
        message: 'Catalogue not found'
      });
    }

    // Optionally delete associated products
    if (deleteProducts === 'true') {
      const productIds = catalogue.products
        .filter(p => p.product)
        .map(p => p.product);

      if (productIds.length > 0) {
        await Product.deleteMany({ _id: { $in: productIds } });
      }
    }

    await Catalogue.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Catalogue deleted successfully'
    });
  } catch (error) {
    console.error('Delete catalogue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete catalogue',
      error: error.message
    });
  }
};

// @desc    Submit a draft catalogue for processing
// @route   POST /api/catalogues/:id/submit
// @access  Private (Seller)
exports.submitCatalogue = async (req, res) => {
  try {
    const catalogue = await Catalogue.findOne({
      _id: req.params.id,
      seller: req.seller._id,
      status: 'draft'
    });

    if (!catalogue) {
      return res.status(404).json({
        success: false,
        message: 'Draft catalogue not found'
      });
    }

    // Validate all products have required fields
    const invalidProducts = catalogue.products.filter(p => !p.name || !p.zammerPrice || !p.mrp);
    if (invalidProducts.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'All products must have name, price, and MRP',
        invalidCount: invalidProducts.length
      });
    }

    // Process the catalogue
    await processCatalogue(catalogue, req.seller._id);

    res.status(200).json({
      success: true,
      message: 'Catalogue submitted and processing started',
      data: catalogue
    });
  } catch (error) {
    console.error('Submit catalogue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit catalogue',
      error: error.message
    });
  }
};

// Helper function to process catalogue and create products
async function processCatalogue(catalogue, sellerId) {
  catalogue.status = 'processing';
  await catalogue.save();

  let createdCount = 0;
  let failedCount = 0;

  for (let i = 0; i < catalogue.products.length; i++) {
    const catalogueProduct = catalogue.products[i];

    try {
      // Map the old category system from the new 4-level system
      const categoryMapping = mapCategoryToLegacy(catalogue.category.level1);

      // Create the product
      const productData = {
        seller: sellerId,
        name: catalogueProduct.name,
        description: catalogueProduct.description || `${catalogueProduct.name} - Quality product from ZAMMER`,
        category: categoryMapping.category,
        subCategory: mapSubCategory(catalogue.category.level3, categoryMapping.category),
        productCategory: mapProductCategory(catalogue.category.level2),
        categoryLevel1: catalogue.category.level1,
        categoryLevel2: catalogue.category.level2,
        categoryLevel3: catalogue.category.level3,
        categoryLevel4: catalogue.category.level4 || '',
        categoryPath: catalogue.category.path,
        zammerPrice: catalogueProduct.zammerPrice,
        mrp: catalogueProduct.mrp,
        variants: catalogueProduct.variants.length > 0
          ? catalogueProduct.variants
          : [{ size: 'M', color: 'Black', colorCode: '#000000', quantity: 1 }],
        images: catalogueProduct.images,
        fabricType: catalogueProduct.fabricType || '',
        status: 'active'
      };

      const product = await Product.create(productData);

      // Update catalogue product with reference
      catalogue.products[i].product = product._id;
      catalogue.products[i].status = 'created';
      createdCount++;
    } catch (error) {
      console.error(`Failed to create product ${catalogueProduct.name}:`, error);
      catalogue.products[i].status = 'failed';
      catalogue.products[i].errorMessage = error.message;
      failedCount++;
    }
  }

  // Update catalogue status
  catalogue.stats.createdProducts = createdCount;
  catalogue.stats.failedProducts = failedCount;

  if (failedCount === 0) {
    catalogue.status = 'completed';
  } else if (createdCount > 0) {
    catalogue.status = 'partial';
  } else {
    catalogue.status = 'failed';
  }

  catalogue.completedAt = new Date();
  await catalogue.save();

  return catalogue;
}

// Helper function to map 4-level category to legacy category
function mapCategoryToLegacy(level1) {
  const mapping = {
    'Men Fashion': { category: 'Men' },
    'Women Fashion': { category: 'Women' },
    'Kids Fashion': { category: 'Kids' }
  };
  return mapping[level1] || { category: 'Men' };
}

// Helper function to map subCategory based on level3
function mapSubCategory(level3, category) {
  // Default subcategories for each main category
  const defaultSubCategories = {
    'Men': 'T-shirts',
    'Women': 'Kurtis',
    'Kids': 'T-shirts'
  };

  // Try to find a matching subcategory from the level3
  const subCategoryMappings = {
    'T-Shirts': 'T-shirts',
    'Shirts': 'Shirts',
    'Jeans': 'Jeans',
    'Kurtas & Kurta Sets': 'Ethnic Wear',
    'Sherwanis': 'Ethnic Wear',
    'Kurtis, Sets & Fabrics': 'Kurtis',
    'Sarees, Blouses & Petticoats': 'Sarees',
    'Lehengas': 'Lehengas',
    'Dresses & Frocks': 'Dresses',
    'Tops & T-Shirts': 'Tops'
  };

  return subCategoryMappings[level3] || defaultSubCategories[category] || 'T-shirts';
}

// Helper function to map productCategory
function mapProductCategory(level2) {
  const productCategoryMappings = {
    'Ethnic Wear': 'Ethnic Wear',
    'Western Wear': 'Western Wear',
    'Winter Wear': 'Winter Fashion',
    'Sportswear': 'Activewear',
    'Sleepwear & Loungewear': 'Nightwear & Loungewear',
    'Bottom Wear': 'Casual Wear',
    'Lingerie & Innerwear': 'Daily Wear',
    'Boys Wear': 'Kids-Friendly Wear',
    'Girls Wear': 'Kids-Friendly Wear',
    'Infant Wear': 'Kids-Friendly Wear',
    'School Uniforms': 'Kids-Friendly Wear'
  };

  return productCategoryMappings[level2] || 'Casual Wear';
}
