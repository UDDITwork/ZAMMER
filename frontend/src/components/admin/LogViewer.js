// File: /frontend/src/components/admin/LogViewer.js
// 🎯 COMPREHENSIVE: Real-time log viewer component for admin dashboard

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FaPlayCircle, 
  FaPauseCircle, 
  FaTrash, 
  FaDownload,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaSearch
} from 'react-icons/fa';
import frontendLogger from '../../services/loggingService';

const LogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [filters, setFilters] = useState({
    level: '',
    search: '',
    operation: '',
    date: ''
  });
  const [activeOperations, setActiveOperations] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const logsEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  // Fetch initial logs
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.level) queryParams.append('level', filters.level);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.operation) queryParams.append('operation', filters.operation);
      if (filters.date) queryParams.append('date', filters.date);
      
      const response = await fetch(`/api/admin/logs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch logs');
      
      const data = await response.json();
      setLogs(data.data.logs || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      frontendLogger.logEvent('LOG_FETCH_ERROR', { error: err.message }, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Fetch active operations
  const fetchActiveOperations = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/logs/active', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setActiveOperations(data.data.activeOperations || []);
      }
    } catch (err) {
      console.error('Failed to fetch active operations:', err);
    }
  }, []);

  // Fetch log statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/logs/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.data.stats || {});
      }
    } catch (err) {
      console.error('Failed to fetch log stats:', err);
    }
  }, []);

  // Start log streaming
  const startStreaming = () => {
    if (eventSourceRef.current) return;
    
    setIsStreaming(true);
    frontendLogger.logEvent('LOG_STREAMING_START', {}, 'info');
    
    // Fetch initial data
    fetchLogs();
    fetchActiveOperations();
    fetchStats();
    
    // Set up periodic refresh
    const interval = setInterval(() => {
      if (isStreaming) {
        fetchLogs();
        fetchActiveOperations();
        fetchStats();
      }
    }, 5000);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  };

  // Stop log streaming
  const stopStreaming = () => {
    setIsStreaming(false);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    frontendLogger.logEvent('LOG_STREAMING_STOP', {}, 'info');
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    frontendLogger.logEvent('LOG_CLEAR', {}, 'info');
  };

  // Download logs
  const downloadLogs = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.level) queryParams.append('level', filters.level);
      if (filters.date) queryParams.append('date', filters.date);
      
      const response = await fetch(`/api/admin/logs/download?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${new Date().toISOString().split('T')[0]}.log`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        frontendLogger.logEvent('LOG_DOWNLOAD', { filters }, 'success');
      }
    } catch (err) {
      setError(err.message);
      frontendLogger.logEvent('LOG_DOWNLOAD_ERROR', { error: err.message }, 'error');
    }
  };

  // Cleanup logs
  const cleanupLogs = async () => {
    try {
      const response = await fetch('/api/admin/logs/cleanup', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ daysToKeep: 7 })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        fetchLogs();
        fetchStats();
        
        frontendLogger.logEvent('LOG_CLEANUP', { daysToKeep: 7 }, 'success');
      }
    } catch (err) {
      setError(err.message);
      frontendLogger.logEvent('LOG_CLEANUP_ERROR', { error: err.message }, 'error');
    }
  };

  // Get log level color
  const getLogLevelColor = (level) => {
    const colors = {
      ERROR: 'text-red-600 bg-red-50',
      CRITICAL: 'text-red-800 bg-red-100',
      WARNING: 'text-yellow-600 bg-yellow-50',
      SUCCESS: 'text-green-600 bg-green-50',
      INFO: 'text-blue-600 bg-blue-50',
      DEBUG: 'text-gray-600 bg-gray-50'
    };
    return colors[level] || colors.INFO;
  };

  // Get log level icon
  const getLogLevelIcon = (level) => {
    const icons = {
      ERROR: <FaTimesCircle className="w-4 h-4" />,
      CRITICAL: <FaExclamationTriangle className="w-4 h-4" />,
      WARNING: <FaExclamationTriangle className="w-4 h-4" />,
      SUCCESS: <FaCheckCircle className="w-4 h-4" />,
      INFO: <FaInfoCircle className="w-4 h-4" />,
      DEBUG: <FaInfoCircle className="w-4 h-4" />
    };
    return icons[level] || icons.INFO;
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (filters.level && log.level !== filters.level) return false;
    if (filters.search && !log.message?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.operation && !log.message?.toLowerCase().includes(filters.operation.toLowerCase())) return false;
    if (filters.date && !log.timestamp?.startsWith(filters.date)) return false;
    return true;
  });

  useEffect(() => {
    fetchLogs();
    fetchActiveOperations();
    fetchStats();
    
    return () => {
      stopStreaming();
    };
  }, [fetchLogs, fetchActiveOperations, fetchStats]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">System Logs</h2>
            <p className="text-sm text-gray-500 mt-1">
              Real-time monitoring of system operations and events
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={isStreaming ? stopStreaming : startStreaming}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                isStreaming 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {isStreaming ? (
                <>
                  <FaPauseCircle className="w-4 h-4 mr-2" />
                  Stop Streaming
                </>
              ) : (
                <>
                  <FaPlayCircle className="w-4 h-4 mr-2" />
                  Start Streaming
                </>
              )}
            </button>
            
            <button
              onClick={downloadLogs}
              className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-200"
            >
              <FaDownload className="w-4 h-4 mr-2" />
              Download
            </button>
            
            <button
              onClick={cleanupLogs}
              className="flex items-center px-4 py-2 bg-orange-100 text-orange-700 rounded-md text-sm font-medium hover:bg-orange-200"
            >
              <FaTrash className="w-4 h-4 mr-2" />
              Cleanup
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats.totalLogs > 0 && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-600">Total Logs</div>
              <div className="text-2xl font-semibold text-blue-900">{stats.totalLogs}</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="text-sm text-red-600">Error Rate</div>
              <div className="text-2xl font-semibold text-red-900">{stats.errorRate}%</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-green-600">Avg Response</div>
              <div className="text-2xl font-semibold text-green-900">{stats.performanceMetrics?.averageResponseTime || 0}ms</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="text-sm text-yellow-600">Active Ops</div>
              <div className="text-2xl font-semibold text-yellow-900">{activeOperations.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
            <select
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Levels</option>
              <option value="ERROR">Error</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="SUCCESS">Success</option>
              <option value="INFO">Info</option>
              <option value="DEBUG">Debug</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <FaSearch className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search logs..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
            <input
              type="text"
              value={filters.operation}
              onChange={(e) => setFilters({ ...filters, operation: e.target.value })}
              placeholder="Filter by operation..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center">
            <FaTimesCircle className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-800 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Logs Container */}
      <div className="h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading logs...</div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">No logs found</div>
          </div>
        ) : (
          <div className="p-6">
            {filteredLogs.map((log, index) => (
              <div key={index} className="mb-3 p-3 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLogLevelColor(log.level)}`}>
                      {getLogLevelIcon(log.level)}
                      <span className="ml-1">{log.level}</span>
                    </span>
                    {log.correlationId && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {log.correlationId}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <FaClock className="w-3 h-3 mr-1" />
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'No timestamp'}
                  </div>
                </div>
                
                <div className="text-sm text-gray-900 mb-2">
                  {log.message || log.raw || 'No message'}
                </div>
                
                {log.data && typeof log.data === 'object' && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                      View Details
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div>
            Showing {filteredLogs.length} of {logs.length} logs
            {isStreaming && <span className="ml-2 text-green-600">● Live</span>}
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={clearLogs}
              className="text-red-600 hover:text-red-800"
            >
              Clear Logs
            </button>
            <button
              onClick={fetchLogs}
              className="text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogViewer;
