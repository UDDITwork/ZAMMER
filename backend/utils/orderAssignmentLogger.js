// File: backend/utils/orderAssignmentLogger.js
// 🎯 ENHANCED: Specialized logging for order assignment operations
// 📊 TRACKS: Agent capacity, assignment success/failure, performance metrics

const { logger, startOperation, endOperation } = require('./logger');

// Order Assignment Operation Types
const ASSIGNMENT_OPERATIONS = {
  SINGLE_ASSIGNMENT: 'SINGLE_ORDER_ASSIGNMENT',
  BULK_ASSIGNMENT: 'BULK_ORDER_ASSIGNMENT',
  AGENT_AVAILABILITY_CHECK: 'AGENT_AVAILABILITY_CHECK',
  CAPACITY_VALIDATION: 'CAPACITY_VALIDATION',
  ASSIGNMENT_SUCCESS: 'ASSIGNMENT_SUCCESS',
  ASSIGNMENT_FAILURE: 'ASSIGNMENT_FAILURE',
  AGENT_STATUS_UPDATE: 'AGENT_STATUS_UPDATE',
  ORDER_STATUS_UPDATE: 'ORDER_STATUS_UPDATE',
  NOTIFICATION_SENT: 'NOTIFICATION_SENT',
  NOTIFICATION_FAILED: 'NOTIFICATION_FAILED'
};

// Enhanced Order Assignment Logger
class OrderAssignmentLogger {
  constructor() {
    this.operationId = null;
    this.startTime = null;
    this.assignmentMetrics = {
      totalOrders: 0,
      successfulAssignments: 0,
      failedAssignments: 0,
      agentCapacityUsed: 0,
      averageAssignmentTime: 0,
      notificationSuccess: 0,
      notificationFailures: 0
    };
  }

  // Start assignment operation tracking
  startAssignmentOperation(operationType, data) {
    this.operationId = startOperation(operationType, 'Order Assignment', {
      operationType,
      ...data,
      timestamp: new Date().toISOString()
    });
    
    this.startTime = Date.now();
    
    logger.assignment('ASSIGNMENT_OPERATION_STARTED', {
      operationId: this.operationId,
      operationType,
      data,
      timestamp: new Date().toISOString()
    }, 'info', this.operationId);
    
    return this.operationId;
  }

  // Log agent availability check
  logAgentAvailabilityCheck(agentId, agentData, isAvailable, reason = '') {
    logger.assignment('AGENT_AVAILABILITY_CHECKED', {
      operationId: this.operationId,
      agentId,
      agentName: agentData.name,
      agentEmail: agentData.email,
      currentStatus: agentData.status,
      isActive: agentData.isActive,
      isVerified: agentData.isVerified,
      currentOrderCount: agentData.assignedOrders?.length || 0,
      maxCapacity: agentData.maxOrdersPerAgent || 5,
      isAvailable,
      reason,
      timestamp: new Date().toISOString()
    }, isAvailable ? 'success' : 'warning', this.operationId);
  }

  // Log capacity validation
  logCapacityValidation(agentId, currentOrders, requestedOrders, maxCapacity, canAssign) {
    const capacityUsed = currentOrders + requestedOrders;
    const capacityPercentage = (capacityUsed / maxCapacity) * 100;
    
    logger.assignment('CAPACITY_VALIDATION', {
      operationId: this.operationId,
      agentId,
      currentOrders,
      requestedOrders,
      maxCapacity,
      capacityUsed,
      capacityPercentage: Math.round(capacityPercentage * 100) / 100,
      canAssign,
      timestamp: new Date().toISOString()
    }, canAssign ? 'success' : 'warning', this.operationId);
  }

  // Log single order assignment attempt
  logSingleAssignmentAttempt(orderId, agentId, orderData, agentData) {
    logger.assignment('SINGLE_ASSIGNMENT_ATTEMPT', {
      operationId: this.operationId,
      orderId,
      orderNumber: orderData.orderNumber,
      agentId,
      agentName: agentData.name,
      customerName: orderData.user?.name,
      totalPrice: orderData.totalPrice,
      orderStatus: orderData.status,
      agentCurrentOrders: agentData.assignedOrders?.length || 0,
      timestamp: new Date().toISOString()
    }, 'info', this.operationId);
  }

