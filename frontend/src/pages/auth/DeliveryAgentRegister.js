// frontend/src/pages/auth/DeliveryAgentRegister.js - FIXED VERSION

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
    phone: '',
    address: '',
    vehicleType: '',
    vehicleModel: '',
    vehicleRegistration: '',
    licenseNumber: '',
    workingAreas: '',
    emergencyContact: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // ✅ FIXED: Use delivery agent context function
  const { loginDeliveryAgent } = useContext(AuthContext);

  // 🚚 REGISTRATION PAGE LOADED
  React.useEffect(() => {
    logDeliveryRegister('REGISTRATION_PAGE_LOADED', { 
      hasStoredToken: !!localStorage.getItem('deliveryAgentToken'),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
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

    setLoading(true);

    try {
      logDeliveryRegister('API_CALL_STARTED', { 
        endpoint: '/api/delivery/register',
        method: 'POST',
        dataFields: Object.keys(formData)
      });

      const response = await fetch('http://localhost:5001/api/delivery/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      const processingTime = Date.now() - startTime;

      if (data.success) {
        // ✅ FIXED: Use proper delivery agent login function
        try {
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

          toast.success('Registration successful! Welcome to ZAMMER Delivery!');
          navigate('/delivery/dashboard');
        } catch (authError) {
          logDeliveryRegisterError('REGISTRATION_AUTH_FAILED', authError, {
            email: formData.email,
            name: formData.name
          });
          toast.error('Registration successful but login failed. Please try logging in.');
          navigate('/delivery/login');
        }
      } else {
        logDeliveryRegisterError('REGISTRATION_FAILED', new Error(data.message || 'Registration failed'), {
          email: formData.email,
          name: formData.name,
          processingTime: `${processingTime}ms`,
          responseStatus: response.status,
          errorMessage: data.message,
          errors: data.errors || []
        });

        // ✅ FIXED: Show validation errors properly
        if (data.errors && Array.isArray(data.errors)) {
          data.errors.forEach(error => {
            toast.error(`${error.path}: ${error.msg}`);
          });
        } else {
          toast.error(data.message || 'Registration failed');
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
      toast.error('Something went wrong. Please try again.');
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

  // 🚚 LOG FORM VALIDATION
  const validateForm = () => {
    const requiredFields = ['name', 'email', 'password', 'phone', 'vehicleType', 'vehicleRegistration', 'licenseNumber'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      logDeliveryRegister('FORM_VALIDATION_FAILED', { 
        missingFields,
        totalFields: requiredFields.length,
        filledFields: requiredFields.length - missingFields.length
      });
      return false;
    }

    logDeliveryRegister('FORM_VALIDATION_PASSED', { 
      totalFields: requiredFields.length,
      allFieldsFilled: true
    });
    return true;
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
          <form className="space-y-6" onSubmit={handleSubmit}>
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter your full name"
                />
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter your email"
                />
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Create a password"
                />
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter your phone number"
                />
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter your complete address"
              />
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Select vehicle type</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Scooter">Scooter</option>
                  <option value="Car">Car</option>
                  <option value="Van">Van</option>
                </select>
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g., Honda Activa, Swift"
                />
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g., MH12AB1234"
                />
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter your license number"
                />
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
                    formValid: validateForm()
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