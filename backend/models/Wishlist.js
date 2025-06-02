 // backend/models/Wishlist.js
// -----------------------------------------------------------------------------
// A dedicated Wishlist collection – one wishlist per user, with an array of
// products (and optional meta such as when the product was added). This plays
// nicely with the REST endpoints you already exposed under /api/users/wishlist
// and keeps the User document lean.
// -----------------------------------------------------------------------------

const mongoose = require('mongoose');

// A single wishlist entry (sub‑document)
const wishlistItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false } // we don’t need separate _id for each item
);

// Wishlist itself – one per user
const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true // ⚡ enforce one‑wishlist‑per‑user invariant
    },
    items: [wishlistItemSchema]
  },
  {
    timestamps: true
  }
);

// -----------------------------------------------------------------------------
// Convenience statics – you can call these from the controller instead of
// re‑writing update logic every time.
// -----------------------------------------------------------------------------

// Add a product if it doesn’t already exist in the wishlist
wishlistSchema.statics.addProduct = async function (userId, productId) {
  return this.findOneAndUpdate(
    { user: userId, 'items.product': { $ne: productId } },
    { $push: { items: { product: productId } } },
    { new: true, upsert: true }
  ).populate('items.product');
};

// Remove a product from the wishlist
wishlistSchema.statics.removeProduct = async function (userId, productId) {
  return this.findOneAndUpdate(
    { user: userId },
    { $pull: { items: { product: productId } } },
    { new: true }
  ).populate('items.product');
};

// Check if a product is in the wishlist
wishlistSchema.statics.isProductInWishlist = async function (userId, productId) {
  const doc = await this.findOne({ user: userId, 'items.product': productId });
  return !!doc;
};

module.exports = mongoose.model('Wishlist', wishlistSchema);
