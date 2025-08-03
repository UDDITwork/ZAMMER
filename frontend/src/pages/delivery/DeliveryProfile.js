// frontend/src/pages/delivery/DeliveryProfile.js - Fixed to use AuthContext

import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../../contexts/AuthContext';

const DeliveryProfile = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const { deliveryAgentAuth, logoutDeliveryAgent, updateDeliveryAgent } = useContext(AuthContext);
  
  // Profile form data
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    address: '',
    vehicleDetails: {
      type: '',
      model: '',
      registrationNumber: ''
    },
    documents: {
      licenseNumber: ''
    },
    emergencyContact: {
      name: '',
      phoneNumber: '',
      relationship: ''
    },
    workingAreas: []
  });

  // Password change form data
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});

  // Check authentication and load data
  useEffect(() => {
    if (!deliveryAgentAuth.isAuthenticated || !deliveryAgentAuth.deliveryAgent) {
      console.log('🚚 [PROFILE] Not authenticated, redirecting to login');
      navigate('/delivery/login');
      return;
    }

    loadProfileData();
  }, [navigate, deliveryAgentAuth]);

  // Load profile data
  const loadProfileData = async () => {
    try {
      setLoading(true);
      const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
      
      if (!token) {
        navigate('/delivery/login');
        return;
      }

      const response = await fetch('http://localhost:5001/api/delivery/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const agent = data.data;
        
        setProfileData({
          name: agent.name || '',
          email: agent.email || '',
          phoneNumber: agent.phoneNumber || '',
          address: agent.address || '',
          vehicleDetails: {
            type: agent.vehicleDetails?.type || '',
            model: agent.vehicleDetails?.model || '',
            registrationNumber: agent.vehicleDetails?.registrationNumber || ''
          },
          documents: {
            licenseNumber: agent.documents?.licenseNumber || agent.licenseNumber || ''
          },
          emergencyContact: agent.emergencyContact || {
            name: '',
            phoneNumber: '',
            relationship: ''
          },
          workingAreas: agent.workingAreas || []
        });

        console.log('✅ [PROFILE] Profile data loaded successfully');
      } else {
        console.error('❌ [PROFILE] Failed to load profile:', response.status);
        if (response.status === 401) {
          logoutDeliveryAgent();
          navigate('/delivery/login');
        } else {
          toast.error('Failed to load profile data');
        }
      }
    } catch (error) {
      console.error('❌ [PROFILE] Error loading profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  // Handle profile input changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      // Handle nested objects
      const [parent, child] = name.split('.');
      if (parent === 'emergencyContact') {
        setProfileData(prev => ({
          ...prev,
          emergencyContact: {
            ...prev.emergencyContact,
            [child]: value
          }
        }));
      } else if (parent === 'vehicleDetails') {
        setProfileData(prev => ({
          ...prev,
          vehicleDetails: {
            ...prev.vehicleDetails,
            [child]: value
          }
        }));
      } else if (parent === 'documents') {
        setProfileData(prev => ({
          ...prev,
          documents: {
            ...prev.documents,
            [child]: value
          }
        }));
      }
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle password input changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate profile form
  const validateProfile = () => {
    const newErrors = {};

    if (!profileData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!profileData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!profileData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^[6-9]\d{9}$/.test(profileData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid Indian mobile number';
    }

    if (!profileData.vehicleDetails.registrationNumber.trim()) {
      newErrors['vehicleDetails.registrationNumber'] = 'Vehicle registration is required';
    }

    if (!profileData.documents.licenseNumber.trim()) {
      newErrors['documents.licenseNumber'] = 'License number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate password form
  const validatePassword = () => {
    const newErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle profile save
  const handleSaveProfile = async () => {
    if (!validateProfile()) {
      return;
    }

    setIsSaving(true);
    
    try {
      const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
      
      const response = await fetch('http://localhost:5001/api/delivery/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (data.success) {
        setIsEditing(false);
        updateDeliveryAgent(data.data); // Update context
        toast.success('Profile updated successfully!');
        console.log('✅ [PROFILE] Profile updated successfully');
      } else {
        setErrors({ submit: data.message });
        toast.error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('❌ [PROFILE] Error updating profile:', error);
      setErrors({ submit: 'Failed to update profile. Please try again.' });
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle password change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }

    setIsChangingPassword(true);
    
    try {
      const token = deliveryAgentAuth.token || localStorage.getItem('deliveryAgentToken');
      
      const response = await fetch('http://localhost:5001/api/delivery/change-password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        toast.success('Password changed successfully!');
      } else {
        setErrors({ password: data.message });
        toast.error(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('❌ [PROFILE] Error changing password:', error);
      setErrors({ password: 'Failed to change password. Please try again.' });
      toast.error('Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    // Reset form data and reload from context/API
    loadProfileData();
    setIsEditing(false);
    setErrors({});
  };

  const handleLogout = () => {
    logoutDeliveryAgent();
    navigate('/delivery/login');
    toast.success('Logged out successfully');
  };

  const vehicleTypes = [
    { value: 'Bicycle', label: 'Bicycle' },
    { value: 'Motorcycle', label: 'Motorcycle' },
    { value: 'Scooter', label: 'Scooter' },
    { value: 'Car', label: 'Car' },
    { value: 'Van', label: 'Van' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <Link to="/delivery/dashboard" className="text-orange-600 hover:text-orange-500 mr-4">
                  ← Back to Dashboard
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">🚚 Profile Settings</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link to="/delivery/dashboard" className="text-orange-600 hover:text-orange-500 mr-4">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">🚚 Profile Settings</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Welcome, {deliveryAgentAuth.deliveryAgent?.name}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Profile Settings
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your personal information and account settings
          </p>
        </div>

        {/* Error Alert */}
        {(errors.submit || errors.password) && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{errors.submit || errors.password}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab('vehicle')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'vehicle'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Vehicle Details
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'security'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Security
            </button>
          </nav>
        </div>

        {/* Profile Information Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                <div className="flex space-x-3">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                          isSaving
                            ? 'bg-orange-400 cursor-not-allowed'
                            : 'bg-orange-600 hover:bg-orange-700'
                        }`}
                      >
                        {isSaving ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="bg-orange-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={profileData.name}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                      !isEditing ? 'bg-gray-50 text-gray-500' : errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                      !isEditing ? 'bg-gray-50 text-gray-500' : errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={profileData.phoneNumber}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                      !isEditing ? 'bg-gray-50 text-gray-500' : errors.phoneNumber ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.phoneNumber && <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>}
                </div>
              </div>

              {/* Address */}
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  id="address"
                  name="address"
                  rows={3}
                  value={profileData.address}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                    !isEditing ? 'bg-gray-50 text-gray-500' : 'border-gray-300'
                  }`}
                />
              </div>

              {/* Emergency Contact */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="emergencyContact.name" className="block text-sm font-medium text-gray-700">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      id="emergencyContact.name"
                      name="emergencyContact.name"
                      value={profileData.emergencyContact.name}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                        !isEditing ? 'bg-gray-50 text-gray-500' : 'border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label htmlFor="emergencyContact.phoneNumber" className="block text-sm font-medium text-gray-700">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      id="emergencyContact.phoneNumber"
                      name="emergencyContact.phoneNumber"
                      value={profileData.emergencyContact.phoneNumber}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                        !isEditing ? 'bg-gray-50 text-gray-500' : 'border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label htmlFor="emergencyContact.relationship" className="block text-sm font-medium text-gray-700">
                      Relationship
                    </label>
                    <input
                      type="text"
                      id="emergencyContact.relationship"
                      name="emergencyContact.relationship"
                      value={profileData.emergencyContact.relationship}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                      placeholder="e.g., Parent, Spouse, Sibling"
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                        !isEditing ? 'bg-gray-50 text-gray-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vehicle Details Tab */}
        {activeTab === 'vehicle' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Vehicle Information</h3>
                <div className="flex space-x-3">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                          isSaving
                            ? 'bg-orange-400 cursor-not-allowed'
                            : 'bg-orange-600 hover:bg-orange-700'
                        }`}
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="bg-orange-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    >
                      Edit Vehicle Details
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="vehicleDetails.type" className="block text-sm font-medium text-gray-700">
                    Vehicle Type
                  </label>
                  <select
                    id="vehicleDetails.type"
                    name="vehicleDetails.type"
                    value={profileData.vehicleDetails.type}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                      !isEditing ? 'bg-gray-50 text-gray-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select vehicle type</option>
                    {vehicleTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="vehicleDetails.model" className="block text-sm font-medium text-gray-700">
                    Vehicle Model
                  </label>
                  <input
                    type="text"
                    id="vehicleDetails.model"
                    name="vehicleDetails.model"
                    value={profileData.vehicleDetails.model}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                    placeholder="e.g., Honda Activa, Royal Enfield"
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                      !isEditing ? 'bg-gray-50 text-gray-500' : 'border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label htmlFor="vehicleDetails.registrationNumber" className="block text-sm font-medium text-gray-700">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    id="vehicleDetails.registrationNumber"
                    name="vehicleDetails.registrationNumber"
                    value={profileData.vehicleDetails.registrationNumber}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                      !isEditing ? 'bg-gray-50 text-gray-500' : errors['vehicleDetails.registrationNumber'] ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors['vehicleDetails.registrationNumber'] && <p className="mt-1 text-sm text-red-600">{errors['vehicleDetails.registrationNumber']}</p>}
                </div>

                <div>
                  <label htmlFor="documents.licenseNumber" className="block text-sm font-medium text-gray-700">
                    License Number
                  </label>
                  <input
                    type="text"
                    id="documents.licenseNumber"
                    name="documents.licenseNumber"
                    value={profileData.documents.licenseNumber}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                      !isEditing ? 'bg-gray-50 text-gray-500' : errors['documents.licenseNumber'] ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors['documents.licenseNumber'] && <p className="mt-1 text-sm text-red-600">{errors['documents.licenseNumber']}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
            </div>

            <form onSubmit={handleChangePassword} className="px-6 py-4 space-y-6">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                    errors.currentPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.currentPassword && <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>}
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                    errors.newPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.newPassword && <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                    isChangingPassword
                      ? 'bg-orange-400 cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  {isChangingPassword ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Changing Password...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryProfile;