// frontend/src/components/delivery/QuickProfileCard.js - Quick Profile Overview

import React from 'react';
import { Link } from 'react-router-dom';
import { useDelivery } from '../../contexts/DeliveryContext';

const QuickProfileCard = () => {
  const { 
    agent, 
    isOnline, 
    isAvailable, 
    stats,
    toggleAvailability,
    logout
  } = useDelivery();

  const handleQuickLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await logout();
    }
  };

  if (!agent) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-200 h-12 w-12"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Profile Overview</h3>
        <Link
          to="/delivery/profile"
          className="text-sm text-orange-600 hover:text-orange-500 font-medium"
        >
          Edit Profile
        </Link>
      </div>

      {/* Profile Info */}
      <div className="flex items-center space-x-4 mb-6">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <span className="text-xl font-bold text-orange-700">
              {agent.name?.charAt(0)?.toUpperCase() || 'D'}
            </span>
          </div>
        </div>

        {/* Basic Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-medium text-gray-900 truncate">
            {agent.name}
          </h4>
          <p className="text-sm text-gray-500 truncate">
            {agent.email}
          </p>
          <p className="text-sm text-gray-500">
            📞 {agent.phoneNumber || agent.mobileNumber}
          </p>
        </div>
      </div>

      {/* Status Section */}
      <div className="space-y-3 mb-6">
        {/* Online Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-400' : 'bg-gray-400'} mr-2`}></div>
            <span className="text-sm font-medium text-gray-700">
              Connection Status
            </span>
          </div>
          <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Availability Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Availability
          </span>
          <button
            onClick={toggleAvailability}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              isAvailable 
                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            {isAvailable ? 'Available' : 'Unavailable'}
          </button>
        </div>

        {/* Vehicle Info */}
        {agent.vehicleDetails && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Vehicle
            </span>
            <span className="text-sm text-gray-900">
              {agent.vehicleDetails.type} • {agent.vehicleDetails.registrationNumber}
            </span>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {stats?.today?.deliveries || 0}
          </div>
          <div className="text-xs text-gray-500">Today's Deliveries</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            ₹{stats?.today?.earnings || 0}
          </div>
          <div className="text-xs text-gray-500">Today's Earnings</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/delivery/profile"
          className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Profile
        </Link>
        <button
          onClick={handleQuickLogout}
          className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>

      {/* Profile Completion Indicator */}
      {agent.profileCompletion && agent.profileCompletion < 100 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Profile Completion</span>
            <span className="text-sm text-gray-500">{agent.profileCompletion}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-orange-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${agent.profileCompletion}%` }}
            ></div>
          </div>
          {agent.profileCompletion < 100 && (
            <Link
              to="/delivery/profile"
              className="text-xs text-orange-600 hover:text-orange-500 mt-1 inline-block"
            >
              Complete your profile →
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default QuickProfileCard;