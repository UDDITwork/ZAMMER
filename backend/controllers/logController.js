// File: /backend/controllers/logController.js
// 🎯 COMPREHENSIVE: Centralized log viewing and monitoring for admin dashboard

const { 
  logger, 
  getActiveOperations, 
  getOperation, 
  getRecentLogs,
  clearOldLogs 
} = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// @desc    Get comprehensive system logs for admin dashboard
// @route   GET /api/admin/logs
// @access  Private (Admin)
const getSystemLogs = async (req, res) => {
  try {
    const { 
      level, 
      limit = 100, 
      offset = 0, 
      date,
      operation,
      correlationId,
      search
    } = req.query;

    logger.admin('GET_SYSTEM_LOGS', {
      adminId: req.admin._id,
      filters: { level, limit, offset, date, operation, correlationId, search }
    }, 'info', req.correlationId);

    let logs = getRecentLogs(parseInt(limit) * 2); // Get more to filter

    // Apply filters
    if (level) {
      logs = logs.filter(log => log.level === level.toUpperCase());
    }

    if (date) {
      const targetDate = new Date(date).toISOString().split('T')[0];
      logs = logs.filter(log => log.timestamp && log.timestamp.startsWith(targetDate));
    }

    if (operation) {
      logs = logs.filter(log => 
        log.message && log.message.toLowerCase().includes(operation.toLowerCase())
      );
    }

    if (correlationId) {
      logs = logs.filter(log => log.correlationId === correlationId);
    }

    if (search) {
      logs = logs.filter(log => 
        log.message && log.message.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply pagination
    const paginatedLogs = logs.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    logger.admin('GET_SYSTEM_LOGS_SUCCESS', {
      adminId: req.admin._id,
      totalLogs: logs.length,
      returnedLogs: paginatedLogs.length,
      filters: { level, limit, offset, date, operation, correlationId, search }
    }, 'success', req.correlationId);

    res.status(200).json({
      success: true,
      data: {
        logs: paginatedLogs,
        total: logs.length,
        hasMore: (parseInt(offset) + parseInt(limit)) < logs.length,
        filters: { level, limit, offset, date, operation, correlationId, search }
      }
    });

  } catch (error) {
    logger.error('GET_SYSTEM_LOGS_ERROR', {
      adminId: req.admin._id,
      error: error.message,
      stack: error.stack
    }, 'error', req.correlationId);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system logs',
      error: error.message
    });
  }
};

