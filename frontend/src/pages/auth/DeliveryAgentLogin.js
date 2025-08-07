// frontend/src/pages/auth/DeliveryAgentLogin.js - Fixed Login

import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../../contexts/AuthContext';

// 🚚 DELIVERY AGENT LOGIN LOGGING
const logDeliveryLogin = (action, data, type = 'info') => {
  const timestamp = new Date().toISOString();
  const logColor = type === 'error' ? '\x1b[31m' : type === 'success' ? '\x1b[32m' : '\x1b[36m';
  const resetColor = '\x1b[0m';
  
  console.log(`${logColor}🚚 [DELIVERY-LOGIN] ${timestamp} | ${action} | ${JSON.stringify(data)}${resetColor}`);
};

const logDeliveryLoginError = (action, error, additionalData = {}) => {
  const timestamp = new Date().toISOString();
  console.error(`\x1b[31m🚚 [DELIVERY-LOGIN-ERROR] ${timestamp} | ${action} | Error: ${error.message} | Stack: ${error.stack} | Data: ${JSON.stringify(additionalData)}\x1b[0m`);
};

const DeliveryAgentLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginDeliveryAgent } = useContext(AuthContext); // ✅ FIXED: Use delivery agent function

  // 🚚 LOGIN PAGE LOADED
  React.useEffect(() => {
    logDeliveryLogin('LOGIN_PAGE_LOADED', { 
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
    logDeliveryLogin('FORM_FIELD_CHANGED', { 
      field: name, 
      hasValue: !!value,
      valueLength: value.length
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const startTime = Date.now();
    
    logDeliveryLogin('LOGIN_ATTEMPT_STARTED', { 
      email: formData.email,
      hasPassword: !!formData.password,
      passwordLength: formData.password.length
    });

    setLoading(true);

    try {
      logDeliveryLogin('API_CALL_STARTED', { 
        endpoint: '/api/delivery/login',
        method: 'POST'
      });

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/delivery/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      const processingTime = Date.now() - startTime;

      if (data.success) {
        // ✅ FIXED: Use delivery agent login function from context
        try {
          await loginDeliveryAgent(data.data);

          logDeliveryLogin('LOGIN_SUCCESS', { 
            agentId: data.data._id,
            email: data.data.email,
            processingTime: `${processingTime}ms`,
            tokenStored: !!data.data.token,
            authContextUpdated: true
          }, 'success');

          toast.success('Login successful!');
          navigate('/delivery/dashboard');
        } catch (authError) {
          logDeliveryLoginError('LOGIN_AUTH_FAILED', authError, {
            email: formData.email
          });
          toast.error('Login successful but context update failed. Please try again.');
        }
      } else {
        logDeliveryLoginError('LOGIN_FAILED', new Error(data.message || 'Login failed'), {
          email: formData.email,
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
          toast.error(data.message || 'Login failed');
        }
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logDeliveryLoginError('LOGIN_ERROR', error, { 
        email: formData.email,
        processingTime: `${processingTime}ms`,
        errorType: error.name,
        errorMessage: error.message
      });

      console.error('Login error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      logDeliveryLogin('LOGIN_ATTEMPT_COMPLETED', { 
        processingTime: `${Date.now() - startTime}ms`
      });
    }
  };

  // 🚚 LOG NAVIGATION ATTEMPTS
  const handleNavigation = (path) => {
    logDeliveryLogin('NAVIGATION_ATTEMPT', { 
      from: '/delivery/login',
      to: path,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            🚚 Delivery Agent Login
          </h2>
          <p className="text-gray-600">
            Access your delivery dashboard
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  logDeliveryLogin('LOGIN_BUTTON_CLICKED', { 
                    email: formData.email,
                    hasPassword: !!formData.password,
                    loading: loading
                  });
                }}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
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
                <span className="px-2 bg-white text-gray-500">New to ZAMMER?</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/delivery/register"
                className="font-medium text-orange-600 hover:text-orange-500"
                onClick={() => handleNavigation('/delivery/register')}
              >
                Register as Delivery Agent
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

export default DeliveryAgentLogin;