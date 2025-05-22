import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { registerSeller } from '../../services/sellerService';
import { AuthContext } from '../../contexts/AuthContext';

const RegisterSchema = Yup.object().shape({
  firstName: Yup.string().required('First name is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  mobileNumber: Yup.string().required('Mobile number is required'),
  shop: Yup.object().shape({
    name: Yup.string().required('Shop name is required'),
    address: Yup.string().required('Shop address is required'),
    category: Yup.string().required('Shop category is required')
  })
});

const SellerRegister = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const { loginSeller } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (values, { setSubmitting }) => {
    setIsLoading(true);
    try {
      const response = await registerSeller(values);
      
      if (response.success) {
        // Store the token and seller data
        loginSeller(response.data);
        
        toast.success('Registration successful!');
        navigate('/seller/dashboard');
      } else {
        toast.error(response.message || 'Registration failed');
      }
    } catch (error) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create a seller account
          </h2>
          <div className="flex justify-center mt-4">
            <div className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 1 ? 'bg-orange-500 text-white' : 'bg-gray-300'
                }`}
              >
                1
              </div>
              <div className={`w-12 h-1 ${step >= 2 ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 2 ? 'bg-orange-500 text-white' : 'bg-gray-300'
                }`}
              >
                2
              </div>
              <div className={`w-12 h-1 ${step >= 3 ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 3 ? 'bg-orange-500 text-white' : 'bg-gray-300'
                }`}
              >
                3
              </div>
            </div>
          </div>
        </div>
        
        <Formik
          initialValues={{
            firstName: '',
            email: '',
            password: '',
            mobileNumber: '',
            shop: {
              name: '',
              address: '',
              gstNumber: '',
              phoneNumber: {
                main: '',
                alternate: ''
              },
              category: '',
              openTime: '',
              closeTime: '',
              workingDays: ''
            },
            bankDetails: {
              accountNumber: '',
              ifscCode: '',
              bankName: '',
              accountType: ''
            }
          }}
          validationSchema={RegisterSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, values }) => (
            <Form className="mt-8 space-y-6">
              {step === 1 && (
                <>
                  <h3 className="text-lg font-medium text-gray-900">Personal Details</h3>
                  <div className="rounded-md shadow-sm -space-y-px">
                    <div className="mb-4">
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                        First Name
                      </label>
                      <Field
                        id="firstName"
                        name="firstName"
                        type="text"
                        className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                      <ErrorMessage
                        name="firstName"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    <div className="mb-4">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <Field
                        id="email"
                        name="email"
                        type="email"
                        className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                      <ErrorMessage
                        name="email"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    <div className="mb-4">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <Field
                        id="password"
                        name="password"
                        type="password"
                        className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                      <ErrorMessage
                        name="password"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    <div className="mb-4">
                      <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700">
                        Mobile Number
                      </label>
                      <Field
                        id="mobileNumber"
                        name="mobileNumber"
                        type="text"
                        className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                      <ErrorMessage
                        name="mobileNumber"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    >
                      Continue
                    </button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h3 className="text-lg font-medium text-gray-900">Shop Details</h3>
                  <div className="rounded-md shadow-sm -space-y-px">
                    <div className="mb-4">
                      <label htmlFor="shop.name" className="block text-sm font-medium text-gray-700">
                        Shop Name
                      </label>
                      <Field
                        id="shop.name"
                        name="shop.name"
                        type="text"
                        className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                      <ErrorMessage
                        name="shop.name"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    <div className="mb-4">
                      <label htmlFor="shop.address" className="block text-sm font-medium text-gray-700">
                        Shop Address
                      </label>
                      <Field
                        id="shop.address"
                        name="shop.address"
                        type="text"
                        className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                      <ErrorMessage
                        name="shop.address"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    <div className="mb-4">
                      <label htmlFor="shop.gstNumber" className="block text-sm font-medium text-gray-700">
                        GST Number (Optional)
                      </label>
                      <Field
                        id="shop.gstNumber"
                        name="shop.gstNumber"
                        type="text"
                        className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                    </div>

                    <div className="mb-4">
                      <label htmlFor="shop.phoneNumber.main" className="block text-sm font-medium text-gray-700">
                        Shop Phone Number
                      </label>
                      <Field
                        id="shop.phoneNumber.main"
                        name="shop.phoneNumber.main"
                        type="text"
                        className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                    </div>

                    <div className="mb-4">
                      <label htmlFor="shop.category" className="block text-sm font-medium text-gray-700">
                        Shop Category
                      </label>
                      <Field
                        as="select"
                        id="shop.category"
                        name="shop.category"
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      >
                        <option value="">Select a category</option>
                        <option value="Men">Men</option>
                        <option value="Women">Women</option>
                        <option value="Kids">Kids</option>
                      </Field>
                      <ErrorMessage
                        name="shop.category"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-1/2 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="w-1/2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    >
                      Continue
                    </button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
                  <div className="rounded-md shadow-sm -space-y-px">
                    <div className="mb-4">
                      <label htmlFor="bankDetails.bankName" className="block text-sm font-medium text-gray-700">
                        Bank Name
                      </label>
                      <Field
                        id="bankDetails.bankName"
                        name="bankDetails.bankName"
                        type="text"
                        className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                    </div>

                    <div className="mb-4">
                      <label htmlFor="bankDetails.accountNumber" className="block text-sm font-medium text-gray-700">
                        Account Number
                      </label>
                      <Field
                        id="bankDetails.accountNumber"
                        name="bankDetails.accountNumber"
                        type="text"
                        className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                    </div>

                    <div className="mb-4">
                      <label htmlFor="bankDetails.ifscCode" className="block text-sm font-medium text-gray-700">
                        IFSC Code
                      </label>
                      <Field
                        id="bankDetails.ifscCode"
                        name="bankDetails.ifscCode"
                        type="text"
                        className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                    </div>

                    <div className="mb-4">
                      <label htmlFor="bankDetails.accountType" className="block text-sm font-medium text-gray-700">
                        Account Type
                      </label>
                      <Field
                        as="select"
                        id="bankDetails.accountType"
                        name="bankDetails.accountType"
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      >
                        <option value="">Select account type</option>
                        <option value="Savings">Savings</option>
                        <option value="Current">Current</option>
                      </Field>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="w-1/2 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || isLoading}
                      className={`w-1/2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                        (isSubmitting || isLoading) ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      {isLoading ? 'Registering...' : 'Register'}
                    </button>
                  </div>
                </>
              )}

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link
                    to="/seller/login"
                    className="font-medium text-orange-600 hover:text-orange-500"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default SellerRegister;