// @desc    Get active operations for real-time monitoring
// @route   GET /api/admin/logs/active
// @access  Private (Admin)
const getActiveOperations = async (req, res) => {
  try {
    logger.admin('GET_ACTIVE_OPERATIONS', {
      adminId: req.admin._id
    }, 'info', req.correlationId);

    const activeOps = getActiveOperations();

    logger.admin('GET_ACTIVE_OPERATIONS_SUCCESS', {
      adminId: req.admin._id,
      activeOperationsCount: activeOps.length
    }, 'success', req.correlationId);

    res.status(200).json({
      success: true,
      data: {
        activeOperations: activeOps,
        count: activeOps.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('GET_ACTIVE_OPERATIONS_ERROR', {
      adminId: req.admin._id,
      error: error.message,
      stack: error.stack
    }, 'error', req.correlationId);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve active operations',
      error: error.message
    });
  }
};

// @desc    Get detailed operation logs by correlation ID
// @route   GET /api/admin/logs/operation/:correlationId
// @access  Private (Admin)
const getOperationLogs = async (req, res) => {
  try {
    const { correlationId } = req.params;

    logger.admin('GET_OPERATION_LOGS', {
      adminId: req.admin._id,
      correlationId
    }, 'info', req.correlationId);

    const operation = getOperation(correlationId);

    if (!operation) {
      return res.status(404).json({
        success: false,
        message: 'Operation not found'
      });
    }

    logger.admin('GET_OPERATION_LOGS_SUCCESS', {
      adminId: req.admin._id,
      correlationId,
      operationType: operation.operationType,
      status: operation.status
    }, 'success', req.correlationId);

    res.status(200).json({
      success: true,
      data: {
        operation,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('GET_OPERATION_LOGS_ERROR', {
      adminId: req.admin._id,
      correlationId: req.params.correlationId,
      error: error.message,
      stack: error.stack
    }, 'error', req.correlationId);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve operation logs',
      error: error.message
    });
  }
};

// @desc    Get log statistics and metrics
// @route   GET /api/admin/logs/stats
// @access  Private (Admin)
const getLogStats = async (req, res) => {
  try {
    logger.admin('GET_LOG_STATS', {
      adminId: req.admin._id
    }, 'info', req.correlationId);

    const logs = getRecentLogs(1000); // Get last 1000 logs for stats
    
    // Calculate statistics
    const stats = {
      totalLogs: logs.length,
      levelBreakdown: {},
      operationBreakdown: {},
      timeRange: {
        earliest: null,
        latest: null
      },
      errorRate: 0,
      performanceMetrics: {
        averageResponseTime: 0,
        slowRequests: 0
      }
    };

    let errorCount = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    logs.forEach(log => {
      // Level breakdown
      if (log.level) {
        stats.levelBreakdown[log.level] = (stats.levelBreakdown[log.level] || 0) + 1;
        if (log.level === 'ERROR' || log.level === 'CRITICAL') {
          errorCount++;
        }
      }

      // Operation breakdown
      if (log.message && log.message.includes('OPERATION_')) {
        const operation = log.message.split('OPERATION_')[1]?.split(':')[0];
        if (operation) {
          stats.operationBreakdown[operation] = (stats.operationBreakdown[operation] || 0) + 1;
        }
      }

      // Time range
      if (log.timestamp) {
        if (!stats.timeRange.earliest || log.timestamp < stats.timeRange.earliest) {
          stats.timeRange.earliest = log.timestamp;
        }
        if (!stats.timeRange.latest || log.timestamp > stats.timeRange.latest) {
          stats.timeRange.latest = log.timestamp;
        }
      }

      // Performance metrics
      if (log.message && log.message.includes('duration:')) {
        const durationMatch = log.message.match(/duration:\s*(\d+)ms/);
        if (durationMatch) {
          totalResponseTime += parseInt(durationMatch[1]);
          responseTimeCount++;
          if (parseInt(durationMatch[1]) > 1000) {
            stats.performanceMetrics.slowRequests++;
          }
        }
      }
    });

    stats.errorRate = logs.length > 0 ? (errorCount / logs.length * 100).toFixed(2) : 0;
    stats.performanceMetrics.averageResponseTime = responseTimeCount > 0 
      ? Math.round(totalResponseTime / responseTimeCount) 
      : 0;

    logger.admin('GET_LOG_STATS_SUCCESS', {
      adminId: req.admin._id,
      totalLogs: stats.totalLogs,
      errorRate: stats.errorRate
    }, 'success', req.correlationId);

    res.status(200).json({
      success: true,
      data: {
        stats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('GET_LOG_STATS_ERROR', {
      adminId: req.admin._id,
      error: error.message,
      stack: error.stack
    }, 'error', req.correlationId);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve log statistics',
      error: error.message
    });
  }
};

// @desc    Download logs as file
// @route   GET /api/admin/logs/download
// @access  Private (Admin)
const downloadLogs = async (req, res) => {
  try {
    const { date, level } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    logger.admin('DOWNLOAD_LOGS', {
      adminId: req.admin._id,
      date: targetDate,
      level
    }, 'info', req.correlationId);

    const logDir = path.join(__dirname, '../logs');
    let filename;
    let filepath;

    if (level) {
      filename = `${level}-${targetDate}.log`;
      filepath = path.join(logDir, filename);
    } else {
      filename = `comprehensive-${targetDate}.log`;
      filepath = path.join(logDir, filename);
    }

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        success: false,
        message: 'Log file not found'
      });
    }

    logger.admin('DOWNLOAD_LOGS_SUCCESS', {
      adminId: req.admin._id,
      filename,
      fileSize: fs.statSync(filepath).size
    }, 'success', req.correlationId);

    res.download(filepath, filename, (err) => {
      if (err) {
        logger.error('DOWNLOAD_LOGS_ERROR', {
          adminId: req.admin._id,
          filename,
          error: err.message
        }, 'error', req.correlationId);
      }
    });

  } catch (error) {
    logger.error('DOWNLOAD_LOGS_ERROR', {
      adminId: req.admin._id,
      error: error.message,
      stack: error.stack
    }, 'error', req.correlationId);

    res.status(500).json({
      success: false,
      message: 'Failed to download logs',
      error: error.message
    });
  }
};

// @desc    Clear old logs (maintenance)
// @route   DELETE /api/admin/logs/cleanup
// @access  Private (Admin)
const cleanupLogs = async (req, res) => {
  try {
    const { daysToKeep = 7 } = req.body;

    logger.admin('CLEANUP_LOGS', {
      adminId: req.admin._id,
      daysToKeep
    }, 'info', req.correlationId);

    clearOldLogs(daysToKeep);

    logger.admin('CLEANUP_LOGS_SUCCESS', {
      adminId: req.admin._id,
      daysToKeep
    }, 'success', req.correlationId);

    res.status(200).json({
      success: true,
      message: `Logs older than ${daysToKeep} days have been cleaned up`,
      data: {
        daysToKeep,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('CLEANUP_LOGS_ERROR', {
      adminId: req.admin._id,
      error: error.message,
      stack: error.stack
    }, 'error', req.correlationId);

    res.status(500).json({
      success: false,
      message: 'Failed to cleanup logs',
      error: error.message
    });
  }
};

// @desc    Get real-time log stream (WebSocket endpoint)
// @route   GET /api/admin/logs/stream
// @access  Private (Admin)
const getLogStream = async (req, res) => {
  try {
    logger.admin('START_LOG_STREAM', {
      adminId: req.admin._id
    }, 'info', req.correlationId);

    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      message: 'Log stream connected',
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(`data: ${JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      })}\n\n`);
    }, 30000);

    // Clean up on disconnect
    req.on('close', () => {
      clearInterval(keepAlive);
      logger.admin('LOG_STREAM_DISCONNECTED', {
        adminId: req.admin._id
      }, 'info', req.correlationId);
    });

  } catch (error) {
    logger.error('LOG_STREAM_ERROR', {
      adminId: req.admin._id,
      error: error.message,
      stack: error.stack
    }, 'error', req.correlationId);

    res.status(500).json({
      success: false,
      message: 'Failed to start log stream',
      error: error.message
    });
  }
};

module.exports = {
  getSystemLogs,
  getActiveOperations,
  getOperationLogs,
  getLogStats,
  downloadLogs,
  cleanupLogs,
  getLogStream
};
