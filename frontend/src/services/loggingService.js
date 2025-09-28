// File: /frontend/src/services/loggingService.js
// 🎯 COMPREHENSIVE: Frontend logging service for tracking all user interactions

class FrontendLogger {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.userType = null;
    this.startTime = Date.now();
    this.interactions = [];
    this.enabled = process.env.NODE_ENV === 'development' || process.env.REACT_APP_ENABLE_LOGGING === 'true';
    
    // Initialize logging
    this.init();
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  init() {
    if (!this.enabled) return;

    // Log page load
    this.logEvent('PAGE_LOAD', {
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    });

    // Track route changes
    this.trackRouteChanges();
    
    // Track user interactions
    this.trackUserInteractions();
    
    // Track API calls
    this.trackAPICalls();
    
    // Track errors
    this.trackErrors();
  }

  setUser(userId, userType) {
    this.userId = userId;
    this.userType = userType;
    
    this.logEvent('USER_SESSION_START', {
      userId,
      userType,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    });
  }

  clearUser() {
    this.logEvent('USER_SESSION_END', {
      userId: this.userId,
      userType: this.userType,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    });
    
    this.userId = null;
    this.userType = null;
  }

  logEvent(eventType, data = {}, level = 'info') {
    if (!this.enabled) return;

    const event = {
      eventType,
      data,
      level,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      userType: this.userType,
      url: window.location.href,
      duration: Date.now() - this.startTime
    };

    this.interactions.push(event);

    // Console logging with colors
    this.consoleLog(event);

    // Send to backend if available
    this.sendToBackend(event);
  }

  consoleLog(event) {
    const colors = {
      info: '#2196F3',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
      critical: '#E91E63',
      user: '#9C27B0',
      api: '#00BCD4',
      navigation: '#FF5722'
    };

    const color = colors[event.level] || colors.info;
    const icon = this.getEventIcon(event.eventType);

    console.log(
      `%c${icon} [${event.eventType}] ${event.timestamp}`,
      `color: ${color}; font-weight: bold; background: rgba(0,0,0,0.1); padding: 2px 6px;`,
      event.data
    );
  }

  getEventIcon(eventType) {
    const icons = {
      PAGE_LOAD: '📄',
      PAGE_UNLOAD: '📄',
      USER_CLICK: '👆',
      USER_INPUT: '⌨️',
      USER_SCROLL: '📜',
      USER_HOVER: '🖱️',
      FORM_SUBMIT: '📝',
      FORM_VALIDATION: '✅',
      API_REQUEST: '🌐',
      API_RESPONSE: '📡',
      API_ERROR: '❌',
      NAVIGATION: '🧭',
      AUTH_LOGIN: '🔐',
      AUTH_LOGOUT: '🚪',
      ERROR: '💥',
      PERFORMANCE: '⚡',
      USER_SESSION_START: '👤',
      USER_SESSION_END: '👋',
      BUTTON_CLICK: '🔘',
      MODAL_OPEN: '🪟',
      MODAL_CLOSE: '❌',
      DROPDOWN_OPEN: '📋',
      DROPDOWN_CLOSE: '📋',
      SEARCH: '🔍',
      FILTER: '🔧',
      SORT: '📊',
      EXPORT: '📤',
      IMPORT: '📥',
      UPLOAD: '⬆️',
      DOWNLOAD: '⬇️'
    };

    return icons[eventType] || '📝';
  }

