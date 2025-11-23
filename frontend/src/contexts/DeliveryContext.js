// i d not remember the reason 
// frontend/src/contexts/DeliveryContext.js - COMPLETE Delivery Context
// 🎯 ADDED: Complete delivery context for operations (not auth)
// 🎯 Uses AuthContext for authentication, handles only delivery operations

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import deliveryService from '../services/deliveryService';
import socketService from '../services/socketService';
import { toast } from 'react-toastify';

const DeliveryContext = createContext();

export const useDelivery = () => {
  const context = useContext(DeliveryContext);
  if (!context) {
    throw new Error('useDelivery must be used within DeliveryProvider');
  }
  return context;
};

export const DeliveryProvider = ({ children }) => {
  // 🎯 USE AuthContext for authentication
  const { deliveryAgentAuth, logoutDeliveryAgent } = useAuth();
  
  // State for delivery operations
  const [stats, setStats] = useState({
    today: { deliveries: 0, earnings: 0 },
    total: { deliveries: 0, earnings: 0 },
    current: { pending: 0, assigned: 0 },
    performance: { rating: 0, completionRate: 0 }
  });
  
  const [deliveryHistory, setDeliveryHistory] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initialize socket when authenticated
  useEffect(() => {
    if (deliveryAgentAuth.isAuthenticated && deliveryAgentAuth.token) {
      initializeSocket();
      loadStats();
    }
  }, [deliveryAgentAuth.isAuthenticated]);

  const initializeSocket = async () => {
    try {
      await socketService.connect();
      setIsOnline(true);
      
      // Listen for order assignments
      socketService.on('new_order_assigned', (data) => {
        showNotification('New order assigned!', 'success');
        loadStats();
      });

      socketService.on('order_updated', (data) => {
        showNotification('Order status updated', 'info');
        loadStats();
      });

    } catch (error) {
      console.error('Socket connection failed:', error);
      setIsOnline(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await deliveryService.getDeliveryStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      setError(error.message || 'Failed to load stats');
    }
  };

  const loadDeliveryHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await deliveryService.getHistory(1, 100); // Get first 100 records
      if (result.success && result.data) {
        // Service already transforms the data to match component expectations
        const history = Array.isArray(result.data) ? result.data : [];
        setDeliveryHistory(history);
      } else {
        setDeliveryHistory([]);
      }
    } catch (error) {
      console.error('Failed to load delivery history:', error);
      setError(error.message || 'Failed to load delivery history');
      setDeliveryHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    try {
      setLoading(true);
      const result = await deliveryService.updateAvailability(!isAvailable);
      if (result.success) {
        setIsAvailable(!isAvailable);
        showNotification(
          `You are now ${!isAvailable ? 'available' : 'unavailable'}`,
          'success'
        );
      }
    } catch (error) {
      showNotification('Failed to update availability', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    toast[type](message);
    setTimeout(() => setNotification(null), 5000);
  };

  const clearNotification = () => {
    setNotification(null);
  };

  const clearError = () => {
    setError(null);
  };

  // Logout wrapper
  const logout = async () => {
    try {
      await socketService.disconnect();
      logoutDeliveryAgent(); // Use AuthContext logout
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    // Auth data from AuthContext
    agent: deliveryAgentAuth.deliveryAgent,
    isAuthenticated: deliveryAgentAuth.isAuthenticated,
    
    // Delivery specific state
    stats,
    deliveryHistory,
    isOnline,
    isAvailable,
    notification,
    error,
    loading,
    
    // Functions
    toggleAvailability,
    showNotification,
    clearNotification,
    clearError,
    logout,
    loadStats,
    loadDeliveryHistory
  };

  return (
    <DeliveryContext.Provider value={value}>
      {children}
    </DeliveryContext.Provider>
  );
};