// File: /frontend/src/pages/admin/LiveLogs.js
// 🎯 REAL-TIME: Live backend logs viewer page for admins

import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { checkAdminAuth, fixAdminAuth } from '../../utils/adminAuthFix';
import { useNavigate } from 'react-router-dom';
import LiveLogViewer from '../../components/admin/LiveLogViewer';
import frontendLogger from '../../services/loggingService';

const LiveLogs = () => {
  const { adminAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCheck = async () => {
      // Initialize frontend logging for admin
      if (adminAuth.admin) {
        frontendLogger.setUser(adminAuth.admin._id, 'admin');
        frontendLogger.logEvent('ADMIN_LIVE_LOGS_ACCESS', {
          adminId: adminAuth.admin._id,
          adminName: adminAuth.admin.name,
          adminEmail: adminAuth.admin.email
        }, 'info');
      }

      // Check if AuthContext has valid authentication
      if (adminAuth.isAuthenticated && adminAuth.admin && adminAuth.token) {
        return;
      }

      // If AuthContext doesn't have auth, check localStorage directly
      const authCheck = checkAdminAuth();
      
      if (authCheck.isValid) {
        return;
      }

      // Try to auto-fix authentication
      const fixResult = await fixAdminAuth();
      
      if (!fixResult.success) {
        navigate('/admin/login', { replace: true });
      }
    };

    handleAuthCheck();
  }, [adminAuth, navigate]);

  // If not authenticated, don't render
  if (!adminAuth.isAuthenticated || !adminAuth.admin || !adminAuth.token) {
    const authCheck = checkAdminAuth();
    if (!authCheck.isValid) {
      return null; // Will redirect in useEffect
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Live Backend Logs</h1>
          <p className="text-gray-600 mt-2">
            Monitor your backend application events in real-time, just like viewing logs in your terminal
          </p>
        </div>
        
        <LiveLogViewer />
      </div>
    </div>
  );
};

export default LiveLogs;

