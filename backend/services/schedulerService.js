// backend/services/schedulerService.js - Scheduler Service for Automated Tasks
const BatchPayoutService = require('./batchPayoutService');
const CashfreePayoutService = require('./cashfreePayoutService');
const PayoutCalculationService = require('./payoutCalculationService');

class SchedulerService {
  constructor() {
    this.isInitialized = false;
    this.loggingEnabled = process.env.SCHEDULER_LOGGING_ENABLED === 'true';
  }

  /**
   * Log service operations
   */
  log(level, message, data = null) {
    if (!this.loggingEnabled) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [SCHEDULER] ${message}`;
    
    console.log(logMessage);
    if (data) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Initialize all scheduled services
   */
  async initialize() {
    try {
      this.log('info', 'Initializing scheduler service');

      // Initialize batch payout service
      BatchPayoutService.initializeScheduler();

      this.isInitialized = true;
      this.log('info', 'Scheduler service initialized successfully');
    } catch (error) {
      this.log('error', 'Failed to initialize scheduler service', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Start all scheduled services
   */
  start() {
    try {
      this.log('info', 'Starting scheduler service');

      if (!this.isInitialized) {
        throw new Error('Scheduler service not initialized');
      }

      // Start batch payout service
      BatchPayoutService.startScheduler();

      this.log('info', 'Scheduler service started successfully');
    } catch (error) {
      this.log('error', 'Failed to start scheduler service', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Stop all scheduled services
   */
  stop() {
    try {
      this.log('info', 'Stopping scheduler service');

      // Stop batch payout service
      BatchPayoutService.stopScheduler();

      this.log('info', 'Scheduler service stopped successfully');
    } catch (error) {
      this.log('error', 'Failed to stop scheduler service', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      batchPayoutService: {
        isRunning: BatchPayoutService.isRunning
      }
    };
  }
}

module.exports = new SchedulerService();
