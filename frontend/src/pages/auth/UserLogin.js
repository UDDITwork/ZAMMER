import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { loginUser } from '../../services/userService';
import { AuthContext } from '../../contexts/AuthContext';
import fallbackApi from '../../services/fallbackApi';

const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
});

const UserLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [useFallbackApi, setUseFallbackApi] = useState(false);
  const navigate = useNavigate();
  const { loginUser: authLogin } = useContext(AuthContext);

  // Clear any API errors when component mounts
  useEffect(() => {
    setApiError(null);
  }, []);

  const handleSubmit = async (values, { setSubmitting }) => {
    setIsLoading(true);
    setApiError(null);
    
    try {
      // Try to login with the real API first
      let response;
      if (!useFallbackApi) {
        try {
          console.log('Attempting login with real API');
          response = await loginUser(values);
        } catch (error) {
          console.error('Real API error:', error);
          if (error.message && error.message.includes('connect to the server')) {
            // If it's a connection error, try the fallback API
            setApiError({
              message: 'Server connection issue. Using test mode.',
              type: 'warning'
            });
            setUseFallbackApi(true);
            response = await fallbackApi.loginUser(values);
          } else {
            // If it's another type of error, rethrow it
            throw error;
          }
        }
      } else {
        // Use fallback API if previously selected
        console.log('Using fallback API for login');
        response = await fallbackApi.loginUser(values);
      }
      
      if (response.success) {
        // Store the token and user data
        authLogin(response.data);
        
        toast.success('Login successful!');
        navigate('/user/dashboard');
      } else {
        setApiError({
          message: response.message || 'Login failed',
          type: 'error'
        });
        toast.error(response.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      const errorMessage = error.message || 'Something went wrong';
      setApiError({
        message: errorMessage,
        type: 'error'
      });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  const useTestMode = () => {
    setUseFallbackApi(true);
    toast.info('Test mode enabled. Use test@example.com / password123 to login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
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
        
        {apiError && (
          <div className={`rounded-md p-4 ${apiError.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
            <p>{apiError.message}</p>
            {apiError.message.includes('connect to the server') && (
              <button 
                className="mt-2 text-sm font-medium text-orange-600 hover:text-orange-500"
                onClick={useTestMode}
              >
                Use Test Mode
              </button>
            )}
          </div>
        )}
        
        {useFallbackApi && (
          <div className="bg-blue-50 text-blue-700 p-4 rounded-md">
            <p className="text-sm">
              Using test mode. Use the following credentials:
              <br />
              Email: <span className="font-bold">test@example.com</span>
              <br />
              Password: <span className="font-bold">password123</span>
            </p>
          </div>
        )}
        
        <Formik
          initialValues={{
            email: useFallbackApi ? 'test@example.com' : '',
            password: useFallbackApi ? 'password123' : ''
          }}
          enableReinitialize={true}
          validationSchema={LoginSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form className="mt-8 space-y-6">
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="email" className="sr-only">
                    Email address
                  </label>
                  <Field
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                    placeholder="Email address"
                  />
                  <ErrorMessage
                    name="email"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <Field
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                    placeholder="Password"
                  />
                  <ErrorMessage
                    name="password"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link to="/user/forgot-password" className="font-medium text-orange-600 hover:text-orange-500">
                    Forgot your password?
                  </Link>
                </div>
                {!useFallbackApi && (
                  <div className="text-sm">
                    <button 
                      type="button"
                      onClick={useTestMode}
                      className="font-medium text-gray-500 hover:text-gray-700"
                    >
                      Use Test Mode
                    </button>
                  </div>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                    (isSubmitting || isLoading) ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default UserLogin;