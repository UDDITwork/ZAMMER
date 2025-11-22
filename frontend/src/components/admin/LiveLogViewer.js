// File: /frontend/src/components/admin/LiveLogViewer.js
// 🎯 REAL-TIME: Live log viewer component using Socket.io for instant updates

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
  FaSearch,
  FaFilter,
  FaExpand,
  FaCompress
} from 'react-icons/fa';
import { io } from 'socket.io-client';
import frontendLogger from '../../services/loggingService';

const LiveLogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [filters, setFilters] = useState({
    level: '',
    search: '',
    operation: ''
  });
  const [maxLogs, setMaxLogs] = useState(1000); // Maximum logs to keep in memory
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [logCount, setLogCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const logsEndRef = useRef(null);
  const socketRef = useRef(null);
  const pausedLogsRef = useRef([]); // Store logs while paused

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    if (!isPaused) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs, isPaused]);

  // Get server URL for Socket.io
  const getServerUrl = () => {
    if (process.env.REACT_APP_SOCKET_URL) {
      return process.env.REACT_APP_SOCKET_URL;
    }
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    // Default to current origin or localhost
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isDev ? 'http://localhost:5001' : window.location.origin;
  };

  // Initialize Socket.io connection
  useEffect(() => {
    const adminId = localStorage.getItem('adminId') || 'admin';
    const serverUrl = getServerUrl();

    console.log('🔌 Connecting to Socket.io for live logs:', serverUrl);

    socketRef.current = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: false
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Connected to Socket.io for live logs');
      setIsConnected(true);
      
      // Join admin logs room
      socket.emit('admin-logs-join', adminId);
    });

    socket.on('admin-logs-joined', (data) => {
      console.log('📊 Joined admin logs room:', data);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from Socket.io:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.io connection error:', error);
      setIsConnected(false);
    });

    // Listen for live logs
    socket.on('live-log', (logEvent) => {
      if (!isPaused) {
        addLog(logEvent);
      } else {
        // Store logs while paused
        pausedLogsRef.current.push(logEvent);
      }
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.emit('admin-logs-leave');
        socket.disconnect();
      }
    };
  }, []); // Only run once on mount

  // Add log to state
  const addLog = useCallback((logEvent) => {
    setLogs(prevLogs => {
      const newLogs = [...prevLogs, logEvent];
      
      // Keep only the last maxLogs
      if (newLogs.length > maxLogs) {
        return newLogs.slice(-maxLogs);
      }
      return newLogs;
    });

    // Update counters
    if (logEvent.level === 'ERROR' || logEvent.level === 'CRITICAL') {
      setErrorCount(prev => prev + 1);
    } else if (logEvent.level === 'WARNING') {
      setWarningCount(prev => prev + 1);
    }
    setLogCount(prev => prev + 1);
  }, [maxLogs]);

  // Toggle pause/resume
  const togglePause = () => {
    if (isPaused) {
      // Resume: add all paused logs
      pausedLogsRef.current.forEach(log => addLog(log));
      pausedLogsRef.current = [];
    }
    setIsPaused(!isPaused);
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    setLogCount(0);
    setErrorCount(0);
    setWarningCount(0);
    pausedLogsRef.current = [];
    frontendLogger.logEvent('LOG_CLEAR', {}, 'info');
  };

  // Get log level color
  const getLogLevelColor = (level) => {
    const colors = {
      ERROR: 'text-red-700 bg-red-50 border-red-200',
      CRITICAL: 'text-red-900 bg-red-100 border-red-300',
      WARNING: 'text-yellow-700 bg-yellow-50 border-yellow-200',
      SUCCESS: 'text-green-700 bg-green-50 border-green-200',
      INFO: 'text-blue-700 bg-blue-50 border-blue-200',
      DEBUG: 'text-gray-700 bg-gray-50 border-gray-200',
      API: 'text-purple-700 bg-purple-50 border-purple-200',
      DATABASE: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      PAYMENT: 'text-pink-700 bg-pink-50 border-pink-200',
      ORDER: 'text-orange-700 bg-orange-50 border-orange-200',
      USER: 'text-cyan-700 bg-cyan-50 border-cyan-200',
      SELLER: 'text-teal-700 bg-teal-50 border-teal-200',
      DELIVERY: 'text-lime-700 bg-lime-50 border-lime-200',
      ADMIN: 'text-amber-700 bg-amber-50 border-amber-200',
      SYSTEM: 'text-slate-700 bg-slate-50 border-slate-200'
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
    if (filters.search && !log.message?.toLowerCase().includes(filters.search.toLowerCase()) && 
        !log.action?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.operation && !log.action?.toLowerCase().includes(filters.operation.toLowerCase())) return false;
    return true;
  });

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'No timestamp';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  // Download logs as text file
  const downloadLogs = () => {
    const logText = filteredLogs.map(log => {
      return `[${log.timestamp}] [${log.level}] ${log.action}\n${log.data ? JSON.stringify(log.data, null, 2) : ''}\n${'='.repeat(80)}\n`;
    }).join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `live-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    frontendLogger.logEvent('LOG_DOWNLOAD', { count: filteredLogs.length }, 'success');
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${isFullscreen ? 'fixed inset-0 z-50 m-4' : ''}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-white to-orange-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Live Backend Logs</h2>
            <p className="text-sm text-gray-500 mt-1">
              Real-time monitoring of backend events and operations
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Connection Status */}
            <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
              isConnected 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>

            <button
              onClick={togglePause}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                isPaused 
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {isPaused ? (
                <>
                  <FaPlayCircle className="w-4 h-4 mr-2" />
                  Resume
                </>
              ) : (
                <>
                  <FaPauseCircle className="w-4 h-4 mr-2" />
                  Pause
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
              onClick={toggleFullscreen}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200"
            >
              {isFullscreen ? (
                <>
                  <FaCompress className="w-4 h-4 mr-2" />
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <FaExpand className="w-4 h-4 mr-2" />
                  Fullscreen
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
            <div className="text-xs text-blue-600 font-medium">Total Logs</div>
            <div className="text-xl font-semibold text-blue-900">{logCount.toLocaleString()}</div>
          </div>
          <div className="bg-red-50 p-2 rounded-lg border border-red-200">
            <div className="text-xs text-red-600 font-medium">Errors</div>
            <div className="text-xl font-semibold text-red-900">{errorCount.toLocaleString()}</div>
          </div>
          <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-200">
            <div className="text-xs text-yellow-600 font-medium">Warnings</div>
            <div className="text-xl font-semibold text-yellow-900">{warningCount.toLocaleString()}</div>
          </div>
          <div className="bg-green-50 p-2 rounded-lg border border-green-200">
            <div className="text-xs text-green-600 font-medium">Displayed</div>
            <div className="text-xl font-semibold text-green-900">{filteredLogs.length.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <FaSearch className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search logs..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
          
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
            <select
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">All Levels</option>
              <option value="ERROR">Error</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="SUCCESS">Success</option>
              <option value="INFO">Info</option>
              <option value="API">API</option>
              <option value="DATABASE">Database</option>
              <option value="PAYMENT">Payment</option>
              <option value="ORDER">Order</option>
              <option value="USER">User</option>
              <option value="SELLER">Seller</option>
              <option value="DELIVERY">Delivery</option>
              <option value="ADMIN">Admin</option>
              <option value="SYSTEM">System</option>
            </select>
          </div>

          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
            <input
              type="text"
              value={filters.operation}
              onChange={(e) => setFilters({ ...filters, operation: e.target.value })}
              placeholder="Filter by operation..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={clearLogs}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200 flex items-center"
            >
              <FaTrash className="w-4 h-4 mr-2" />
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Logs Container */}
      <div className={`overflow-y-auto bg-gray-900 text-gray-100 font-mono text-sm ${isFullscreen ? 'h-[calc(100vh-280px)]' : 'h-[600px]'}`}>
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 text-center">
              <div className="text-lg mb-2">No logs to display</div>
              <div className="text-sm">
                {!isConnected ? 'Waiting for connection...' : isPaused ? 'Logs are paused' : 'Waiting for logs...'}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-1">
            {filteredLogs.map((log, index) => (
              <div 
                key={index} 
                className={`p-2 rounded border-l-4 ${getLogLevelColor(log.level)} hover:bg-opacity-80 transition-colors`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center space-x-2 flex-1">
                    <span className="text-xs font-semibold">{log.icon || '📝'}</span>
                    <span className="text-xs font-bold">{log.level}</span>
                    {log.correlationId && (
                      <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">
                        {log.correlationId.substring(0, 8)}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 flex items-center">
                      <FaClock className="w-3 h-3 mr-1" />
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                </div>
                
                <div className="text-sm font-medium mb-1 text-gray-100">
                  {log.action || log.message || 'No action'}
                </div>
                
                {log.data && typeof log.data === 'object' && Object.keys(log.data).length > 0 && (
                  <details className="text-xs mt-1">
                    <summary className="cursor-pointer text-gray-400 hover:text-gray-200 font-medium">
                      View Data ({Object.keys(log.data).length} fields)
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-800 rounded text-gray-300 overflow-x-auto max-h-48 overflow-y-auto">
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
            {isPaused && pausedLogsRef.current.length > 0 && (
              <span className="ml-2 text-yellow-600">
                ({pausedLogsRef.current.length} paused)
              </span>
            )}
            {isConnected && !isPaused && <span className="ml-2 text-green-600 animate-pulse">● Live</span>}
          </div>
          <div className="text-xs text-gray-400">
            Max logs: {maxLogs.toLocaleString()} | Auto-scroll: {isPaused ? 'Paused' : 'Active'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveLogViewer;