  // Log bulk assignment attempt
  logBulkAssignmentAttempt(orderIds, agentId, agentData) {
    this.assignmentMetrics.totalOrders = orderIds.length;
    
    logger.assignment('BULK_ASSIGNMENT_ATTEMPT', {
      operationId: this.operationId,
      orderIds,
      orderCount: orderIds.length,
      agentId,
      agentName: agentData.name,
      agentCurrentOrders: agentData.assignedOrders?.length || 0,
      agentMaxCapacity: agentData.maxOrdersPerAgent || 5,
      timestamp: new Date().toISOString()
    }, 'info', this.operationId);
  }

  // Log successful assignment
  logAssignmentSuccess(orderId, agentId, assignmentData) {
    this.assignmentMetrics.successfulAssignments++;
    
    logger.assignment('ASSIGNMENT_SUCCESS', {
      operationId: this.operationId,
      orderId,
      orderNumber: assignmentData.orderNumber,
      agentId,
      agentName: assignmentData.agentName,
      customerName: assignmentData.customerName,
      totalPrice: assignmentData.totalPrice,
      assignmentTime: new Date().toISOString(),
      agentNewOrderCount: assignmentData.agentNewOrderCount,
      timestamp: new Date().toISOString()
    }, 'success', this.operationId);
  }

  // Log assignment failure
  logAssignmentFailure(orderId, agentId, errorData) {
    this.assignmentMetrics.failedAssignments++;
    
    logger.assignment('ASSIGNMENT_FAILURE', {
      operationId: this.operationId,
      orderId,
      agentId,
      errorCode: errorData.code,
      errorMessage: errorData.message,
      errorType: errorData.type,
      timestamp: new Date().toISOString()
    }, 'error', this.operationId);
  }

  // Log agent status update
  logAgentStatusUpdate(agentId, oldStatus, newStatus, reason = '') {
    logger.assignment('AGENT_STATUS_UPDATED', {
      operationId: this.operationId,
      agentId,
      oldStatus,
      newStatus,
      reason,
      timestamp: new Date().toISOString()
    }, 'info', this.operationId);
  }

  // Log order status update
  logOrderStatusUpdate(orderId, oldStatus, newStatus, updatedBy, reason = '') {
    logger.assignment('ORDER_STATUS_UPDATED', {
      operationId: this.operationId,
      orderId,
      oldStatus,
      newStatus,
      updatedBy,
      reason,
      timestamp: new Date().toISOString()
    }, 'info', this.operationId);
  }

  // Log notification sent
  logNotificationSent(agentId, notificationType, notificationData) {
    this.assignmentMetrics.notificationSuccess++;
    
    logger.assignment('NOTIFICATION_SENT', {
      operationId: this.operationId,
      agentId,
      notificationType,
      notificationData,
      timestamp: new Date().toISOString()
    }, 'success', this.operationId);
  }

  // Log notification failure
  logNotificationFailure(agentId, notificationType, errorData) {
    this.assignmentMetrics.notificationFailures++;
    
    logger.assignment('NOTIFICATION_FAILED', {
      operationId: this.operationId,
      agentId,
      notificationType,
      errorMessage: errorData.message,
      errorCode: errorData.code,
      timestamp: new Date().toISOString()
    }, 'error', this.operationId);
  }

  // Log capacity metrics
  logCapacityMetrics(agentId, capacityData) {
    logger.assignment('CAPACITY_METRICS', {
      operationId: this.operationId,
      agentId,
      currentOrders: capacityData.currentOrders,
      maxCapacity: capacityData.maxCapacity,
      capacityPercentage: capacityData.capacityPercentage,
      availableSlots: capacityData.availableSlots,
      isAtCapacity: capacityData.isAtCapacity,
      timestamp: new Date().toISOString()
    }, 'info', this.operationId);
  }

  // Log performance metrics
  logPerformanceMetrics(operationType, metrics) {
    const duration = Date.now() - this.startTime;
    this.assignmentMetrics.averageAssignmentTime = duration;
    
    logger.assignment('PERFORMANCE_METRICS', {
      operationId: this.operationId,
      operationType,
      duration: `${duration}ms`,
      totalOrders: this.assignmentMetrics.totalOrders,
      successfulAssignments: this.assignmentMetrics.successfulAssignments,
      failedAssignments: this.assignmentMetrics.failedAssignments,
      successRate: this.assignmentMetrics.totalOrders > 0 ? 
        (this.assignmentMetrics.successfulAssignments / this.assignmentMetrics.totalOrders * 100).toFixed(2) + '%' : '0%',
      notificationSuccess: this.assignmentMetrics.notificationSuccess,
      notificationFailures: this.assignmentMetrics.notificationFailures,
      timestamp: new Date().toISOString()
    }, 'info', this.operationId);
  }

