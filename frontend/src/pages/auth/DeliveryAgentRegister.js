// frontend/src/pages/auth/DeliveryAgentRegister.js - FULLY FIXED VERSION
// 🚚 FIXED: Proper field mapping, validation, and error handling

import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../../contexts/AuthContext';

// 🚚 DELIVERY AGENT REGISTRATION LOGGING
const logDeliveryRegister = (action, data, type = 'info') => {
  const timestamp = new Date().toISOString();
  const logColor = type === 'error' ? '\x1b[31m' : type === 'success' ? '\x1b[32m' : '\x1b[36m';
  const resetColor = '\x1b[0m';
  
  console.log(`${logColor}🚚 [DELIVERY-REGISTER] ${timestamp} | ${action} | ${JSON.stringify(data)}${resetColor}`);
};

const logDeliveryRegisterError = (action, error, additionalData = {}) => {
  const timestamp = new Date().toISOString();
  console.error(`\x1b[31m🚚 [DELIVERY-REGISTER-ERROR] ${timestamp} | ${action} | Error: ${error.message} | Stack: ${error.stack} | Data: ${JSON.stringify(additionalData)}\x1b[0m`);
};

const DeliveryAgentRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',              // ✅ Keep as 'phone' - backend will map to mobileNumber
    address: '',
    vehicleType: '',
    vehicleModel: '',
    vehicleRegistration: '',
    licenseNumber: '',
    workingAreas: '',
    emergencyContact: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  
  // ✅ FIXED: Use proper delivery agent context function
  const { loginDeliveryAgent } = useContext(AuthContext);

  // 🚚 REGISTRATION PAGE LOADED
  React.useEffect(() => {
    logDeliveryRegister('REGISTRATION_PAGE_LOADED', { 
      hasStoredToken: !!localStorage.getItem('deliveryAgentToken'),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
    
    // Clear any existing tokens to prevent conflicts
    const existingTokens = {
      userToken: localStorage.getItem('userToken'),
      sellerToken: localStorage.getItem('sellerToken'),
      adminToken: localStorage.getItem('adminToken')
    };
    
    if (existingTokens.userToken || existingTokens.sellerToken || existingTokens.adminToken) {
      logDeliveryRegister('CLEARING_CONFLICTING_TOKENS', existingTokens);
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('sellerToken');
      localStorage.removeItem('sellerData');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    setFormData({
      ...formData,
      [name]: value
    });

    // 🚚 LOG FORM FIELD CHANGES
    logDeliveryRegister('FORM_FIELD_CHANGED', { 
      field: name, 
      hasValue: !!value,
      valueLength: value.length,
      isPassword: name === 'password'
    });
  };

  // ✅ ENHANCED: Client-side validation
  const validateForm = () => {
    const newErrors = {};
    
    // Required field validation
    const requiredFields = {
      name: 'Full name is required',
      email: 'Email address is required', 
      password: 'Password is required',
      phone: 'Phone number is required',
      address: 'Address is required',
      vehicleType: 'Vehicle type is required',
      vehicleModel: 'Vehicle model is required',
      vehicleRegistration: 'Vehicle registration is required',
      licenseNumber: 'License number is required'
    };

    Object.keys(requiredFields).forEach(field => {
      if (!formData[field] || formData[field].trim() === '') {
        newErrors[field] = requiredFields[field];
      }
    });

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation (Indian mobile number)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit Indian mobile number';
    }

    // Password validation
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    setErrors(newErrors);
    
    const hasErrors = Object.keys(newErrors).length > 0;
    
    logDeliveryRegister('FORM_VALIDATION', { 
      hasErrors,
      errorCount: Object.keys(newErrors).length,
      errors: hasErrors ? Object.keys(newErrors) : []
    });
    
    return !hasErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const startTime = Date.now();
    
    logDeliveryRegister('REGISTRATION_ATTEMPT_STARTED', { 
      email: formData.email,
      name: formData.name,
      hasPassword: !!formData.password,
      hasVehicleDetails: !!formData.vehicleType,
      hasLicense: !!formData.licenseNumber,
      formFields: Object.keys(formData).filter(key => formData[key])
    });

    // ✅ VALIDATE FORM FIRST
    if (!validateForm()) {
      logDeliveryRegister('FORM_VALIDATION_FAILED', { 
        errors: Object.keys(errors)
      });
      toast.error('Please fix the form errors before submitting');
      return;
    }

    setLoading(true);

    try {
      logDeliveryRegister('API_CALL_STARTED', { 
        endpoint: '/api/delivery/register',
        method: 'POST',
        dataFields: Object.keys(formData).filter(key => formData[key])
      });

      // ✅ PREPARE DATA - Clean and format
      const submitData = {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        phone: formData.phone.trim(),  // Backend will map this to mobileNumber
        address: formData.address.trim(),
        vehicleType: formData.vehicleType,
        vehicleModel: formData.vehicleModel.trim(),
        vehicleRegistration: formData.vehicleRegistration.trim().toUpperCase(),
        licenseNumber: formData.licenseNumber.trim(),
        workingAreas: formData.workingAreas.trim(),
        emergencyContact: formData.emergencyContact.trim()
      };

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/delivery/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();
      const processingTime = Date.now() - startTime;

      logDeliveryRegister('API_RESPONSE_RECEIVED', {
        success: data.success,
        status: response.status,
        hasData: !!data.data,
        hasToken: !!(data.data && data.data.token),
        processingTime: `${processingTime}ms`
      });

      if (data.success && data.data) {
        // ✅ FIXED: Use proper delivery agent login function
        try {
          logDeliveryRegister('AUTH_CONTEXT_UPDATE_STARTED', { 
            agentId: data.data._id,
            email: data.data.email
          });

          await loginDeliveryAgent(data.data);

          logDeliveryRegister('REGISTRATION_SUCCESS', { 
            agentId: data.data._id,
            email: data.data.email,
            name: data.data.name,
            processingTime: `${processingTime}ms`,
            tokenStored: !!data.data.token,
            authContextUpdated: true,
            hasVehicleDetails: !!data.data.vehicleDetails,
            hasLicense: !!data.data.licenseNumber
          }, 'success');

          toast.success('🎉 Registration successful! Welcome to ZAMMER Delivery!');
          
          // Small delay to ensure state updates complete
          setTimeout(() => {
            navigate('/delivery/dashboard');
          }, 500);
          
        } catch (authError) {
          logDeliveryRegisterError('REGISTRATION_AUTH_FAILED', authError, {
            email: formData.email,
            name: formData.name
          });
          
          toast.error('Registration successful but login failed. Please try logging in manually.');
          setTimeout(() => {
            navigate('/delivery/login');
          }, 2000);
        }
      } else {
        // ✅ ENHANCED: Better error handling
        logDeliveryRegisterError('REGISTRATION_FAILED', new Error(data.message || 'Registration failed'), {
          email: formData.email,
          name: formData.name,
          processingTime: `${processingTime}ms`,
          responseStatus: response.status,
          errorMessage: data.message,
          errorCode: data.code,
          errors: data.errors || []
        });

        // Handle different types of errors
        if (data.code === 'DUPLICATE_AGENT') {
          toast.error('An account with this email or phone number already exists. Please try logging in instead.');
        } else if (data.code === 'VALIDATION_ERROR' && data.errors) {
          // Show validation errors
          const validationErrors = {};
          data.errors.forEach(error => {
            validationErrors[error.field] = error.message;
            toast.error(`${error.field}: ${error.message}`);
          });
          setErrors(validationErrors);
        } else if (data.errors && Array.isArray(data.errors)) {
          // Handle express-validator errors
          const validationErrors = {};
          data.errors.forEach(error => {
            validationErrors[error.path || error.param] = error.msg;
            toast.error(`${error.path || error.param}: ${error.msg}`);
          });
          setErrors(validationErrors);
        } else {
          toast.error(data.message || 'Registration failed. Please try again.');
        }
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logDeliveryRegisterError('REGISTRATION_ERROR', error, { 
        email: formData.email,
        name: formData.name,
        processingTime: `${processingTime}ms`,
        errorType: error.name,
        errorMessage: error.message
      });

      console.error('Registration error:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error('Unable to connect to server. Please check your internet connection.');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
      logDeliveryRegister('REGISTRATION_ATTEMPT_COMPLETED', { 
        processingTime: `${Date.now() - startTime}ms`
      });
    }
  };

  // 🚚 LOG NAVIGATION ATTEMPTS
  const handleNavigation = (path) => {
    logDeliveryRegister('NAVIGATION_ATTEMPT', { 
      from: '/delivery/register',
      to: path,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            🚚 Join ZAMMER Delivery
          </h2>
          <p className="text-gray-600">
            Register as a delivery agent and start earning
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password *
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Create a password (min 6 characters)"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number *
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter 10-digit mobile number"
                  maxLength="10"
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address *
              </label>
              <textarea
                id="address"
                name="address"
                rows="3"
                required
                value={formData.address}
                onChange={handleChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${
                  errors.address ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your complete address"
              />
              {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
            </div>

            {/* Vehicle Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700">
                  Vehicle Type *
                </label>
                <select
                  id="vehicleType"
                  name="vehicleType"
                  required
                  value={formData.vehicleType}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${
                    errors.vehicleType ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select vehicle type</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Scooter">Scooter</option>
                  <option value="Car">Car</option>
                  <option value="Van">Van</option>
                </select>
                {errors.vehicleType && <p className="mt-1 text-sm text-red-600">{errors.vehicleType}</p>}
              </div>

              <div>
                <label htmlFor="vehicleModel" className="block text-sm font-medium text-gray-700">
                  Vehicle Model *
                </label>
                <input
                  id="vehicleModel"
                  name="vehicleModel"
                  type="text"
                  required
                  value={formData.vehicleModel}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${
                    errors.vehicleModel ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Honda Activa, Swift"
                />
                {errors.vehicleModel && <p className="mt-1 text-sm text-red-600">{errors.vehicleModel}</p>}
              </div>

              <div>
                <label htmlFor="vehicleRegistration" className="block text-sm font-medium text-gray-700">
                  Registration Number *
                </label>
                <input
                  id="vehicleRegistration"
                  name="vehicleRegistration"
                  type="text"
                  required
                  value={formData.vehicleRegistration}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${
                    errors.vehicleRegistration ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., MH12AB1234"
                />
                {errors.vehicleRegistration && <p className="mt-1 text-sm text-red-600">{errors.vehicleRegistration}</p>}
              </div>
            </div>

            {/* License and Working Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700">
                  License Number *
                </label>
                <input
                  id="licenseNumber"
                  name="licenseNumber"
                  type="text"
                  required
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${
                    errors.licenseNumber ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your license number"
                />
                {errors.licenseNumber && <p className="mt-1 text-sm text-red-600">{errors.licenseNumber}</p>}
              </div>

              <div>
                <label htmlFor="workingAreas" className="block text-sm font-medium text-gray-700">
                  Preferred Working Areas
                </label>
                <input
                  id="workingAreas"
                  name="workingAreas"
                  type="text"
                  value={formData.workingAreas}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g., Andheri, Bandra, Dadar"
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700">
                Emergency Contact
              </label>
              <input
                id="emergencyContact"
                name="emergencyContact"
                type="text"
                value={formData.emergencyContact}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                placeholder="Name and phone number of emergency contact"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  logDeliveryRegister('REGISTER_BUTTON_CLICKED', { 
                    email: formData.email,
                    name: formData.name,
                    hasPassword: !!formData.password,
                    hasVehicleDetails: !!formData.vehicleType,
                    loading: loading,
                    hasErrors: Object.keys(errors).length > 0
                  });
                }}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating account...
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Already have an account?</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/delivery/login"
                className="font-medium text-orange-600 hover:text-orange-500"
                onClick={() => handleNavigation('/delivery/login')}
              >
                Sign in to your account
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-sm text-gray-500 hover:text-gray-700"
              onClick={() => handleNavigation('/')}
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryAgentRegister;