// backend/routes/payoutRoutes.js - Payout Management Routes
const express = require('express');
const router = express.Router();

// Import controllers
const {
  // Seller endpoints
  createBeneficiary,
  getBeneficiary,
  updateBeneficiary,
  getPayoutHistory,
  getPayoutStats,
  
  // Admin endpoints
  getAllBeneficiaries,
  getAllPayouts,
  getPayoutAnalytics,
  processBatchPayouts,
  processSinglePayout,
  getBatchPayoutStatus,
  getBatchPayoutHistory,
  getPayoutEligibilityStats,
  updateOrderPayoutEligibility,
  
  // Webhook endpoints
  handleWebhook,
  
  // Utility endpoints
  healthCheck
} = require('../controllers/payoutController');

// Import middleware
const { protect: sellerProtect } = require('../middleware/authMiddleware');
const { adminProtect } = require('../middleware/adminMiddleware');

// ========================================
// SELLER ROUTES
// ========================================

// Beneficiary Management
router.route('/beneficiary')
  .post(sellerProtect, createBeneficiary)
  .get(sellerProtect, getBeneficiary)
  .put(sellerProtect, updateBeneficiary);

// Payout History and Stats
router.route('/history')
  .get(sellerProtect, getPayoutHistory);

router.route('/stats')
  .get(sellerProtect, getPayoutStats);

// ========================================
// ADMIN ROUTES
// ========================================

// Beneficiary Management
router.route('/admin/beneficiaries')
  .get(adminProtect, getAllBeneficiaries);

// Payout Management
router.route('/admin/payouts')
  .get(adminProtect, getAllPayouts);

router.route('/admin/analytics')
  .get(adminProtect, getPayoutAnalytics);

// Batch Processing
router.route('/admin/process-batch')
  .post(adminProtect, processBatchPayouts);

router.route('/admin/process-single/:orderId')
  .post(adminProtect, processSinglePayout);

// Batch Management
router.route('/admin/batch/:batchTransferId')
  .get(adminProtect, getBatchPayoutStatus);

router.route('/admin/batch-history')
  .get(adminProtect, getBatchPayoutHistory);

// Eligibility Management
router.route('/admin/eligibility-stats')
  .get(adminProtect, getPayoutEligibilityStats);

router.route('/admin/update-eligibility')
  .post(adminProtect, updateOrderPayoutEligibility);

// ========================================
// WEBHOOK ROUTES
// ========================================

// Cashfree Webhooks (Public - no authentication required)
router.route('/webhook')
  .post(handleWebhook);

// ========================================
// UTILITY ROUTES
// ========================================

// Health Check
router.route('/health')
  .get(healthCheck);

module.exports = router;