  // End assignment operation
  endAssignmentOperation(status, summary = {}) {
    const duration = Date.now() - this.startTime;
    
    const finalMetrics = {
      ...this.assignmentMetrics,
      totalDuration: `${duration}ms`,
      operationStatus: status,
      summary
    };
    
    logger.assignment('ASSIGNMENT_OPERATION_COMPLETED', {
      operationId: this.operationId,
      status,
      duration: `${duration}ms`,
      metrics: finalMetrics,
      timestamp: new Date().toISOString()
    }, status === 'COMPLETED' ? 'success' : 'error', this.operationId);
    
    // End operation tracking
    endOperation(this.operationId, status, {
      duration,
      metrics: finalMetrics
    });
    
    return finalMetrics;
  }

  // Log system health check
  logSystemHealthCheck(healthData) {
    logger.assignment('SYSTEM_HEALTH_CHECK', {
      operationId: this.operationId,
      totalAgents: healthData.totalAgents,
      availableAgents: healthData.availableAgents,
      agentsAtCapacity: healthData.agentsAtCapacity,
      totalOrders: healthData.totalOrders,
      unassignedOrders: healthData.unassignedOrders,
      systemLoad: healthData.systemLoad,
      timestamp: new Date().toISOString()
    }, 'info', this.operationId);
  }

  // Log configuration changes
  logConfigurationChange(configType, oldValue, newValue, changedBy) {
    logger.assignment('CONFIGURATION_CHANGED', {
      operationId: this.operationId,
      configType,
      oldValue,
      newValue,
      changedBy,
      timestamp: new Date().toISOString()
    }, 'info', this.operationId);
  }
}

// Create singleton instance
const orderAssignmentLogger = new OrderAssignmentLogger();

// Helper functions for common logging patterns
const logAgentAvailability = (agentId, agentData, isAvailable, reason = '') => {
  orderAssignmentLogger.logAgentAvailabilityCheck(agentId, agentData, isAvailable, reason);
};

const logCapacityCheck = (agentId, currentOrders, requestedOrders, maxCapacity, canAssign) => {
  orderAssignmentLogger.logCapacityValidation(agentId, currentOrders, requestedOrders, maxCapacity, canAssign);
};

const logAssignmentAttempt = (orderId, agentId, orderData, agentData) => {
  orderAssignmentLogger.logSingleAssignmentAttempt(orderId, agentId, orderData, agentData);
};

const logBulkAttempt = (orderIds, agentId, agentData) => {
  orderAssignmentLogger.logBulkAssignmentAttempt(orderIds, agentId, agentData);
};

const logSuccess = (orderId, agentId, assignmentData) => {
  orderAssignmentLogger.logAssignmentSuccess(orderId, agentId, assignmentData);
};

const logFailure = (orderId, agentId, errorData) => {
  orderAssignmentLogger.logAssignmentFailure(orderId, agentId, errorData);
};

const logNotification = (agentId, type, data, isSuccess = true) => {
  if (isSuccess) {
    orderAssignmentLogger.logNotificationSent(agentId, type, data);
  } else {
    orderAssignmentLogger.logNotificationFailure(agentId, type, data);
  }
};

const logStatusUpdate = (id, oldStatus, newStatus, type = 'order', updatedBy = 'system', reason = '') => {
  if (type === 'agent') {
    orderAssignmentLogger.logAgentStatusUpdate(id, oldStatus, newStatus, reason);
  } else {
    orderAssignmentLogger.logOrderStatusUpdate(id, oldStatus, newStatus, updatedBy, reason);
  }
};

// Export the logger and helper functions
module.exports = {
  OrderAssignmentLogger,
  orderAssignmentLogger,
  ASSIGNMENT_OPERATIONS,
  logAgentAvailability,
  logCapacityCheck,
  logAssignmentAttempt,
  logBulkAttempt,
  logSuccess,
  logFailure,
  logNotification,
  logStatusUpdate
};
