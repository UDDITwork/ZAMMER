const InventoryHistory = require('../models/InventoryHistory');
const Product = require('../models/Product');

// Helper function to get color code from color name
const getColorCode = (colorName) => {
  const colorMap = {
    'Black': '#000000',
    'White': '#FFFFFF',
    'Red': '#FF0000',
    'Blue': '#0000FF',
    'Green': '#008000',
    'Yellow': '#FFFF00',
    'Purple': '#800080',
    'Orange': '#FFA500',
    'Pink': '#FFC0CB',
    'Brown': '#964B00',
    'Gray': '#808080',
    'Navy': '#000080'
  };
  return colorMap[colorName] || '#000000'; // Default to black if color not found
};

class InventoryHistoryService {
  // Log inventory change
  static async logInventoryChange({
    productId,
    sellerId,
    variant,
    changeType,
    quantityChange,
    previousQuantity,
    newQuantity,
    reason,
    orderId = null,
    notes = ''
  }) {
    try {
      const historyEntry = new InventoryHistory({
        productId,
        sellerId,
        variant,
        changeType,
        quantityChange,
        previousQuantity,
        newQuantity,
        reason,
        orderId,
        notes
      });

      await historyEntry.save();
      console.log(`📊 Inventory history logged: ${changeType} for product ${productId}`);
      return historyEntry;
    } catch (error) {
      console.error('❌ Error logging inventory history:', error);
      throw error;
    }
  }

  // Get inventory history for a product
  static async getProductInventoryHistory(productId, limit = 50) {
    try {
      const history = await InventoryHistory
        .find({ productId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('orderId', 'orderNumber status');

      return {
        success: true,
        data: history
      };
    } catch (error) {
      console.error('❌ Error fetching product inventory history:', error);
      return {
        success: false,
        message: 'Failed to fetch inventory history'
      };
    }
  }

  // Get inventory history for a seller
  static async getSellerInventoryHistory(sellerId, limit = 100) {
    try {
      const history = await InventoryHistory
        .find({ sellerId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('productId', 'name images')
        .populate('orderId', 'orderNumber status');

      return {
        success: true,
        data: history
      };
    } catch (error) {
      console.error('❌ Error fetching seller inventory history:', error);
      return {
        success: false,
        message: 'Failed to fetch inventory history'
      };
    }
  }

  // Get inventory summary for dashboard
  static async getInventorySummary(sellerId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        todayChanges,
        lowStockProducts,
        recentActivity
      ] = await Promise.all([
        // Today's inventory changes
        InventoryHistory.find({
          sellerId,
          timestamp: { $gte: today }
        }).countDocuments(),

        // Low stock products
        Product.find({
          sellerId,
          'variants.quantity': { $lte: 5, $gt: 0 }
        }).select('name variants'),

        // Recent activity (last 7 days)
        InventoryHistory.find({
          sellerId,
          timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        })
        .sort({ timestamp: -1 })
        .limit(10)
        .populate('productId', 'name')
        .populate('orderId', 'orderNumber')
      ]);

      return {
        success: true,
        data: {
          todayChanges,
          lowStockProducts: lowStockProducts.length,
          recentActivity
        }
      };
    } catch (error) {
      console.error('❌ Error fetching inventory summary:', error);
      return {
        success: false,
        message: 'Failed to fetch inventory summary'
      };
    }
  }

  // Update product stock with history logging
  static async updateProductStock({
    productId,
    sellerId,
    variantUpdates,
    reason,
    notes = ''
  }) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        return {
          success: false,
          message: 'Product not found'
        };
      }

      const historyEntries = [];

      for (const update of variantUpdates) {
        const existingVariant = product.variants.find(
          v => v.size === update.size && v.color === update.color
        );

        let previousQuantity = 0;
        let newQuantity = update.quantity;

        if (existingVariant) {
          // Update existing variant
          previousQuantity = existingVariant.quantity;
          newQuantity = previousQuantity + update.quantity;
          existingVariant.quantity = newQuantity;
        } else {
          // Create new variant
          const colorCode = getColorCode(update.color);
          product.variants.push({
            size: update.size,
            color: update.color,
            colorCode: colorCode,
            quantity: update.quantity,
            images: []
          });
        }

        // Log the change
        const historyEntry = await this.logInventoryChange({
          productId,
          sellerId,
          variant: {
            size: update.size,
            color: update.color
          },
          changeType: 'ADD', // Use 'ADD' for both existing and new variants
          quantityChange: update.quantity,
          previousQuantity,
          newQuantity,
          reason: existingVariant ? reason : `${reason} (New variant created)`,
          notes
        });

        historyEntries.push(historyEntry);
      }

      // Save the product
      await product.save();

      return {
        success: true,
        message: 'Stock updated successfully',
        data: {
          product,
          historyEntries
        }
      };
    } catch (error) {
      console.error('❌ Error updating product stock:', error);
      return {
        success: false,
        message: 'Failed to update stock'
      };
    }
  }
}

module.exports = InventoryHistoryService;