  async sendToBackend(event) {
    try {
      // Only send critical events and user interactions to backend
      if (['ERROR', 'API_ERROR', 'FORM_SUBMIT', 'AUTH_LOGIN', 'AUTH_LOGOUT'].includes(event.eventType)) {
        await fetch('/api/admin/logs/frontend', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          },
          body: JSON.stringify({
            ...event,
            source: 'frontend'
          })
        });
      }
    } catch (error) {
      console.error('Failed to send log to backend:', error);
    }
  }

  trackRouteChanges() {
    // Track initial route
    this.logEvent('NAVIGATION', {
      route: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash
    });

    // Track route changes (for SPAs)
    let lastPath = window.location.pathname;
    const checkRouteChange = () => {
      if (window.location.pathname !== lastPath) {
        this.logEvent('NAVIGATION', {
          from: lastPath,
          to: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash
        });
        lastPath = window.location.pathname;
      }
    };

    // Check for route changes periodically
    setInterval(checkRouteChange, 1000);
  }

  trackUserInteractions() {
    // Track clicks
    document.addEventListener('click', (e) => {
      const target = e.target;
      const tagName = target.tagName.toLowerCase();
      const className = target.className;
      const id = target.id;
      const text = target.textContent?.substring(0, 100);

      this.logEvent('USER_CLICK', {
        tagName,
        className,
        id,
        text,
        x: e.clientX,
        y: e.clientY,
        target: {
          tagName,
          className,
          id,
          text
        }
      });
    });

    // Track form submissions
    document.addEventListener('submit', (e) => {
      const form = e.target;
      const formData = new FormData(form);
      const formFields = {};
      
      for (let [key, value] of formData.entries()) {
        formFields[key] = typeof value === 'string' && value.length > 100 
          ? value.substring(0, 100) + '...' 
          : value;
      }

      this.logEvent('FORM_SUBMIT', {
        formId: form.id,
        formClass: form.className,
        formAction: form.action,
        formMethod: form.method,
        fields: Object.keys(formFields),
        fieldCount: Object.keys(formFields).length
      });
    });

    // Track input changes (throttled)
    let inputTimeout;
    document.addEventListener('input', (e) => {
      clearTimeout(inputTimeout);
      inputTimeout = setTimeout(() => {
        const target = e.target;
        if (target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea') {
          this.logEvent('USER_INPUT', {
            inputType: target.type,
            inputName: target.name,
            inputId: target.id,
            inputClass: target.className,
            valueLength: target.value?.length || 0,
            hasValue: !!target.value
          });
        }
      }, 1000);
    });

    // Track scroll events (throttled)
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.logEvent('USER_SCROLL', {
          scrollY: window.scrollY,
          scrollX: window.scrollX,
          scrollPercentage: Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
        });
      }, 500);
    });
  }

  trackAPICalls() {
    // Override fetch to track API calls
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [url, options = {}] = args;
      const startTime = Date.now();
      
      this.logEvent('API_REQUEST', {
        url: url.toString(),
        method: options.method || 'GET',
        headers: options.headers,
        hasBody: !!options.body
      });

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        this.logEvent('API_RESPONSE', {
          url: url.toString(),
          method: options.method || 'GET',
          status: response.status,
          statusText: response.statusText,
          duration: `${duration}ms`,
          success: response.ok
        }, response.ok ? 'success' : 'error');

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        this.logEvent('API_ERROR', {
          url: url.toString(),
          method: options.method || 'GET',
          error: error.message,
          duration: `${duration}ms`
        }, 'error');

        throw error;
      }
    };
  }

  trackErrors() {
    // Track JavaScript errors
    window.addEventListener('error', (e) => {
      this.logEvent('ERROR', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error?.stack,
        type: 'javascript'
      }, 'error');
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
      this.logEvent('ERROR', {
        reason: e.reason,
        promise: e.promise,
        type: 'promise'
      }, 'error');
    });
  }

  // Specific logging methods for common actions
  logButtonClick(buttonName, context = {}) {
    this.logEvent('BUTTON_CLICK', {
      buttonName,
      ...context
    });
  }

  logFormValidation(formName, isValid, errors = {}) {
    this.logEvent('FORM_VALIDATION', {
      formName,
      isValid,
      errorCount: Object.keys(errors).length,
      errors: Object.keys(errors)
    }, isValid ? 'success' : 'warning');
  }

  logModalAction(action, modalName, context = {}) {
    this.logEvent(`MODAL_${action.toUpperCase()}`, {
      modalName,
      ...context
    });
  }

  logSearch(query, results, filters = {}) {
    this.logEvent('SEARCH', {
      query,
      resultCount: results?.length || 0,
      filters,
      hasResults: (results?.length || 0) > 0
    });
  }

  logFilter(filterType, filterValue, context = {}) {
    this.logEvent('FILTER', {
      filterType,
      filterValue,
      ...context
    });
  }

  logSort(sortBy, sortOrder, context = {}) {
    this.logEvent('SORT', {
      sortBy,
      sortOrder,
      ...context
    });
  }

  logPerformance(operation, duration, context = {}) {
    this.logEvent('PERFORMANCE', {
      operation,
      duration: `${duration}ms`,
      ...context
    }, 'info');
  }

  // Get session summary
  getSessionSummary() {
    const now = Date.now();
    const sessionDuration = now - this.startTime;
    
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      userType: this.userType,
      startTime: new Date(this.startTime).toISOString(),
      duration: `${Math.round(sessionDuration / 1000)}s`,
      interactionCount: this.interactions.length,
      eventTypes: [...new Set(this.interactions.map(i => i.eventType))],
      errors: this.interactions.filter(i => i.level === 'error').length,
      apiCalls: this.interactions.filter(i => i.eventType.includes('API')).length
    };
  }

  // Export session data
  exportSessionData() {
    return {
      summary: this.getSessionSummary(),
      interactions: this.interactions
    };
  }
}

// Create singleton instance
const frontendLogger = new FrontendLogger();

// Export the logger instance and class
export default frontendLogger;
export { FrontendLogger };
