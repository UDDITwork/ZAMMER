// Save this as: frontend/src/utils/flowMonitor.js

/**
 * Comprehensive Flow Monitor for ZAMMER Marketplace
 * Tracks buyer-to-seller order flow with detailed terminal logging
 */

class FlowMonitor {
    constructor() {
      this.isActive = process.env.NODE_ENV === 'development' || process.env.REACT_APP_ENABLE_FLOW_MONITOR === 'true';
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.flowEvents = [];
      
      if (this.isActive) {
        this.initializeMonitoring();
      }
    }
  
    initializeMonitoring() {
      console.log(`
  🚀 ===============================
     ZAMMER FLOW MONITOR ACTIVE
  ===============================
  📱 Session ID: ${this.sessionId}
  🌍 Environment: ${process.env.NODE_ENV}
  ⏰ Started: ${new Date().toLocaleString()}
  ===============================`);
  
      // Monitor page visibility changes
      document.addEventListener('visibilitychange', () => {
        this.logEvent('PAGE_VISIBILITY', document.hidden ? 'HIDDEN' : 'VISIBLE', {
          timestamp: new Date().toISOString()
        });
      });
  
      // Monitor online/offline status
      window.addEventListener('online', () => {
        this.logEvent('CONNECTIVITY', 'ONLINE', { timestamp: new Date().toISOString() });
      });
  
      window.addEventListener('offline', () => {
        this.logEvent('CONNECTIVITY', 'OFFLINE', { timestamp: new Date().toISOString() });
      });
  
      // Monitor unhandled errors
      window.addEventListener('error', (event) => {
        this.logEvent('UNHANDLED_ERROR', 'ERROR', {
          message: event.message,
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
          timestamp: new Date().toISOString()
        });
      });
  
      // Monitor unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.logEvent('UNHANDLED_REJECTION', 'ERROR', {
          reason: event.reason?.toString(),
          timestamp: new Date().toISOString()
        });
      });
    }
  
    // Core logging method
    logEvent(category, status, data = null) {
      if (!this.isActive) return;
  
      const timestamp = new Date().toISOString();
      const logLevel = this.getLogLevel(status);
      
      const event = {
        sessionId: this.sessionId,
        timestamp,
        category,
        status,
        data
      };
  
      this.flowEvents.push(event);
  
      // Terminal output with color coding
      console.log(
        `${logLevel} [FLOW-MONITOR] ${timestamp} - ${category}: ${status}`,
        data ? JSON.stringify(data, null, 2) : ''
      );
  
      // Keep only last 100 events to prevent memory issues
      if (this.flowEvents.length > 100) {
        this.flowEvents = this.flowEvents.slice(-100);
      }
    }
  
    getLogLevel(status) {
      switch (status.toUpperCase()) {
        case 'SUCCESS':
        case 'COMPLETE':
        case 'ONLINE':
        case 'VISIBLE':
          return '✅';
        case 'ERROR':
        case 'FAILED':
        case 'OFFLINE':
          return '❌';
        case 'WARNING':
        case 'RETRY':
        case 'HIDDEN':
          return '⚠️';
        case 'PROCESSING':
        case 'LOADING':
        case 'CONNECTING':
          return '🔄';
        case 'INFO':
        case 'NAVIGATE':
        case 'CLICK':
          return 'ℹ️';
        default:
          return '📝';
      }
    }
  
    // Track user navigation
    trackNavigation(from, to, method = 'NAVIGATE') {
      this.logEvent('NAVIGATION', method, {
        from,
        to,
        timestamp: new Date().toISOString()
      });
    }
  
    // Track API calls
    trackApiCall(endpoint, method, status, duration = null, data = null) {
      this.logEvent('API_CALL', status, {
        endpoint,
        method,
        duration: duration ? `${duration}ms` : null,
        data,
        timestamp: new Date().toISOString()
      });
    }
  
    // Track user actions
    trackUserAction(action, details = null) {
      this.logEvent('USER_ACTION', 'INFO', {
        action,
        details,
        timestamp: new Date().toISOString()
      });
    }
  
    // Track cart operations
    trackCartOperation(operation, productId = null, quantity = null, result = 'SUCCESS') {
      this.logEvent('CART_OPERATION', result, {
        operation,
        productId,
        quantity,
        timestamp: new Date().toISOString()
      });
    }
  
    // Track order flow
    trackOrderFlow(stage, status, orderData = null) {
      this.logEvent('ORDER_FLOW', status, {
        stage,
        orderData,
        timestamp: new Date().toISOString()
      });
  
      // Special terminal display for order milestones
      if (stage === 'ORDER_CREATED' && status === 'SUCCESS') {
        console.log(`
  🎉 ===============================
     ORDER FLOW MILESTONE!
  ===============================
  📦 Stage: ${stage}
  ✅ Status: ${status}
  🔢 Order: ${orderData?.orderNumber || 'N/A'}
  💰 Amount: ₹${orderData?.totalPrice || 'N/A'}
  📅 Time: ${new Date().toLocaleString()}
  ===============================`);
      }
    }
  
    // Track payment flow
    trackPaymentFlow(stage, status, paymentData = null) {
      this.logEvent('PAYMENT_FLOW', status, {
        stage,
        paymentData,
        timestamp: new Date().toISOString()
      });
  
      // Special terminal display for payment milestones
      if (stage === 'PAYMENT_SUCCESS' && status === 'SUCCESS') {
        console.log(`
  💳 ===============================
     PAYMENT FLOW MILESTONE!
  ===============================
  💰 Stage: ${stage}
  ✅ Status: ${status}
  🏦 Method: ${paymentData?.method || 'N/A'}
  💵 Amount: ₹${paymentData?.amount || 'N/A'}
  📅 Time: ${new Date().toLocaleString()}
  ===============================`);
      }
    }
  
    // Track socket connections
    trackSocketEvent(event, status, data = null) {
      this.logEvent('SOCKET_EVENT', status, {
        event,
        data,
        timestamp: new Date().toISOString()
      });
    }
  
    // Track authentication events
    trackAuth(action, userType, status, details = null) {
      this.logEvent('AUTHENTICATION', status, {
        action,
        userType,
        details,
        timestamp: new Date().toISOString()
      });
    }
  
    // Get flow summary
    getFlowSummary() {
      if (!this.isActive) return null;
  
      const summary = {
        sessionId: this.sessionId,
        totalEvents: this.flowEvents.length,
        eventsByCategory: {},
        eventsByStatus: {},
        recentEvents: this.flowEvents.slice(-10),
        timestamp: new Date().toISOString()
      };
  
      // Categorize events
      this.flowEvents.forEach(event => {
        // By category
        if (!summary.eventsByCategory[event.category]) {
          summary.eventsByCategory[event.category] = 0;
        }
        summary.eventsByCategory[event.category]++;
  
        // By status
        if (!summary.eventsByStatus[event.status]) {
          summary.eventsByStatus[event.status] = 0;
        }
        summary.eventsByStatus[event.status]++;
      });
  
      return summary;
    }
  
    // Print flow summary to console
    printFlowSummary() {
      if (!this.isActive) return;
  
      const summary = this.getFlowSummary();
      
      console.log(`
  📊 ===============================
     FLOW MONITOR SUMMARY
  ===============================
  📱 Session: ${summary.sessionId}
  📈 Total Events: ${summary.totalEvents}
  
  📋 By Category:
  ${Object.entries(summary.eventsByCategory)
    .map(([cat, count]) => `   ${cat}: ${count}`)
    .join('\n')}
  
  📊 By Status:
  ${Object.entries(summary.eventsByStatus)
    .map(([status, count]) => `   ${status}: ${count}`)
    .join('\n')}
  
  ⏰ Generated: ${new Date().toLocaleString()}
  ===============================`);
    }
  
    // Export flow data (for debugging)
    exportFlowData() {
      if (!this.isActive) return null;
  
      const exportData = {
        sessionInfo: {
          sessionId: this.sessionId,
          startTime: this.flowEvents[0]?.timestamp,
          exportTime: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        },
        summary: this.getFlowSummary(),
        allEvents: this.flowEvents
      };
  
      // Create downloadable JSON
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `zammer-flow-${this.sessionId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  
      console.log('📥 Flow data exported successfully');
    }
  
    // Clear flow data
    clearFlowData() {
      this.flowEvents = [];
      console.log('🧹 Flow monitor data cleared');
    }
  }
  
  // Create global instance
  const flowMonitor = new FlowMonitor();
  
  // Make available globally for debugging
  if (typeof window !== 'undefined') {
    window.flowMonitor = flowMonitor;
    
    if (flowMonitor.isActive) {
      console.log(`
  🔧 Flow Monitor Debug Commands:
  ┌─────────────────────────────────────┐
  │ window.flowMonitor.printFlowSummary() │
  │ window.flowMonitor.exportFlowData()   │
  │ window.flowMonitor.clearFlowData()    │
  │ window.flowMonitor.getFlowSummary()   │
  └─────────────────────────────────────┘`);
    }
  }
  
  export default flowMonitor;