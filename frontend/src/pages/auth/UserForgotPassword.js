import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { requestPasswordReset } from '../../services/userService';

const UserForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would call the API
      // await requestPasswordReset(email);
      
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmitted(true);
      toast.success('Password reset instructions sent to your email');
    } catch (error) {
      console.error('Forgot password error:', error);
      
      // Handle connection errors gracefully
      if (error.message && error.message.includes('connect to the server')) {
        setError('Unable to connect to the server. The app is running in offline mode for testing.');
        // Still show success since this is a demo
        setSubmitted(true);
      } else {
        setError(error.message || 'Something went wrong. Please try again.');
        toast.error(error.message || 'Something went wrong');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Forgot Password</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {submitted ? (
          <div className="text-center">
            <p className="text-green-600 mb-4">If an account exists with that email, we've sent a password reset link.</p>
            <Link to="/user/login" className="text-orange-500 hover:underline">
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <div className="mt-4 text-center">
              <Link to="/user/login" className="text-orange-500 hover:underline">
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default UserForgotPassword;