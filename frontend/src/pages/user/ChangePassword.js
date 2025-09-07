import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../services/api';

const ChangePasswordSchema = Yup.object().shape({
  currentPassword: Yup.string()
    .required('Current password is required'),
  newPassword: Yup.string()
    .required('New password is required')
    .min(6, 'New password must be at least 6 characters'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword'), null], 'Passwords must match')
    .required('Confirm password is required')
});

const ChangePassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const navigate = useNavigate();
  const { userAuth } = useContext(AuthContext);

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
        `%c[ChangePassword] ${message}`,
        `color: ${colors[type]}; font-weight: bold;`,
        data
      );
    }
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    setIsLoading(true);
    
    try {
      debugLog('🔐 CHANGE PASSWORD ATTEMPT STARTED', {
        hasCurrentPassword: !!values.currentPassword,
        hasNewPassword: !!values.newPassword,
        passwordsMatch: values.newPassword === values.confirmPassword
      }, 'info');

      const response = await api.put('/users/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });

      debugLog('📊 CHANGE PASSWORD RESPONSE', {
        success: response.data.success,
        message: response.data.message
      }, response.data.success ? 'success' : 'error');

      if (response.data.success) {
        toast.success('Password changed successfully!');
        debugLog('✅ PASSWORD CHANGED SUCCESSFULLY', null, 'success');
        navigate('/user/profile');
      } else {
        toast.error(response.data.message || 'Failed to change password');
        debugLog('❌ PASSWORD CHANGE FAILED', response.data, 'error');
      }
    } catch (error) {
      debugLog('💥 PASSWORD CHANGE ERROR', {
        error: error,
        message: error.message,
        responseData: error.response?.data
      }, 'error');

      console.error('Change password error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Something went wrong while changing password';
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-25 to-pink-25 pb-20">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-pink-500 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        
        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 hover:bg-white/30 transition-all duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h1 className="text-2xl font-bold">Change Password</h1>
            
            <div className="w-10 h-10"></div> {/* Spacer for centering */}
          </div>

          {/* User Info */}
          <div className="text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-white/30">
              <span className="text-2xl font-bold">
                {userAuth.user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <h2 className="text-lg font-semibold mb-1">{userAuth.user?.name || 'User'}</h2>
            <p className="text-orange-100 text-sm">{userAuth.user?.email}</p>
          </div>
        </div>
      </div>

      {/* Change Password Form */}
      <div className="p-6">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Update Your Password</h3>
              <p className="text-gray-600">Enter your current password and choose a new secure password</p>
            </div>

            <Formik
              initialValues={{
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
              }}
              validationSchema={ChangePasswordSchema}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting, values }) => (
                <Form className="space-y-6">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Current Password
                    </label>
                    <div className="relative">
                      <Field
                        name="currentPassword"
                        type={showPasswords.current ? 'text' : 'password'}
                        className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-base pr-12"
                        placeholder="Enter your current password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('current')}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                      >
                        {showPasswords.current ? (
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
                    <ErrorMessage
                      name="currentPassword"
                      component="div"
                      className="text-red-500 text-sm mt-2"
                    />
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      New Password
                    </label>
                    <div className="relative">
                      <Field
                        name="newPassword"
                        type={showPasswords.new ? 'text' : 'password'}
                        className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-base pr-12"
                        placeholder="Enter your new password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('new')}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                      >
                        {showPasswords.new ? (
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
                    <ErrorMessage
                      name="newPassword"
                      component="div"
                      className="text-red-500 text-sm mt-2"
                    />
                    <p className="text-gray-500 text-xs mt-1">Password must be at least 6 characters long</p>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Field
                        name="confirmPassword"
                        type={showPasswords.confirm ? 'text' : 'password'}
                        className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-base pr-12"
                        placeholder="Confirm your new password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirm')}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                      >
                        {showPasswords.confirm ? (
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
                    <ErrorMessage
                      name="confirmPassword"
                      component="div"
                      className="text-red-500 text-sm mt-2"
                    />
                    {values.newPassword && values.confirmPassword && values.newPassword !== values.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                    )}
                  </div>

                  {/* Password Strength Indicator */}
                  {values.newPassword && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Password Strength</h4>
                      <div className="space-y-2">
                        <div className="flex items-center text-xs">
                          <div className={`w-2 h-2 rounded-full mr-2 ${values.newPassword.length >= 6 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <span className={values.newPassword.length >= 6 ? 'text-green-600' : 'text-gray-500'}>
                            At least 6 characters
                          </span>
                        </div>
                        <div className="flex items-center text-xs">
                          <div className={`w-2 h-2 rounded-full mr-2 ${/[A-Z]/.test(values.newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <span className={/[A-Z]/.test(values.newPassword) ? 'text-green-600' : 'text-gray-500'}>
                            Contains uppercase letter
                          </span>
                        </div>
                        <div className="flex items-center text-xs">
                          <div className={`w-2 h-2 rounded-full mr-2 ${/[0-9]/.test(values.newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <span className={/[0-9]/.test(values.newPassword) ? 'text-green-600' : 'text-gray-500'}>
                            Contains number
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting || isLoading}
                      className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
                        (isSubmitting || isLoading) 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                          Updating Password...
                        </div>
                      ) : (
                        'Update Password'
                      )}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>

      {/* Enhanced Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 z-50 shadow-2xl">
        <div className="flex justify-between items-center px-2 py-3">
          <button 
            onClick={() => navigate('/user/dashboard')}
            className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-orange-500 transition-colors duration-300 group"
          >
            <div className="w-8 h-8 bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-orange-100 group-hover:to-pink-100 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="text-xs font-medium">Home</span>
          </button>
          
          <button 
            onClick={() => navigate('/user/shop')}
            className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-orange-500 transition-colors duration-300 group"
          >
            <div className="w-8 h-8 bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-orange-100 group-hover:to-pink-100 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <span className="text-xs font-medium">Shop</span>
          </button>
          
          <button 
            onClick={() => navigate('/user/cart')}
            className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-orange-500 transition-colors duration-300 group"
          >
            <div className="w-8 h-8 bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-orange-100 group-hover:to-pink-100 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-xs font-medium">Cart</span>
          </button>
          
          <button 
            onClick={() => navigate('/user/trending')}
            className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-orange-500 transition-colors duration-300 group"
          >
            <div className="w-8 h-8 bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-orange-100 group-hover:to-pink-100 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-xs font-medium">Trending</span>
          </button>
          
          <button 
            onClick={() => navigate('/user/profile')}
            className="flex flex-col items-center justify-center py-2 flex-1 text-orange-500 group"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-pink-100 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-xs font-bold">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
