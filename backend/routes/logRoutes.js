// File: /backend/routes/logRoutes.js
// 🎯 COMPREHENSIVE: Routes for centralized log viewing and monitoring

const express = require('express');
const router = express.Router();
const { 
  getSystemLogs,
  getActiveOperations,
  getOperationLogs,
  getLogStats,
  downloadLogs,
  cleanupLogs,
  getLogStream
} = require('../controllers/logController');
const { adminMiddleware } = require('../middleware/adminMiddleware');

// Apply admin middleware to all routes
router.use(adminMiddleware);

// @route   GET /api/admin/logs
// @desc    Get comprehensive system logs with filtering
// @access  Private (Admin)
router.get('/', getSystemLogs);

// @route   GET /api/admin/logs/active
// @desc    Get active operations for real-time monitoring
// @access  Private (Admin)
router.get('/active', getActiveOperations);

// @route   GET /api/admin/logs/operation/:correlationId
// @desc    Get detailed operation logs by correlation ID
// @access  Private (Admin)
router.get('/operation/:correlationId', getOperationLogs);

// @route   GET /api/admin/logs/stats
// @desc    Get log statistics and metrics
// @access  Private (Admin)
router.get('/stats', getLogStats);

// @route   GET /api/admin/logs/stream
// @desc    Get real-time log stream (Server-Sent Events)
// @access  Private (Admin)
router.get('/stream', getLogStream);

// @route   GET /api/admin/logs/download
// @desc    Download logs as file
// @access  Private (Admin)
router.get('/download', downloadLogs);

// @route   DELETE /api/admin/logs/cleanup
// @desc    Clear old logs (maintenance)
// @access  Private (Admin)
router.delete('/cleanup', cleanupLogs);

module.exports = router;
