// File: /frontend/src/components/admin/LiveLogViewer.js
// 🎯 REAL-TIME: Live log viewer component using Socket.io for instant updates

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FaPlayCircle, 
  FaPauseCircle, 
  FaTrash, 
  FaDownload,
  FaClock,
  FaSearch,
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


  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (filters.level && log.level !== filters.level) return false;
    if (filters.search && !log.message?.toLowerCase().includes(filters.search.toLowerCase()) && 
        !log.action?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.operation && !log.action?.toLowerCase().includes(filters.operation.toLowerCase())) return false;
    return true;
  });

  // Format timestamp - Terminal style
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

      {/* Logs Container - Terminal Style */}
      <div className={`overflow-y-auto bg-black text-gray-100 font-mono text-xs leading-relaxed ${isFullscreen ? 'h-[calc(100vh-280px)]' : 'h-[600px]'}`}>
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
          <div className="p-2">
            {filteredLogs.map((log, index) => {
              // Get color for log level (terminal-style colors)
              const getLevelColor = (level) => {
                const colors = {
                  ERROR: 'text-red-400',
                  CRITICAL: 'text-red-500',
                  WARNING: 'text-yellow-400',
                  SUCCESS: 'text-green-400',
                  INFO: 'text-cyan-400',
                  DEBUG: 'text-gray-400',
                  API: 'text-blue-400',
                  DATABASE: 'text-purple-400',
                  PAYMENT: 'text-pink-400',
                  ORDER: 'text-orange-400',
                  USER: 'text-blue-300',
                  SELLER: 'text-teal-400',
                  DELIVERY: 'text-lime-400',
                  ADMIN: 'text-amber-400',
                  SYSTEM: 'text-gray-300'
                };
                return colors[level] || 'text-gray-300';
              });

              // Format the log as a continuous line (like Windows CMD)
              const timestamp = formatTimestamp(log.timestamp);
              const levelColor = getLevelColor(log.level);
              const icon = log.icon || '';
              const correlationId = log.correlationId ? `[${log.correlationId.substring(0, 8)}]` : '';
              const action = log.action || log.message || 'No action';
              
              // Format data - inline if short, on continuation lines if long
              let dataLines = [];
              if (log.data && typeof log.data === 'object' && Object.keys(log.data).length > 0) {
                const compactJson = JSON.stringify(log.data);
                if (compactJson.length > 120) {
                  // Multi-line format for long data
                  const formatted = JSON.stringify(log.data, null, 2);
                  dataLines = formatted.split('\n').map((line, i) => (
                    <span key={i} className="block text-gray-400 pl-4">
                      {line}
                    </span>
                  ));
                } else {
                  // Single line format
                  dataLines = [<span key="data" className="text-gray-400"> {compactJson}</span>];
                }
              }

              return (
                <div key={index} className="mb-0.5">
                  {/* Main log line */}
                  <div className="whitespace-pre-wrap break-words">
                    <span className="text-gray-500">{timestamp}</span>
                    <span className="text-gray-600 mx-1">|</span>
                    <span className={levelColor}>[{log.level}]</span>
                    {correlationId && (
                      <>
                        <span className="text-gray-600 mx-1">|</span>
                        <span className="text-gray-500">{correlationId}</span>
                      </>
                    )}
                    {icon && (
                      <>
                        <span className="text-gray-600 mx-1">|</span>
                        <span className="text-gray-300">{icon}</span>
                      </>
                    )}
                    <span className="text-gray-600 mx-1">-</span>
                    <span className="text-white">{action}</span>
                    {dataLines.length === 1 && dataLines[0]}
                  </div>
                  {/* Multi-line data continuation */}
                  {dataLines.length > 1 && (
                    <div className="pl-4">
                      {dataLines}
                    </div>
                  )}
                </div>
              );
            })}
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

