import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { verifyResetToken, resetPassword } from '../../services/userService';

const UserResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetComplete, setResetComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);
  const [error, setError] = useState(null);
  
  // Verify token on component mount
  useEffect(() => {
    const checkToken = async () => {
      try {
        // In a real implementation, this would verify the token
        // const response = await verifyResetToken(token);
        // setTokenValid(response.success);
        
        // For now, just simulate token validation
        await new Promise(resolve => setTimeout(resolve, 500));
        setTokenValid(true);
      } catch (error) {
        console.error('Token verification error:', error);
        setTokenValid(false);
        setError('This reset link is invalid or has expired.');
      }
    };
    
    checkToken();
  }, [token]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would call the API
      // const response = await resetPassword({ token, password });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setResetComplete(true);
      toast.success('Password has been reset successfully');
    } catch (error) {
      console.error('Password reset error:', error);
      
      // Handle connection errors gracefully
      if (error.message && error.message.includes('connect to the server')) {
        setError('Unable to connect to the server. Please try again later.');
      } else {
        setError(error.message || 'Something went wrong. Please try again.');
      }
      
      toast.error(error.message || 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Show loading state while checking token
  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-6">Verifying Reset Link</h1>
          <div className="animate-pulse">Please wait while we verify your reset link...</div>
        </div>
      </div>
    );
  }
  
  // Show error if token is invalid
  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Invalid Reset Link</h1>
          <div className="text-red-600 mb-4 text-center">
            {error || 'This password reset link is invalid or has expired.'}
          </div>
          <div className="text-center">
            <Link to="/user/forgot-password" className="text-orange-500 hover:underline">
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Reset Password</h1>
        
        {resetComplete ? (
          <div className="text-center">
            <p className="text-green-600 mb-4">Your password has been reset successfully!</p>
            <Link to="/user/login" className="text-orange-500 hover:underline">
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="password">
                New Password
              </label>
              <input
                id="password"
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 mb-2" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className={`w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default UserResetPassword;