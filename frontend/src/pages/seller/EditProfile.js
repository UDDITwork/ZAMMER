import React, { useState, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import SellerLayout from '../../components/layouts/SellerLayout';
import { getSellerProfile, updateSellerProfile } from '../../services/sellerService';
import { AuthContext } from '../../contexts/AuthContext';

const ProfileSchema = Yup.object().shape({
  firstName: Yup.string().required('First name is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  mobileNumber: Yup.string().required('Mobile number is required'),
  shop: Yup.object().shape({
    name: Yup.string().required('Shop name is required'),
    address: Yup.string().required('Shop address is required'),
    category: Yup.string().required('Shop category is required')
  })
});

const EditProfile = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const { sellerAuth, loginSeller } = useContext(AuthContext);

  useEffect(() => {
    fetchSellerProfile();
  }, []);

  const fetchSellerProfile = async () => {
    setFetchLoading(true);
    try {
      const response = await getSellerProfile();
      if (response.success) {
        setProfile(response.data);
      } else {
        toast.error(response.message || 'Failed to fetch profile');
      }
    } catch (error) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    setIsLoading(true);
    try {
      const response = await updateSellerProfile(values);
      
      if (response.success) {
        // Update auth context with new data
        loginSeller({
          ...sellerAuth,
          ...response.data
        });
        
        toast.success('Profile updated successfully!');
      } else {
        toast.error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <SellerLayout>
      <div className="edit-profile-container">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Profile</h1>
        
        {fetchLoading ? (
          <div className="text-center py-10">
            <p className="text-gray-600">Loading profile data...</p>
          </div>
        ) : profile ? (
          <Formik
            initialValues={{
              firstName: profile.firstName || '',
              email: profile.email || '',
              mobileNumber: profile.mobileNumber || '',
              shop: {
                name: profile.shop?.name || '',
                address: profile.shop?.address || '',
                gstNumber: profile.shop?.gstNumber || '',
                phoneNumber: {
                  main: profile.shop?.phoneNumber?.main || '',
                  alternate: profile.shop?.phoneNumber?.alternate || ''
                },
                category: profile.shop?.category || '',
                openTime: profile.shop?.openTime || '',
                closeTime: profile.shop?.closeTime || '',
                workingDays: profile.shop?.workingDays || ''
              },
              bankDetails: {
                accountNumber: profile.bankDetails?.accountNumber || '',
                ifscCode: profile.bankDetails?.ifscCode || '',
                bankName: profile.bankDetails?.bankName || '',
                accountType: profile.bankDetails?.accountType || ''
              }
            }}
            validationSchema={ProfileSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <Field
                        id="firstName"
                        name="firstName"
                        type="text"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                      <ErrorMessage
                        name="firstName"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <Field
                        id="email"
                        name="email"
                        type="email"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                      <ErrorMessage
                        name="email"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        Mobile Number
                      </label>
                      <Field
                        id="mobileNumber"
                        name="mobileNumber"
                        type="text"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                      <ErrorMessage
                        name="mobileNumber"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Shop Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="shop.name" className="block text-sm font-medium text-gray-700 mb-1">
                        Shop Name
                      </label>
                      <Field
                        id="shop.name"
                        name="shop.name"
                        type="text"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                      <ErrorMessage
                        name="shop.name"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="shop.address" className="block text-sm font-medium text-gray-700 mb-1">
                        Shop Address
                      </label>
                      <Field
                        id="shop.address"
                        name="shop.address"
                        type="text"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                      <ErrorMessage
                        name="shop.address"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="shop.gstNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        GST Number (Optional)
                      </label>
                      <Field
                        id="shop.gstNumber"
                        name="shop.gstNumber"
                        type="text"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="shop.category" className="block text-sm font-medium text-gray-700 mb-1">
                        Shop Category
                      </label>
                      <Field
                        as="select"
                        id="shop.category"
                        name="shop.category"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
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
                    
                    <div>
                      <label htmlFor="shop.phoneNumber.main" className="block text-sm font-medium text-gray-700 mb-1">
                        Shop Phone Number
                      </label>
                      <Field
                        id="shop.phoneNumber.main"
                        name="shop.phoneNumber.main"
                        type="text"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="shop.phoneNumber.alternate" className="block text-sm font-medium text-gray-700 mb-1">
                        Alternate Phone Number (Optional)
                      </label>
                      <Field
                        id="shop.phoneNumber.alternate"
                        name="shop.phoneNumber.alternate"
                        type="text"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="shop.openTime" className="block text-sm font-medium text-gray-700 mb-1">
                        Opening Time
                      </label>
                      <Field
                        id="shop.openTime"
                        name="shop.openTime"
                        type="text"
                        placeholder="e.g. 9:00 AM"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="shop.closeTime" className="block text-sm font-medium text-gray-700 mb-1">
                        Closing Time
                      </label>
                      <Field
                        id="shop.closeTime"
                        name="shop.closeTime"
                        type="text"
                        placeholder="e.g. 8:00 PM"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="shop.workingDays" className="block text-sm font-medium text-gray-700 mb-1">
                        Working Days
                      </label>
                      <Field
                        id="shop.workingDays"
                        name="shop.workingDays"
                        type="text"
                        placeholder="e.g. Monday to Saturday"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Bank Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="bankDetails.bankName" className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Name
                      </label>
                      <Field
                        id="bankDetails.bankName"
                        name="bankDetails.bankName"
                        type="text"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="bankDetails.accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        Account Number
                      </label>
                      <Field
                        id="bankDetails.accountNumber"
                        name="bankDetails.accountNumber"
                        type="text"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="bankDetails.ifscCode" className="block text-sm font-medium text-gray-700 mb-1">
                        IFSC Code
                      </label>
                      <Field
                        id="bankDetails.ifscCode"
                        name="bankDetails.ifscCode"
                        type="text"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="bankDetails.accountType" className="block text-sm font-medium text-gray-700 mb-1">
                        Account Type
                      </label>
                      <Field
                        as="select"
                        id="bankDetails.accountType"
                        name="bankDetails.accountType"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      >
                        <option value="">Select account type</option>
                        <option value="Savings">Savings</option>
                        <option value="Current">Current</option>
                      </Field>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className={`px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                      (isSubmitting || isLoading) ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        ) : (
          <div className="text-center py-10 bg-white rounded-lg shadow-sm">
            <p className="text-red-500">Failed to load profile data. Please try again later.</p>
          </div>
        )}
      </div>
    </SellerLayout>
  );
};

export default EditProfile;