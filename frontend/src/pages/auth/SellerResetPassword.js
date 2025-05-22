import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { resetPassword, verifyResetToken } from '../../services/sellerService';

const ResetPasswordSchema = Yup.object().shape({
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
});

const SellerResetPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [tokenValidating, setTokenValidating] = useState(true);
  const [passwordReset, setPasswordReset] = useState(false);
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await verifyResetToken(token);
        setIsValidToken(response.success);
      } catch (error) {
        setIsValidToken(false);
        toast.error('Invalid or expired reset link');
      } finally {
        setTokenValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (values, { setSubmitting }) => {
    setIsLoading(true);
    try {
      const response = await resetPassword({
        token,
        password: values.password,
      });
      
      if (response.success) {
        setPasswordReset(true);
        toast.success('Password has been reset successfully');
      } else {
        toast.error(response.message || 'Failed to reset password');
      }
    } catch (error) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  if (tokenValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <p className="text-lg">Validating your reset link...</p>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Invalid Reset Link
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              This password reset link is invalid or has expired.
            </p>
          </div>
          <div>
            <Link
              to="/seller/forgot-password"
              className="font-medium text-orange-600 hover:text-orange-500"
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (passwordReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Password Reset Complete
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Your password has been reset successfully.
            </p>
          </div>
          <div>
            <Link
              to="/seller/login"
              className="font-medium text-orange-600 hover:text-orange-500"
            >
              Sign in with your new password
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please enter your new password below.
          </p>
        </div>
        
        <Formik
          initialValues={{ password: '', confirmPassword: '' }}
          validationSchema={ResetPasswordSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form className="mt-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="sr-only">
                    New Password
                  </label>
                  <Field
                    id="password"
                    name="password"
                    type="password"
                    className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                    placeholder="New password"
                  />
                  <ErrorMessage
                    name="password"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="sr-only">
                    Confirm New Password
                  </label>
                  <Field
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                    placeholder="Confirm new password"
                  />
                  <ErrorMessage
                    name="confirmPassword"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                    (isSubmitting || isLoading) ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default SellerResetPassword; 