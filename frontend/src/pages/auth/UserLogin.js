import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../../contexts/AuthContext';
import { loginUser } from '../../services/userService';

const UserLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { loginUser: contextLogin, userAuth } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Enhanced debugging
  const debugLog = (message, data = null, type = 'info') => {
    if (process.env.NODE_ENV === 'development') {
      const colors = {
        info: '#2196F3',
        success: '#4CAF50', 
        warning: '#FF9800',
        error: '#F44336'
      };
      
      console.log(
        `%c[UserLogin] ${message}`,
        `color: ${colors[type]}; font-weight: bold;`,
        data
      );
    }
  };

  useEffect(() => {
    debugLog('Component mounted', {
      userAuthenticated: userAuth.isAuthenticated,
      userName: userAuth.user?.name,
      redirectFrom: location.state?.from
    });

    // Redirect if already logged in
    if (userAuth.isAuthenticated) {
      const redirectTo = location.state?.from || '/user/dashboard';
      debugLog('User already authenticated, redirecting', { redirectTo }, 'info');
      navigate(redirectTo);
    }
  }, [userAuth.isAuthenticated, navigate, location.state?.from]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return false;
    }

    if (!formData.password.trim()) {
      toast.error('Password is required');
      return false;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      debugLog('🔑 LOGIN ATTEMPT STARTED', {
        email: formData.email,
        passwordLength: formData.password.length
      }, 'info');

      const response = await loginUser(formData);
      
      debugLog('📊 LOGIN RESPONSE RECEIVED', {
        success: response.success,
        hasData: !!response.data,
        hasToken: !!response.data?.token,
        userName: response.data?.name
      }, response.success ? 'success' : 'error');

      if (response.success && response.data) {
        debugLog('✅ SERVER LOGIN SUCCESS - Calling context login...', {
          userData: {
            name: response.data.name,
            email: response.data.email,
            id: response.data._id,
            hasToken: !!response.data.token,
            tokenLength: response.data.token?.length
          }
        }, 'success');

        // Call the context login function
        await contextLogin(response.data);
        
        debugLog('✅ CONTEXT LOGIN COMPLETED', null, 'success');
        
        toast.success(`Welcome back, ${response.data.name}!`);
        
        // Redirect to intended page or dashboard
        const redirectTo = location.state?.from || '/user/dashboard';
        debugLog('🎯 REDIRECTING USER', { redirectTo }, 'info');
        navigate(redirectTo);
        
      } else {
        debugLog('❌ LOGIN FAILED - Invalid response', {
          response,
          message: response.message
        }, 'error');
        toast.error(response.message || 'Login failed');
      }
    } catch (error) {
      debugLog('💥 LOGIN ERROR CAUGHT', {
        error: error,
        message: error.message,
        errorData: error,
        hasResponse: !!error.response,
        responseData: error.response?.data
      }, 'error');

      console.error('Login error:', error);
      
      // Handle different error formats
      let errorMessage = 'Something went wrong during login';
      
      if (error.message) {
        // Error object with message property
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        // Axios error with response data
        errorMessage = error.response.data.message;
      } else if (typeof error === 'string') {
        // String error
        errorMessage = error;
      } else if (error?.message) {
        // Error object
        errorMessage = error.message;
      }
      
      // Show user-friendly error message
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Debug auth state function
  const handleAuthDebug = () => {
    debugLog('🔧 MANUAL AUTH DEBUG TRIGGERED', null, 'info');
    
    // Check localStorage
    const userToken = localStorage.getItem('userToken');
    const userData = localStorage.getItem('userData');
    
    const debugInfo = {
      localStorage: {
        userToken: userToken ? {
          exists: true,
          length: userToken.length,
          preview: `${userToken.substring(0, 30)}...`
        } : { exists: false },
        userData: userData ? {
          exists: true,
          length: userData.length,
          preview: userData.substring(0, 50) + '...'
        } : { exists: false },
        allKeys: Object.keys(localStorage)
      },
      authContext: {
        isAuthenticated: userAuth.isAuthenticated,
        hasUser: !!userAuth.user,
        hasToken: !!userAuth.token,
        userName: userAuth.user?.name
      }
    };
    
    debugLog('📊 AUTH DEBUG REPORT', debugInfo, 'info');
    
    // Call global debug functions if available
    if (window.debugAuth) {
      window.debugAuth();
    }
    if (window.debugAPI) {
      window.debugAPI.checkTokens();
    }
    if (window.debugCartAuth) {
      window.debugCartAuth();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="text-orange-500 text-3xl font-bold">ZAMMER</div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link to="/user/register" className="font-medium text-orange-600 hover:text-orange-500">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Development Debug Panel */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="text-sm font-medium text-yellow-800 mb-3">Debug Panel</h3>
              <div className="space-y-2">
                <button
                  onClick={handleAuthDebug}
                  className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-800 py-2 px-3 rounded text-sm font-medium transition-colors"
                >
                  🔧 Check Auth State
                </button>
                <div className="text-xs text-yellow-700">
                  <div>Auth: {userAuth.isAuthenticated ? '✅' : '❌'}</div>
                  <div>Token: {userAuth.token ? '✅' : '❌'}</div>
                  <div>User: {userAuth.user?.name || 'None'}</div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
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
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link to="/user/forgot-password" className="font-medium text-orange-600 hover:text-orange-500">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-orange-300 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
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
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Are you a seller?{' '}
                <Link to="/seller/login" className="font-medium text-orange-600 hover:text-orange-500">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;