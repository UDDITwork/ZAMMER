 
// frontend/src/components/delivery/LocationTracker.js - Real-time Location Tracking Component

import React, { useState, useEffect, useRef } from 'react';
import deliveryService from '../../services/deliveryService';

const LocationTracker = ({ 
  isActive = false,
  onLocationUpdate,
  onError,
  updateInterval = 60000, // 1 minute default
  className = '',
  showMap = false,
  showStatus = true,
  autoStart = false
}) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [permissions, setPermissions] = useState('unknown');
  
  const watchIdRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const isComponentMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isComponentMounted.current = false;
      stopTracking();
    };
  }, []);

  // Auto-start tracking if enabled
  useEffect(() => {
    if (autoStart && isActive) {
      startTracking();
    }
  }, [autoStart, isActive]);

  // Check geolocation permissions
  const checkPermissions = async () => {
    if (!navigator.geolocation) {
      setPermissions('unsupported');
      return false;
    }

    if (navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setPermissions(permission.state);
        return permission.state === 'granted';
      } catch (error) {
        console.warn('Permission API not supported');
      }
    }

    return true; // Assume granted if can't check
  };

  // Start location tracking
  const startTracking = async () => {
    try {
      // Check permissions first
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        const error = 'Location permission denied';
        setError(error);
        onError?.(error);
        return;
      }

      setError(null);
      setIsTracking(true);

      // Get initial position
      getCurrentPosition();

      // Set up continuous tracking
      if (navigator.geolocation.watchPosition) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          handleLocationSuccess,
          handleLocationError,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
          }
        );
      }

      // Set up interval for server updates
      updateIntervalRef.current = setInterval(() => {
        if (currentLocation && isComponentMounted.current) {
          updateLocationOnServer(currentLocation.latitude, currentLocation.longitude);
        }
      }, updateInterval);

      console.log('📍 Location tracking started');
    } catch (error) {
      handleLocationError(error);
    }
  };

  // Stop location tracking
  const stopTracking = () => {
    setIsTracking(false);

    // Clear watch position
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Clear update interval
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    console.log('📍 Location tracking stopped');
  };

  // Get current position once
  const getCurrentPosition = () => {
    if (!navigator.geolocation) {
      const error = 'Geolocation is not supported by this browser';
      setError(error);
      onError?.(error);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      handleLocationSuccess,
      handleLocationError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  };

  // Handle successful location retrieval
  const handleLocationSuccess = (position) => {
    if (!isComponentMounted.current) return;

    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp),
      speed: position.coords.speed,
      heading: position.coords.heading
    };

    setCurrentLocation(location);
    setLastUpdate(location.timestamp);
    setAccuracy(location.accuracy);
    setError(null);

    // Call callback
    onLocationUpdate?.(location);

    // Update server if tracking is active
    if (isTracking) {
      updateLocationOnServer(location.latitude, location.longitude);
    }
  };

  // Handle location error
  const handleLocationError = (error) => {
    if (!isComponentMounted.current) return;

    let errorMessage = 'Unknown location error';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location access denied. Please enable location permissions.';
        setPermissions('denied');
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable. Please check GPS settings.';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out. Please try again.';
        break;
      default:
        errorMessage = error.message || 'Failed to get location';
        break;
    }

    setError(errorMessage);
    setIsTracking(false);
    onError?.(errorMessage);
  };

  // Update location on server
  const updateLocationOnServer = async (latitude, longitude) => {
    try {
      const result = await deliveryService.updateLocation(latitude, longitude);
      if (!result.success) {
        console.warn('Failed to update location on server:', result.message);
      }
    } catch (error) {
      console.error('Error updating location on server:', error);
    }
  };

  // Toggle tracking
  const toggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  // Format time since last update
  const getTimeSinceUpdate = () => {
    if (!lastUpdate) return 'Never';
    
    const now = new Date();
    const diff = Math.floor((now - lastUpdate) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  // Get accuracy color
  const getAccuracyColor = () => {
    if (!accuracy) return 'text-gray-500';
    if (accuracy <= 10) return 'text-green-600';
    if (accuracy <= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get status color
  const getStatusColor = () => {
    if (error) return 'text-red-600';
    if (isTracking) return 'text-green-600';
    return 'text-gray-500';
  };

  return (
    <div className={`location-tracker ${className}`}>
      {/* Status Display */}
      {showStatus && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Location Tracking
            </h3>
            
            {/* Toggle Button */}
            <button
              onClick={toggleTracking}
              disabled={!isActive}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isTracking
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isTracking ? 'Stop Tracking' : 'Start Tracking'}
            </button>
          </div>

          {/* Status Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tracking Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                error ? 'bg-red-500' : isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}></div>
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {error ? 'Error' : isTracking ? 'Tracking Active' : 'Inactive'}
              </span>
            </div>

            {/* Last Update */}
            <div className="text-sm text-gray-600">
              <span className="font-medium">Last Update:</span> {getTimeSinceUpdate()}
            </div>

            {/* Current Location */}
            {currentLocation && (
              <>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Latitude:</span> {currentLocation.latitude.toFixed(6)}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Longitude:</span> {currentLocation.longitude.toFixed(6)}
                </div>
              </>
            )}

            {/* Accuracy */}
            {accuracy && (
              <div className="text-sm">
                <span className="font-medium text-gray-600">Accuracy:</span>{' '}
                <span className={`font-medium ${getAccuracyColor()}`}>
                  ±{Math.round(accuracy)}m
                </span>
              </div>
            )}

            {/* Speed */}
            {currentLocation?.speed !== null && currentLocation?.speed !== undefined && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Speed:</span> {Math.round(currentLocation.speed * 3.6)} km/h
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* Permissions Warning */}
          {permissions === 'denied' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-sm text-yellow-800 font-medium">Location Permission Required</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Please enable location access in your browser settings to use real-time tracking.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-4 flex space-x-2">
            <button
              onClick={getCurrentPosition}
              disabled={!isActive || isTracking}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Get Current Location
            </button>
            
            {currentLocation && (
              <button
                onClick={() => updateLocationOnServer(currentLocation.latitude, currentLocation.longitude)}
                disabled={!isActive}
                className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Update Server
              </button>
            )}
          </div>
        </div>
      )}

      {/* Simple Map View (optional) */}
      {showMap && currentLocation && (
        <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Current Location</h4>
          <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <p className="text-sm text-gray-600">Map integration coming soon</p>
              <p className="text-xs text-gray-500 mt-1">
                {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Compact Location Tracker for status bars
export const CompactLocationTracker = ({ isActive, onToggle }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    // Start delivery service location tracking
    if (isActive && isTracking) {
      deliveryService.startLocationTracking({
        updateInterval: 30000 // 30 seconds for compact tracker
      });
    } else {
      deliveryService.stopLocationTracking();
    }
  }, [isActive, isTracking]);

  const toggleTracking = () => {
    const newState = !isTracking;
    setIsTracking(newState);
    setLastUpdate(new Date());
    onToggle?.(newState);
  };

  return (
    <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
      <div className={`w-2 h-2 rounded-full ${
        isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
      }`}></div>
      
      <span className="text-sm text-gray-600">
        {isTracking ? 'Tracking' : 'Offline'}
      </span>
      
      <button
        onClick={toggleTracking}
        disabled={!isActive}
        className="text-xs px-2 py-1 rounded text-gray-500 hover:text-gray-700 disabled:opacity-50"
      >
        {isTracking ? 'Stop' : 'Start'}
      </button>
    </div>
  );
};

export default LocationTracker;