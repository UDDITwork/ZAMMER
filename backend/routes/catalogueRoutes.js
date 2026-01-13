/**
 * Catalogue Routes for ZAMMER Marketplace
 * All routes are protected and require seller authentication
 */

const express = require('express');
const router = express.Router();
const { protectSeller } = require('../middleware/authMiddleware');
const {
  createCatalogue,
  getSellerCatalogues,
  getCatalogueById,
  updateCatalogue,
  deleteCatalogue,
  submitCatalogue
} = require('../controllers/catalogueController');

// Apply seller protection to all routes
router.use(protectSeller);

// Create a new catalogue (POST /api/catalogues)
router.post('/', createCatalogue);

// Get all catalogues for the seller (GET /api/catalogues)
router.get('/', getSellerCatalogues);

// Get a single catalogue by ID (GET /api/catalogues/:id)
router.get('/:id', getCatalogueById);

// Update a draft catalogue (PUT /api/catalogues/:id)
router.put('/:id', updateCatalogue);

// Delete a catalogue (DELETE /api/catalogues/:id)
router.delete('/:id', deleteCatalogue);

// Submit a draft catalogue for processing (POST /api/catalogues/:id/submit)
router.post('/:id/submit', submitCatalogue);

module.exports = router;
