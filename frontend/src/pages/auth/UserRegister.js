import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { registerUser } from '../../services/userService';
import fallbackApi from '../../services/fallbackApi';

const RegisterSchema = Yup.object().shape({
  name: Yup.string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
  mobileNumber: Yup.string()
    .required('Mobile number is required')
    .matches(/^[0-9]{10}$/, 'Mobile number must be 10 digits')
});

const UserRegister = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [useFallbackApi, setUseFallbackApi] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (values, { setSubmitting }) => {
    setIsLoading(true);
    setApiError(null);
    
    try {
      // Try to register with the real API first
      let response;
      if (!useFallbackApi) {
        try {
          console.log('Attempting registration with real API');
          response = await registerUser(values);
        } catch (error) {
          console.error('Real API error:', error);
          if (error.message && error.message.includes('connect to the server')) {
            // If it's a connection error, try the fallback API
            setApiError({
              message: 'Server connection issue. Using test mode.',
              type: 'warning'
            });
            setUseFallbackApi(true);
            response = await fallbackApi.registerUser(values);
          } else {
            // If it's another type of error, rethrow it
            throw error;
          }
        }
      } else {
        // Use fallback API if previously selected
        console.log('Using fallback API for registration');
        response = await fallbackApi.registerUser(values);
      }
      
      if (response.success) {
        toast.success('Registration successful! Please login.');
        navigate('/user/login');
      } else {
        setApiError({
          message: response.message || 'Registration failed',
          type: 'error'
        });
        toast.error(response.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      
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
    toast.info('Test mode enabled. You can register with any valid data.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/user/login" className="font-medium text-orange-600 hover:text-orange-500">
              sign in to your account
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
              Using test mode. Registration will be simulated.
            </p>
          </div>
        )}
        
        <Formik
          initialValues={{
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            mobileNumber: ''
          }}
          validationSchema={RegisterSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form className="mt-8 space-y-6">
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="name" className="sr-only">
                    Full Name
                  </label>
                  <Field
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                    placeholder="Full Name"
                  />
                  <ErrorMessage
                    name="name"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="sr-only">
                    Email address
                  </label>
                  <Field
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                    placeholder="Email address"
                  />
                  <ErrorMessage
                    name="email"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="mobileNumber" className="sr-only">
                    Mobile Number
                  </label>
                  <Field
                    id="mobileNumber"
                    name="mobileNumber"
                    type="tel"
                    autoComplete="tel"
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                    placeholder="Mobile Number"
                  />
                  <ErrorMessage
                    name="mobileNumber"
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
                    autoComplete="new-password"
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                    placeholder="Password"
                  />
                  <ErrorMessage
                    name="password"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="sr-only">
                    Confirm Password
                  </label>
                  <Field
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                    placeholder="Confirm Password"
                  />
                  <ErrorMessage
                    name="confirmPassword"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <div></div> {/* Empty div for spacing */}
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
                  {isLoading ? 'Registering...' : 'Register'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default UserRegister;