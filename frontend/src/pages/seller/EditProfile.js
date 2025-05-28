import React, { useState, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import SellerLayout from '../../components/layouts/SellerLayout';
import GooglePlacesAutocomplete from '../../components/GooglePlacesAutocomplete';
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
    category: Yup.string().required('Shop category is required'),
    description: Yup.string().max(500, 'Description cannot be more than 500 characters')
  })
});

// 🎯 NEW: Mock image upload function (same as AddProduct.js)
const mockImageUpload = async (file) => {
  try {
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create base64 data URL for reliable image display
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target.result); // Returns base64 data URL
      };
      reader.onerror = (error) => {
        console.error('File reading error:', error);
        // Fallback to a placeholder
        resolve('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNmMGYwZjAiLz4KPHRleHQgeD0iMTUwIiB5PSIxNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiI+U2hvcCBJbWFnZTwvdGV4dD4KPC9zdmc+');
      };
      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error('Image upload error:', error);
    // Return placeholder SVG
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNmMGYwZjAiLz4KPHRleHQgeD0iMTUwIiB5PSIxNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiI+U2hvcCBJbWFnZTwvdGV4dD4KPC9zdmc+';
  }
};

const EditProfile = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
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
        
        // Set existing location data if available
        if (response.data.shop?.location) {
          setSelectedPlace({
            address: response.data.shop.address,
            coordinates: response.data.shop.location.coordinates
          });
        }
      } else {
        toast.error(response.message || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      toast.error(error.message || 'Something went wrong');
    } finally {
      setFetchLoading(false);
    }
  };

  const handlePlaceSelected = (placeData) => {
    console.log('Place selected in EditProfile:', placeData);
    setSelectedPlace(placeData);
    
    // Show success message
    toast.success('Address selected successfully!');
  };

  // 🎯 NEW: Handle shop image upload
  const handleShopImageUpload = async (e, setFieldValue, currentImages) => {
    setUploadingImages(true);
    try {
      const files = Array.from(e.target.files);
      const uploadedImages = [...(currentImages || [])];
      
      console.log('📸 Uploading shop images:', files.length);
      
      for (const file of files) {
        const imageUrl = await mockImageUpload(file);
        uploadedImages.push(imageUrl);
      }
      
      setFieldValue('shop.images', uploadedImages);
      
      // Set main image if not already set
      if (uploadedImages.length > 0 && !currentImages?.length) {
        setFieldValue('shop.mainImage', uploadedImages[0]);
      }
      
      toast.success(`${files.length} shop image(s) uploaded successfully`);
    } catch (error) {
      toast.error('Failed to upload shop images');
      console.error('Shop image upload error:', error);
    } finally {
      setUploadingImages(false);
    }
  };

  // 🎯 NEW: Remove shop image
  const removeShopImage = (index, setFieldValue, currentImages) => {
    const newImages = [...currentImages];
    const removedImage = newImages.splice(index, 1)[0];
    setFieldValue('shop.images', newImages);
    
    // If removed image was the main image, set new main image
    setFieldValue('shop.mainImage', newImages.length > 0 ? newImages[0] : '');
    
    toast.success('Shop image removed');
  };

  // 🎯 NEW: Set main image
  const setMainImage = (imageUrl, setFieldValue) => {
    setFieldValue('shop.mainImage', imageUrl);
    toast.success('Main shop image updated');
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    setIsLoading(true);
    try {
      // Prepare the data with location coordinates if available
      const submitData = {
        ...values,
        shop: {
          ...values.shop,
          // Include location coordinates if a place was selected
          ...(selectedPlace && selectedPlace.coordinates && {
            location: {
              type: 'Point',
              coordinates: selectedPlace.coordinates
            }
          })
        }
      };

      console.log('🔄 Submitting profile data with shop images:', {
        ...submitData,
        shop: {
          ...submitData.shop,
          imagesCount: submitData.shop.images?.length || 0,
          hasMainImage: !!submitData.shop.mainImage
        }
      });
      
      const response = await updateSellerProfile(submitData);
      
      if (response.success) {
        // Update auth context with new data
        loginSeller({
          ...sellerAuth.seller,
          ...response.data
        });
        
        toast.success('Profile updated successfully!');
      } else {
        toast.error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <SellerLayout>
      <div className="edit-profile-container">
        <div className="flex items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Edit Profile</h1>
          {selectedPlace && selectedPlace.coordinates && (
            <div className="ml-4 flex items-center text-green-600 text-sm">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              Location coordinates saved
            </div>
          )}
        </div>
        
        {fetchLoading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
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
                workingDays: profile.shop?.workingDays || '',
                description: profile.shop?.description || '',
                images: profile.shop?.images || [],
                mainImage: profile.shop?.mainImage || ''
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
            {({ values, setFieldValue, isSubmitting, errors, touched }) => (
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
                        Shop Address <span className="text-orange-500">*</span>
                      </label>
                      <GooglePlacesAutocomplete
                        value={values.shop.address}
                        onChange={(address) => setFieldValue('shop.address', address)}
                        onPlaceSelected={handlePlaceSelected}
                        placeholder="Enter your shop address"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        error={errors.shop?.address && touched.shop?.address ? errors.shop.address : null}
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

                  {/* 🎯 NEW: Shop Description */}
                  <div className="mt-6">
                    <label htmlFor="shop.description" className="block text-sm font-medium text-gray-700 mb-1">
                      Shop Description (Optional)
                    </label>
                    <Field
                      as="textarea"
                      id="shop.description"
                      name="shop.description"
                      rows={3}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      placeholder="Brief description of your shop and what you sell..."
                    />
                    <ErrorMessage
                      name="shop.description"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {values.shop.description.length}/500 characters
                    </div>
                  </div>

                  {/* Location Preview */}
                  {selectedPlace && selectedPlace.coordinates && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-green-800">Location Coordinates Captured</p>
                          <p className="text-xs text-green-600">
                            Lat: {selectedPlace.coordinates[1].toFixed(6)}, 
                            Lng: {selectedPlace.coordinates[0].toFixed(6)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 🎯 NEW: Shop Images Section */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Shop Images
                  </h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Shop Images
                    </label>
                    
                    {values.shop.images.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                        {values.shop.images.map((image, index) => (
                          <div key={index} className="relative h-24 bg-gray-100 rounded-md overflow-hidden">
                            <img 
                              src={image} 
                              alt={`Shop ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                            
                            {/* Main Image Badge */}
                            {values.shop.mainImage === image && (
                              <div className="absolute top-1 left-1 bg-orange-500 text-white text-xs px-1 py-0.5 rounded">
                                Main
                              </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="absolute top-1 right-1 flex space-x-1">
                              {values.shop.mainImage !== image && (
                                <button
                                  type="button"
                                  onClick={() => setMainImage(image, setFieldValue)}
                                  className="bg-blue-500 text-white w-5 h-5 rounded text-xs hover:bg-blue-600 flex items-center justify-center"
                                  title="Set as main image"
                                >
                                  ★
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeShopImage(index, setFieldValue, values.shop.images)}
                                className="bg-red-500 text-white w-5 h-5 rounded text-xs hover:bg-red-600 flex items-center justify-center"
                                title="Remove image"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-2">
                      <label className="block">
                        <span className="sr-only">Choose shop images</span>
                        <input 
                          type="file" 
                          multiple
                          accept="image/*"
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
                          onChange={(e) => handleShopImageUpload(e, setFieldValue, values.shop.images)}
                          disabled={uploadingImages}
                        />
                      </label>
                      {uploadingImages && (
                        <div className="mt-2 text-sm text-gray-500 flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500 mr-2"></div>
                          Uploading shop images...
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Upload images that represent your shop. These will be displayed to customers.
                        <br />
                        Supported formats: JPG, PNG, GIF. Max size: 5MB per image.
                      </p>
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

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isLoading || uploadingImages}
                    className={`px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                      (isSubmitting || isLoading || uploadingImages) ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving Changes...
                      </div>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        ) : (
          <div className="text-center py-10 bg-white rounded-lg shadow-sm">
            <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-500 font-medium">Failed to load profile data</p>
            <p className="text-gray-500 text-sm mt-1">Please try again later or refresh the page</p>
            <button
              onClick={fetchSellerProfile}
              className="mt-4 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </SellerLayout>
  );
};

export default EditProfile;